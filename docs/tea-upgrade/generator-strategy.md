# OpenAPI generation strategy

## Current command

`openapitools.json` pins `@openapitools/openapi-generator-cli` `7.16.0`.

README lines 160–163 generate `typescript-nestjs-server` from `tea-spec/openapi.yaml` into `oolong/oolong-server/src/generated-nest/`.

That input is `info.version` `0.2.0-beta.2`. The output matches it: operation IDs, pagination fields, nested `ComponentReleaseWithCollection`, optional artifact `version`.

## What regeneration would overwrite

`generated-nest/.openapi-generator-ignore` does not protect any file. A generate into that directory replaces:

- `api/*.ts` abstract classes (`TEAProductApi.ts` methods `getTeaProductByUuid`, `queryTeaProducts`)
- `controllers/*.ts`
- `models/*.ts`
- `api.module.ts` and `api-implementations.ts`

It does not delete `src/handlers/` or `src/controllers/well-known.controller.ts`. Those files implement the old method names, so the project would not compile.

Handwritten logic is already outside the generated tree. That split is the right one and should be kept. Well-known stays handwritten because it is not an OpenAPI operation.

## Can 7.16.0 consume the pinned document?

Not verified. Generator execution was out of scope.

The pinned file is OpenAPI 3.1.1 (line 2) and uses:

- `allOf` for both release-with-collection schemas and all five paginated responses
- `const` on `token_type`
- `additionalProperties: false`
- success content key `*/*` for downloads
- header parameters and required response headers
- security requirement `{}`
- `pattern` on UUIDs, timestamps, and SemVer

`typescript-nestjs-server` in the 7.x line has historically emitted incomplete models for `allOf` and has ignored response headers. If that is still true at 7.16.0, generated interfaces would compile and still be the wrong JSON shape. A green generate is not evidence the types match the schema.

## Safe migration

Do this only after an explicit implementation authorization. Do not regenerate during the audit.

1. Copy `spec/openapi.yaml` from commit `962a0228af1bfcc1232ac3f79239317ff33fdb04` to a temporary directory. Do not replace `tea-spec/openapi.yaml` until the trial is reviewed.
2. Run generator `7.16.0` with `-g typescript-nestjs-server` into a second temporary directory, not `src/generated-nest/`.
3. Review the trial for: flat `latestCollection`, pagination `hasNext`, `mediaType`, no `MD5`, operation IDs `getProduct` / `discover` / `getLatestArtifact`, download methods present, `requestToken` present.
4. If the trial types match those shapes, replace `src/generated-nest/` in a later change and rewrite handlers to the new interfaces in the same change. Keep services in `src/handlers/`.
5. If the trial drops `allOf` properties or download headers, do not adopt it. Hand-write the controllers and response types for the 28 operations, still isolated from storage code. Revisit a newer generator only as a separate, reviewed change. Do not bump `openapitools.json` blindly.
6. Add `src/handlers/` and `src/controllers/well-known.controller.ts` to `.openapi-generator-ignore` only if a future command’s `-o` is widened to `src/`. With the current `-o generated-nest`, they are already safe.
7. Runtime validation still will not come from the generator. Add a response check in tests against the pinned document. Do not treat generated TypeScript as the schema.

## What not to generate

- Do not generate a client into this server repository.
- Do not copy types from the Rust SDK.
- Do not point the generator at upstream `main` of the TEA repository. Pin `962a0228af1bfcc1232ac3f79239317ff33fdb04`.

## Spec file in git

Replacing `tea-spec/openapi.yaml` is an implementation change, not an audit change. When it happens, record the commit SHA next to the file (for example in `docs/tea-upgrade` or a one-line header comment outside the YAML if the generator rejects comments; the pinned file already starts with a comment, so a sibling `TEA_SPEC_COMMIT` file is safer).

## Implementation status

Recorded 2026-10-10. The "not verified" statement above is the audit result. The trial was run afterward.

OpenAPI Generator CLI `7.16.0` (`openapi-generator-cli-7.16.0.jar` from Maven Central) generated `typescript-nestjs-server` into `/tmp/tea-gen-7160-trial` from `tea-spec/openapi.yaml`. Exit code 0.

The models keep the pinned shapes: `ProductReleaseWithCollection` is a flat object with `latestCollection`, `PaginationDetails` has `hasNext` and `nextPageToken`, `ArtifactFormat.mediaType` replaces `mimeType`, and `ChecksumType` has no `MD5`. Download operations are present.

The download controllers are not usable as generated. `If-None-Match` is an ordinary parameter with no header decorator, and the success type is `Blob`, which Nest would serialize as JSON. That loses the binary response.

Automatic replacement of `src/generated-nest` was stopped. That directory remains the Beta 2 snapshot and is not mounted. The contract is implemented by `oolong/oolong-server/src/tea`. Generated files were not patched.
