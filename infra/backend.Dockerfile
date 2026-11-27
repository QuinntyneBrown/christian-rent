# The backend image: the API and ChristianRent.Cli side by side, so the same image runs the API,
# the migrations and the purge jobs (ADR 0031). Built from the repository root:
#
#   docker build -f infra/backend.Dockerfile -t backend .
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
ENV DOTNET_CLI_TELEMETRY_OPTOUT=1 DOTNET_NOLOGO=1

# The project files and their lock files first, so a change to the code keeps the restored layer.
COPY backend/global.json backend/.editorconfig backend/Directory.Build.props backend/Directory.Packages.props ./
COPY backend/src/ChristianRent.Domain/ChristianRent.Domain.csproj backend/src/ChristianRent.Domain/packages.lock.json src/ChristianRent.Domain/
COPY backend/src/ChristianRent.Application/ChristianRent.Application.csproj backend/src/ChristianRent.Application/packages.lock.json src/ChristianRent.Application/
COPY backend/src/ChristianRent.Infrastructure/ChristianRent.Infrastructure.csproj backend/src/ChristianRent.Infrastructure/packages.lock.json src/ChristianRent.Infrastructure/
COPY backend/src/ChristianRent.Api/ChristianRent.Api.csproj backend/src/ChristianRent.Api/packages.lock.json src/ChristianRent.Api/
COPY backend/src/ChristianRent.Cli/ChristianRent.Cli.csproj backend/src/ChristianRent.Cli/packages.lock.json src/ChristianRent.Cli/
RUN dotnet restore src/ChristianRent.Api --locked-mode \
 && dotnet restore src/ChristianRent.Cli --locked-mode

COPY backend/src/ src/
RUN dotnet publish src/ChristianRent.Api -c Release --no-restore -o /out/api \
 && dotnet publish src/ChristianRent.Cli -c Release --no-restore -o /out/cli

# Not the Alpine image: a search ignores accents through ICU, which this one has (ADR 0015).
FROM mcr.microsoft.com/dotnet/aspnet:10.0
COPY --from=build /out/api /app/api
COPY --from=build /out/cli /app/cli
# The content root, where appsettings.json is; the CLI is run from here as /app/cli/ChristianRent.Cli.dll.
WORKDIR /app/api
USER $APP_UID
ENTRYPOINT ["dotnet", "ChristianRent.Api.dll"]
