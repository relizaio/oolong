# Baseline

Read-only audit. No repository files were modified.

## Repository identity

| Item | Value |
| --- | --- |
| Workspace | `/Volumes/jupiter/Develop/contribution/oolong` |
| Fork remote `origin` | `https://github.com/Mehrn0ush/oolong-TEA-server.git` |
| Upstream remote `upstream` | `https://github.com/relizaio/oolong.git` |
| GitHub parent | `relizaio/oolong` (`fork: true`) |
| Branch | `main` |
| HEAD | `2cb77b593a9e51220c166670534ab66c0849b235` |
| HEAD subject | `docs: fix ReARM link` |
| HEAD committer date | `2026-03-03T19:33:16Z` |
| Tracking | `main...origin/main` |
| Working tree | clean (`git status --porcelain` empty) |

GitHub API confirmation, without updating local refs:

- `repos/Mehrn0ush/oolong-TEA-server/commits/main` → `2cb77b593a9e51220c166670534ab66c0849b235`
- `repos/relizaio/oolong/commits/main` → the same SHA and date
- Compare `2cb77b593a9e51220c166670534ab66c0849b235...relizaio:main` → `status: identical`, `ahead_by: 0`, `behind_by: 0`, `total_commits: 0`

Local `origin/main` and `upstream/main` are the same SHA. Merge-base of `HEAD` and `upstream/main` is `2cb77b593a9e51220c166670534ab66c0849b235`.

## Fork point and unique commits

There is no divergent fork point. The fork and upstream histories are the same commit.

- Commits on the fork that are not on upstream: none
- Commits on upstream that are not on the fork: none
- First commit in the shared history: `4bcb023` `chore: init commit`

No merge, rebase, or fetch into this clone was performed. The GitHub comparison above is the freshness check.

## Bundled TEA specification

| Item | Value |
| --- | --- |
| File | `tea-spec/openapi.yaml` |
| OpenAPI | `3.1.1` (line 2) |
| `info.version` | `0.2.0-beta.2` (line 15) |
| Server URL in the document | `http://localhost/tea/v1` (line 17) |
| Operations | 16 |
| Global security | `bearerAuth` or `basicAuth` (lines 1216+) |

Runtime defaults repeat that beta string:

- `oolong/oolong-server/src/main.ts` lines 14–19, default prefix `v0.2.0-beta.2`
- `oolong/oolong-server/.env.example` line 12
- `oolong/Dockerfile` line 30
- `oolong/docker-compose.yml` line 9
- `oolong/docker-compose.dev.yml` line 12
- `helm-chart/oolong/values.yaml` line 88
- `README.md` lines 75 and 107

## Pinned authoritative specification

Retrieved outside the repository from GitHub contents API at ref `962a0228af1bfcc1232ac3f79239317ff33fdb04`.

| Item | Value |
| --- | --- |
| Repository | `https://github.com/CycloneDX/transparency-exchange-api` |
| Commit | `962a0228af1bfcc1232ac3f79239317ff33fdb04` |
| Commit date | `2026-10-08T06:28:26Z` |
| Subject | `Merge pull request #410 from Mehrn0ush/docs/readme-bom-exchange-link` |
| OpenAPI blob | `spec/openapi.yaml` |
| Blob SHA | `c96baa3e102c195895643fab81ae468ee54b8182` |
| Blob size | 142993 bytes |
| OpenAPI | `3.1.1` (line 2) |
| `info.version` | `1.0.0` (line 25) |
| Local copy | `/tmp/tea-962a022/files/spec/openapi.yaml` |
| Operations | 28 |
| Schemas | 41 |

`info.version: 1.0.0` is not evidence that the standard is finished. The repository README at this commit still says “Status of the standard: Beta 2” (`README.md` lines 17–20) and says publisher-API work starts after the 1.0 release. Consumer OpenAPI behavior at this commit is what this audit treats as normative for the server.

The pinned commit is about seven months newer than the server commit.

## Normative and informative sources at the pinned commit

Normative for server behavior:

- `spec/openapi.yaml` — operations, schemas, parameters, responses, headers, security schemes
- `discovery/readme.md` — TEI syntax, `.well-known/tea`, version selection, `/discovery` success and failure
- `discovery/tea-well-known.schema.json` — well-known document schema (`schemaVersion` const `1`; version strings are full SemVer)
- `auth/readme.md` — when authentication is required, token endpoint, public-server rules
- `tea-collection/tea-collection.md` — collection and artifact immutability, revisions, checksums, update-reason precedence
- `tei-types/` — registry of TEI types (the discovery document says the registry is authoritative and its table is informative)

Informative, not conformance requirements for TEA 1.0:

- `doc/tea-requirements.md` lines 1–4 state this explicitly
- `doc/tea-usecases.md`, presentations, `api-flow/*` narrative
- OpenAPI `example` values that contradict a schema `pattern` (see schema-diff finding SCH-14)

Client-only requirements (do not implement on the server, but the server must not break them):

- DNS and TLS certificate checks
- SemVer selection and `/v` + exact advertised version
- Not forwarding bearer tokens to another origin
- Not probing `/token` to discover whether authentication exists

## OpenAPI generator configuration in the fork

`openapitools.json`:

```json
"generator-cli": { "version": "7.16.0" }
```

README generation command (lines 160–163):

```bash
npx @openapitools/openapi-generator-cli version-manager set 7.16.0
npx @openapitools/openapi-generator-cli generate \
  -i tea-spec/openapi.yaml \
  -g typescript-nestjs-server \
  -o oolong/oolong-server/src/generated-nest/
```

Input today is the bundled `0.2.0-beta.2` document, not the pinned commit.

## Layout

```text
tea-spec/openapi.yaml                          bundled beta.2 spec
openapitools.json                              generator CLI 7.16.0
oolong/Dockerfile
oolong/Dockerfile.sbom
oolong/docker-compose.yml
oolong/docker-compose.dev.yml
oolong/content/                                image content root (placeholder README)
oolong/sample_content/                         sample YAML, not served unless copied
oolong/oolong-server/src/main.ts               handwritten bootstrap
oolong/oolong-server/src/app.module.ts         wires generated module + handlers
oolong/oolong-server/src/handlers/             handwritten services
oolong/oolong-server/src/controllers/          handwritten .well-known
oolong/oolong-server/src/utils/content-loader.ts
oolong/oolong-server/src/generated-nest/       generated interfaces, models, controllers
helm-chart/oolong/
```

Tests present: `app.controller.spec.ts` and `test/app.e2e-spec.ts`. Both assert `GET /` returns `Hello World!`. No TEA route tests.

## Implementation status

Recorded 2026-10-10. The historical baseline above is unchanged.

| Finding | Status |
| --- | --- |
| Baseline commit `2cb77b593a9e51220c166670534ab66c0849b235` | Verified before this change |
| Audit reports imported without rewriting the findings | Verified |
| Pinned OpenAPI file is a byte copy of commit `962a0228af1bfcc1232ac3f79239317ff33fdb04` | Verified (`tea-spec/SPEC_PIN.md`) |
