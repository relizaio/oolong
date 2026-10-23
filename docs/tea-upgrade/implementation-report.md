# TEA 1.0.0 server implementation

Date: 2026-10-10. Fork only. Nothing was pushed.

Baseline before the change: `2cb77b593a9e51220c166670534ab66c0849b235`.

Pinned contract: CycloneDX Transparency Exchange API commit `962a0228af1bfcc1232ac3f79239317ff33fdb04`. `tea-spec/openapi.yaml` is a byte copy of that blob (`c96baa3e102c195895643fab81ae468ee54b8182`). Provenance is in `tea-spec/SPEC_PIN.md`. The previous Beta 2 document is `tea-spec/archive/openapi-0.2.0-beta.2.yaml`.

## What the server does

The mounted API is `oolong/oolong-server/src/tea`. Routes use the pinned prefix `/v1.0.0`. `/.well-known/tea` stays outside that prefix, reports `schemaVersion` 1, and advertises version `1.0.0` with no leading `v`. Startup rejects any `API_VERSION` other than `1.0.0` or `v1.0.0`.

Storage is still YAML on disk. There is no database. The loader uses the JSON schema, refuses YAML aliases, and limits YAML documents to 1_000_000 bytes and artifact bodies to 32_000_000 bytes. Paths are resolved with `realpath` before a body is read. A segment that contains `..`, a slash, a backslash, or a NUL is rejected. UUID path parameters are validated before lookup.

Known operations return `{ "error", "message"? }` using only `OBJECT_UNKNOWN`, `NOT_IMPLEMENTED`, `INVALID_REQUEST`, `INVALID_PAGE_TOKEN`, `NO_ACCEPTABLE_FORMAT`, and `SIGNATURE_NOT_FOUND`. Unmounted paths still return the Nest 404 body.

The four CLE routes return `404 OBJECT_UNKNOWN` when the object is missing and `404 NOT_IMPLEMENTED` when it exists. `POST /token` returns `404 NOT_IMPLEMENTED`. `Authorization: Bearer` is ignored.

Pagination defaults to 25 items, rejects `pageSize` above 100 as `INVALID_REQUEST`, and returns `hasNext` plus an HMAC `nextPageToken` bound to the operation, parent, filters, sort, page size, and index. A mismatched or malformed token is `400 INVALID_PAGE_TOKEN`.

Discovery requires exactly one of `tei` or `purl`. Comparison uses the value Express decoded once. An unknown identifier is `404 OBJECT_UNKNOWN`. When several product releases match, the server orders them by product-release UUID. The pinned document does not define a numeric priority on a release, so that order is the server's stable tie-break. `idType` alone returns objects that have an identifier of that type. `idType` with `idValue` matches both fields on the same identifier. `idValue` alone is `400 INVALID_REQUEST`. That rejection is current Oolong behavior; TEA 1.0 does not settle idValue-only filtering.

A release response is flat and includes `latestCollection`. A release with no collection files returns a synthetic version 1 collection in the response only.

Hosted downloads return the file bytes. A format with `url` and no local body returns `302`. The strong `ETag` is the quoted SHA-256 of the prefix `tea-representation-v1`, a NUL byte, and the representation bytes. It is not a TEA checksum. `304` repeats `ETag`, `Content-Location`, `Cache-Control`, and `Vary` when the `200` would have sent them, and the body is empty. `HEAD` sends those headers and no body. `Vary: Accept` is set only when `mediaType` is omitted and the revision has more than one format. The server does not apply HTTP content coding. `Repr-Digest` is optional in the pinned document and is not sent.

## Generator

OpenAPI Generator CLI 7.16.0 was run outside `src/generated-nest`. The models keep flat `latestCollection`, token pagination, `mediaType`, and checksums without MD5. The download controllers leave `If-None-Match` unbound and type the body as `Blob`. `src/generated-nest` was left as the Beta 2 snapshot and is not mounted. Details are appended to `generator-strategy.md`.

## Fixtures and tests

`oolong/fixtures/tea-1.0.0` is the default content root. Identifiers and checksums are in `fixture-reference.md`. Sample content was migrated to `tei://`, `createdDate`, `mediaType`, and `{uuid, version}` artifact references.

`npm test` and `npm run test:e2e` pass. The e2e suite covers the mandatory operations, unknown objects, pagination, discovery, downloads, validators, signatures, CLE, token absence, bearer credentials, and a traversal-shaped identifier.

## Dependencies

`package-lock.json` resolved URLs were rewritten from `https://npm.test.relizahub.com/` to `https://registry.npmjs.org/`. The private host is not reachable from this environment. Integrity hashes were kept. `npm audit fix` was then applied without `--force`. Direct dependency ranges in `package.json` did not change. `npm audit --omit=dev` reports 0 vulnerabilities. A full `npm audit` still reports dev-toolchain issues, including one high advisory in `brace-expansion`, whose non-breaking fix is not available. `npm audit fix --force` was not run.

## Containers

`oolong/docker-compose.tea-interop.yml` builds the local Dockerfile, publishes `127.0.0.1:3005:3000`, mounts the fixtures read-only, and sets `SERVER_HOST=http://127.0.0.1:3005` and `TEA_SPEC_COMMIT=962a0228af1bfcc1232ac3f79239317ff33fdb04`. The image runs as uid 10001. On 2026-10-10 the stack became healthy: `/.well-known/tea` advertised `1.0.0` at `http://127.0.0.1:3005`, and `GET /v1.0.0/products` returned 200. The stack was then stopped.

`docker-compose.yml` builds the local production image, mounts `fixtures/tea-1.0.0`, sets `API_VERSION=v1.0.0`, and requires `PAGE_TOKEN_SECRET`. Helm wires `PAGE_TOKEN_SECRET` from a Kubernetes Secret (chart-created on first install or `pageTokenSecret.existingSecret`). The default chart image digest is still the published registry build until you override `image` for this fork.

## Audit notes

Historical findings in `docs/tea-upgrade` were not rewritten. Each note has an implementation-status section.

READY FOR RUST ↔ OOLONG INTEROPERABILITY TESTING
