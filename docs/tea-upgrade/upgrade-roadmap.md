# Upgrade roadmap

## Severity

| ID | Severity | Topic |
| --- | --- | --- |
| DISC-01, DOCK-02 | Critical | Advertised version `0.2.0-beta.2` |
| DISC-02, SCH-06 | Critical | `urn:tei:` and discovery `200 []` |
| SCH-01 | Critical | Artifact revisions stripped / unstorable |
| SCH-07 | Critical | Release payload nesting |
| SCH-08 | Critical | Offset pagination versus token pagination |
| HTTP-02 | Critical | No artifact download or `ETag` / `304` |
| HTTP-05 | Critical | Error JSON is not a TEA error |
| DISC-03, SCH-02, SCH-04, HTTP-04, HTTP-06, DOCK-01 | High | PURL discovery, `mediaType`, `createdDate`, `Content-Location`, missing parent `404`, compose mount |
| SEC-01, SEC-09 | High | Path join without content-root check |
| SCH-05, SCH-09, SCH-10, HTTP-03, HTTP-07, SEC-02, SEC-03, SEC-04, SEC-07 | Medium | Distributions, error enum, timestamps, `406`, page cap, symlinks, YAML size, logs, bind address |
| SCH-03, SEC-05 | Low | `MD5`, echoed ids |
| HTTP-01, SEC-06, SEC-08, SCH-14 | Informational | HEAD not an OpenAPI operation, public auth profile, container user, example timestamps |

## Upstream

Finding UP-01. Severity: Informational.

Fork `Mehrn0ush/oolong-TEA-server` and `relizaio/oolong` are the same commit `2cb77b593a9e51220c166670534ab66c0849b235` (`docs: fix ReARM link`, `2026-03-03T19:33:16Z`). GitHub compare: `ahead_by: 0`, `behind_by: 0`, `status: identical`.

No upstream commit is missing. No fork-only commit exists. Cherry-pick nothing. Do not merge or rebase. A later fetch is warranted only when implementation starts, in case upstream moves after this audit.

## Dependency order

The suggested seven phases are reordered so that path checks exist before new file layouts, and so the version prefix exists before route tests.

### Phase 1 — Pin, generator trial, error filter, version prefix

Foundation. No in-repo regenerate until a temp trial is reviewed (`generator-strategy.md`).

- Record spec commit `962a0228af1bfcc1232ac3f79239317ff33fdb04`.
- Trial-generate outside the repo.
- Add a TEA exception filter (`error`, no `statusCode`).
- Default prefix `v1.0.0` and well-known `versions: ["1.0.0"]`.
- Contain every filesystem read (SEC-01) before new paths are added.

Exit: `GET /.well-known/tea` advertises `1.0.0`; a bad UUID returns `INVALID_REQUEST`; a path-escape UUID does not read outside the root.

### Phase 2 — Storage model

Data model and storage.

- Map legacy `date` → `createdDate`, `mimeType` → `mediaType`, `distributionType`/`id` → `distributionId`.
- Store `tei://` identifiers. Do not serve `urn:tei:`.
- Artifact directory: one series, many revisions, optional hosted bytes and signature bytes.
- Stop deleting `version`.
- Synthesize collection version 1 when a release has no collection file.
- Keep YAML files. Do not add a database.

Exit: a fixture release round-trips to the pinned JSON shapes in a unit test of the loader.

### Phase 3 — Mandatory reads and pagination

- Rewrite handlers to the pinned operation IDs after Phase 1’s interface decision.
- Flat release + `latestCollection`.
- Token pagination, sort, `pageSize` default 25 maximum 100.
- `404` when a parent UUID does not exist.
- New routes: `/components`, `/componentReleases`.
- Remove or stop registering `GET /artifact/:uuid`.

Exit: operation-matrix rows that are not downloads, CLE, or token return the pinned success schema.

### Phase 4 — Discovery

- `tei` xor `purl`.
- Exact TEI match after one decode.
- Unresolved identifier is `404` `OBJECT_UNKNOWN`.
- `servers[].versions` is `1.0.0`. `rootUrl` has no version suffix.

Exit: fixture TEI and PURL tests in `interop-fixtures-plan.md`.

### Phase 5 — Artifact HTTP

Protocol and security.

- Metadata latest and by version.
- Download and signature download, including `302` only when used.
- Strong `ETag`, `Content-Location`, `Vary`, `Cache-Control`, `304`, `406`.
- Checksums compared to hosted bytes in tests. Checksums are not entity tags.
- CLE routes return `NOT_IMPLEMENTED`.
- Public profile: ignore bearer tokens; `POST /token` returns `NOT_IMPLEMENTED`.

Exit: HTTP tests in `http-conformance.md`.

### Phase 6 — Fixtures and automated tests

Testing. Supertest against the fixture tree. No Rust SDK changes.

### Phase 7 — Local compose profile

Deployment. `docker-compose.tea-interop.yml` as in `docker-readiness.md`. Bind localhost. Do not pull the Reliza image. Then, and only then, point the Rust client at `http://127.0.0.1:3005`.

## Effort assumptions

One engineer who already knows this Nest codebase. Generator trial succeeds or is abandoned within the first change. Fixtures stay small enough for directory scans. No authentication server. No CLE dataset. Estimates are calendar engineering time, not test-lab time.

| Phase | Assumption-based size |
| --- | --- |
| 1 | 2–4 days, mostly the generator decision and the error filter |
| 2 | 3–5 days, including a migration of `sample_content` |
| 3 | 4–6 days |
| 4 | 2–3 days |
| 5 | 4–6 days |
| 6 | 3–4 days |
| 7 | 1–2 days |

If the generator emits unusable `allOf` models, Phase 1 grows by several days of hand-written controllers. If upstream publishes a conflicting server rewrite before implementation, stop and re-diff. That has not happened as of this audit.

## Risks

- Regenerating `generated-nest/` in place drops the handwritten compile. Mitigate with the temp trial and one commit that updates handlers together.
- Sample `urn:tei:` content and the public demo README will not work against a 1.0.0 client until identifiers are rewritten. Keep a legacy reader only at the storage boundary.
- Pagination tokens must encode sort and filters. A token that is only an offset will not return `400` on a conflicting `sortOrder`.
- Directory scans plus mutable files can duplicate or skip rows across pages. The test profile should be immutable. A production read can snapshot the file list per token.
- Implementing `401` “for safety” on a public server breaks clients (`auth/readme.md` lines 260–262).
- OpenAPI examples with non-`Z` timestamps will fail strict tests if copied (SCH-14).
- `docker-compose.yml` volume path will hide fixtures even after the server is fixed (DOCK-01).
- Following symlinks in content (SEC-02) becomes more serious once download serves raw bytes.

## Implementation readiness

READY TO BEGIN SERVER UPGRADE

The pinned specification was retrieved and checked against this commit. The Nest split between generated contracts and handwritten storage is clear enough to change safely. The gaps are specified behaviors the current beta.2 server does not implement. They are not unknown protocol. The generator’s handling of `allOf` is an unverified tool risk and is the first task inside Phase 1, not a reason to hold the upgrade. Do not start that work until implementation is explicitly authorized. This audit did not modify the repository.

## Implementation status

Recorded 2026-10-10. Severity and the baseline commit above are historical.

The server upgrade was implemented on this fork without pushing. Status for each finding is recorded in the matching audit note. The completion record is `implementation-report.md`.
