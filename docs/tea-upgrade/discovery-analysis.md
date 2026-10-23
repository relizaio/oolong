# Discovery and TEI analysis

## Advertised version

The value clients append after `/v` is the string advertised in `.well-known/tea` `endpoints[].versions` and in discovery `servers[].versions`. It is a full SemVer 2.0.0 string with no leading `v`.

At the pinned commit that string is `1.0.0`.

Evidence:

- OpenAPI `info.version` is `1.0.0` (`spec/openapi.yaml` line 25). This is the spec identifier, not a second numbering scheme.
- Well-known schema items are SemVer and the example is `"1.0.0"` (`discovery/tea-well-known.schema.json` lines 34–45).
- Discovery prose: clients append `/v` plus the exact advertised string, example `/v1.0.0` (`discovery/readme.md` lines 272–304).
- `server-info.versions` items use the same SemVer pattern (`spec/openapi.yaml` schema `server-info`, inventory confirmed).
- Repository README line 17 says “Beta 2”. That is process status. It is not the version path segment.

`0.2.0-beta.2` is a legal SemVer prerelease, so the current server’s prefix shape (`/v` + version) matches the rule, and the advertised value does not. A 1.0.0 client will not select `0.2.0-beta.2` as its highest mutually supported version when it implements 1.0.0.

Do not copy the OpenAPI `servers.url` value `http://localhost/tea/v1.0.0` into the well-known `url`. That server entry already includes the version segment and is described as local development only (lines 26–28). Well-known `url` is the API base without the version suffix. The client adds `/v1.0.0`. A base of `http://127.0.0.1:3005` yields `http://127.0.0.1:3005/v1.0.0/discovery?...`. An optional path such as `/tea` is allowed only if it is part of the well-known `url` (`https://api2.example.com/mytea` in the example) and is not the version segment.

`schemaVersion` remains integer `1` (`tea-well-known.schema.json` lines 10–13). The current controller’s `schemaVersion: 1` is still correct.

## Current well-known implementation

`WellKnownController.getTeaDiscovery` (`well-known.controller.ts` lines 11–31):

- `GET /.well-known/tea` is excluded from the global prefix. Path matches the discovery document.
- `versions` is `API_VERSION` with one leading `v` removed, default `0.2.0-beta.2`.
- `url` is `SERVER_HOST`, default `http://localhost:3000`.
- No `priority` field. Absence means priority `1` for clients (`discovery/readme.md` lines 285–289). Omitting it is allowed.
- No `additionalProperties` check. The object matches the required keys.
- `url` pattern in the schema rejects userinfo, query, and fragment, and expects `http` or `https` without a trailing slash. The code does not enforce that.
- HTTPS is required outside local testing (`auth/readme.md` lines 212–217, OpenAPI server description line 28). Defaults are `http://`, which is acceptable only for localhost.

Finding DISC-01. Severity: Critical. The server advertises `0.2.0-beta.2` and mounts routes at `/v0.2.0-beta.2`. Expected: advertise `1.0.0` and mount the pinned API at `/v1.0.0`. Normative: `discovery/readme.md` 272–304; `spec/openapi.yaml` line 25; well-known schema lines 34–45. Impact: a client pinned to this commit will not call these routes. Remediation: one configured SemVer, default `1.0.0`, used both as the route prefix (with a `v`) and as the well-known version (without a `v`). Test: `GET /.well-known/tea` returns `versions: ["1.0.0"]` and `GET /v1.0.0/discovery` is the API.

## Current `/discovery` implementation

Generated route: `GET /discovery` (`TEADiscoveryApi.controller.ts` lines 10–12), so the live path is `GET /v0.2.0-beta.2/discovery?tei=`.

`TEADiscoveryService.discoveryByTei` (lines 15–50):

- Requires the generated `tei` query argument. The pinned operation also accepts `purl`, and exactly one of the two is mandatory (`discovery/readme.md` lines 352–357). OpenAPI marks each parameter `required: false` individually (`spec/openapi.yaml` discovery parameters). The prose requirement is the server rule: neither or both → `400`.
- Decodes with `decodeURIComponent` after Nest has already decoded the query. A TEI whose published spelling contains a percent sequence can be decoded twice. Comparison must use the TEI after one transport decode (`discovery/readme.md` lines 175–179).
- Loads product releases only. Match is `idType === 'TEI'` and `idValue === decodedTei`.
- No match returns `[]` with HTTP 200. Normative success is a non-empty array. No match is `404` with `error: OBJECT_UNKNOWN` (`discovery/readme.md` lines 330–334 and 370–374; response `discovery-response`).
- Does not resolve PURL identifiers on the release.
- Builds `servers[]` from `SERVER_HOST` and the beta version string. `rootUrl` must be the API base without `/v1.0.0` (`discovery/readme.md` lines 316–325). Priority `1.0` is allowed (range 0 to 1).
- `console.log` of the TEI (line 18).

Sample identifier is the old URN form (`oolong/sample_content/products/kauf_bulb/releases/BLF10-1m-1.95/release.yaml` lines 6–10):

```text
urn:tei:asin:demo.rearmhq.com:B09D6HR559
urn:tei:uuid:demo.rearmhq.com:9485fbc9-aa7d-4c26-95c9-d5a8ccb1c073
```

Pinned syntax (`discovery/readme.md` lines 92–111):

```text
tei://<domain-name>/<type>/<unique-identifier>
```

Examples: `tei://example.com/uuid/d4d9f54a-abcf-11ee-ac79-1a52914d44b1`, `tei://example.com/asin/B07FZ8S74R`. Equality is exact and case-sensitive (lines 143–151). Servers must not rewrite a stored TEI to match a client that canonicalizes it.

Finding DISC-02. Severity: Critical. Empty `200` and URN TEIs. Expected: `tei://` identifiers, `404` + `OBJECT_UNKNOWN` when unresolved, `400` when `tei` and `purl` are both missing or both present. Normative: `discovery/readme.md` 92–119, 306–374. Impact: clients treat a non-TEA JSON `404` as failover, and they treat `200 []` as an invalid success body. Remediation: implement `discover` as specified; stop returning an empty array. Test: unknown TEI → 404 body `{"error":"OBJECT_UNKNOWN"}` and `Content-Type: application/json`; fixture TEI → one-element array.

Finding DISC-03. Severity: High. PURL discovery is absent. `GET /discovery?purl=pkg:maven/...` is a same-server inventory lookup, not DNS (`discovery/readme.md` 352–368). Remediation: match product-release identifiers with `idType: PURL`. Test: fixture PURL returns the same release UUID as its TEI; unknown PURL returns `OBJECT_UNKNOWN`.

## Multiple endpoints

The controller returns one endpoint. The schema allows many, with `priority`. One endpoint is valid. `servers[]` in the discovery response can differ from the well-known list (`discovery/readme.md` 316–325). The current code always echoes `SERVER_HOST`. That is valid for a single-base server if `SERVER_HOST` is the API base without the version segment.

## Authentication and discovery

A public server shall not answer resource requests with `401` and shall ignore `Authorization: Bearer` (`auth/readme.md` lines 256–268; `discovery/readme.md` lines 440–442). Oolong does not implement `/token` and does not read `Authorization`. That matches the public-server profile.

It does not match the profile if any object is protected. Protected objects need `POST /token`, API-key Basic exchange, and `401` + `WWW-Authenticate: Bearer` (`auth/readme.md` lines 46–47 and 270–285). A missing `/token` may be a plain `404`; clients are told not to probe it, and a `404` there means the endpoint is not implemented (`discovery/readme.md` lines 499–502). For a public interoperability server, leaving `/token` unimplemented is permitted. The response should be a TEA `404` with `error: NOT_IMPLEMENTED` if a client calls it, because the OpenAPI operation lists that response. See operation `requestToken`.

## Outdated beta behavior still in the tree

| Behavior | Where | Pinned replacement |
| --- | --- | --- |
| Version `0.2.0-beta.2` | `main.ts` 16, well-known 16, discovery service 34, Docker, Helm, README | `1.0.0` |
| `urn:tei:` identifiers | sample release YAML lines 8–10, README lines 18–43 | `tei://domain/type/id` |
| Discovery query name only `tei`, product releases only | `TEADiscoveryService.ts` 15–28 | `tei` or `purl`, exactly one |
| `200 []` | same method, implicit when the filter is empty | `404` `OBJECT_UNKNOWN` |
| `tea-server-info` schema name | generated `tea-server-info.ts` | `server-info` |

## Implementation status

Recorded 2026-10-10.

| Finding | Status |
| --- | --- |
| DISC-01 advertised beta version | Fixed. `versions` is `["1.0.0"]` and the endpoint URL has no `/v1.0.0` suffix |
| DISC-02 empty discovery array and `urn:tei:` | Fixed. Unknown identifiers return `404` `OBJECT_UNKNOWN`. Stored TEIs use `tei://` |
| DISC-03 PURL scope | Fixed. Discovery matches product-release `PURL` identifiers only |
| Exactly one of `tei` or `purl` | Verified. Neither or both returns `400` `INVALID_REQUEST` |
| One transport decode | Verified. A twice-encoded TEI does not match the stored value |
