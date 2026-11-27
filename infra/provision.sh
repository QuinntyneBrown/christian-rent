#!/usr/bin/env bash
# Creates what christian.rent runs on in Azure (ADR 0031), with the Azure CLI. Run it once, signed
# in (`az login`) as an owner of the subscription; it is safe to run again and changes nothing
# that already exists. It creates no container app or job: deploy.sh does, on every commit to main.
#
#   bash infra/provision.sh
set -euo pipefail
cd "$(dirname "$0")"
source ./names.sh

say() { printf '\n== %s\n' "$1"; }

SUBSCRIPTION_ID=$(az account show --query id -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)
SCOPE="/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP"

grant() { # principal id, principal type, role, scope
  az role assignment create --assignee-object-id "$1" --assignee-principal-type "$2" \
    --role "$3" --scope "$4" -o none
}

say "Resource group"
az group create -n "$RESOURCE_GROUP" -l "$LOCATION" -o none

say "Container registry"
az acr create -g "$RESOURCE_GROUP" -n "$REGISTRY" --sku Basic --admin-enabled false -o none
REGISTRY_ID=$(az acr show -g "$RESOURCE_GROUP" -n "$REGISTRY" --query id -o tsv)

say "Identities"
# The apps and jobs run as one identity: it pulls images and reads the connection string.
az identity create -g "$RESOURCE_GROUP" -n "$APP_IDENTITY" -o none
APP_PRINCIPAL=$(az identity show -g "$RESOURCE_GROUP" -n "$APP_IDENTITY" --query principalId -o tsv)
# GitHub Actions deploys as the other, with no stored secret: main's OIDC token is exchanged.
az identity create -g "$RESOURCE_GROUP" -n "$DEPLOY_IDENTITY" -o none
DEPLOY_PRINCIPAL=$(az identity show -g "$RESOURCE_GROUP" -n "$DEPLOY_IDENTITY" --query principalId -o tsv)
DEPLOY_CLIENT_ID=$(az identity show -g "$RESOURCE_GROUP" -n "$DEPLOY_IDENTITY" --query clientId -o tsv)
az identity federated-credential create -g "$RESOURCE_GROUP" --identity-name "$DEPLOY_IDENTITY" \
  --name github-main --issuer https://token.actions.githubusercontent.com \
  --subject "$GITHUB_SUBJECT" --audiences api://AzureADTokenExchange -o none

say "Roles"
# A new identity takes a moment to be known to the directory.
for attempt in 1 2 3 4 5 6; do
  grant "$APP_PRINCIPAL" ServicePrincipal AcrPull "$REGISTRY_ID" 2>/dev/null && break
  [ "$attempt" = 6 ] && { echo "The app identity could not be given AcrPull." >&2; exit 1; }
  sleep 10
done
grant "$DEPLOY_PRINCIPAL" ServicePrincipal AcrPush "$REGISTRY_ID"
grant "$DEPLOY_PRINCIPAL" ServicePrincipal Contributor "$SCOPE"

say "Logs"
az monitor log-analytics workspace create -g "$RESOURCE_GROUP" -n "$LOG_WORKSPACE" -l "$LOCATION" \
  --retention-time 30 -o none
LOG_CUSTOMER_ID=$(az monitor log-analytics workspace show -g "$RESOURCE_GROUP" -n "$LOG_WORKSPACE" --query customerId -o tsv)
LOG_KEY=$(az monitor log-analytics workspace get-shared-keys -g "$RESOURCE_GROUP" -n "$LOG_WORKSPACE" --query primarySharedKey -o tsv)

say "Network"
# The database has no public address: it and the container apps share this network.
az network vnet create -g "$RESOURCE_GROUP" -n "$VNET" -l "$LOCATION" --address-prefixes 10.40.0.0/16 -o none
az network vnet subnet create -g "$RESOURCE_GROUP" --vnet-name "$VNET" -n "$APPS_SUBNET" \
  --address-prefixes 10.40.0.0/23 --delegations Microsoft.App/environments -o none
az network vnet subnet create -g "$RESOURCE_GROUP" --vnet-name "$VNET" -n "$DATABASE_SUBNET" \
  --address-prefixes 10.40.2.0/28 --delegations Microsoft.DBforPostgreSQL/flexibleServers -o none
APPS_SUBNET_ID=$(az network vnet subnet show -g "$RESOURCE_GROUP" --vnet-name "$VNET" -n "$APPS_SUBNET" --query id -o tsv)
DATABASE_SUBNET_ID=$(az network vnet subnet show -g "$RESOURCE_GROUP" --vnet-name "$VNET" -n "$DATABASE_SUBNET" --query id -o tsv)

say "Container Apps environment"
if ! az containerapp env show -g "$RESOURCE_GROUP" -n "$ENVIRONMENT" -o none 2>/dev/null; then
  az containerapp env create -g "$RESOURCE_GROUP" -n "$ENVIRONMENT" -l "$LOCATION" \
    --enable-workload-profiles --infrastructure-subnet-resource-id "$APPS_SUBNET_ID" \
    --logs-workspace-id "$LOG_CUSTOMER_ID" --logs-workspace-key "$LOG_KEY" -o none
fi

say "Photo storage"
az storage account create -g "$RESOURCE_GROUP" -n "$STORAGE_ACCOUNT" -l "$LOCATION" --sku Standard_LRS \
  --kind StorageV2 --min-tls-version TLS1_2 --allow-blob-public-access false --https-only true -o none
az storage share-rm create -g "$RESOURCE_GROUP" --storage-account "$STORAGE_ACCOUNT" -n "$PHOTO_SHARE" --quota 100 -o none
# A deleted share can be brought back for two weeks.
az storage account file-service-properties update -g "$RESOURCE_GROUP" -n "$STORAGE_ACCOUNT" \
  --enable-delete-retention true --delete-retention-days 14 -o none
STORAGE_KEY=$(az storage account keys list -g "$RESOURCE_GROUP" -n "$STORAGE_ACCOUNT" --query "[0].value" -o tsv)
az containerapp env storage set -g "$RESOURCE_GROUP" -n "$ENVIRONMENT" --storage-name "$PHOTO_SHARE" \
  --azure-file-account-name "$STORAGE_ACCOUNT" --azure-file-account-key "$STORAGE_KEY" \
  --azure-file-share-name "$PHOTO_SHARE" --access-mode ReadWrite -o none

say "Key vault"
if ! az keyvault show -g "$RESOURCE_GROUP" -n "$KEY_VAULT" -o none 2>/dev/null; then
  az keyvault create -g "$RESOURCE_GROUP" -n "$KEY_VAULT" -l "$LOCATION" --enable-rbac-authorization true -o none
fi
KEY_VAULT_ID=$(az keyvault show -g "$RESOURCE_GROUP" -n "$KEY_VAULT" --query id -o tsv)
grant "$APP_PRINCIPAL" ServicePrincipal "Key Vault Secrets User" "$KEY_VAULT_ID"
grant "$(az ad signed-in-user show --query id -o tsv)" User "Key Vault Secrets Officer" "$KEY_VAULT_ID"

secret_exists() { az keyvault secret show --vault-name "$KEY_VAULT" -n "$1" -o none 2>/dev/null; }
set_secret() { # name, value; waits for the role above to take effect
  for attempt in 1 2 3 4 5 6 7 8 9 10 11 12; do
    az keyvault secret set --vault-name "$KEY_VAULT" -n "$1" --value "$2" -o none 2>/dev/null && return 0
    sleep 10
  done
  echo "Could not write the secret $1 to $KEY_VAULT." >&2
  return 1
}

say "Database"
# The password is made here, kept only in the key vault and never printed.
if ! secret_exists database-password; then
  set_secret database-password "Cr$(openssl rand -hex 24)"
fi
DATABASE_PASSWORD=$(az keyvault secret show --vault-name "$KEY_VAULT" -n database-password --query value -o tsv)
if ! az postgres flexible-server show -g "$RESOURCE_GROUP" -n "$DATABASE_SERVER" -o none 2>/dev/null; then
  az postgres flexible-server create -g "$RESOURCE_GROUP" -n "$DATABASE_SERVER" -l "$LOCATION" \
    --tier Burstable --sku-name Standard_B1ms --storage-size 32 --version 17 \
    --admin-user "$DATABASE_ADMIN" --admin-password "$DATABASE_PASSWORD" \
    --subnet "$DATABASE_SUBNET_ID" --private-dns-zone "$DATABASE_DNS_ZONE" \
    --backup-retention 14 --yes -o none
fi
az postgres flexible-server db create -g "$RESOURCE_GROUP" --server-name "$DATABASE_SERVER" \
  --database-name "$DATABASE_NAME" -o none
# The migrations create these two extensions (ADR 0015); Azure allows only the ones listed here.
az postgres flexible-server parameter set -g "$RESOURCE_GROUP" --server-name "$DATABASE_SERVER" \
  --name azure.extensions --value pg_trgm,unaccent -o none
DATABASE_HOST=$(az postgres flexible-server show -g "$RESOURCE_GROUP" -n "$DATABASE_SERVER" --query fullyQualifiedDomainName -o tsv)
CONNECTION_STRING="Host=$DATABASE_HOST;Database=$DATABASE_NAME;Username=$DATABASE_ADMIN;Password=$DATABASE_PASSWORD;SSL Mode=VerifyFull"
if [ "$(az keyvault secret show --vault-name "$KEY_VAULT" -n connection-string --query value -o tsv 2>/dev/null)" != "$CONNECTION_STRING" ]; then
  set_secret connection-string "$CONNECTION_STRING"
fi

say "GitHub"
# Identifiers, not secrets: the deploy workflow signs in with them and main's OIDC token.
if command -v gh >/dev/null; then
  gh variable set AZURE_CLIENT_ID --repo "$GITHUB_REPOSITORY_NAME" --body "$DEPLOY_CLIENT_ID"
  gh variable set AZURE_TENANT_ID --repo "$GITHUB_REPOSITORY_NAME" --body "$TENANT_ID"
  gh variable set AZURE_SUBSCRIPTION_ID --repo "$GITHUB_REPOSITORY_NAME" --body "$SUBSCRIPTION_ID"
else
  echo "Set these repository variables for the deploy workflow:"
  echo "  AZURE_CLIENT_ID=$DEPLOY_CLIENT_ID"
  echo "  AZURE_TENANT_ID=$TENANT_ID"
  echo "  AZURE_SUBSCRIPTION_ID=$SUBSCRIPTION_ID"
fi

say "Provisioned. The next commit to main deploys; or run: bash infra/deploy.sh <image tag>"
