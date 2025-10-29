![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

 **Social:**
[![Discord](https://img.shields.io/discord/757425726143201370.svg?color=%237289da&label=Discord&logo=discord&logoColor=%237289da)](https://discord.gg/UTxjBf9juQ)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-blue.svg?logo=LinkedIn)](https://www.linkedin.com/company/relizaio/)

# Oolong - lightweight TEA server implementation

This project is a lightweight implementation of [Transparency Exchange API](https://github.com/CycloneDX/transparency-exchange-api/) which uses [NestJS](https://nestjs.com/) framework.

If you are looking for a full-featured TEA server implementation with UI and built-in artifact storage, please refer to [ReARM](https://github.com/reliza/rearm).

## Build Container Image

The provided Dockerfile will package content from `content/` directory. We provided some `sample_content/` directory for development and testing purposes. You can copy the content from `sample_content/` to `content/` directory.

```bash
cd oolong
docker build -t oolong-local .
```

## Run Container Image

The following command shows how to run the container image with a custom content directory and environment variables.

```bash
docker run -p 3000:3000 \
  -v /path/to/content:/app/src/content \
  -e API_VERSION=v0.2.0-beta.2 \
  -e SERVER_HOST=https://myserver.com/tea \
  oolong-local
```

It is possible to mount the content directory to the container and use it as a volume. This way, you can update the content directory and the container will use the updated content.

## Run with Docker Compose

### Production Mode

Use the pre-built image from the registry:

```bash
docker-compose up -d
```

This will run the server on `http://localhost:3005` using the image from `registry.relizahub.com/library/oolong-server`.

### Development Mode

Build and run from local Dockerfile with development settings:

```bash
docker-compose -f docker-compose.dev.yml up -d --build
```

This will build the image locally and run with `NODE_ENV=development`.

Both configurations:
- Mount the `./oolong/content` directory to serve TEA content
- Run on port `3005` (mapped to container port `3000`)
- Set `API_VERSION=v0.2.0-beta.2`
- Set `SERVER_HOST=http://localhost:3005`

## Generation from TEA OpenAPI Specification

```bash
npx @openapitools/openapi-generator-cli version-manager set 7.16.0
npx @openapitools/openapi-generator-cli generate -i tea-spec/openapi.yaml -g typescript-nestjs-server -o oolong/oolong-server/src/generated-nest/
```

## Run Locally for Development

```bash
cd oolong/oolong-server/src/generated-nest
npm ci --ignore-scripts

cd ../../
npm ci --ignore-scripts

npm run start:dev
```

## Installation via helm chart

### Using local chart (development mode)
```bash
helm upgrade --install --create-namespace -n oolong oolong helm-chart/oolong
```

## More Documentation
Refer to [IMPLEMENTATION_NOTES.md](oolong/oolong-server/IMPLEMENTATION_NOTES.md) for more details.