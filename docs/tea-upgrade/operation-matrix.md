# Operation matrix

Pinned document: `spec/openapi.yaml` at `962a0228af1bfcc1232ac3f79239317ff33fdb04`.

28 operations. All are `GET` except `POST /token`. None declare a request body except `requestToken` (`application/x-www-form-urlencoded`, schema `token-request`).

Global security (`spec/openapi.yaml` lines 3319–3323) is bearer **or** no credential. A public server is allowed. `401` and `403` are required only when the server protects the object. This audit assumes the upgraded Oolong interop profile stays public, so missing `401`/`403` is acceptable on that profile and is not counted as incompatible by itself. Missing `400` validation and the TEA error body are incompatible on every profile.

Error body for resource `4xx`, when a body is sent (`error-response`): required `error`, optional `message`, `additionalProperties: false`. Nest `NotFoundException` produces `{ "statusCode", "message", "error" }`. That object is not a TEA error. Discovery clients treat a non-TEA `404` as a failed attempt (`discovery/readme.md` lines 376–381 and 406–408).

## Counts

| Class | Count | Operations |
| --- | --- | --- |
| Compatible | 0 | — |
| Implemented but incompatible | 13 | `discover`, `queryProducts`, `listProductReleases`, `queryProductReleases`, `getProductRelease`, `listProductReleaseCollections`, `getLatestProductReleaseCollection`, `getProductReleaseCollectionByVersion`, `listComponentReleases`, `getComponentRelease`, `listComponentReleaseCollections`, `getLatestComponentReleaseCollection`, `getComponentReleaseCollectionByVersion` |
| Partially implemented | 2 | `getProduct`, `getComponent` |
| Missing | 8 | `queryComponents`, `queryComponentReleases`, six `/artifact/...` operations |
| Optional and unsupported | 5 | four `/cle` operations, `requestToken` |
| Not applicable | 0 | — |
| Requires further investigation | 0 | Route behavior was read from source. Runtime header bytes were not captured. See `http-conformance.md`. |

Mandatory success operations for a public conforming server: 23. CLE may be absent only with TEA `404` / `NOT_IMPLEMENTED`. `POST /token` may be absent on a server that authenticates nothing (`auth/readme.md` lines 35–38).

Legacy route `GET /artifact/:uuid` (`TEAArtifactApi.controller.ts` lines 10–12) is not a pinned operation. It must not be treated as `getLatestArtifact`.

## Shared gaps (every existing JSON route)

- No UUID pattern check. Pinned `uuid` is lowercase RFC 9562 (`spec/openapi.yaml` schema `uuid`). Malformed ids must be `400` / `INVALID_REQUEST`.
- No TEA error body.
- No response-schema check. Extra YAML fields are returned.
- Query numbers are strings at runtime. `pageOffset ?? 0` does not coerce (`TEAProductService.ts` lines 26–27).
- Parent-scoped lists do not `404` when the parent UUID is unknown (`TEAProductReleaseService.getReleasesByProductId` lines 52–70; `TEAComponentService.getReleasesByComponentId` lines 15–17; collection loaders return `[]`).

## Matrix

Status abbreviations: INC incompatible, PART partial, MISS missing, OPT optional unsupported.

| Method | Path | Operation ID | Status | Current code | Required change |
| --- | --- | --- | --- | --- | --- |
| GET | `/discovery` | `discover` | INC | `TEADiscoveryApi.controller.ts` 10–12; `TEADiscoveryService.ts` 15–50 | `tei` xor `purl`; `404` not `[]`; `tei://`; `server-info` version `1.0.0` |
| GET | `/products` | `queryProducts` | INC | `TEAProductApi.controller.ts` 15–17; `TEAProductService.ts` 24–58 | Replace offset page with `pageSize` (default 25, max 100), `pageToken`, `sortField=name`, `sortOrder`, body `hasNext` + `results` |
| GET | `/product/{uuid}` | `getProduct` | PART | controller 10–12; service 16–21 | Keep entity; add UUID `400`; TEA `404` |
| GET | `/product/{uuid}/releases` | `listProductReleases` | INC | `TEAProductReleaseApi` + service 52–70 | Paginated `product-release`; `404` if product unknown; sort `createdDate` default |
| GET | `/product/{uuid}/cle` | `getProductCle` | OPT | no route | Public profile: TEA `404` `NOT_IMPLEMENTED`, or implement `cle` |
| GET | `/productReleases` | `queryProductReleases` | INC | service 83–110 | Same pagination replacement as products; filter `idType`/`idValue` |
| GET | `/productRelease/{uuid}` | `getProductRelease` | INC | service 73–80 returns `ProductRelease` only | Flat object plus required `latestCollection` |
| GET | `/productRelease/{uuid}/cle` | `getProductReleaseCle` | OPT | no route | Same as other CLE |
| GET | `/productRelease/{uuid}/collections` | `listProductReleaseCollections` | INC | service 37–38 returns `Collection[]` | Paginated envelope; sort `version` |
| GET | `/productRelease/{uuid}/collection/latest` | `getLatestProductReleaseCollection` | INC | service 41–49 | Response must use `createdDate` and artifact revisions |
| GET | `/productRelease/{uuid}/collection/{collectionVersion}` | `getProductReleaseCollectionByVersion` | INC | service 16–34 | Integer version; same collection schema; `400` if version is not an integer |
| GET | `/components` | `queryComponents` | MISS | no route | New list, same pagination as products, sort `name` |
| GET | `/component/{uuid}` | `getComponent` | PART | `TEAComponentService.ts` 19–26 | UUID `400`; TEA `404` |
| GET | `/component/{uuid}/releases` | `listComponentReleases` | INC | service 15–17 returns `Release[]` | Paginated `component-release`; `404` if component unknown |
| GET | `/component/{uuid}/cle` | `getComponentCle` | OPT | no route | CLE optional response |
| GET | `/componentReleases` | `queryComponentReleases` | MISS | no route | New filtered, sorted, token-paginated list |
| GET | `/componentRelease/{uuid}` | `getComponentRelease` | INC | `TEAComponentReleaseService.ts` 36–56 returns `{ release, latestCollection }` | Flatten to `component-release` fields + `latestCollection` |
| GET | `/componentRelease/{uuid}/cle` | `getComponentReleaseCle` | OPT | no route | CLE optional response |
| GET | `/componentRelease/{uuid}/collections` | `listComponentReleaseCollections` | INC | service 32–34 | Paginated envelope |
| GET | `/componentRelease/{uuid}/collection/latest` | `getLatestComponentReleaseCollection` | INC | service 58–66 | Collection schema, including empty version-1 rule |
| GET | `/componentRelease/{uuid}/collection/{collectionVersion}` | `getComponentReleaseCollectionByVersion` | INC | service 15–29 | Same as product collection by version |
| GET | `/artifact/{uuid}/latest` | `getLatestArtifact` | MISS | legacy `GET /artifact/:uuid` only | Metadata for highest revision; required `version` |
| GET | `/artifact/{uuid}/latest/download` | `downloadLatestArtifact` | MISS | none | Bytes or `302`; `ETag`, `Content-Location`, `Cache-Control`; `304`; `406` |
| GET | `/artifact/{uuid}/latest/signature/download` | `downloadLatestArtifactSignature` | MISS | none | Signature bytes; `404` `SIGNATURE_NOT_FOUND` when the format exists and has no signature |
| GET | `/artifact/{uuid}/{artifactVersion}` | `getArtifactByVersion` | MISS | none | Immutable revision metadata |
| GET | `/artifact/{uuid}/{artifactVersion}/download` | `downloadArtifactByVersion` | MISS | none | Versioned bytes; strong `ETag`; `immutable` only when the coded bytes are stable |
| GET | `/artifact/{uuid}/{artifactVersion}/signature/download` | `downloadArtifactSignatureByVersion` | MISS | none | Versioned signature |
| POST | `/token` | `requestToken` | OPT | none | Omit on the public profile. If implemented: Basic API key, `client_credentials`, `Cache-Control: no-store` |

## Parameters that replace beta.2 pagination

Pinned list operations drop `pageOffset`. They add:

- `pageSize` integer, minimum 1, maximum 100, default 25
- `pageToken` opaque; conflicting or foreign tokens are `400` / `INVALID_PAGE_TOKEN`
- `sortOrder` `asc` (default) or `desc`
- `sortField` by resource: products and components `name`; releases `createdDate` (default), `releaseDate`, `version`; collections `version`

`idType` and `idValue` stay optional filters. `idType` enum gains `COMPLIANCE_DOCUMENT`.

## Per-operation evidence

### `discover`

Required behavior is in `discovery-analysis.md` findings DISC-02 and DISC-03. Current method signature is `discoveryByTei(tei, request)` and cannot accept `purl` until the interface is regenerated or rewritten.

Test: neither param, both params, unknown TEI, fixture TEI, fixture PURL, double-encoded TEI compared after one decode.

### `queryProducts`, `listProductReleases`, `queryProductReleases`

`TEAProductService.ts` lines 44–58 and `TEAProductReleaseService.ts` lines 58–69 and 98–109 build `{ timestamp, pageStartIndex, pageSize, totalResults, results }`. Pinned `paginated-*-response` is `allOf` `pagination-details` plus `results`. Required pagination field is `hasNext`. `nextPageToken` is present only when `hasNext` is true.

Default page size in code is 100. Pinned default is 25 and maximum is 100.

`listProductReleases` returns an empty page for an unknown product UUID. The operation lists `404`.

Tests: 0 items, 1 item, 26 items with default page size, second page via copied token, token reused on another path → `400`, `sortOrder=desc`, unknown parent → `404` `OBJECT_UNKNOWN`.

### `getProduct`, `getComponent`

Success schema is still `uuid`, `name`, `identifiers` (all required). Sample product `identifiers: []` is a valid empty array. Identifiers that are present must include both `idType` and `idValue` (pinned `identifier.required`).

These are partial because a well-formed YAML body can already match, while `400` and the TEA `404` body do not.

Tests: known UUID `200`; unknown UUID `404` with only `error`; `GET .../product/NOT-A-UUID` → `400` `INVALID_REQUEST`.

### `getProductRelease`

`getTeaProductReleaseByUuid` returns the release YAML after the loader fills `product` and `productName` (`content-loader.ts` lines 112–116). Pinned `getProductRelease` returns `product-release-with-collection`: the release fields and `latestCollection` in one object (`spec/openapi.yaml` operation at line 246; schema `allOf`).

The beta.2 component-release GET was already a wrapper. The product-release GET was not. Both pinned operations are flat.

Test: fixture release JSON contains `uuid`, `version`, `createdDate`, `components`, `product`, and `latestCollection.version`.

### `getComponentRelease`

`TEAComponentReleaseService.ts` lines 52–55:

```ts
return { release, latestCollection };
```

Pinned example is flat (`uuid`, `version`, `component`, `latestCollection`, …). A client that reads `body.uuid` will not see the nested `release.uuid`.

Also, zero collection files throw `NotFoundException` (lines 45–47). The collection chapter says a retrievable release is served with collection version 1, empty `artifacts`, and `updateReason.type: INITIAL_RELEASE` (`tea-collection.md` lines 10–18). Absence of a collection file is not absence of the release.

Test: release YAML and no collection file still returns `200` with `latestCollection.version === 1` and `artifacts: []`.

### Collection reads

Sample collection uses `date`, not `createdDate` (`oolong/sample_content/.../collections/1.yaml` lines 1–6). Pinned `collection.required` includes `createdDate` and not `date`. Artifact entries inside collections are resolved from `artifacts/{uuid}.yaml`, then `version` is deleted (`content-loader.ts` lines 257–268 and 381–383). Pinned artifacts require `version`, `createdDate`, `type`, `formats`, and `formats[].mediaType` (not `mimeType`).

`getCollection` treats the string `latest` as a special case (service lines 17–19) on the version route. The pinned API has a separate `/collection/latest` path. The version parameter is an integer. The string `latest` on the version route is `400`, not an alias.

Tests: version `1` body schema; version `0` and `foo` → `400`; missing version → `404` `OBJECT_UNKNOWN`; list returns `{ hasNext, results }`.

### Artifact operations

`TEAArtifactService.getArtifact` (lines 15–22) reads one YAML and returns it as JSON. There is no byte download, no revision, no `Accept` / `mediaType` selection, no `406`, no `304`, no signature route.

External `url` on a format means clients fetch that URL themselves (`tea-collection.md` lines 120–123). The server download endpoint is for formats without `url`. A server may still `302` when bytes live elsewhere (`tea-collection.md` lines 126–127). Checksums are over the artifact bytes before HTTP content coding, and they are not `ETag` values (`tea-collection.md` lines 151–156; header `artifact-etag`).

Tests are specified in `http-conformance.md` and `interop-fixtures-plan.md`.

### CLE and token

CLE schema is `cle` with required `events`. Implementing CLE is optional (pinned README lines 93–103; `404` description `NOT_IMPLEMENTED`). For interop, register the four routes and return `404` `NOT_IMPLEMENTED` until a fixture includes events. Do not return Nest’s default `404`.

`requestToken` is optional while the server protects nothing. Do not accept API keys on resource routes. Do not log credentials if the endpoint is added later.

## Tests required before calling any operation compatible

No current test hits a TEA route (`app.controller.spec.ts`, `test/app.e2e-spec.ts`). Each row above needs a supertest against a fixture content root. Status code, JSON shape, and the headers named in the OpenAPI response are the assertion, not only “route exists”.

## Implementation status

Recorded 2026-10-10. The counts above describe the beta.2 server and are not rewritten.

| Class at audit | Status |
| --- | --- |
| 13 incompatible list and release operations | Fixed. HTTP tests cover success and unknown-object cases |
| 2 partial object reads (`getProduct`, `getComponent`) | Fixed |
| 8 missing component-query and artifact operations | Fixed |
| 5 optional CLE and `POST /token` operations | Verified as conforming absence: `404` `NOT_IMPLEMENTED` when the object exists, `404` `OBJECT_UNKNOWN` when a CLE object is missing |
| Unmounted paths | Not applicable to the TEA error schema. They still return the Nest 404 body so a client can fail over |
