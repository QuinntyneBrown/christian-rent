# 0031. christian.rent runs on Azure Container Apps, and every commit to main is deployed

**Status:** Accepted. Settles the production half of [0003](0003-database-engine.md) and of
[0004](0004-file-storage.md), names the hosts [0028](0028-two-applications-deployed-separately.md)
left unchosen, and adds a deploy workflow beside the CI of [0008](0008-ci-scope.md).

## Context

Nothing was deployed and no host was chosen: the designs left the hosting platform, its
deployment pipeline, the production database and the file storage product open
(`docs/detailed-designs/platform/fail-clearly-and-operate`, *Undecided*). The request is a
pipeline that deploys to Azure on each commit to `main`.

What a host has to do is already decided. Each application has a static host on its own origin
that serves its files, falls back to `index.html`, sends the security headers and proxies its
`/api` paths to the API on the same origin with `Host`, `X-Forwarded-For` and
`X-Forwarded-Proto` ([0028](0028-two-applications-deployed-separately.md)). The API trusts
forwarded headers only from the proxies it is told of, and limits an anonymous caller by their
address ([0009](0009-health-endpoints-and-rate-limiter.md)). Migrations are applied by
`ChristianRent.Cli migrate` before the new API takes traffic, never by the API. Photos are files
on a disk path. The API and the CLI need ICU. The launch is in Canada.

## Decision

- **Azure Container Apps, in Canada Central**, in the resource group `rg-christian-rent`.
  Everything is made with the Azure CLI: `infra/provision.sh` once, by an operator, and
  `infra/deploy.sh <image tag>` on every release. `infra/names.sh` holds the names.
- **Two container apps, one for each application**: `ca-christian-rent` and
  `ca-christian-rent-admin`. Each replica holds two containers: the application's static host
  (nginx, not root, `infra/host.Dockerfile` and `infra/nginx/`) and the API beside it
  (`infra/backend.Dockerfile`), which the host reaches on loopback. So each origin proxies to
  the API with the `Host` it was asked for, and the API sees its proxy at `127.0.0.1`, the one
  address ASP.NET Core trusts for forwarded headers without a setting: the caller's address and
  the scheme are right, and nobody else can supply them. Azure's ingress ends TLS, redirects
  HTTP to HTTPS and appends the caller's address to `X-Forwarded-For`; nginx passes that header
  and `X-Forwarded-Proto` through unchanged. The API has no address of its own: it is reachable
  only through a host.
- **The API runs in both container apps**, from the one image with the one set of settings.
  [0028](0028-two-applications-deployed-separately.md) speaks of "the one backend"; it is one
  backend, in two instances, which the design already allows for: the data protection keys are
  in the database and the photos on a share both mount. Putting it behind its own internal
  ingress instead would hide the caller's address from it, or need the API to trust addresses
  that change. Admin's instance receives `/api/admin/` only, because its host proxies nothing
  else. Each container app runs one replica, so each rate limit counts in one place for its
  application; more replicas would need the limits kept outside the process.
- **The hosts are the ones Azure gives** (`<app>.<environment>.canadacentral.azurecontainerapps.io`)
  until christian.rent's own domains are bound. `names.sh` holds `RENT_HOST` and `ADMIN_HOST`
  (`christian.rent` for `rent` now; Admin's is still Azure's), which the repository variables
  of the same names can override, and `deploy.sh` derives `Site:Origin`, `Site:AdminOrigin`,
  `AllowedHosts` and Admin's `config.json` (the host's `SITE_URL`) from them. `AllowedHosts`
  keeps the Azure hosts too, so a bound domain never takes the Azure address away.
- **The database is Azure Database for PostgreSQL flexible server** (version 17, Burstable
  B1ms), with no public address: it and the container apps share a virtual network. Its
  `azure.extensions` allows `pg_trgm` and `unaccent`. Azure backs it up daily and keeps 14 days,
  restorable to a point in time. Its password is made by `provision.sh`, kept in the key vault
  `kv-christian-rent` and never printed; the connection string is a key vault secret the
  container apps and jobs read as their managed identity. The API signs in as the server's
  administrator role until a narrower role is worth its own change.
- **Photos are on an Azure Files share** (`stchristianrent`, `photos`), mounted at
  `/data/photos` in the API and the jobs; `LocalDiskPhotoStorage` and `PhotoStorage:RootPath`
  are unchanged. A deleted share can be recovered for 14 days.
- **Three jobs run `ChristianRent.Cli`** from the backend image: `caj-christian-rent-migrate`
  (started by each release), `caj-christian-rent-departed` (`purge-departed`, daily at 09:00
  UTC) and `caj-christian-rent-photos` (`purge-photos`, hourly).
- **`.github/workflows/deploy.yml` deploys every commit to `main`**, once `CI` has passed on
  it. Three images (`backend`, `rent`, `admin`) are built side by side and pushed to the
  registry `crchristianrent`, tagged with the commit. Then `deploy.sh` runs `migrate` and stops
  if it fails; gives both container apps and the scheduled jobs the new images and settings;
  waits until each application's new revision is ready (the API's readiness probe is
  `/health/ready`, so the database and the photo storage answer); and asks each origin for its
  first screen and for the API through its host. A revision that never becomes ready takes no
  traffic: the last one keeps serving, and the workflow fails. Releases run one at a time and
  are never cancelled half way. Going back is `deploy.sh <an earlier commit>`; a migration is
  not undone by it, so a migration stays compatible with the release before it.
- **No stored credential.** The workflow signs in to Azure as the managed identity
  `id-christian-rent-deploy` by exchanging GitHub's OIDC token, which Azure accepts only for
  this repository's `main`. That identity may push images and change this resource group, and
  cannot read the key vault's secrets. The repository holds three variables, none a secret:
  `AZURE_CLIENT_ID`, `AZURE_TENANT_ID` and `AZURE_SUBSCRIPTION_ID`.
- **The deploy workflow is not part of the 5 minutes of CI.** `CI` stays as
  [0008](0008-ci-scope.md) has it and gates the release. `Deploy` runs after it, on `main`
  only, with no test of its own beyond asking the origins; it is kept short by building the
  images in parallel with a layer cache.
- **`HTTPS_PORT` is not set.** Azure's ingress already redirects HTTP to HTTPS, and the API is
  reachable only through a host. With it set, the platform's health probes, which reach the API
  directly over HTTP, would be answered with a redirect, which a probe counts as healthy.

## Consequences

- A commit to `main` is public a few minutes after CI passes, so `main` is always releasable.
- A setting of a container app or a job is changed in `deploy.sh` and released like code; a
  change made in the portal is overwritten by the next release.
- Still open: a backup of the photo share to a separate store (L2-034, criterion 4; the
  database's is Azure's own), the telemetry backend (`OTEL_EXPORTER_OTLP_ENDPOINT` stays unset;
  the containers' console logs go to the Log Analytics workspace `log-christian-rent`), and
  christian.rent's own domains.
- Images accumulate in the registry, one set for each commit; nothing removes old ones yet.
- An operator runs the CLI's other commands in a running API container, for example
  `az containerapp exec -g rg-christian-rent -n ca-christian-rent --container api --command "dotnet /app/cli/ChristianRent.Cli.dll grant-admin <member-id>"`.
