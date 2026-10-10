# Architecture audit

## Bootstrap and module boundaries

`main.ts` creates a NestJS application, sets a global path prefix, and listens.

```14:19:oolong/oolong-server/src/main.ts
  const apiVersion = process.env.API_VERSION || 'v0.2.0-beta.2';
  app.setGlobalPrefix(apiVersion, {
    exclude: ['.well-known/tea']
  });
```

There is no `ValidationPipe`, guard, interceptor, or exception filter. Nest’s default exception shape is what clients receive.

`app.module.ts` imports `ApiModule.forRoot(...)` and registers six handwritten services as the generated API implementations, plus `AppController` and `WellKnownController`.

Generated module: `oolong/oolong-server/src/generated-nest/api.module.ts`. It binds one controller per tag from the beta.2 document:

- `TEAArtifactApiController`
- `TEAComponentApiController`
- `TEAComponentReleaseApiController`
- `TEADiscoveryApiController`
- `TEAProductApiController`
- `TEAProductReleaseApiController`

Handwritten services in `src/handlers/` implement the abstract classes in `src/generated-nest/api/`. Storage is `ContentLoader` in `src/utils/content-loader.ts`. Each service constructs its own `ContentLoader`. There is no shared cache, index, or database.

`AppController.getHello` is the Nest starter route at the version prefix (`GET /v0.2.0-beta.2/`). It is not a TEA operation.

## Generated versus handwritten

| Area | Location | Origin |
| --- | --- | --- |
| Controllers, API interfaces, models, `ApiModule` | `src/generated-nest/` | OpenAPI Generator `typescript-nestjs-server` |
| Services | `src/handlers/*.ts` | Handwritten |
| Well-known | `src/controllers/well-known.controller.ts` | Handwritten, not in the OpenAPI document |
| YAML storage | `src/utils/content-loader.ts` | Handwritten |
| Bootstrap, module wiring | `src/main.ts`, `src/app.module.ts` | Handwritten |
| Logging | `src/utils/logger.ts` | Handwritten wrapper over Nest `Logger` |

`generated-nest/README.md` says generated files should not be edited and that applications implement `api/` contracts. `generated-nest/.openapi-generator-ignore` is the stock comment template. No project files are ignored. Regeneration of `generated-nest/` would replace controllers, interfaces, and models. It would not delete `src/handlers/`, but every handler `implements` a generated interface whose method names and signatures come from beta.2 operation IDs. Those IDs do not exist in the pinned document, so the handlers would fail to compile until rewritten.

No evidence was found of hand-edited business logic inside generated controllers. They are thin `@Get` delegates. Example: `TEAProductApi.controller.ts` lines 10–17. Unused `Body` imports match generator output.

Generated models are TypeScript interfaces only. Nothing in the server validates a response against the OpenAPI schema at runtime. `ContentLoader.loadYamlFile` casts YAML with `as T` (`content-loader.ts` lines 21–28).

## What the generator represents today

The generated interfaces match the bundled `0.2.0-beta.2` document, not the pinned document. Confirmed mismatches that matter for regeneration:

- Operation IDs such as `getTeaProductByUuid` and `queryTeaProducts` (`TEAProductApi.ts` lines 8–12). Pinned IDs are `getProduct` and `queryProducts`.
- Pagination model `timestamp`, `pageStartIndex`, `pageSize`, `totalResults` (`pagination-details.ts` lines 3–7). Pinned pagination is `hasNext` and optional `nextPageToken`.
- `ComponentReleaseWithCollection` nests `release` and `latestCollection` (lines 8–17). The pinned schema flattens `component-release` fields next to `latestCollection` via `allOf`.
- `Artifact.uuid` is optional and there is no `version` or `createdDate` (`artifact.ts`). The loader deletes `version` (`content-loader.ts` lines 381–383) because the bundled comment says version is not in the API yet. The pinned schema requires `version`.
- `IdentifierType` is `CPE | TEI | PURL` (`identifier-type.ts` lines 5–9). Pinned enum adds `COMPLIANCE_DOCUMENT`.
- `ChecksumType` includes `MD5` (`checksum-type.ts` lines 5–18). Pinned enum removes `MD5`.

## Generator fitness for the pinned document

Not executed. This audit did not run OpenAPI Generator.

The pinned document is OpenAPI 3.1.1 and uses constructs the current Nest server generator must be trialled against before anyone overwrites `generated-nest/`:

- `allOf` for `product-release-with-collection`, `component-release-with-collection`, and every paginated response
- `const: Bearer` on `token-response.token_type`
- `additionalProperties: false` on `error-response` and `server-info`
- binary success content `*/*` on artifact downloads
- header parameters (`If-None-Match`) and many response headers (`ETag`, `Content-Location`, `Vary`, `Repr-Digest`, `Cache-Control`)
- an empty security requirement `{}` beside `bearerAuth`
- `integer` path parameters for collection and artifact versions

`openapitools.json` pins CLI `7.16.0`. Whether that CLI’s `typescript-nestjs-server` emits usable interfaces for this document is unverified. See `generator-strategy.md`.

## Request pipeline

1. Global prefix from `API_VERSION`, default `v0.2.0-beta.2`, excluded for `.well-known/tea`.
2. Generated controller reads params and queries as declared. Query numbers are not coerced: there is no pipe.
3. Handler calls `ContentLoader`, which scans the content directory on every request.
4. Missing entities throw `NotFoundException` in some handlers and return empty collections or empty pages in others.
5. Nest serializes the returned object as JSON. No schema filter removes unknown YAML fields. No TEA `error` property is set.

## Storage

Default directory: `path.join(__dirname, '../../src/content')` (`content-loader.ts` lines 10–12).

From compiled `dist/utils`, that resolves to `<server>/src/content`. The image copies content to `/app/src/content` (`Dockerfile` line 23), which matches that resolution. `npm run start:dev` expects files under `oolong/oolong-server/src/content`, which is gitignored except `placeholder.md`. Sample data lives in `oolong/sample_content/` and is not served until copied.

Expected tree (from `IMPLEMENTATION_NOTES.md` and the loader):

```text
products/{name}/product.yaml
products/{name}/releases/{version}/release.yaml
products/{name}/releases/{version}/collections/{n}.yaml
components/{name}/component.yaml
components/{name}/releases/{version}/release.yaml
components/{name}/releases/{version}/collections/{n}.yaml
artifacts/{uuid}.yaml
```

Lookups scan every matching YAML file. There is no index. Identifier filters are exact `idType` + `idValue` equality. Collection “latest” is the highest numeric `version` after an in-memory sort. Artifact identity is the filename, not a field inside the file. One file per UUID, so revisions cannot be stored. The loader strips `version`.

Product and component release YAML does not have to contain `product` / `component` UUIDs. The loader overwrites those from the parent directory (`content-loader.ts` lines 104–116 and 179–191).

## Authentication, validation, logging, tests

- No authentication middleware, bearer parsing, or token store.
- No authorization decisions.
- No UUID pattern check, so the pinned `400` for a malformed UUID is never produced.
- `TEADiscoveryService` prints the TEI with `console.log` (line 18). Debug logging prints full product objects (`TEAProductService.ts` lines 29–50, `content-loader.ts` lines 73–74).
- Unit and e2e tests cover only `Hello World!`.

## Limitations that bound the upgrade

The filesystem design can represent the pinned model if the tree grows artifact revisions and optional local bytes. It does not need a database for the mandatory read API. Full-directory scans will not meet pagination stability under concurrent content edits; a load-time index is enough and still fits the lightweight design.

Regenerating in place before the handlers are rewritten will not compile. Handwritten services must stay outside `generated-nest/`.

## Implementation status

Recorded 2026-10-10. The beta.2 architecture described above is the pre-change server.

| Finding | Status |
| --- | --- |
| Global prefix and well-known exclusion driven by `API_VERSION` | Fixed. The prefix is hardcoded `v1.0.0`. `API_VERSION` is accepted only as `1.0.0` or `v1.0.0` |
| Generated beta controllers mounted as the API | Fixed. `AppModule` mounts `src/tea` only |
| Filesystem storage | Verified. YAML on disk remains the store. No database was added |
