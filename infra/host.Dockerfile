# The static host of one application (ADR 0028, ADR 0031): nginx serving `rent` or `admin`, with
# its security headers, the SPA fallback and the proxy to the API beside it. Built from the
# repository root, once for each application:
#
#   docker build -f infra/host.Dockerfile --build-arg APP=rent -t rent .
#   docker build -f infra/host.Dockerfile --build-arg APP=admin -t admin .
FROM node:24-slim AS build
WORKDIR /src
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
ARG APP
RUN npm run build:${APP}

# Runs as a user that is not root and listens on 8080.
FROM nginxinc/nginx-unprivileged:1.29-alpine
ARG APP
COPY infra/nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
# The image's entrypoint fills in ${SITE_URL} when the container starts and writes the result to
# /etc/nginx/conf.d/default.conf; nginx's own variables ($host, $uri) are left alone.
COPY infra/nginx/${APP}.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /src/dist/${APP}/browser /usr/share/nginx/html
