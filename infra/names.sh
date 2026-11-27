# The names of everything christian.rent has in Azure (ADR 0031). Sourced by provision.sh and
# deploy.sh; nothing here is a secret.

# Git Bash on Windows would otherwise rewrite arguments that start with "/", such as resource ids.
export MSYS_NO_PATHCONV=1

LOCATION=${LOCATION:-canadacentral}
RESOURCE_GROUP=${RESOURCE_GROUP:-rg-christian-rent}

REGISTRY=crchristianrent
APP_IDENTITY=id-christian-rent-app
DEPLOY_IDENTITY=id-christian-rent-deploy
LOG_WORKSPACE=log-christian-rent
VNET=vnet-christian-rent
APPS_SUBNET=snet-apps
DATABASE_SUBNET=snet-database
ENVIRONMENT=cae-christian-rent
STORAGE_ACCOUNT=stchristianrent
PHOTO_SHARE=photos
KEY_VAULT=kv-christian-rent
DATABASE_SERVER=psql-christian-rent
DATABASE_NAME=christian_rent
DATABASE_ADMIN=cradmin
DATABASE_DNS_ZONE=christian-rent.private.postgres.database.azure.com

# The public hosts, each bound to its container app with a certificate Azure manages:
# christian.rent to rent's and admin.christian.rent to Admin's. A host left empty is the one Azure
# gave its container app (deploy.sh fills that in). The deploy workflow can override either with
# the repository variables RENT_HOST and ADMIN_HOST.
RENT_HOST=${RENT_HOST:-christian.rent}
ADMIN_HOST=${ADMIN_HOST:-admin.christian.rent}
# The same site by its other name, also bound to rent's container app: rent's static host answers
# it with a redirect to RENT_HOST (nginx/rent.conf.template). Empty when no such name is bound.
RENT_WWW_HOST=${RENT_WWW_HOST-www.christian.rent}

RENT_APP=ca-christian-rent
ADMIN_APP=ca-christian-rent-admin
MIGRATE_JOB=caj-christian-rent-migrate
PURGE_DEPARTED_JOB=caj-christian-rent-departed
PURGE_PHOTOS_JOB=caj-christian-rent-photos

# The repository whose pushes to main deploy, and the subject GitHub puts in its OIDC token for
# them. This account issues immutable subjects (owner and repository ids), as
# `gh api repos/<owner>/<repo>/actions/oidc/customization/sub` shows.
GITHUB_REPOSITORY_NAME=${GITHUB_REPOSITORY_NAME:-QuinntyneBrown/christian-rent}
GITHUB_SUBJECT=${GITHUB_SUBJECT:-repo:QuinntyneBrown@1749159/christian-rent@1472924492:ref:refs/heads/main}
