![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

 **Social:**
[![Discord](https://img.shields.io/discord/757425726143201370.svg?color=%237289da&label=Discord&logo=discord&logoColor=%237289da)](https://discord.gg/UTxjBf9juQ)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-blue.svg?logo=LinkedIn)](https://www.linkedin.com/company/relizaio/)

# Oolong - lightweight TEA server implementation

This project is a lightweight implementation of [Transparency Exchange API](https://github.com/CycloneDX/transparency-exchange-api/) which uses [NestJS](https://nestjs.com/) framework.

If you are looking for a full-featured TEA server implementation with UI and built-in artifact storage, please refer to [ReARM](https://github.com/relizaio/rearm).

## Live Demo
Live demo server is currently operating at oolong-demo.rearmhq.com.

I.e., you can access well-known at [https://oolong-demo.rearmhq.com/.well-known/tea](https://oolong-demo.rearmhq.com/.well-known/tea).

Also you can download [ReARM CLI](https://github.com/relizaio/rearm-cli) and try out full flow with TEI urn:tei:asin:oolong-demo.rearmhq.com:B09D6HR559

using 

```bash
rearm tea full_tea_flow --debug true --tei urn:tei:asin:oolong-demo.rearmhq.com:B09D6HR559
```

## Sample Data
Additional sample data can be found in the [Reliza-Demos/conferences-oolong-content-2025-11](https://github.com/Reliza-Demos/conferences-oolong-content-2025-11) repository.

TEIs with full ReARM CLI commands that can be used against it:

#### Kauf Bulb Demo:
```bash
rearm tea full_tea_flow --debug true --tei urn:tei:uuid:oolong-demo.rearmhq.com:9485fbc9-aa7d-4c26-95c9-d5a8ccb1c073
rearm tea full_tea_flow --debug true --tei urn:tei:asin:oolong-demo.rearmhq.com:B09D6HR559
```

As shown on OWASP 2025 Global AppSec USA.

#### Apache Log4j Demo:
```bash
rearm tea full_tea_flow --debug true --tei urn:tei:purl:oolong-demo.rearmhq.com:pkg:maven/org.apache.logging.log4j/log4j-core@2.25.0
rearm tea full_tea_flow --debug true --tei urn:tei:uuid:oolong-demo.rearmhq.com:ff08fa6a-1df9-4ab7-b3ec-e02837845a06
rearm tea full_tea_flow --debug true --tei urn:tei:purl:oolong-demo.rearmhq.com:pkg:github/apache/logging-log4j2
```

As shown on Open Source SecCon 2025 in Atlanta - video available at [https://www.youtube.com/watch?v=na30ADqKH0c](https://www.youtube.com/watch?v=na30ADqKH0c).
Slides available [here](https://www.slideshare.net/slideshow/open-source-security-con2025-in-atlanta-transparency-exchange-api-where-to-find-product-sbom/284093812).

## Content Management

We provided  `oolong/sample_content/` directory for development and testing purposes. 

Oolong uses `oolong/oolong-server/src/content/` directory to serve TEA content (this is under .gitignore). You can copy the content from `oolong/sample_content/` to `oolong/oolong-server/src/content/` directory directly when running via npm.

The provided Dockerfile will package content from `oolong/content/` directory. This way the content will be baked into the container image.

Alternatively, you can mount the content with docker-compose or using git pod in the helm chart installation. If using git pod option, the content will be synchronized with the git repository at the specified interval (currently, only public git repositories are supported).

For content management, use [ReARM CLI](https://github.com/relizaio/rearm-cli). See documentation for oolong content management commands [here](https://github.com/relizaio/rearm-cli/blob/main/docs/oolong.md).

## Build Container Image

```bash
cd oolong
docker build -t oolong-local .
```

## Run Container Image

The following command shows how to run the container image with a custom content directory and environment variables.

```bash
docker run -p 127.0.0.1:3000:3000 \
  -v /path/to/content:/app/src/content:ro \
  -e API_VERSION=v1.0.0 \
  -e CONTENT_DIR=/app/src/content \
  -e SERVER_HOST=https://myserver.com/tea \
  -e PAGE_TOKEN_SECRET="$(openssl rand -base64 48)" \
  oolong-local
```

It is possible to mount the content directory to the container and use it as a volume. This way, you can update the content directory and the container will use the updated content.

## Run with Docker Compose

### Production-style Compose (local image)

Builds the production image (`NODE_ENV=production`), mounts `fixtures/tea-1.0.0`, and requires `PAGE_TOKEN_SECRET`:

```bash
cd oolong
cp .env.example .env   # edit PAGE_TOKEN_SECRET
docker compose up -d --build
```

The server listens on `http://127.0.0.1:3005`.

### Development Mode

Build and run with `NODE_ENV=development` (no `PAGE_TOKEN_SECRET` required):

```bash
docker-compose -f docker-compose.dev.yml up -d --build
```

`docker-compose.tea-interop.yml` is the pinned-spec interop profile: same fixtures, `TEA_SPEC_COMMIT=962a0228af1bfcc1232ac3f79239317ff33fdb04`, and a fixed local `PAGE_TOKEN_SECRET` for CI-style checks.


## Installation via helm chart

The server image requires `PAGE_TOKEN_SECRET` when `NODE_ENV=production`. By default the chart creates a Kubernetes Secret on **first install only** (stable across `helm upgrade`). Alternatively, create a Secret yourself and set `pageTokenSecret.create=false` and `pageTokenSecret.existingSecret`.

With an empty PVC, mount content via git pod or populate the volume; otherwise the pod serves an empty content root instead of the image fixtures.

### Using local chart (development mode)

Default install (chart creates `PAGE_TOKEN_SECRET` once):

```bash
helm upgrade --install --create-namespace -n oolong oolong helm-chart/oolong \
    --version 0.0.7
```

Local image on kind (after `kind load docker-image oolong-server:local`):

```bash
helm upgrade --install --create-namespace -n oolong oolong helm-chart/oolong \
  --set image=oolong-server:local \
  --set persistence.enabled=false \
  --set env.SERVER_HOST='http://127.0.0.1:3000'
```

Bring your own Secret:

```bash
kubectl create namespace oolong
kubectl create secret generic oolong-page-token -n oolong \
  --from-literal=PAGE_TOKEN_SECRET="$(openssl rand -base64 48)"
helm upgrade --install -n oolong oolong helm-chart/oolong \
  --set pageTokenSecret.create=false \
  --set pageTokenSecret.existingSecret=oolong-page-token
```

Sample installation on k3d:

```bash
helm upgrade --install --create-namespace -n oolong --set useTraefikDevelopment=true \
    --set env.SERVER_HOST='http://oolong.localhost:8003' oolong helm-chart/oolong \
    --version 0.0.7
```

### Using official chart from registry

```bash
helm upgrade --install --create-namespace -n oolong oolong registry.relizahub.com/library/oolong \
    --version 0.0.7
```

### Git Pod Configuration

Enable automatic Git synchronization to populate content from a Git repository. Note, currently, only public repositories are supported.

```bash
helm upgrade --install --create-namespace -n oolong \
  --set gitPod.enabled=true \
  --set gitPod.repoUrl='https://github.com/your-org/your-repo.git' \
  --set gitPod.branch='main' \
  --set gitPod.syncInterval='60' \
  oolong helm-chart/oolong \
  --version 0.0.7
```

**Configuration options:**
- `gitPod.enabled` - Enable/disable Git pod (default: `false`)
- `gitPod.repoUrl` - Git repository URL (required when enabled)
- `gitPod.branch` - Git branch to sync (default: `main`)
- `gitPod.syncInterval` - Sync interval in seconds (default: `60`)
- `gitPod.mountPath` - Mount path for content (default: `/content`)

The Git pod will clone the repository and perform `git pull` at the specified interval, keeping the content synchronized with the remote repository.


## Generation from TEA OpenAPI Specification

The running API is the handwritten server in `oolong/oolong-server/src/tea`. `src/generated-nest` remains the Beta 2 snapshot and is not mounted.

OpenAPI Generator CLI 7.16.0 can emit models for the pinned 1.0.0 document, and its download controllers do not preserve binary responses or the `If-None-Match` header. Do not regenerate into `src/generated-nest`. The trial is recorded in `docs/tea-upgrade/generator-strategy.md`.

## Run Locally for Development

```bash
cd oolong/oolong-server
npm ci --ignore-scripts
npm run start:dev
```

The server reads `CONTENT_DIR`, or `../fixtures/tea-1.0.0` when that variable is unset. `API_VERSION` must be `1.0.0` or `v1.0.0`.

## More Documentation
Refer to [IMPLEMENTATION_NOTES.md](oolong/oolong-server/IMPLEMENTATION_NOTES.md) for more details.
