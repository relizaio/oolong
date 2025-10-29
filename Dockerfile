FROM node:24.10.0-alpine3.22@sha256:775ba24d35a13e74dedce1d2af4ad510337b68d8e22be89e0ce2ccc299329083 AS builder
WORKDIR /app
COPY oolong-server/package*.json ./
RUN npm ci --ignore-scripts
COPY oolong-server/ ./
RUN npm run build

FROM node:24.10.0-alpine3.22@sha256:775ba24d35a13e74dedce1d2af4ad510337b68d8e22be89e0ce2ccc299329083 AS package
ARG CI_ENV=noci
ARG GIT_COMMIT=git_commit_undefined
ARG GIT_BRANCH=git_branch_undefined
ARG VERSION=not_versioned

RUN mkdir /app && echo "version=$VERSION" > /app/version && echo "commit=$GIT_COMMIT" >> /app/version \
    && echo "branch=$GIT_BRANCH" >> /app/version && addgroup -g 10001 -S apprunner && adduser -u 10001 -S apprunner -G apprunner \
    && chown apprunner:apprunner -R /app

WORKDIR /app

COPY --chown=apprunner:apprunner oolong-server/package*.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=builder --chown=apprunner:apprunner /app/dist ./dist
COPY --chown=apprunner:apprunner content ./src/content

USER apprunner

# Set environment variables with defaults
ENV NODE_ENV=production
ENV PORT=3000
ENV API_VERSION=v0.2.0-beta.2
ENV SERVER_HOST=http://localhost:3000

# Expose the port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/.well-known/tea', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"


LABEL org.opencontainers.image.vendor="Reliza Incorporated"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.version="${VERSION}"
LABEL org.opencontainers.image.revision="${GIT_COMMIT}"
LABEL org.opencontainers.image.created="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
LABEL org.opencontainers.image.source="https://github.com/reliza/oolong"
LABEL org.opencontainers.image.url="https://github.com/reliza/oolong"
LABEL org.opencontainers.image.description="Oolong is a minimal TEA server implementation"
LABEL org.opencontainers.image.authors="Reliza Incorporated <info@reliza.io>"
LABEL git_commit="${GIT_COMMIT}"
LABEL git_branch="${GIT_BRANCH}"
LABEL ci_environment="${CI_ENV}"
LABEL version="${VERSION}"

# Start the application
CMD ["node", "dist/main"]
