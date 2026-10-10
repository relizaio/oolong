# Security assessment

Read-only. Findings are from source. Nothing was exploited against a running server. “Confirmed” means the code path is present. “Suspected” means a runtime parser behavior was not executed.

Authentication is optional in TEA. A server with no protected objects is not, by itself, a vulnerability (`auth/readme.md` lines 26–38).

## SEC-01 — content root is not enforced

- Severity: High
- Status: Confirmed missing control. Exploitability through a single Express path segment was not executed (suspected).
- Affected: `oolong/oolong-server/src/utils/content-loader.ts` lines 21–33 and 367–369
- Current: `loadArtifactByUuid` uses `path.join(artifactsDir, `${uuid}.yaml`)` and `loadYamlFile` uses `path.resolve` with no check that the result stays under `contentDir`. `uuid` comes from the route parameter (`TEAArtifactApi.controller.ts` line 11). Express `:uuid` does not match a raw `/`. A parameter that decodes to `..` segments (`%2e%2e%2f...`) is the suspected bypass. This audit did not send that request.
- Expected: resolve `realpath` of the candidate file and require it to remain inside the realpath of the content root. Reject otherwise with `400` or `404`, without reading the file.
- Normative: TEA does not require path traversal protection. This is an implementation safety requirement from the audit brief: a TEI or UUID must not escape the content root.
- Impact: a successful bypass reads files outside the content directory as YAML or, later, as artifact bytes.
- Remediation: one containment helper used by every read. Apply it before adding revision paths and byte paths, which will concatenate more untrusted segments.
- Test: UUID values `..`, `../secret`, and percent-encoded dot-segments return 400/404 and do not change a canary file outside the root. A normal fixture UUID still loads.

## SEC-02 — directory walk follows symlinks

- Severity: Medium
- Status: Confirmed code path. Requires a symlink inside the content tree.
- Affected: `content-loader.ts` `findFiles` lines 38–58. `fs.statSync` follows symlinks. A directory link is recursed into. There is no `realpath` confinement.
- Expected: refuse to follow a symlink that resolves outside the content root, or refuse all symlinks.
- Impact: content that an operator mounted from an untrusted git repo (`helm` git pod) can point reads at other files visible to uid 10001.
- Remediation: same helper as SEC-01.
- Test: a symlink under `products/` pointing outside the root is not read.

## SEC-03 — unbounded YAML and byte reads

- Severity: Medium
- Status: Confirmed
- Affected: `content-loader.ts` lines 27 and 45–49. `readFileSync` and `readdirSync` have no size cap. `js-yaml` 4 `load` (line 28) uses the default schema, which does not execute arbitrary YAML tags the way `unsafeLoad` did. Alias expansion can still amplify memory. That amplification was not measured.
- Expected: reject files over a configured maximum before parse; keep js-yaml’s default schema.
- Impact: a large or alias-heavy file in the content mount can exhaust the process.
- Remediation: max bytes for metadata YAML and for hosted artifacts. Stream downloads with a cap.
- Test: a YAML larger than the cap returns `400` or `500` without loading it fully into the response.

## SEC-04 — identifier logging

- Severity: Medium
- Status: Confirmed
- Affected: `TEADiscoveryService.ts` line 18 `console.log('Discovery query for TEI:', decodedTei)`. `logger.debug` in `TEAProductService.ts` lines 29–50 and `content-loader.ts` lines 73–74 prints loaded products. `DEBUG_MODE` defaults to false (`main.ts` lines 7–11), so Nest debug is off unless enabled. `console.log` is not gated by `DEBUG_MODE`.
- Expected: do not log full TEIs, PURLs, or tokens at info level. Never log `Authorization`.
- Impact: request identifiers land in stdout of the container.
- Remediation: remove the `console.log`. Log a hash or nothing.
- Test: a discovery request does not write the fixture TEI to stdout when `DEBUG_MODE` is false.

## SEC-05 — error messages echo input

- Severity: Low
- Status: Confirmed
- Affected: `NotFoundException` strings in the handlers, for example `TEAProductService.ts` line 19.
- Expected: TEA `message` is diagnostic and optional. Do not reflect raw path input into a body that clients might display unsafely. Prefer `{"error":"OBJECT_UNKNOWN"}`.
- Impact: low. Combined with SCH-09, the current body is also the wrong schema.
- Test: 404 JSON does not contain the request UUID if `message` is omitted.

## SEC-06 — no authentication on a public profile

- Severity: Informational
- Status: Confirmed behavior, permitted
- Affected: no guards in `src/`. Global security allows an empty requirement (`spec/openapi.yaml` lines 3319–3323).
- Expected for this audit’s interop profile: ignore `Authorization: Bearer`, do not return `401`, do not implement `/token`.
- Impact: anyone who can reach the port can read all content. That matches the sample data, which is public BOM material. It is an insecure default only if the content mount is later filled with access-controlled artifacts without adding the token baseline.
- Remediation: document the profile. If any object becomes protected, implement `POST /token` and `401` with `WWW-Authenticate: Bearer` before shipping that object. Do not accept Basic credentials on resource routes.
- Test: `Authorization: Bearer test` on `GET /v1.0.0/products` is still `200` for the public profile.

## SEC-07 — compose publishes on all interfaces

- Severity: Medium
- Status: Confirmed configuration
- Affected: `oolong/docker-compose.yml` lines 4–5 and `docker-compose.dev.yml` lines 5–6, `ports: "3005:3000"`. Docker publishes that on `0.0.0.0`.
- Expected for local interop: `127.0.0.1:3005:3000`.
- Impact: a laptop on a shared network exposes the API.
- Remediation: test compose only. Do not change the production chart binding in this audit.
- Test: from another host, the port is closed; from localhost it answers.

## SEC-08 — container identity

- Severity: Informational, with one gap
- Status: Confirmed
- Affected: `Dockerfile` lines 15–25. User `apprunner` uid 10001, `USER apprunner`. Helm `values.yaml` lines 16–25 drops all capabilities, `runAsNonRoot`, `runAsUser: 10001`. `readOnlyRootFilesystem: false`. No resource limits (`resources: {}`).
- Expected: non-root is already correct. A test profile can set a read-only root and a writable content mount. Limits belong on the test profile so a fixture cannot exhaust the machine.
- Image reference in Helm is `registry.relizahub.com/library/oolong-server:25.10.6@sha256:23718baf...` (`values.yaml` line 7). This audit did not pull it.
- Git pod (`values.yaml` lines 57–84) clones a public git URL into the content volume when enabled. Default `enabled: false`. An enabled repo is the content trust boundary (SEC-02).

## SEC-09 — legacy artifact filename

- Severity: High
- Status: Confirmed construction; same suspected encoding question as SEC-01
- Affected: `content-loader.ts` lines 367–369, controller line 11
- This is the concrete TEI/UUID-to-path case. Discovery does not use the TEI as a path. The artifact UUID does.
- Remediation and test: SEC-01.

## Secrets

No `.env` is committed. `.env.example` has no secrets. Tokens are not implemented, so they are not logged. Do not add a default API key.

## Dependency review

Not run. `npm audit` would be a later, authorized check. The audit did not install or upgrade packages. Known runtime libraries used on the request path: NestJS 11, `js-yaml` 4, Express via `@nestjs/platform-express`. No statement is made here about published CVEs.

## Implementation status

Recorded 2026-10-10.

| Finding | Status |
| --- | --- |
| SEC-01 path join of request data | Fixed. HTTP identifiers are validated as UUIDs or integers before lookup. Storage paths come from the loaded map |
| SEC-02 symlink escape | Fixed. `PathGuard` uses `realpath` and rejects targets outside the root. Covered by a unit test |
| SEC-03 YAML size and aliases | Fixed. JSON schema, `maxAliasCount: 0`, and a 1_000_000 byte YAML limit |
| SEC-04 request logging of identifiers | Fixed. The new discovery path does not log the TEI |
| SEC-05 echoed identifiers | Fixed. Error messages do not repeat the supplied identifier |
| SEC-06 public profile | Verified. `Authorization: Bearer` is ignored and does not return `401` |
| SEC-07 bind address | Partially verified. Dev and interop compose bind `127.0.0.1`. The registry compose file still publishes `3005:3000` |
| SEC-08 container user | Verified. The image still runs as uid 10001 |
| SEC-09 content-root check | Fixed. `bodyFile` and `signatureFile` must be one safe child of the revision directory |
