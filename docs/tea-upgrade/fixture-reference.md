# TEA 1.0.0 fixture reference

Content root: `oolong/fixtures/tea-1.0.0`.

Reads do not rewrite these files. A release with no `collections/` directory still returns one synthetic collection: version `1`, `INITIAL_RELEASE`, empty `artifacts`. That object is not written to disk.

## Products

Sorted by `name`, then `uuid`.

| Name | UUID |
| --- | --- |
| Alpha Fixture | `11111111-1111-4111-8111-111111111111` |
| Beta Fixture | `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1` |
| Delta Fixture | `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3` |
| Epsilon Fixture | `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4` |
| Gamma Fixture | `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2` |

Alpha identifiers: CPE `cpe:2.3:a:oolong:fixture-widget`, PURL `pkg:generic/oolong-fixture/widget`. Discovery does not use the product PURL.

## Product releases

Parent: Alpha Fixture. Default sort is `createdDate`.

| UUID | Version | createdDate | releaseDate | Identifiers |
| --- | --- | --- | --- | --- |
| `22222222-2222-4222-8222-222222222224` | `0.9.0` | `2025-12-01T00:00:00Z` | absent | none |
| `22222222-2222-4222-8222-222222222222` | `1.0.0` | `2026-01-15T00:00:00Z` | `2026-01-20T00:00:00Z` | TEI `tei://localhost/uuid/22222222-2222-4222-8222-222222222222`, PURL `pkg:generic/oolong-fixture/widget@1.0.0` |
| `22222222-2222-4222-8222-222222222223` | `1.1.0` | `2026-02-01T00:00:00Z` | `2026-02-02T00:00:00Z` | none |

`releaseDate` ascending places the release with no `releaseDate` last. Collection versions `1` and `2` belong to `22222222-2222-4222-8222-222222222222`. Version `1` references artifact revision 1. Version `2` references artifact revision 2. Release `22222222-2222-4222-8222-222222222223` has the synthetic collection only.

## Components

| Name | UUID |
| --- | --- |
| Fixture Part | `33333333-3333-4333-8333-333333333333` |
| Fixture Other | `33333333-3333-4333-8333-333333333334` |

## Component releases

| UUID | Parent | Version | Notes |
| --- | --- | --- | --- |
| `44444444-4444-4444-8444-444444444444` | Fixture Part | `1.0.0` | distribution `dist-hosted`; collections 1 (empty) and 2 |
| `44444444-4444-4444-8444-444444444445` | Fixture Part | `1.1.0` | no `releaseDate`; synthetic collection |
| `44444444-4444-4444-8444-444444444446` | Fixture Other | `1.0.0` | synthetic collection |

## Artifacts

`55555555-5555-4555-8555-555555555555`

- Revision 1: external `url` `https://example.invalid/fixture-widget-r1.json`. Download returns `302`.
- Revision 2: hosted JSON and XML. The JSON format has a detached signature. The XML format does not.

`55555555-5555-4555-8555-555555555557`

- Revision 1: hosted JSON and no signature. Signature download returns `404` `SIGNATURE_NOT_FOUND`.

## Bytes

JSON, 137 bytes:

`{"bomFormat":"CycloneDX","specVersion":"1.6","version":1,"metadata":{"component":{"type":"application","name":"oolong-fixture-widget"}}}\n`

- SHA-256 `8c5170df0ae7a47f77b2f0b1f03c04500343aa2a26863098d2f133b9350d0f98`
- SHA-1 `a9ac7d6e8b5aae33125cd3c3d58c9bb5e3924e35`

XML, 57 bytes:

`<?xml version="1.0"?><bom name="oolong-fixture-widget"/>\n`

- SHA-256 `d29d6d76e387b580977cb53148e71437ca20f9c176dc6057640d539de62646e2`
- SHA-1 `27bfb63913a24a513d4a034e18bdb1605218097a`

Signature, 30 bytes: `fixture-detached-signature-v1\n`

- SHA-256 `2cc8c8b70e58183dd967d39559803362a73d27be2ec4aee761dd1ded8c2049d7`

The HTTP `ETag` is the quoted SHA-256 of `tea-representation-v1` followed by a NUL byte and the representation bytes. It is not either checksum above.
