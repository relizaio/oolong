import { Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  Artifact,
  Collection,
  Component,
  ComponentRelease,
  ContentStore,
  Product,
  ProductRelease,
} from './content-store';
import { TeaException } from './errors';
import {
  cmpOptionalDate,
  cmpStr,
  pageResult,
  PageQuery,
  resolvePage,
  singleQuery,
  SortOrder,
  withOrder,
} from './pagination';
import {
  cacheControl,
  contentLocation,
  disposition,
  representationEtag,
  selectFormat,
  sendBytes,
  sendRedirect,
  serverHost,
  varyFor,
  API_SEMVER,
} from './representation';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function requireUuid(value: string): string {
  if (!UUID_RE.test(value)) {
    throw new TeaException(400, 'INVALID_REQUEST', 'malformed uuid');
  }
  return value;
}

function requireVersion(value: string): number {
  if (!/^(0|[1-9]\d*)$/.test(value)) {
    throw new TeaException(400, 'INVALID_REQUEST', 'invalid version');
  }
  return Number(value);
}

function tie(primary: number, a: string, b: string, desc: boolean): number {
  if (primary !== 0) return primary;
  return withOrder(cmpStr(a, b), desc);
}

function byName<T extends { name: string; uuid: string }>(
  items: T[],
  desc: boolean,
): T[] {
  return [...items].sort((a, b) =>
    tie(withOrder(cmpStr(a.name, b.name), desc), a.uuid, b.uuid, desc),
  );
}

function matchesId(
  identifiers: { idType: string; idValue: string }[] | undefined,
  idType: string,
  idValue: string,
): boolean {
  if (!idType) return true;
  return (identifiers ?? []).some(
    (id) => id.idType === idType && id.idValue === idValue,
  );
}

@Injectable()
export class TeaService {
  constructor(readonly store: ContentStore) {}

  private queryOf(source: Record<string, unknown>): PageQuery {
    return {
      pageSize: singleQuery(source.pageSize, 'pageSize'),
      pageToken: singleQuery(source.pageToken, 'pageToken'),
      sortField: singleQuery(source.sortField, 'sortField'),
      sortOrder: singleQuery(source.sortOrder, 'sortOrder'),
      idType: singleQuery(source.idType, 'idType'),
      idValue: singleQuery(source.idValue, 'idValue'),
    };
  }

  listProducts(source: Record<string, unknown>) {
    const state = resolvePage(
      this.queryOf(source),
      'products',
      '',
      ['name'],
      'name',
    );
    const desc = state.sortOrder === 'desc';
    const items = byName([...this.store.products.values()], desc).filter(
      (item) => matchesId(item.identifiers, state.idType, state.idValue),
    );
    return pageResult(items, state);
  }

  getProduct(uuid: string): Product {
    const found = this.store.products.get(requireUuid(uuid));
    if (!found) throw new TeaException(404, 'OBJECT_UNKNOWN');
    return found;
  }

  listProductReleases(uuid: string, source: Record<string, unknown>) {
    const id = requireUuid(uuid);
    if (!this.store.products.has(id))
      throw new TeaException(404, 'OBJECT_UNKNOWN');
    const state = resolvePage(
      this.queryOf(source),
      'product-releases',
      id,
      ['createdDate', 'releaseDate', 'version'],
      'createdDate',
    );
    const items = this.sortReleases(
      this.store.releasesByProduct.get(id) ?? [],
      state.sortField,
      state.sortOrder,
    );
    return pageResult(items, state);
  }

  listAllProductReleases(source: Record<string, unknown>) {
    const state = resolvePage(
      this.queryOf(source),
      'product-release-query',
      '',
      ['createdDate', 'releaseDate', 'version'],
      'createdDate',
    );
    const items = this.sortReleases(
      [...this.store.productReleases.values()],
      state.sortField,
      state.sortOrder,
    ).filter((item) =>
      matchesId(item.identifiers, state.idType, state.idValue),
    );
    return pageResult(items, state);
  }

  getProductRelease(
    uuid: string,
  ): ProductRelease & { latestCollection: Collection } {
    const found = this.store.productReleases.get(requireUuid(uuid));
    if (!found) throw new TeaException(404, 'OBJECT_UNKNOWN');
    return this.store.productReleaseView(found);
  }

  listComponents(source: Record<string, unknown>) {
    const state = resolvePage(
      this.queryOf(source),
      'components',
      '',
      ['name'],
      'name',
    );
    const desc = state.sortOrder === 'desc';
    const items = byName([...this.store.components.values()], desc).filter(
      (item) => matchesId(item.identifiers, state.idType, state.idValue),
    );
    return pageResult(items, state);
  }

  getComponent(uuid: string): Component {
    const found = this.store.components.get(requireUuid(uuid));
    if (!found) throw new TeaException(404, 'OBJECT_UNKNOWN');
    return found;
  }

  listComponentReleases(uuid: string, source: Record<string, unknown>) {
    const id = requireUuid(uuid);
    if (!this.store.components.has(id))
      throw new TeaException(404, 'OBJECT_UNKNOWN');
    const state = resolvePage(
      this.queryOf(source),
      'component-releases',
      id,
      ['createdDate', 'releaseDate', 'version'],
      'createdDate',
    );
    const items = this.sortComponentReleases(
      this.store.releasesByComponent.get(id) ?? [],
      state.sortField,
      state.sortOrder,
    );
    return pageResult(items, state);
  }

  listAllComponentReleases(source: Record<string, unknown>) {
    const state = resolvePage(
      this.queryOf(source),
      'component-release-query',
      '',
      ['createdDate', 'releaseDate', 'version'],
      'createdDate',
    );
    const items = this.sortComponentReleases(
      [...this.store.componentReleases.values()],
      state.sortField,
      state.sortOrder,
    ).filter((item) =>
      matchesId(item.identifiers, state.idType, state.idValue),
    );
    return pageResult(items, state);
  }

  getComponentRelease(
    uuid: string,
  ): ComponentRelease & { latestCollection: Collection } {
    const found = this.store.componentReleases.get(requireUuid(uuid));
    if (!found) throw new TeaException(404, 'OBJECT_UNKNOWN');
    return this.store.componentReleaseView(found);
  }

  listCollections(
    kind: 'product' | 'component',
    uuid: string,
    source: Record<string, unknown>,
  ) {
    const release = this.releaseOf(kind, uuid);
    const state = resolvePage(
      this.queryOf(source),
      `${kind}-collections`,
      release.uuid,
      ['version'],
      'version',
    );
    const belongs =
      kind === 'product' ? 'PRODUCT_RELEASE' : 'COMPONENT_RELEASE';
    const items = [
      ...this.store.collectionsFor(release.uuid, belongs, release.createdDate),
    ];
    items.sort((a, b) =>
      withOrder(a.version - b.version, state.sortOrder === 'desc'),
    );
    return pageResult(items, state);
  }

  getCollection(
    kind: 'product' | 'component',
    uuid: string,
    version: string,
  ): Collection {
    const release = this.releaseOf(kind, uuid);
    const belongs =
      kind === 'product' ? 'PRODUCT_RELEASE' : 'COMPONENT_RELEASE';
    const found = this.store.collectionVersion(
      release.uuid,
      requireVersion(version),
      belongs,
      release.createdDate,
    );
    if (!found) throw new TeaException(404, 'OBJECT_UNKNOWN');
    return found;
  }

  getLatestCollection(kind: 'product' | 'component', uuid: string): Collection {
    const release = this.releaseOf(kind, uuid);
    const belongs =
      kind === 'product' ? 'PRODUCT_RELEASE' : 'COMPONENT_RELEASE';
    return this.store.latestCollection(
      release.uuid,
      belongs,
      release.createdDate,
    );
  }

  getArtifact(uuid: string, version: number | 'latest'): Artifact {
    const id = requireUuid(uuid);
    const record =
      version === 'latest'
        ? this.store.latestArtifact(id)
        : this.store.artifact(id, version);
    if (!record) throw new TeaException(404, 'OBJECT_UNKNOWN');
    return record.meta;
  }

  download(
    req: Request,
    res: Response,
    uuid: string,
    version: number | 'latest',
    kind: 'download' | 'signature',
    mediaType: string | undefined,
  ): void {
    const id = requireUuid(uuid);
    const record =
      version === 'latest'
        ? this.store.latestArtifact(id)
        : this.store.artifact(id, version);
    if (!record) throw new TeaException(404, 'OBJECT_UNKNOWN');
    const format = selectFormat(
      record.meta.formats,
      mediaType,
      req.header('accept'),
    );
    const latest = version === 'latest';
    if (kind === 'signature') {
      const sig = record.signatures.get(format.mediaType);
      if (!sig) {
        if (format.signatureUrl) {
          sendRedirect(res, format.signatureUrl);
          return;
        }
        throw new TeaException(404, 'SIGNATURE_NOT_FOUND');
      }
      this.sendFile(
        req,
        res,
        record.meta,
        format.mediaType,
        this.store.readBody(sig),
        'signature',
        latest,
        'application/octet-stream',
        mediaType,
      );
      return;
    }
    const body = record.bodies.get(format.mediaType);
    if (!body) {
      if (format.url) {
        sendRedirect(res, format.url);
        return;
      }
      throw new TeaException(404, 'OBJECT_UNKNOWN');
    }
    this.sendFile(
      req,
      res,
      record.meta,
      format.mediaType,
      this.store.readBody(body),
      'download',
      latest,
      format.mediaType,
      mediaType,
    );
  }

  discover(source: Record<string, unknown>) {
    const tei = singleQuery(source.tei, 'tei');
    const purl = singleQuery(source.purl, 'purl');
    const hasTei = tei !== undefined && tei !== '';
    const hasPurl = purl !== undefined && purl !== '';
    if (hasTei === hasPurl) {
      throw new TeaException(
        400,
        'INVALID_REQUEST',
        'provide exactly one of tei or purl',
      );
    }
    const matches = [...this.store.productReleases.values()].filter(
      (release) => {
        const ids = release.identifiers ?? [];
        if (hasTei)
          return ids.some((id) => id.idType === 'TEI' && id.idValue === tei);
        return ids.some((id) => id.idType === 'PURL' && id.idValue === purl);
      },
    );
    matches.sort((a, b) => cmpStr(a.uuid, b.uuid));
    if (matches.length === 0) throw new TeaException(404, 'OBJECT_UNKNOWN');
    return matches.map((release) => ({
      productReleaseUuid: release.uuid,
      servers: [{ rootUrl: serverHost(), versions: [API_SEMVER], priority: 1 }],
    }));
  }

  cle(
    kind: 'product' | 'component' | 'product-release' | 'component-release',
    uuid: string,
  ): never {
    const id = requireUuid(uuid);
    const exists =
      kind === 'product'
        ? this.store.products.has(id)
        : kind === 'component'
          ? this.store.components.has(id)
          : kind === 'product-release'
            ? this.store.productReleases.has(id)
            : this.store.componentReleases.has(id);
    if (!exists) throw new TeaException(404, 'OBJECT_UNKNOWN');
    throw new TeaException(404, 'NOT_IMPLEMENTED');
  }

  private releaseOf(
    kind: 'product' | 'component',
    uuid: string,
  ): { uuid: string; createdDate: string } {
    const id = requireUuid(uuid);
    if (kind === 'product') {
      const found = this.store.productReleases.get(id);
      if (!found) throw new TeaException(404, 'OBJECT_UNKNOWN');
      return found;
    }
    const found = this.store.componentReleases.get(id);
    if (!found) throw new TeaException(404, 'OBJECT_UNKNOWN');
    return found;
  }

  private sortReleases(
    items: ProductRelease[],
    field: string,
    order: SortOrder,
  ): ProductRelease[] {
    const desc = order === 'desc';
    return [...items].sort((a, b) => {
      let primary = 0;
      if (field === 'releaseDate')
        primary = cmpOptionalDate(a.releaseDate, b.releaseDate, desc);
      else if (field === 'version')
        primary = withOrder(cmpStr(a.version, b.version), desc);
      else primary = withOrder(cmpStr(a.createdDate, b.createdDate), desc);
      return tie(primary, a.uuid, b.uuid, desc);
    });
  }

  private sortComponentReleases(
    items: ComponentRelease[],
    field: string,
    order: SortOrder,
  ): ComponentRelease[] {
    const desc = order === 'desc';
    return [...items].sort((a, b) => {
      let primary = 0;
      if (field === 'releaseDate')
        primary = cmpOptionalDate(a.releaseDate, b.releaseDate, desc);
      else if (field === 'version')
        primary = withOrder(cmpStr(a.version, b.version), desc);
      else primary = withOrder(cmpStr(a.createdDate, b.createdDate), desc);
      return tie(primary, a.uuid, b.uuid, desc);
    });
  }

  private sendFile(
    req: Request,
    res: Response,
    artifact: Artifact,
    mediaType: string,
    bytes: Buffer,
    kind: 'download' | 'signature',
    latest: boolean,
    contentType: string,
    mediaTypeQuery: string | undefined,
  ): void {
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      ETag: representationEtag(bytes),
      'Cache-Control': cacheControl(latest),
      'Content-Location': contentLocation(
        artifact.uuid,
        artifact.version,
        kind,
        mediaType,
      ),
      'Content-Disposition': disposition(
        `${artifact.name ?? 'artifact'}-v${artifact.version}`,
      ),
    };
    const vary = varyFor(mediaTypeQuery);
    if (vary) headers.Vary = vary;
    sendBytes(req, res, bytes, headers);
  }
}
