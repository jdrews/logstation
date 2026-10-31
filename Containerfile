#
# logstation container image
#
# Multi-stage build. All stages use Chainguard images, which are updated
# frequently as new CVEs are patched. The final image is a small, static,
# non-root runtime.
#
# This builds the entire image from source in one command:
#
#   podman build -f Containerfile .
#
# The web stage runs `yarn install` with lifecycle scripts disabled
# (YARN_ENABLE_SCRIPTS=false). The native modules the build depends on
# (notably @swc/core) ship prebuilt platform binaries, so their install scripts
# are not required for `parcel build`; `canvas` is a test-only dependency. This
# avoids executing untrusted package scripts during install (see the SonarCloud
# "package manager scripts" rule). The install is further isolated in a
# disposable Chainguard build stage (no GITHUB_TOKEN in scope) that is discarded
# after the build, and the runtime image contains no Node.js -- only a static
# Go binary and static web assets -- so no build-time package can execute at
# runtime.
#
# This file uses plain Dockerfile syntax and is named "Containerfile" so it is
# compatible with both podman and docker (e.g. `podman build -f Containerfile`).

# ---------------------------------------------------------------------------
# Stage 1: build the web frontend (React)
# ---------------------------------------------------------------------------
# The -dev variant ships `apk` and a C++ toolchain, both of which are needed
# to compile the native `canvas` dependency from source during `yarn install`.
# This is a build-only stage, so its larger size does not affect the image.
FROM cgr.dev/chainguard/node:latest-dev AS web

# The web build uses yarn 4 (berry) via corepack, matching the
# `packageManager` field in web/package.json. This is a build-only stage, so it
# runs as root: `corepack enable` writes to /usr/bin and `apk` needs root to
# update its database.
WORKDIR /app/web
USER root

# `canvas` is a native dependency that is compiled from source during
# `yarn install`. It needs these system libraries.
RUN apk add --no-cache \
      cairo pango libjpeg-turbo giflib librsvg pixman glib libx11

COPY web/package.json web/yarn.lock web/.yarnrc.yml ./
# --immutable enforces the exact pinned, integrity-hashed versions from the
# committed yarn.lock (no version drift). YARN_ENABLE_SCRIPTS=false disables
# package lifecycle scripts (the native deps ship prebuilt binaries, so they
# are not needed for the build).
RUN corepack enable \
      && YARN_ENABLE_SCRIPTS=false yarn install --immutable

COPY web/ ./
RUN yarn build

# ---------------------------------------------------------------------------
# Stage 2: build the Go binary (embeds the web dist)
# ---------------------------------------------------------------------------
FROM cgr.dev/chainguard/go:latest AS go

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
COPY --from=web /app/web/dist ./web/dist

# Static binary, no CGO.
RUN CGO_ENABLED=0 go build -o logstation .

# ---------------------------------------------------------------------------
# Stage 3: runtime
# ---------------------------------------------------------------------------
FROM cgr.dev/chainguard/busybox:latest

# The base image defaults to a non-root user, so we need root to install the
# binary into /usr/local/bin and create /config.
USER root
COPY --from=go /app/logstation /usr/local/bin/logstation
COPY entrypoint.sh /entrypoint.sh

# logstation reads/writes logstation.conf in the working directory.
RUN mkdir -p /config && chown nonroot:nonroot /config
WORKDIR /config

# Run the server as a non-root user.
USER nonroot

EXPOSE 8884

ENTRYPOINT ["/entrypoint.sh"]
