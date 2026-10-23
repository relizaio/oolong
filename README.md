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

Build and run with `NODE_ENV=development` and the explicit pagination-key opt-in (`PAGE_TOKEN_DEV_FALLBACK=true`). That fallback is disabled whenever `NODE_ENV=production`.

```bash
docker-compose -f docker-compose.dev.yml up -d --build
```

`docker-compose.tea-interop.yml` is the pinned-spec interop profile: same fixtures, `TEA_SPEC_COMMIT=962a0228af1bfcc1232ac3f79239317ff33fdb04`, and a fixed local `PAGE_TOKEN_SECRET` for CI-style checks.


## Installation via helm chart

**Required image override.** This chart's liveness probe (`/healthz`) and git snapshot loader are not in the published `25.10.6` image. Helm fails unless you set `image` to a build from this branch. The default `values.yaml` `image` is empty on purpose.

The server requires `PAGE_TOKEN_SECRET` unless `PAGE_TOKEN_DEV_FALLBACK=true` and `NODE_ENV` is not `production`. The chart always supplies the Secret and never sets the development fallback. Alternatively, create a Secret yourself and set `pageTokenSecret.create=false` and `pageTokenSecret.existingSecret`.

The TEA API is unauthenticated by design and is intended for a public catalog. Anyone who can reach the Service can read the mounted content. For private content, require authentication at the ingress and do not expose the ClusterIP Service (or pod port) without that control. Artifact download endpoints issue `302 Location` for publisher `http`/`https` URLs stored in the catalog; the server does not fetch those URLs (not server-side SSRF). Other URI schemes remain valid on the TEA object but are not used as redirect targets.

With an empty PVC, mount content via git pod or populate the volume; otherwise git mode stays unready until the first valid revision is published.

### Using local chart (development mode)

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
  --set image=oolong-server:local \
  --set pageTokenSecret.create=false \
  --set pageTokenSecret.existingSecret=oolong-page-token
```

Sample installation on k3d:

```bash
helm upgrade --install --create-namespace -n oolong oolong helm-chart/oolong \
    --set image=oolong-server:local \
    --set useTraefikDevelopment=true \
    --set env.SERVER_HOST='http://oolong.localhost:8003'
```

### Using official chart from registry

Do not install the published `0.0.7` chart / `25.10.6` image for this branch. Use the local chart and a compatible image override until a new image is published.

### Git Pod Configuration

Enable automatic Git synchronization to populate content from a public HTTPS Git repository. The Git pod uses `Recreate` and a `flock` on the shared volume so an upgrade does not run two publishers against the same checkout. The lock is held by the publishing process and is released when that process exits. It rolls when the rendered Git ConfigMap changes (`checksum/git-script`). The server keeps serving its accepted snapshot while the Git pod restarts.

`gitPod.repoUrl` must be `https://` with no userinfo. The Git pod disables `git://`, `ssh://`, `http://`, and `file://`. Optional `gitPod.allowedHosts` is an exact hostname allowlist. Hostname checks do not follow DNS changes or Git redirects; apply a NetworkPolicy or cluster egress control so the Git pod cannot reach internal or metadata destinations.

`gitPod.revisionRetentionCount` is an integer from 1 to 1000 (`values.schema.json`). Helm passes it as the `REVISION_RETENTION_COUNT` environment variable. The Git script validates the value and never interpolates Helm values into shell text.

Server pods are labeled `app.kubernetes.io/component=server` and Git pods `app.kubernetes.io/component=git`, so `kubectl logs deploy/<release>` no longer selects both. Those Deployment selectors are immutable: if an upgrade from an older chart fails, delete the two Deployments (keep the PVC) and run `helm upgrade` again.

```bash
helm upgrade --install --create-namespace -n oolong oolong helm-chart/oolong \
  --set image=oolong-server:local \
  --set gitPod.enabled=true \
  --set gitPod.repoUrl='https://github.com/your-org/your-repo.git' \
  --set gitPod.branch='main' \
  --set gitPod.syncInterval='60'
```

**Configuration options:**
- `gitPod.enabled` - Enable/disable Git pod (default: `false`)
- `gitPod.repoUrl` - Public `https://` Git URL (required when enabled)
- `gitPod.allowedHosts` - Optional exact hostname allowlist (default: empty)
- `gitPod.branch` - Git branch to sync (default: `main`)
- `gitPod.syncInterval` - Sync interval in seconds (default: `60`)
- `gitPod.revisionRetentionCount` - Revisions to keep (1-1000, default: `5`)
- `gitPod.mountPath` - Mount path for content (default: `/content`)

The Git pod treats `/_work` as a disposable checkout: it fetches `gitPod.branch`, checks out that exact commit, copies it into `/content/revisions/<sha>/`, and atomically updates `/content/.oolong-current-revision`. The server polls automatically when git sync is enabled. Invalid revisions are rejected and the previous snapshot keeps serving.

A TEA 1.0.0 conversion of the conference demo catalog lives in the sibling
`conferences-oolong-content-2025-11` clone
([Reliza-Demos/conferences-oolong-content-2025-11](https://github.com/Reliza-Demos/conferences-oolong-content-2025-11)).
After that conversion is pushed, set `gitPod.repoUrl` to that repository. The
`conference-git-live` end-to-end test publishes a local clone of that tree,
renames Kauf Bulb, and checks that `/v1.0.0/products` returns the new name.


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
