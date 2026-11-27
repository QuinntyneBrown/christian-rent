#!/usr/bin/env bash
# Releases one image tag to Azure with the Azure CLI (ADR 0031). The deploy workflow runs it on
# every commit to main, after it has pushed the three images; an operator can run it by hand to
# release or to go back to an earlier tag:
#
#   bash infra/deploy.sh <image tag>
#
# It applies the migrations first, as a job that must succeed, then gives both applications and
# the two scheduled jobs the new images and settings, waits until both applications are ready on
# them, and asks each origin for a page and for the API. What each container app and job is, is
# written here, so a change to a setting is released like a change to the code.
#
# RENT_HOST and ADMIN_HOST name the two public hosts; without them the hosts are the ones Azure
# gave the container apps.
set -euo pipefail
cd "$(dirname "$0")"
source ./names.sh

TAG=${1:?"Usage: deploy.sh <image tag>"}

say() { printf '\n== %s\n' "$1"; }

say "Reading what provision.sh made"
ENVIRONMENT_ID=$(az containerapp env show -g "$RESOURCE_GROUP" -n "$ENVIRONMENT" --query id -o tsv)
DEFAULT_DOMAIN=$(az containerapp env show -g "$RESOURCE_GROUP" -n "$ENVIRONMENT" --query properties.defaultDomain -o tsv)
IDENTITY_ID=$(az identity show -g "$RESOURCE_GROUP" -n "$APP_IDENTITY" --query id -o tsv)
REGISTRY_SERVER=$(az acr show -g "$RESOURCE_GROUP" -n "$REGISTRY" --query loginServer -o tsv)
KEY_VAULT_URI=$(az keyvault show -g "$RESOURCE_GROUP" -n "$KEY_VAULT" --query properties.vaultUri -o tsv)

RENT_HOST=${RENT_HOST:-$RENT_APP.$DEFAULT_DOMAIN}
ADMIN_HOST=${ADMIN_HOST:-$ADMIN_APP.$DEFAULT_DOMAIN}
BACKEND_IMAGE=$REGISTRY_SERVER/backend:$TAG

# Beside this script, as a relative path: one the Azure CLI reads the same way on every system.
WORK=$(mktemp -d ./.deploy.XXXXXX)
trap 'rm -rf "$WORK"' EXIT

# What every container app and job shares: who it runs as, where its images come from, and the
# connection string, which stays in the key vault and is read by that identity.
shared_configuration() {
  cat <<YAML
    registries:
      - server: $REGISTRY_SERVER
        identity: $IDENTITY_ID
    secrets:
      - name: connection-string
        keyVaultUrl: ${KEY_VAULT_URI}secrets/connection-string
        identity: $IDENTITY_ID
YAML
}

# The settings of the backend, for the API and for ChristianRent.Cli (README, Settings).
backend_env() {
  cat <<YAML
          - name: ConnectionStrings__Default
            secretRef: connection-string
          - name: PhotoStorage__RootPath
            value: /data/photos
YAML
}

photo_volume() {
  cat <<YAML
    volumes:
      - name: photos
        storageType: AzureFile
        storageName: $PHOTO_SHARE
YAML
}

# One application: its static host and, beside it in the same replica, the API it proxies to. The
# API hears only its host, on loopback, which is the one proxy it trusts by default.
app_yaml() { # host image name, SITE_URL or nothing
  cat <<YAML
location: $LOCATION
identity:
  type: UserAssigned
  userAssignedIdentities:
    $IDENTITY_ID: {}
properties:
  environmentId: $ENVIRONMENT_ID
  workloadProfileName: Consumption
  configuration:
    activeRevisionsMode: Single
    ingress:
      external: true
      allowInsecure: false
      targetPort: 8080
      transport: auto
$(shared_configuration)
  template:
    containers:
      - name: host
        image: $REGISTRY_SERVER/$1:$TAG
        env:
          - name: SITE_URL
            value: "$2"
        resources:
          cpu: 0.25
          memory: 0.5Gi
        probes:
          - type: Readiness
            httpGet:
              path: /favicon.svg
              port: 8080
            periodSeconds: 10
      - name: api
        image: $BACKEND_IMAGE
        env:
          - name: ASPNETCORE_ENVIRONMENT
            value: Production
          - name: ASPNETCORE_HTTP_PORTS
            value: "5080"
          - name: Site__Origin
            value: https://$RENT_HOST
          - name: Site__AdminOrigin
            value: https://$ADMIN_HOST
          - name: AllowedHosts
            value: "$RENT_HOST;$ADMIN_HOST"
$(backend_env)
        resources:
          cpu: 0.5
          memory: 1Gi
        volumeMounts:
          - volumeName: photos
            mountPath: /data/photos
        probes:
          - type: Startup
            httpGet:
              path: /health/live
              port: 5080
              httpHeaders:
                - name: Host
                  value: $RENT_HOST
            periodSeconds: 3
            failureThreshold: 40
          - type: Liveness
            httpGet:
              path: /health/live
              port: 5080
              httpHeaders:
                - name: Host
                  value: $RENT_HOST
            periodSeconds: 20
          - type: Readiness
            httpGet:
              path: /health/ready
              port: 5080
              httpHeaders:
                - name: Host
                  value: $RENT_HOST
            periodSeconds: 10
            timeoutSeconds: 5
    scale:
      minReplicas: 1
      maxReplicas: 1
$(photo_volume)
YAML
}

# One run of ChristianRent.Cli, started by hand (migrate) or by the clock (the purges).
job_yaml() { # command, cron expression or nothing
  local trigger
  if [ -n "$2" ]; then
    trigger="triggerType: Schedule
    scheduleTriggerConfig:
      cronExpression: \"$2\"
      parallelism: 1
      replicaCompletionCount: 1"
  else
    trigger="triggerType: Manual
    manualTriggerConfig:
      parallelism: 1
      replicaCompletionCount: 1"
  fi
  cat <<YAML
location: $LOCATION
identity:
  type: UserAssigned
  userAssignedIdentities:
    $IDENTITY_ID: {}
properties:
  environmentId: $ENVIRONMENT_ID
  workloadProfileName: Consumption
  configuration:
    $trigger
    replicaTimeout: 900
    replicaRetryLimit: 0
$(shared_configuration)
  template:
    containers:
      - name: cli
        image: $BACKEND_IMAGE
        command: ["dotnet", "/app/cli/ChristianRent.Cli.dll", "$1"]
        env:
          - name: DOTNET_ENVIRONMENT
            value: Production
$(backend_env)
        resources:
          cpu: 0.25
          memory: 0.5Gi
        volumeMounts:
          - volumeName: photos
            mountPath: /data/photos
$(photo_volume)
YAML
}

apply_app() { # name, yaml file
  if az containerapp show -g "$RESOURCE_GROUP" -n "$1" -o none 2>/dev/null; then
    az containerapp update -g "$RESOURCE_GROUP" -n "$1" --yaml "$2" -o none
  else
    az containerapp create -g "$RESOURCE_GROUP" -n "$1" --yaml "$2" -o none
  fi
}

apply_job() { # name, yaml file
  if az containerapp job show -g "$RESOURCE_GROUP" -n "$1" -o none 2>/dev/null; then
    az containerapp job update -g "$RESOURCE_GROUP" -n "$1" --yaml "$2" -o none
  else
    az containerapp job create -g "$RESOURCE_GROUP" -n "$1" --yaml "$2" -o none
  fi
}

app_yaml rent "" >"$WORK/rent.yaml"
app_yaml admin "https://$RENT_HOST" >"$WORK/admin.yaml"
job_yaml migrate "" >"$WORK/migrate.yaml"
# Daily, at 09:00 UTC (README, Settings: Members:PurgeAfterDays).
job_yaml purge-departed "0 9 * * *" >"$WORK/purge-departed.yaml"
# Hourly (ADR 0021).
job_yaml purge-photos "15 * * * *" >"$WORK/purge-photos.yaml"

say "Applying the migrations ($TAG)"
apply_job "$MIGRATE_JOB" "$WORK/migrate.yaml"
EXECUTION=$(az containerapp job start -g "$RESOURCE_GROUP" -n "$MIGRATE_JOB" --query name -o tsv)
STATUS=Running
for attempt in $(seq 1 90); do
  STATUS=$(az containerapp job execution show -g "$RESOURCE_GROUP" -n "$MIGRATE_JOB" \
    --job-execution-name "$EXECUTION" --query properties.status -o tsv)
  case "$STATUS" in
    Succeeded) break ;;
    Failed | Stopped | Degraded) break ;;
  esac
  sleep 5
done
if [ "$STATUS" != Succeeded ]; then
  echo "The migrations did not succeed ($EXECUTION: $STATUS); nothing else was released." >&2
  az containerapp job logs show -g "$RESOURCE_GROUP" -n "$MIGRATE_JOB" --execution "$EXECUTION" \
    --container cli --tail 50 2>/dev/null || true
  exit 1
fi
echo "Applied ($EXECUTION)."

say "Releasing rent, admin and the scheduled jobs ($TAG)"
apply_app "$RENT_APP" "$WORK/rent.yaml" &
RENT_PID=$!
apply_app "$ADMIN_APP" "$WORK/admin.yaml" &
ADMIN_PID=$!
apply_job "$PURGE_DEPARTED_JOB" "$WORK/purge-departed.yaml" &
DEPARTED_PID=$!
apply_job "$PURGE_PHOTOS_JOB" "$WORK/purge-photos.yaml" &
PHOTOS_PID=$!
FAILED=0
for pid in $RENT_PID $ADMIN_PID $DEPARTED_PID $PHOTOS_PID; do
  wait "$pid" || FAILED=1
done
[ "$FAILED" = 0 ] || { echo "A release failed; see above." >&2; exit 1; }

say "Waiting until both applications are ready on $TAG"
# A new revision takes traffic only once its probes pass; until then the last one still serves.
ready_on_tag() { # app name
  local latest ready image
  read -r latest ready image < <(az containerapp show -g "$RESOURCE_GROUP" -n "$1" -o tsv --query \
    "[properties.latestRevisionName, properties.latestReadyRevisionName, properties.template.containers[?name=='api'].image | [0]]" \
    | tr -d '\r' | tr '\n' ' ') || true
  [ -n "$latest" ] && [ "$latest" = "$ready" ] && [ "$image" = "$BACKEND_IMAGE" ]
}
for app in "$RENT_APP" "$ADMIN_APP"; do
  for attempt in $(seq 1 60); do
    ready_on_tag "$app" && break
    [ "$attempt" = 60 ] && { echo "$app is not ready on $TAG; the last ready revision still serves." >&2; exit 1; }
    sleep 5
  done
  echo "$app is ready."
done

say "Asking each origin"
expect() { # what, expected status, url
  local status
  for attempt in $(seq 1 12); do
    status=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$3" || true)
    [ "$status" = "$2" ] && { echo "$2 $1"; return 0; }
    sleep 5
  done
  echo "$1 answered $status, not $2: $3" >&2
  return 1
}
expect "rent's first screen" 200 "https://$RENT_HOST/"
expect "rent's API, through its host, with the database" 200 "https://$RENT_HOST/api/listings"
expect "Admin's first screen" 200 "https://$ADMIN_HOST/"
expect "Admin's API, through its host" 401 "https://$ADMIN_HOST/api/admin/session"
expect "Admin's host refusing the rest of the API" 404 "https://$ADMIN_HOST/api/listings"
curl -s --max-time 20 "https://$ADMIN_HOST/config.json" | grep -q "\"https://$RENT_HOST\"" \
  || { echo "Admin's config.json does not name https://$RENT_HOST." >&2; exit 1; }
echo "200 Admin's config.json names https://$RENT_HOST"

say "Released $TAG"
echo "rent:  https://$RENT_HOST"
echo "admin: https://$ADMIN_HOST"
