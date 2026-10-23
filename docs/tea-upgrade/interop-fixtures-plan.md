# Interoperability fixtures and test plan

Design only. Fixtures were not written into the repository. They are not copied from the Rust SDK. Identifiers below are for a future fixture tree.

Pinned behavior: commit `962a0228af1bfcc1232ac3f79239317ff33fdb04`.

Hosted artifact bytes, UTF-8, 137 bytes:

```json
{"bomFormat":"CycloneDX","specVersion":"1.6","version":1,"metadata":{"component":{"type":"application","name":"oolong-fixture-widget"}}}
```

SHA-256: `8c5170df0ae7a47f77b2f0b1f03c04500343aa2a26863098d2f133b9350d0f98`

SHA-1: `a9ac7d6e8b5aae33125cd3c3d58c9bb5e3924e35`

Detached signature file contents `fixture-detached-signature-v1\n` (30 bytes). SHA-256: `2cc8c8b70e58183dd967d39559803362a73d27be2ec4aee761dd1ded8c2049d7`. This is not a real cryptographic signature. It exists so the signature route returns stable bytes. Clients that require a validated signature should treat cryptographic verification as out of scope for this fixture.

API base in examples: `http://127.0.0.1:3005`. Version path: `/v1.0.0`. Well-known `url` is `http://127.0.0.1:3005` with `versions: ["1.0.0"]` and `schemaVersion: 1`.

## Entities

| ID | Type | Relationships |
| --- | --- | --- |
| `11111111-1111-4111-8111-111111111111` | product `Fixture Product` | identifiers: CPE `cpe:2.3:a:oolong:fixture-widget`, PURL `pkg:generic/oolong-fixture/widget` |
| `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1` | product `Fixture Other` | used only to force a second page |
| `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2` | product `Fixture Third` | third page row |
| `22222222-2222-4222-8222-222222222222` | product release `1.0.0` | product above; TEI `tei://localhost/uuid/22222222-2222-4222-8222-222222222222`; PURL `pkg:generic/oolong-fixture/widget@1.0.0`; component ref to `33333333-3333-4333-8333-333333333333` release `44444444-4444-4444-8444-444444444444` |
| `33333333-3333-4333-8333-333333333333` | component `Fixture Component` | PURL `pkg:generic/oolong-fixture/part` |
| `44444444-4444-4444-8444-444444444444` | component release `1.0.0` | parent component; distributionId `dist-hosted` |
| `55555555-5555-4555-8555-555555555555` | artifact series | revisions 1 and 2; type `BOM`; distributionIds `["dist-hosted"]` |
| collection version 1 | collection UUID = product release UUID | `INITIAL_RELEASE`, artifacts: revision 1 |
| collection version 2 | same collection UUID | `ARTIFACT_UPDATED`, artifacts: revision 2 |
| component collection version 1 | UUID = component release UUID | `INITIAL_RELEASE`, empty `artifacts` |

Revision 2 format has no `url` (server-hosted bytes and checksum above) and a second format is not required. Revision 1 format has an external `url` of `https://example.invalid/fixture-widget-r1.json` and the same checksums, so metadata can describe an external object without the test fetching it. `createdDate` for all objects: `2026-01-15T00:00:00Z`.

CLE: no events stored. The four CLE routes return `404` `NOT_IMPLEMENTED`.

No API keys.

## Expected calls

| Case | Request | Status | Schema / headers | Notes |
| --- | --- | --- | --- | --- |
| Well-known | `GET /.well-known/tea` | 200 | well-known schema | `versions == ["1.0.0"]` |
| TEI discovery | `GET /v1.0.0/discovery?tei=` + encoded TEI | 200 | non-empty `discovery-info[]` | `productReleaseUuid` is the release UUID; `servers[0].rootUrl` has no `/v1.0.0` |
| PURL discovery | `GET /v1.0.0/discovery?purl=` + encoded `pkg:generic/oolong-fixture/widget@1.0.0` | 200 | same release UUID | |
| Discovery neither | `GET /v1.0.0/discovery` | 400 | `INVALID_REQUEST` | |
| Discovery both | `tei` and `purl` | 400 | `INVALID_REQUEST` | |
| Unknown TEI | `tei://localhost/uuid/00000000-0000-4000-8000-000000000099` | 404 | `OBJECT_UNKNOWN` | not `200 []` |
| Product | `GET /v1.0.0/product/11111111-1111-4111-8111-111111111111` | 200 | `product` | |
| Bad UUID | `GET /v1.0.0/product/NOT-A-UUID` | 400 | `INVALID_REQUEST` | |
| Missing product | `.../product/99999999-9999-4999-8999-999999999999` | 404 | `OBJECT_UNKNOWN` | |
| Product releases | `GET /v1.0.0/product/11111111-1111-4111-8111-111111111111/releases` | 200 | paginated `product-release` | `hasNext` false |
| Missing parent releases | unknown product `/releases` | 404 | `OBJECT_UNKNOWN` | not an empty page |
| Product list page | `GET /v1.0.0/products?pageSize=2&sortField=name&sortOrder=asc` | 200 | `hasNext` true, `nextPageToken` present, 2 results | second request with that token returns the remaining product and `hasNext` false without `nextPageToken` |
| Bad token | same token on `/components` | 400 | `INVALID_PAGE_TOKEN` | |
| Release by id | `GET /v1.0.0/productRelease/22222222-2222-4222-8222-222222222222` | 200 | flat release + `latestCollection` | `latestCollection.version == 2` |
| Collection list | `.../collections?sortField=version` | 200 | two collections, versions 1 then 2 | |
| Collection latest | `.../collection/latest` | 200 | version 2, artifact revision 2 | |
| Collection v1 | `.../collection/1` | 200 | version 1, artifact revision 1 | body still contains revision 1 after revision 2 exists |
| Component release | `GET /v1.0.0/componentRelease/44444444-4444-4444-8444-444444444444` | 200 | flat + `latestCollection.artifacts == []` | |
| Artifact latest metadata | `GET /v1.0.0/artifact/55555555-5555-4555-8555-555555555555/latest` | 200 | `version == 2`, `mediaType` present | |
| Artifact v1 metadata | `.../1` | 200 | `version == 1` | |
| Download v2 | `GET .../2/download` | 200 | bytes above; `Content-Type: application/vnd.cyclonedx+json`; `ETag`; `Content-Location` contains `/2/download?mediaType=` | SHA-256 of decoded body equals the checksum |
| Conditional | same URL, `If-None-Match` from the 200 | 304 | empty body; same `ETag` and `Content-Location` | |
| Bad media type | `?mediaType=text/plain` | 406 | `NO_ACCEPTABLE_FORMAT` | |
| Signature v2 | `.../2/signature/download` | 200 | 30 signature bytes | |
| Signature absent | if a format without a signature is requested | 404 | `SIGNATURE_NOT_FOUND` | only when the revision exists |
| Latest download | `.../latest/download` | 200 | `Cache-Control` has no `immutable`; `Content-Location` names revision 2 | |
| CLE | `GET /v1.0.0/product/11111111-1111-4111-8111-111111111111/cle` | 404 | `NOT_IMPLEMENTED` | optional capability |
| Bearer ignored | product GET with `Authorization: Bearer example` | 200 | same body | public profile |
| Token route | `POST /v1.0.0/token` | 404 | `NOT_IMPLEMENTED` | public profile; not a Nest HTML 404 |
| Legacy path | `GET /v1.0.0/artifact/{uuid}` with no revision | 404 | TEA error | old route must not remain as a 200 |

## Test plan for the Rust client and this server

Do not run it yet. Do not modify the SDK. Both sides are judged against the pinned documents, not against each other.

| # | Area | Preconditions | Request | Server | Client | Normative reference | If it fails |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Discovery document | server up, fixture mounted | `GET /.well-known/tea` | 200, schema, version `1.0.0` | selects `/v1.0.0` | `discovery/readme.md` 209–304; well-known schema | Server if version or schema wrong; client if it requires a leading `v` inside `versions` |
| 2 | Version path | well-known ok | client builds `/v1.0.0/discovery` | route exists | uses the advertised string exactly | `discovery/readme.md` 291–294 | Client if it strips prerelease or changes case; server if the prefix is still beta.2 |
| 3 | TEI | fixture TEI stored exactly | discovery `tei` | one release, not `[]` | does not rewrite the TEI | `discovery/readme.md` 92–179, 306–334 | Server if URN or empty array; client if it canonicalizes case |
| 4 | Entity GET | discovery UUID | product, release, component, component release | schemas in schema-diff | reads flat `latestCollection` | OpenAPI GET responses | Server if nested `release`; client if it requires beta.2 wrapper |
| 5 | Collections | two versions | list, latest, version 1 | version 1 unchanged | treats latest as version 2 | `tea-collection.md` 21–31, 49–60 | Server if version 1 was mutated |
| 6 | Artifact metadata | revisions 1 and 2 | latest and `/1` | required fields, `mediaType` | does not use `mimeType` | schema `artifact` | Server if `version` stripped |
| 7 | Download | hosted revision 2 | GET download | bytes, `Content-Type`, `Content-Location` | hashes after removing content coding | `tea-collection.md` 80–90, 151–156 | Server if gzip of a `.gz` file is declared; client if it hashes the wire body |
| 8 | Integrity | checksum above | compare SHA-256 | metadata checksum matches bytes | mismatch is a fixture or server defect, not “no update” | `tea-collection.md` 133–149 | Fixture if the file changed; server if a transform was applied |
| 9 | Pagination | 3 products | `pageSize=2` then token | `hasNext` rules | copies token verbatim | parameter `page-token` | Server if offset fields remain; client if it builds its own token |
| 10 | Conditional | ETag from test 7 | `If-None-Match` | 304, empty body, same validators | does not replace the cached bytes | response `304-not-modified` | Server if body is non-empty; client if it treats 304 as an error |
| 11 | Auth | public profile | bearer on a product GET; `POST /token` | 200 ignored; token `NOT_IMPLEMENTED` | does not fail the product call because a token was sent | `auth/readme.md` 256–268 | Server if 401; client if it requires `/token` on a public server |
| 12 | Negative | — | bad UUID, unknown TEI, bad media type, CLE | 400 / 404 / 406 with TEA `error` | unknown TEI is not failover | `discovery/readme.md` 370–414; `406` response | Server if Nest `statusCode` body; client if any 404 triggers failover |

Failure classes allowed by the brief: client defect, server defect, specification ambiguity, fixture defect, test harness defect, unsupported optional capability.

Specification ambiguity already recorded: OpenAPI examples of `createdDate` that do not match the `date-time` pattern (SCH-14). Tests must expect the pattern.

Optional and unsupported in this plan: real CLE events, real signature validation, OAuth grants other than “no authentication”, `MD5`.

## Implementation status

Recorded 2026-10-10. The fixture plan above was implemented at `oolong/fixtures/tea-1.0.0`. Identifiers, bytes, and checksums are listed in `fixture-reference.md`.

| Requirement | Status |
| --- | --- |
| More than one product page, multiple releases, two components, collection versions, multi-revision artifact, checksums, one signature and one missing signature, TEI and PURL | Verified |
| Reads do not mutate files | Verified by a unit test |
| Synthetic collection is response-only | Verified. Release `22222222-2222-4222-8222-222222222223` has no collection directory |
