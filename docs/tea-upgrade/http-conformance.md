# HTTP conformance

Source inspection only. The server was not started, so header bytes on the wire were not captured. Nest’s default JSON responses are inferred from `NestFactory.create` without a custom serializer (`main.ts` lines 10–12) and from `NotFoundException` usage. Those inferences are marked.

Pinned HTTP requirements that are actually specified live on artifact and signature downloads, on `/token`, and on error responses. Generic “Express supports HEAD” is not treated as conformance.

## Representation versus artifact metadata

| Concept | Pinned meaning | Oolong today |
| --- | --- | --- |
| Artifact metadata | JSON `artifact` schema, including `version` and `formats` | `GET /artifact/:uuid` returns YAML-as-JSON. Not the pinned path. |
| Artifact content | Bytes of one format, `Content-Type` = that format’s `mediaType` | Not implemented. Sample formats point at GitHub `url`s. |
| Checksum | Digest of artifact bytes before HTTP content coding (`tea-collection.md` lines 151–156) | Stored on the format. Not checked when serving. Not an `ETag`. |
| `ETag` | Strong validator of the selected HTTP representation, including content coding (header `artifact-etag`) | No `ETag` is set in application code. |
| `Repr-Digest` | Digest of the coded HTTP representation (RFC 9530), optional | Not set. |
| Content coding | `Content-Encoding` when a coding is applied; omit when none | Not set. |

## Method and status behavior

### GET JSON resources

Existing controllers are `@Get` only. Success is the returned object. Nest will normally send `Content-Type: application/json`. That matches metadata operations. It does not match artifact bytes.

There is no `Accept` handling. A metadata operation’s success content is `application/json` only. A client sending `Accept: application/xml` still gets JSON. The OpenAPI document does not list `406` on metadata GETs. `406` is specified for download operations (`NO_ACCEPTABLE_FORMAT`). Leaving metadata as JSON regardless of `Accept` matches the documented success content. Unverified on the wire.

### HEAD

The OpenAPI document does not declare `HEAD` on any path. RFC 9110 recommends `HEAD` for resources that allow `GET`. The informative requirements note mentions `ETag` or `HEAD` as a possible update check (`doc/tea-requirements.md` lines 66–69) and that document says it is not a conformance requirement (lines 1–4).

Finding HTTP-01. Severity: Informational. HEAD was not executed. Do not claim the Nest GET handlers satisfy download conditional requests. Downloads must implement `GET` + `If-None-Match` as specified. Adding `HEAD` that returns the same validators and no body is consistent with RFC 9110 and should be tested, but it is not an extra OpenAPI operation.

### Conditional GET, `ETag`, `304`

Normative only where the operation lists `If-None-Match` and `304-not-modified`: the four download operations.

Rules from the parameter and the `304` response:

- Compare `If-None-Match` with the weak comparison function (RFC 9110 section 13.1.2) against the `ETag` of the representation selected after negotiation.
- The `ETag` itself must be strong.
- `304` has an empty body and repeats `ETag` and `Content-Location`. It repeats `Cache-Control` and `Vary` when the `200` would have sent them.
- `latest` responses use a revalidating `Cache-Control` (`no-cache`, `private, no-cache`, or `no-store`), never `immutable`.
- A specific revision may use `immutable` only when those coded bytes will not change during freshness.

Finding HTTP-02. Severity: Critical. No download route, no validator, no `304`. Current code cannot be conditional. Impact: clients cannot revalidate artifact bytes. Remediation: implement the four download operations. Test: first `200` `ETag` replayed as `If-None-Match` returns `304` with an empty body and the same `ETag` and `Content-Location`.

### `Cache-Control`

- Token success shall send `no-store` (response `token-issued`). Not applicable until `/token` exists.
- Revision downloads: public only if the bytes require no authorization; otherwise `private` or `no-store`.
- Latest downloads: revalidate; not immutable.
- Discovery prose says implementations should respect caching headers (`discovery/readme.md` lines 239–247). It does not mandate a particular `Cache-Control` on `.well-known/tea`. Sending none is not a confirmed defect. A local test server should send `Cache-Control: no-store` on well-known and discovery so tests do not cache a stale version. That is a test-profile recommendation.

### `Content-Type`, `Accept`, `406`

Download `Content-Type` is the selected format’s `mediaType`, not `application/json` and not the artifact’s own file extension.

`mediaType` query matching is case-insensitive for type and subtype. Parameter values other than that are exact. When `mediaType` is omitted, use `Accept` (RFC 9110 section 12) and otherwise a server-chosen format. If `Accept` can still change the format, include `Accept` in `Vary`. `mediaType` does not remove `Accept-Encoding` variation.

Finding HTTP-03. Severity: High once downloads exist; currently the routes are missing (HTTP-02). Test: `mediaType=application/vnd.cyclonedx+json` returns that `Content-Type`; an unknown type returns `406` and `{"error":"NO_ACCEPTABLE_FORMAT"}`.

### `Content-Location` and `Vary`

`Content-Location` on a download is required and is the absolute versioned URL including `mediaType`, not the `latest` URL (header `artifact-content-location`). Example shape:

```text
https://host/v1.0.0/artifact/{uuid}/{version}/download?mediaType=application%2Fvnd.cyclonedx%2Bjson
```

Finding HTTP-04. Severity: High. Not implemented. A `latest` response that omits `Content-Location` does not tell the client which revision it received.

### `Content-Encoding`

Omit when no coding is applied. Do not declare a `.gz` artifact’s own compression as `Content-Encoding` (`tea-collection.md` lines 154–156). Checksums would then be verified after the client removes that coding and would not match.

### Redirects

`302` + `Location` is a specified alternative when bytes are elsewhere. Clients must not send the TEA bearer token to another origin (`discovery/readme.md` lines 457–462). Oolong has no redirect logic. Sample artifacts already use external `url` on the metadata, which means the client fetches `url` and does not need the download endpoint for that format. Hosted fixtures still need the download endpoint.

### `400`, `401`, `403`, `404`

| Code | Required when | Oolong |
| --- | --- | --- |
| 400 | Malformed UUID, bad integer version, bad `pageToken`, discovery with neither or both of `tei` and `purl` | Not produced. Bad pages become `NaN` slices or empty results. |
| 401 | Protected object, no valid bearer token. Must be `WWW-Authenticate: Bearer`. Must not be used to hide an object. | Not produced. Correct for a public server. Incorrect if protection is added without this challenge. |
| 403 | Authenticated but not authorized. Optional concealment is `404` `OBJECT_UNKNOWN` only after authentication. | Not produced. Correct for a public server. |
| 404 | Unknown object, or optional capability `NOT_IMPLEMENTED`, or signature `SIGNATURE_NOT_FOUND` | `NotFoundException` or empty `200`, depending on the handler. Body is not a TEA error. |

Finding HTTP-05. Severity: Critical. Discovery and missing-object `404` bodies are not TEA errors, and several “missing” cases are `200` with `[]`. Normative: `error-response`; `discovery/readme.md` lines 376–381. Remediation: one exception filter. Test: response JSON has `error` and does not have `statusCode`.

Finding HTTP-06. Severity: High. Unknown parent UUID on list-by-id returns an empty page (`TEAProductReleaseService.ts` 52–70, `TEAComponentService.ts` 15–17). Expected: `404` `OBJECT_UNKNOWN`.

### Pagination

See SCH-08. HTTP-level addition: `pageSize` above 100 or below 1 is an invalid request (`400`). The current code does not cap `pageSize`.

Finding HTTP-07. Severity: Medium. `pageSize=100000` is accepted (`TEAProductService.ts` lines 26–27, no maximum). Expected: maximum 100, default 25. Test: omitted `pageSize` yields at most 25 items; `pageSize=101` yields `400`.

## Well-known HTTP

`GET /.well-known/tea` is outside the version prefix. That matches “this URI is not the API” (`discovery/readme.md` lines 520–525). Status 200 and JSON are right. Version string is wrong (DISC-01). Caching headers were not observed.

## Public-server `Authorization`

A presented bearer token shall be ignored, not rejected (`auth/readme.md` lines 256–268). Oolong never reads the header, so it ignores it. That is compatible with the public profile. Unverified only in the sense that a future guard must not start returning `401` for the public profile.

## Implementation status

Recorded 2026-10-10.

| Finding | Status |
| --- | --- |
| HTTP-01 HEAD | Fixed. JSON and download HEAD responses keep `Content-Length` and send no body |
| HTTP-02 download, `ETag`, `304` | Fixed. The strong `ETag` is a representation hash, not a TEA checksum. `304` repeats `ETag`, `Content-Location`, and `Cache-Control` with an empty body |
| HTTP-03 `406` | Fixed. `NO_ACCEPTABLE_FORMAT` |
| HTTP-04 `Content-Location` | Fixed. `/latest` points at the numbered revision URL |
| HTTP-05 TEA error body | Fixed for known operations |
| HTTP-06 missing parent | Fixed. `404` `OBJECT_UNKNOWN` |
| HTTP-07 page size | Fixed. Default 25, maximum 100, `101` is `400` `INVALID_REQUEST` |
| External `url` | Verified. Revision 1 returns `302` |
| Missing signature | Verified. `404` `SIGNATURE_NOT_FOUND` when the revision exists and no signature is published |
