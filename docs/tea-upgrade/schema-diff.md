# Schema diff

Bundled document: `tea-spec/openapi.yaml` (`info.version` `0.2.0-beta.2`, 27 schemas, 16 operations).

Pinned document: commit `962a0228af1bfcc1232ac3f79239317ff33fdb04`, `spec/openapi.yaml` (`info.version` `1.0.0`, 41 schemas, 28 operations).

Compared with a structural load of both YAML files. Descriptions-only edits are omitted. OpenAPI 3.1 `required` is not the same thing as “optional property” and is not the same thing as `null`. The pinned file does not use `type: [T, "null"]`. Optional properties are simply absent from `required`. Where `required` changed, that is called out separately from nullability.

Generated TypeScript interfaces are not runtime validation.

## Schema set

Removed component names: `productRelease`, `release`, `tea-server-info`.

Replacements: `product-release`, `component-release`, `server-info`.

Added: `cle`, `cle-definitions`, `cle-event`, `cle-event-type`, `cle-support-definition`, `cle-version-specifier`, `compliance-document-type`, `paginated-collection-response`, `paginated-component-response`, `paginated-component-release-response`, `product-release-with-collection`, `token-error-response`, `token-request`, `token-response`.

`component-release-with-collection` and the two old paginated responses remain as names but their JSON shape changed (`allOf`, properties removed from the wrapper).

## Field-level changes

### `artifact`

- Required: none → `uuid`, `type`, `formats`, `createdDate`, `version`.
- Added: `version` (integer revision, starts at 1), `createdDate` (`date-time`), `distributionIds`.
- Removed: `distributionTypes`.
- Oolong deletes `version` on load (`content-loader.ts` lines 381–383). Sample artifact `173cedd7-fabb-4d3a-9315-7d7465d236b6.yaml` has `version: 1` and no `createdDate`, and uses `mimeType`.

Finding SCH-01. Severity: Critical. One YAML file per UUID cannot store two immutable revisions, and the loader strips the revision number. Expected: `artifacts/{uuid}` identifies a series; each revision has its own metadata and bytes. Normative: `tea-collection.md` lines 74–108; schema `artifact`. Impact: `latest` versus historical download cannot be implemented. Remediation: store revisions; stop deleting `version`. Test: two revisions of one UUID; `GET .../latest` returns the higher `version`; the lower version body is unchanged.

### `artifact-format`

- Required: `mediaType`.
- Renamed: `mimeType` → `mediaType`.
- `url` and `signatureUrl` format: `url` → `uri`.
- If `url` is present, `checksums` is required and must be non-empty (`tea-collection.md` lines 133–145). Checksums are absent from `required` in the schema when `url` is absent; the prose makes them required when `url` is set. Implement the prose.
- Sample format uses `mimeType: vnd.cyclonedx+json` (not a media type with a type/subtype) and an empty `signatureUrl`.

Finding SCH-02. Severity: High. Clients select formats by `mediaType`. A `mimeType` field will not match. Remediation: rename on read or migrate files; omit empty `signatureUrl` rather than sending `""`. Test: collection artifact `formats[0].mediaType` equals `application/vnd.cyclonedx+json`.

### `checksum` and `checksum-type`

- `checksum` required: `algType`, `algValue`.
- Enum removed `MD5`. Remaining: `SHA-1`, `SHA-256`, `SHA-384`, `SHA-512`, `SHA3-256`, `SHA3-384`, `SHA3-512`, `BLAKE2b-256`, `BLAKE2b-384`, `BLAKE2b-512`, `BLAKE3`.
- Sample uses `SHA-256`. That value survives. Generated `ChecksumType` still lists `MD5` (`checksum-type.ts` lines 5–18).

Finding SCH-03. Severity: Low for current samples, Medium if any content uses `MD5`. Do not advertise `MD5`. Checksums are not `ETag`s.

### `collection`

- Required: `uuid`, `version`, `createdDate`, `belongsTo`, `updateReason`, `artifacts`.
- Renamed: `date` → `createdDate` (`date-time`, pattern `YYYY-MM-DDTHH:MM:SSZ` with optional fraction, UTC only).
- `artifacts` may be empty.
- Collection UUID equals the parent release UUID (`tea-collection.md` lines 49–53). The loader sets `collection.uuid = releaseUuid` (lines 247–248 and 326–327), which matches.
- Sample `collections/1.yaml` has `date` and `version: 1`. `updateReason.type: INITIAL_RELEASE` still matches the pinned enum.

Finding SCH-04. Severity: High. Served collections will not contain `createdDate` until files or the loader map `date`. Normative: schema `collection`; `tea-collection.md` lines 45–72. Remediation: accept `date` only as a legacy input and emit `createdDate`. Test: response property `createdDate` matches the pattern and `date` is absent.

### `collection-update-reason`

Required `type`. `comment` stays optional. Enum values observed in the collection chapter are unchanged: `INITIAL_RELEASE`, `VEX_UPDATED`, `ARTIFACT_UPDATED`, `ARTIFACT_REMOVED`, `ARTIFACT_ADDED`. Precedence when several kinds change is normative prose (`tea-collection.md` lines 193–197), not something the beta.2 server implemented. Oolong stores the YAML reason as written. That is acceptable if publishers set `type` correctly.

### `release-distribution`

- Required rename: `id` → `distributionId`.
- Removed: `distributionType`.
- `url` / `signatureUrl` format `uri`.
- Artifact `distributionIds` refers to these ids. Sample component release has `distributions: []`.

Finding SCH-05. Severity: Medium. Any content that used `distributionType` or `id` will not match. Remediation: migrate the property name before serving.

### `identifier` and `identifier-type`

- `identifier` required: `idType`, `idValue`. Both were optional in the generated interface (`identifier.ts` lines 8–16).
- Enum added `COMPLIANCE_DOCUMENT`. `idValue` is then one of `compliance-document-type` (SOC 2, ISO, FedRAMP, and the rest listed in that schema).
- TEI `idValue` syntax changed from `urn:tei:` to `tei://`. See discovery-analysis.

Finding SCH-06. Severity: Critical for stored TEIs. Severity Medium for the new enum. Sample release lines 6–10 will not resolve under the pinned comparison rules.

### `product` and `component`

Required fields unchanged: `uuid`, `name`, `identifiers`. No field renames. These are the two partial operations. Names should be unique within their own namespace; that is a recommendation, not a hard requirement (schema descriptions).

### `product-release` (was `productRelease`)

Required: `uuid`, `version`, `createdDate`, `components`, `product`. `product` was optional in `product-release.ts` (lines 15–16) and is filled by the loader, so served objects can already contain it. `createdDate` stays required. Pattern is the UTC `Z` form. Sample `2025-10-16T19:26:57Z` matches.

`components[]` items are `component-ref`: required `uuid`, optional `release` UUID. Unchanged structurally.

### `component-release` (was `release`)

Required: `uuid`, `version`, `createdDate`, `component`. Same loader backfill for `component`. Distributions use SCH-05.

### Release-with-collection wrappers

Beta.2 `ComponentReleaseWithCollection` is `{ release, latestCollection }` with both required (`component-release-with-collection.ts` lines 8–17).

Pinned `component-release-with-collection` and new `product-release-with-collection` are `allOf` the release schema plus required `latestCollection`. JSON is flat.

Finding SCH-07. Severity: Critical. Confirmed by `TEAComponentReleaseService.ts` lines 52–55 and by `getTeaProductReleaseByUuid` returning no collection. Normative: schemas and `GET` response `$ref`s. Impact: clients cannot read `uuid` or `latestCollection` at the top level consistently. Remediation: return one object. Test: `body.release` is absent; `body.latestCollection.uuid` equals `body.uuid`.

### Pagination

`pagination-details.ts` lines 3–7 require `timestamp`, `pageStartIndex`, `pageSize`, `totalResults`.

Pinned `pagination-details` requires `hasNext` only. `nextPageToken` is required by description when `hasNext` is true and forbidden when it is false. Paginated responses are `allOf` that object plus required `results`.

Finding SCH-08. Severity: Critical. Every list response Oolong emits is the beta.2 envelope (`TEAProductService.ts` lines 52–58). Normative: schema `pagination-details` and parameter `page-token`. Impact: clients will not follow `nextPageToken`. Remediation: opaque token bound to path, parent UUID, filters, and sort. Test: `hasNext: false` omits `nextPageToken`; page 2 does not repeat page 1.

### `discovery-info` and `server-info`

`discovery-info.productReleaseUuid` and `servers` remain. Item schema renamed `tea-server-info` → `server-info`. `server-info.additionalProperties: false`. `versions` items are SemVer. `rootUrl` is `format: uri`. `priority` is optional float.

Oolong’s well-known document is a different schema (`schemaVersion`, `endpoints`) and is not `discovery-info`. Do not merge them.

### `error-response` and `unknown-error-type`

Added optional `message`. `additionalProperties: false`.

Enum was `OBJECT_UNKNOWN`, `OBJECT_NOT_SHAREABLE`.

Pinned enum: `OBJECT_UNKNOWN`, `NOT_IMPLEMENTED`, `NO_ACCEPTABLE_FORMAT`, `SIGNATURE_NOT_FOUND`, `INVALID_REQUEST`, `INVALID_PAGE_TOKEN`.

`OBJECT_NOT_SHAREABLE` is gone. Concealment is `404` + `OBJECT_UNKNOWN` after authentication, not a distinct code.

Finding SCH-09. Severity: High. Nest error JSON fails `additionalProperties: false` and has no `error` enum. Normative: schema `error-response`; response `404-object-by-id-not-found`. Remediation: exception filter. Test: 404 body keys are only `error` and optionally `message`.

### `uuid` and `date-time`

- `uuid` pattern `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`. Uppercase is invalid.
- `date-time` pattern `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$`. Offsets are not accepted.

Finding SCH-10. Severity: Medium. No runtime check. A release timestamp with an offset would be served as stored.

### CLE and token schemas

New and unused. `cle.required` is `events`. `cle-event.required` is `id`, `type`, `effective`, `published`. Event types: `released`, `endOfDevelopment`, `endOfSupport`, `endOfLife`, `endOfDistribution`, `endOfMarketing`, `supersededBy`, `componentRenamed`, `withdrawn`.

`token-request.required` is `grant_type`. `token-response.required` is `access_token`, `token_type`, and `token_type` has `const: Bearer`. `token-error-response` uses RFC 6749 error strings, not TEA `unknown-error-type`.

These are optional for the public profile. Do not invent stored CLE events.

### Serialization

YAML load is `js-yaml` `load` then a cast. Unknown keys pass through to JSON. Pinned `error-response` and `server-info` forbid additional properties. Other resource schemas do not set `additionalProperties: false`, so extra resource fields are not automatically a schema violation. They are still a compatibility hazard. Emit the documented properties.

Integers such as `collection.version` must be JSON numbers. The version route currently accepts a string and `parseInt`s it (`TEAProductReleaseService.ts` lines 26–27).

## Spec ambiguity to preserve, not “fix” in the server

Finding SCH-14. Severity: Informational. Several OpenAPI examples use `createdDate: "2024-12-15 00:00:00 UTC"`, which does not match the `date-time` pattern. The pattern and the schema description (UTC `Z`) are the constraint. Do not copy the example timestamp. Classification if a test fails on this: specification ambiguity in the example, not a server defect, as long as the server emits the pattern.

## Implementation status

Recorded 2026-10-10. The schema gaps above are the beta.2 gaps.

| Finding | Status |
| --- | --- |
| SCH-01 artifact revisions | Fixed. Revisions live at `artifacts/{uuid}/v{n}.yaml`. `version` is kept |
| SCH-02 `mediaType` | Fixed |
| SCH-04 `createdDate` | Fixed in fixtures, sample content, and responses |
| SCH-05 distributions | Partially verified. Component release `44444444-4444-4444-8444-444444444444` publishes one distribution |
| SCH-06 `urn:tei:` | Fixed in sample content (`tei://`) |
| SCH-07 nested release | Fixed. Release responses are flat and include `latestCollection` |
| SCH-08 offset pagination | Fixed. Responses use `hasNext` and an opaque `nextPageToken` |
| SCH-09 error codes | Fixed. Runtime codes are only the six pinned codes |
| SCH-10 timestamps | Fixed. Stored timestamps match the UTC `Z` pattern |
| SCH-14 example timestamps | Not applicable. The server does not copy OpenAPI examples into responses |
| MD5 | Not applicable. The loader rejects unknown checksum algorithms, including MD5 |
