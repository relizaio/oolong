# TEA Service Implementation

## Overview
All TEA service handlers have been implemented to read from the content directory (YAML files) and serve the data via the API.

## Components Implemented

### 1. ContentLoader Utility (`src/utils/content-loader.ts`)
A shared utility class that handles:
- Loading and parsing YAML files using `js-yaml`
- Scanning the content directory structure
- Finding products, components, releases, and collections
- Filtering by UUID and identifiers
- Sorting collections by version

**Directory Structure Expected:**
```
src/content/
├── products/
│   └── {product_name}/
│       ├── product.yaml
│       └── releases/
│           └── {release_version}/
│               └── release.yaml
└── components/
    └── {component_name}/
        ├── component.yaml
        └── releases/
            └── {release_version}/
                ├── release.yaml
                └── collections/
                    ├── 1.yaml
                    ├── 2.yaml
                    └── ...
```

### 2. TEAProductService (`src/handlers/TEAProductService.ts`)
Implements:
- `getTeaProductByUuid(uuid)` - Get a specific product by UUID
- `queryTeaProducts(pageOffset, pageSize, idType, idValue)` - Query products with pagination and optional identifier filtering

### 3. TEAProductReleaseService (`src/handlers/TEAProductReleaseService.ts`)
Implements:
- `getTeaProductReleaseByUuid(uuid)` - Get a specific product release by UUID
- `getReleasesByProductId(uuid, pageOffset, pageSize)` - Get all releases for a product with pagination
- `queryTeaProductReleases(pageOffset, pageSize, idType, idValue)` - Query product releases with pagination and optional identifier filtering
- `getCollectionsByProductReleaseId(uuid)` - Get all collections for a product release (aggregated from component releases)
- `getCollectionForProductRelease(uuid, collectionVersion)` - Get a specific collection version for a product release
- `getLatestCollectionForProductRelease(uuid)` - Get the latest collection for a product release

### 4. TEAComponentService (`src/handlers/TEAComponentService.ts`)
Implements:
- `getTeaComponentById(uuid)` - Get a specific component by UUID
- `getReleasesByComponentId(uuid)` - Get all releases for a component

### 5. TEAComponentReleaseService (`src/handlers/TEAComponentReleaseService.ts`)
Implements:
- `getComponentReleaseById(uuid)` - Get a component release with its latest collection
- `getCollectionsByReleaseId(uuid)` - Get all collections for a component release
- `getCollection(uuid, collectionVersion)` - Get a specific collection version for a component release
- `getLatestCollection(uuid)` - Get the latest collection for a component release

## Features

### Sequential Scanning
All methods use sequential file scanning to find matching YAML files. This approach is simple and works well for small to medium-sized content directories.

### Pagination Support
Query methods support pagination with:
- `pageOffset` - Starting page index
- `pageSize` - Number of items per page
- Returns `totalResults`, `pageStartIndex`, `pageSize`, and `results`

### Identifier Filtering
Query methods support filtering by identifier type and value:
- Searches through the `identifiers` array in each entity
- Matches both `idType` and `idValue`

### Error Handling
- Returns `NotFoundException` when entities are not found
- Proper error messages for debugging

## Dependencies Added
- `js-yaml` - YAML parsing library
- `@types/js-yaml` - TypeScript type definitions

## Content Directory
The default content directory is `src/content/`, but it's currently gitignored (except for `placeholder.md`). The actual content is copied from `sample_content/` for development.

## Configuration

### Environment Variables

- **`API_VERSION`** (default: `v0.2.0-beta.2`) - Version prefix for all API endpoints
  - Example: With default value, endpoints become `/v0.2.0-beta.2/products`
  - The version is also exposed in the `/.well-known/tea` discovery endpoint
- **`SERVER_HOST`** (default: `http://localhost:3000`) - Public URL for the TEA API
  - Used in the `/.well-known/tea` discovery endpoint
- **`PORT`** (default: `3000`) - Server port
- **`CONTENT_DIR`** (optional) - Custom path to content directory (defaults to `src/content`)

Create a `.env` file based on `.env.example` to customize these values.

### Discovery Endpoint

The server provides a `.well-known/tea` endpoint (without version prefix) for TEA discovery:

```
GET /.well-known/tea
```

Returns:
```json
{
  "endpoints": [
    {
      "versions": ["0.2.0-beta.2"],
      "url": "http://localhost:3000"
    }
  ],
  "schemaVersion": 1
}
```

Note that URL is based on the SERVER_HOST env variable.

## Testing
To test the implementation:
1. Copy content from `sample_content/` to `src/content/`
2. Start the server: `npm run start:dev`
3. Access the API endpoints with version prefix:
   - `GET /v0.2.0-beta.2/products`
   - `GET /v0.2.0-beta.2/product/{uuid}`
   - `GET /v0.2.0-beta.2/product/{uuid}/releases`
   - etc.
