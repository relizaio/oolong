# Docker and deployment readiness

Containers were not built or started. Images were not pulled.

## What exists

| File | Role |
| --- | --- |
| `oolong/Dockerfile` | Multi-stage Node 24.10.0 Alpine, non-root uid 10001, content copied to `/app/src/content`, port 3000 |
| `oolong/Dockerfile.sbom` | SBOM image variant. Not required for interop. |
| `oolong/docker-compose.yml` | Prebuilt `registry.relizahub.com/library/oolong-server`, host port 3005 |
| `oolong/docker-compose.dev.yml` | Build local Dockerfile, same port and env |
| `helm-chart/oolong/` | Chart 0.0.7, image tag `25.10.6` with digest, git-sync sidecar off by default |

Dockerfile environment (lines 27–31):

```text
NODE_ENV=production
PORT=3000
API_VERSION=v0.2.0-beta.2
SERVER_HOST=http://localhost:3000
```

Compose repeats `API_VERSION=v0.2.0-beta.2` and `SERVER_HOST=http://localhost:3005` (`docker-compose.yml` lines 8–10, dev file lines 11–13). Helm `values.yaml` lines 86–89 match the beta version.

Health check (`Dockerfile` lines 37–38) and Helm probes (`deployment.yaml` lines 38–55, `values.yaml` lines 93–95) request `/.well-known/tea` and treat any HTTP 200 as healthy. That stays green even if `/v1.0.0/products` is absent. It does not check the advertised version.

## Volume path defect

Finding DOCK-01. Severity: High. Confirmed by file paths, not by running Compose.

`oolong/docker-compose.yml` line 7 and the dev file line 8:

```yaml
volumes:
  - ./oolong/content:/app/src/content
```

Compose resolves `./` from the compose file’s directory, `oolong/`. The mount source is `oolong/oolong/content`, which is not the content directory. The directory that exists is `oolong/content/` (`oolong/content/README.md`). The Dockerfile build context is `oolong/` and `COPY content ./src/content` (Dockerfile line 23), which is the correct relative path for an image build.

README lines 104–108 say the compose files mount `./oolong/content` and set the beta version. That sentence matches the YAML and does not match the repository layout when the command is `cd oolong && docker-compose up` (README lines 88–99).

Impact: a mounted fixture directory at `oolong/content` is not what the container serves. The image’s copied content (a placeholder) is not overridden.

Remediation for a new test file, not an in-place surprise edit of the published compose: mount `./content` or an explicit fixture path. Test: a marker file in the fixture appears in `GET /v1.0.0/products`.

## Version configuration

Finding DOCK-02. Severity: Critical for interoperability, same defect as DISC-01. Every image and chart default advertises `v0.2.0-beta.2`. A test profile must set `API_VERSION=v1.0.0` and `SERVER_HOST` to the base URL without `/v1.0.0`.

## Local test profile (proposed, not created)

Do not use the Helm chart or `registry.relizahub.com` for the first interop run.

Proposed file, to be added only when implementation is authorized, for example `oolong/docker-compose.tea-interop.yml`:

- Build `oolong/Dockerfile` locally. No `docker pull` of the Reliza registry.
- `ports: ["127.0.0.1:3005:3000"]`
- `API_VERSION=v1.0.0`
- `SERVER_HOST=http://127.0.0.1:3005`
- `DEBUG_MODE=false`
- Mount a fixture directory read-only at `/app/src/content`
- No git pod, no API keys, no external IdP
- Health: `GET http://127.0.0.1:3005/.well-known/tea` returns 200 and body `versions` contains `1.0.0`, then `GET http://127.0.0.1:3005/v1.0.0/products` returns 200
- Document `TEA_SPEC_COMMIT=962a0228af1bfcc1232ac3f79239317ff33fdb04` in the compose comment or an env var the process logs once at startup
- `docker compose -f docker-compose.tea-interop.yml down -v` removes the stack. Fixtures stay on the host, not in an anonymous volume.

Readiness today: the Dockerfile can host that profile after the server speaks 1.0.0. The current compose files cannot, because of DOCK-01, DOCK-02, and the all-interfaces publish (SEC-07).

## Helm

Leave the published chart on beta.2 until the image is upgraded. Do not point a test at `registry.relizahub.com/library/oolong-server:25.10.6`. The digest is pinned; the tag is still the March 2026 server line. Git-sync remains unsuitable for deterministic fixtures because it tracks a branch tip.

## Implementation status

Recorded 2026-10-10.

| Finding | Status |
| --- | --- |
| DOCK-01 compose content mount | Fixed. `docker-compose.yml` mounts `./content`. Dev and interop compose mount `./fixtures/tea-1.0.0` read-only |
| DOCK-02 advertised version | Fixed for the image, dev compose, Helm `env.API_VERSION`, and `docker-compose.tea-interop.yml` |
| Registry compose `API_VERSION` | Not applicable to this image. It remains `v0.2.0-beta.2` because that file still runs the registry image |
| Helm image digest and chart version | Not applicable. They were left unchanged. The chart env now says `v1.0.0` while the pinned digest is still the older image, so the chart is not the interop path |
| Local interop profile | Fixed. `oolong/docker-compose.tea-interop.yml` builds the local Dockerfile, binds `127.0.0.1:3005:3000`, and checks that well-known advertises `1.0.0` and `/v1.0.0/products` returns 200 |
