import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { INestApplication } from '@nestjs/common';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import * as yaml from 'js-yaml';
import request from 'supertest';
import { createApp } from '../src/tea/create-app';

const ART = '55555555-5555-4555-8555-555555555555';
const UNSIGNED = '55555555-5555-4555-8555-555555555557';
const PRODUCT = '11111111-1111-4111-8111-111111111111';
const RELEASE = '22222222-2222-4222-8222-222222222222';
const RELEASE_NO_DATE = '22222222-2222-4222-8222-222222222224';
const COMPONENT = '33333333-3333-4333-8333-333333333333';
const COMPONENT_RELEASE = '44444444-4444-4444-8444-444444444444';
const MISSING = '99999999-9999-4999-8999-999999999999';
const JSON_SUM =
  '8c5170df0ae7a47f77b2f0b1f03c04500343aa2a26863098d2f133b9350d0f98';

function etagOf(bytes: Buffer): string {
  const hex = createHash('sha256')
    .update(Buffer.concat([Buffer.from('tea-representation-v1\0'), bytes]))
    .digest('hex');
  return `"${hex}"`;
}

function emptyPayload(body: unknown): boolean {
  if (body === undefined || body === null || body === '') return true;
  if (Buffer.isBuffer(body)) return body.length === 0;
  if (typeof body === 'object') return Object.keys(body).length === 0;
  return false;
}

function rawBody(
  res: request.Response,
  callback: (err: Error | null, body: Buffer) => void,
): void {
  const chunks: Buffer[] = [];
  res.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
  res.on('end', () => callback(null, Buffer.concat(chunks)));
}

describe('TEA 1.0.0 (e2e)', () => {
  let app: INestApplication;
  const root = path.resolve(__dirname, '../../fixtures/tea-1.0.0');
  const jsonBytes = fs.readFileSync(
    path.join(root, 'artifacts', ART, 'widget.json'),
  );
  const xmlBytes = fs.readFileSync(
    path.join(root, 'artifacts', ART, 'widget.xml'),
  );
  const sigBytes = fs.readFileSync(
    path.join(root, 'artifacts', ART, 'widget.json.sig'),
  );
  const jsonEtag = etagOf(jsonBytes);

  beforeAll(async () => {
    process.env.CONTENT_DIR = root;
    process.env.SERVER_HOST = 'http://127.0.0.1:3000';
    process.env.API_VERSION = 'v1.0.0';
    app = await createApp();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => app.getHttpServer();

  it('advertises 1.0.0 from well-known without the version prefix', async () => {
    const res = await request(server()).get('/.well-known/tea').expect(200);
    expect(res.body).toEqual({
      schemaVersion: 1,
      endpoints: [
        { url: 'http://127.0.0.1:3000', versions: ['1.0.0'], priority: 1 },
      ],
    });
    expect(JSON.stringify(res.body)).not.toContain('/v1.0.0');
  });

  it('answers HEAD for JSON with the GET content length and an empty body', async () => {
    const get = await request(server()).get('/.well-known/tea').expect(200);
    const head = await request(server()).head('/.well-known/tea').expect(200);
    expect(head.headers['content-length']).toBe(
      String(Buffer.byteLength(JSON.stringify(get.body))),
    );
    expect(head.text ?? '').toBe('');
  });

  it('ignores Authorization and does not serve Hello World', async () => {
    const res = await request(server())
      .get('/v1.0.0/products')
      .set('Authorization', 'Bearer not-a-token')
      .expect(200);
    expect(res.body.results.length).toBeGreaterThan(0);
    await request(server()).get('/v1.0.0/').expect(404);
  });

  it('uses the TEA error schema for known operations and Nest 404 for unmounted paths', async () => {
    const unknown = await request(server())
      .get(`/v1.0.0/product/${MISSING}`)
      .expect(404);
    expect(unknown.body).toEqual({ error: 'OBJECT_UNKNOWN' });
    const malformed = await request(server())
      .get('/v1.0.0/product/not-a-uuid')
      .expect(400);
    expect(malformed.body.error).toBe('INVALID_REQUEST');
    const missing = await request(server())
      .get('/v1.0.0/does-not-exist')
      .expect(404);
    expect(missing.body.statusCode).toBe(404);
    expect(missing.body.error).toBe('Not Found');
  });

  it('discovers by tei or purl and rejects unknown, empty, and combined queries', async () => {
    const tei = `tei://localhost/uuid/${RELEASE}`;
    const byTei = await request(server())
      .get('/v1.0.0/discovery')
      .query({ tei })
      .expect(200);
    expect(byTei.body).toEqual([
      {
        productReleaseUuid: RELEASE,
        servers: [
          {
            rootUrl: 'http://127.0.0.1:3000',
            versions: ['1.0.0'],
            priority: 1,
          },
        ],
      },
    ]);
    const unknownTei = await request(server())
      .get('/v1.0.0/discovery')
      .query({
        tei: 'tei://localhost/uuid/99999999-9999-4999-8999-999999999999',
      })
      .expect(404);
    expect(unknownTei.body).toEqual({ error: 'OBJECT_UNKNOWN' });
    const byPurl = await request(server())
      .get('/v1.0.0/discovery')
      .query({ purl: 'pkg:generic/oolong-fixture/widget@1.0.0' })
      .expect(200);
    expect(byPurl.body[0].productReleaseUuid).toBe(RELEASE);
    const encoded = await request(server())
      .get(
        `/v1.0.0/discovery?tei=${encodeURIComponent(encodeURIComponent(tei))}`,
      )
      .expect(404);
    expect(encoded.body.error).toBe('OBJECT_UNKNOWN');
    const productPurl = await request(server())
      .get('/v1.0.0/discovery')
      .query({ purl: 'pkg:generic/oolong-fixture/widget' })
      .expect(404);
    expect(productPurl.body.error).toBe('OBJECT_UNKNOWN');
    const neither = await request(server())
      .get('/v1.0.0/discovery')
      .expect(400);
    expect(neither.body.error).toBe('INVALID_REQUEST');
    const both = await request(server())
      .get('/v1.0.0/discovery')
      .query({ tei, purl: 'pkg:x/y' })
      .expect(400);
    expect(both.body.error).toBe('INVALID_REQUEST');
  });

  it('pages products and rejects a token reused on another operation', async () => {
    const first = await request(server())
      .get('/v1.0.0/products')
      .query({ pageSize: '2' })
      .expect(200);
    expect(
      first.body.results.map((item: { name: string }) => item.name),
    ).toEqual(['Alpha Fixture', 'Beta Fixture']);
    expect(first.body.hasNext).toBe(true);
    const second = await request(server())
      .get('/v1.0.0/products')
      .query({ pageToken: first.body.nextPageToken })
      .expect(200);
    expect(
      second.body.results.map((item: { name: string }) => item.name),
    ).toEqual(['Delta Fixture', 'Epsilon Fixture']);
    const third = await request(server())
      .get('/v1.0.0/products')
      .query({ pageToken: second.body.nextPageToken })
      .expect(200);
    expect(
      third.body.results.map((item: { name: string }) => item.name),
    ).toEqual(['Gamma Fixture']);
    expect(third.body.hasNext).toBe(false);
    expect(third.body.nextPageToken).toBeUndefined();
    const again = await request(server())
      .get('/v1.0.0/products')
      .query({ pageToken: first.body.nextPageToken })
      .expect(200);
    expect(again.body.results[0].name).toBe('Delta Fixture');
    const crossed = await request(server())
      .get('/v1.0.0/components')
      .query({ pageToken: first.body.nextPageToken })
      .expect(400);
    expect(crossed.body.error).toBe('INVALID_PAGE_TOKEN');
    const filtered = await request(server())
      .get('/v1.0.0/products')
      .query({
        pageToken: first.body.nextPageToken,
        idType: 'CPE',
        idValue: 'cpe:2.3:a:oolong:fixture-widget',
      })
      .expect(400);
    expect(filtered.body.error).toBe('INVALID_PAGE_TOKEN');
    const bad = await request(server())
      .get('/v1.0.0/products')
      .query({ pageToken: 'not-a-token' })
      .expect(400);
    expect(bad.body.error).toBe('INVALID_PAGE_TOKEN');
    const releasePage = await request(server())
      .get(`/v1.0.0/product/${PRODUCT}/releases`)
      .query({ pageSize: '1' })
      .expect(200);
    const sortMismatch = await request(server())
      .get(`/v1.0.0/product/${PRODUCT}/releases`)
      .query({
        pageToken: releasePage.body.nextPageToken,
        sortField: 'version',
      })
      .expect(400);
    expect(sortMismatch.body.error).toBe('INVALID_PAGE_TOKEN');
    const parentMismatch = await request(server())
      .get('/v1.0.0/product/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/releases')
      .query({ pageToken: releasePage.body.nextPageToken })
      .expect(400);
    expect(parentMismatch.body.error).toBe('INVALID_PAGE_TOKEN');
    const huge = await request(server())
      .get('/v1.0.0/products')
      .query({ pageSize: '101' })
      .expect(400);
    expect(huge.body.error).toBe('INVALID_REQUEST');
    const one = await request(server())
      .get('/v1.0.0/products')
      .query({ pageSize: '1' })
      .expect(200);
    expect(one.body.results).toHaveLength(1);
    const full = await request(server())
      .get('/v1.0.0/products')
      .query({ pageSize: '100' })
      .expect(200);
    expect(full.body.hasNext).toBe(false);
    const empty = await request(server())
      .get('/v1.0.0/products')
      .query({ idType: 'PURL', idValue: 'pkg:missing' })
      .expect(200);
    expect(empty.body).toEqual({ hasNext: false, results: [] });
    const lone = await request(server())
      .get('/v1.0.0/products')
      .query({ idType: 'PURL' })
      .expect(400);
    expect(lone.body.error).toBe('INVALID_REQUEST');
  });

  it('returns flat releases, stable collection versions, and parent 404s', async () => {
    const product = await request(server())
      .get(`/v1.0.0/product/${PRODUCT}`)
      .expect(200);
    expect(product.body.name).toBe('Alpha Fixture');
    const releases = await request(server())
      .get(`/v1.0.0/product/${PRODUCT}/releases`)
      .expect(200);
    expect(
      releases.body.results.map((item: { version: string }) => item.version),
    ).toEqual(['0.9.0', '1.0.0', '1.1.0']);
    const byDate = await request(server())
      .get(`/v1.0.0/product/${PRODUCT}/releases`)
      .query({ sortField: 'releaseDate' })
      .expect(200);
    expect(
      byDate.body.results.map((item: { uuid: string }) => item.uuid),
    ).toEqual([
      RELEASE,
      '22222222-2222-4222-8222-222222222223',
      RELEASE_NO_DATE,
    ]);
    const view = await request(server())
      .get(`/v1.0.0/productRelease/${RELEASE}`)
      .expect(200);
    expect(view.body.release).toBeUndefined();
    expect(view.body.uuid).toBe(RELEASE);
    expect(view.body.latestCollection.version).toBe(2);
    expect(view.body.latestCollection.uuid).toBe(RELEASE);
    expect(view.body.latestCollection.artifacts[0].version).toBe(2);
    const older = await request(server())
      .get(`/v1.0.0/productRelease/${RELEASE}/collection/1`)
      .expect(200);
    expect(older.body.artifacts[0].version).toBe(1);
    const latest = await request(server())
      .get(`/v1.0.0/productRelease/${RELEASE}/collection/latest`)
      .expect(200);
    expect(latest.body.version).toBe(2);
    const synthetic = await request(server())
      .get(
        '/v1.0.0/productRelease/22222222-2222-4222-8222-222222222223/collection/latest',
      )
      .expect(200);
    expect(synthetic.body).toMatchObject({
      version: 1,
      artifacts: [],
      updateReason: { type: 'INITIAL_RELEASE' },
    });
    const missingParent = await request(server())
      .get(`/v1.0.0/product/${MISSING}/releases`)
      .expect(404);
    expect(missingParent.body.error).toBe('OBJECT_UNKNOWN');
    const component = await request(server())
      .get(`/v1.0.0/componentRelease/${COMPONENT_RELEASE}`)
      .expect(200);
    expect(component.body.latestCollection.version).toBe(2);
    expect(component.body.component).toBe(COMPONENT);
    const componentLatest = await request(server())
      .get(`/v1.0.0/componentRelease/${COMPONENT_RELEASE}/collection/1`)
      .expect(200);
    expect(componentLatest.body.artifacts).toEqual([]);
  });

  it('serves artifact metadata, bytes, validators, and signatures', async () => {
    const latest = await request(server())
      .get(`/v1.0.0/artifact/${ART}/latest`)
      .expect(200);
    expect(latest.body.version).toBe(2);
    expect(latest.body.formats[0].mediaType).toBe(
      'application/vnd.cyclonedx+json',
    );
    expect(latest.body.formats[0].checksums[0].algValue).toBe(JSON_SUM);
    expect(latest.body.formats[0].url).toBeUndefined();
    const version1 = await request(server())
      .get(`/v1.0.0/artifact/${ART}/1`)
      .expect(200);
    expect(version1.body.formats[0].url).toBe(
      'https://example.invalid/fixture-widget-r1.json',
    );
    await request(server()).get(`/v1.0.0/artifact/${ART}/0`).expect(404);
    const badVersion = await request(server())
      .get(`/v1.0.0/artifact/${ART}/01`)
      .expect(400);
    expect(badVersion.body.error).toBe('INVALID_REQUEST');

    const external = await request(server())
      .get(`/v1.0.0/artifact/${ART}/1/download`)
      .expect(302);
    expect(external.headers.location).toBe(
      'https://example.invalid/fixture-widget-r1.json',
    );

    const download = await request(server())
      .get(`/v1.0.0/artifact/${ART}/2/download`)
      .parse(rawBody)
      .expect(200);
    expect(Buffer.compare(download.body as Buffer, jsonBytes)).toBe(0);
    expect(download.headers.etag).toBe(jsonEtag);
    expect(download.headers.etag).not.toBe(`"${JSON_SUM}"`);
    expect(download.headers['content-type']).toContain(
      'application/vnd.cyclonedx+json',
    );
    expect(download.headers['content-location']).toBe(
      `http://127.0.0.1:3000/v1.0.0/artifact/${ART}/2/download?mediaType=application%2Fvnd.cyclonedx%2Bjson`,
    );
    expect(download.headers['cache-control']).toBe(
      'public, max-age=31536000, immutable',
    );
    expect(download.headers.vary).toBe('Accept');
    expect(download.headers['content-encoding']).toBeUndefined();

    const head = await request(server())
      .head(`/v1.0.0/artifact/${ART}/2/download`)
      .parse(rawBody)
      .expect(200);
    expect(head.headers['content-length']).toBe(String(jsonBytes.length));
    expect(head.headers.etag).toBe(jsonEtag);
    expect(head.headers['content-type']).toContain(
      'application/vnd.cyclonedx+json',
    );
    expect(head.headers.vary).toBe('Accept');
    expect(emptyPayload(head.body)).toBe(true);

    const latestDownload = await request(server())
      .get(`/v1.0.0/artifact/${ART}/latest/download`)
      .parse(rawBody)
      .expect(200);
    expect(latestDownload.headers['cache-control']).toBe('no-cache');
    expect(latestDownload.headers['content-location']).toContain(
      `/${ART}/2/download?`,
    );

    const pinned = await request(server())
      .get(`/v1.0.0/artifact/${ART}/2/download`)
      .query({ mediaType: 'application/vnd.cyclonedx+xml' })
      .parse(rawBody)
      .expect(200);
    expect(Buffer.compare(pinned.body as Buffer, xmlBytes)).toBe(0);
    expect(pinned.headers.vary).toBeUndefined();

    const negotiated = await request(server())
      .get(`/v1.0.0/artifact/${ART}/2/download`)
      .set('Accept', 'application/vnd.cyclonedx+xml')
      .parse(rawBody)
      .expect(200);
    expect(Buffer.compare(negotiated.body as Buffer, xmlBytes)).toBe(0);

    const unacceptable = await request(server())
      .get(`/v1.0.0/artifact/${ART}/2/download`)
      .set('Accept', 'text/plain')
      .expect(406);
    expect(unacceptable.body.error).toBe('NO_ACCEPTABLE_FORMAT');

    const notModified = await request(server())
      .get(`/v1.0.0/artifact/${ART}/2/download`)
      .set('If-None-Match', jsonEtag)
      .parse(rawBody)
      .expect(304);
    expect(notModified.headers.etag).toBe(jsonEtag);
    expect(notModified.headers['content-location']).toContain(
      `/${ART}/2/download?`,
    );
    expect(notModified.headers['cache-control']).toBe(
      'public, max-age=31536000, immutable',
    );
    expect(notModified.headers.vary).toBe('Accept');
    expect(emptyPayload(notModified.body)).toBe(true);

    const checksum = await request(server())
      .get(`/v1.0.0/artifact/${ART}/2/download`)
      .set('If-None-Match', `"${JSON_SUM}"`)
      .parse(rawBody)
      .expect(200);
    expect(Buffer.compare(checksum.body as Buffer, jsonBytes)).toBe(0);

    const signature = await request(server())
      .get(`/v1.0.0/artifact/${ART}/2/signature/download`)
      .parse(rawBody)
      .expect(200);
    expect(Buffer.compare(signature.body as Buffer, sigBytes)).toBe(0);
    expect(signature.headers['content-type']).toContain(
      'application/octet-stream',
    );

    const unsigned = await request(server())
      .get(`/v1.0.0/artifact/${UNSIGNED}/1/signature/download`)
      .expect(404);
    expect(unsigned.body.error).toBe('SIGNATURE_NOT_FOUND');
    const unknownSig = await request(server())
      .get(`/v1.0.0/artifact/${MISSING}/1/signature/download`)
      .expect(404);
    expect(unknownSig.body.error).toBe('OBJECT_UNKNOWN');
  });

  it('varies one-format downloads on Accept', async () => {
    const path = `/v1.0.0/artifact/${UNSIGNED}/1/download`;
    const matching = await request(server())
      .get(path)
      .set('Accept', 'application/json')
      .parse(rawBody)
      .expect(200);
    expect(matching.headers['content-type']).toContain('application/json');
    expect(matching.headers.vary).toBe('Accept');
    expect((matching.body as Buffer).length).toBeGreaterThan(0);

    const wildcard = await request(server())
      .get(path)
      .set('Accept', '*/*')
      .parse(rawBody)
      .expect(200);
    expect(wildcard.headers['content-type']).toContain('application/json');
    expect(wildcard.headers.vary).toBe('Accept');

    const absent = await request(server())
      .get(path)
      .unset('Accept')
      .parse(rawBody)
      .expect(200);
    expect(absent.headers['content-type']).toContain('application/json');
    expect(absent.headers.vary).toBe('Accept');

    const rejected = await request(server())
      .get(path)
      .set('Accept', 'text/plain')
      .expect(406);
    expect(rejected.body.error).toBe('NO_ACCEPTABLE_FORMAT');

    const pinned = await request(server())
      .get(path)
      .query({ mediaType: 'application/json' })
      .set('Accept', 'text/plain')
      .parse(rawBody)
      .expect(200);
    expect(pinned.headers['content-type']).toContain('application/json');
    expect(pinned.headers.vary).toBeUndefined();

    const head = await request(server())
      .head(path)
      .set('Accept', 'application/json')
      .parse(rawBody)
      .expect(200);
    expect(head.headers.vary).toBe('Accept');
    expect(head.headers['content-type']).toContain('application/json');
    expect(emptyPayload(head.body)).toBe(true);

    const headRejected = await request(server())
      .head(path)
      .set('Accept', 'text/plain')
      .parse(rawBody)
      .expect(406);
    expect(emptyPayload(headRejected.body)).toBe(true);

    const json = await request(server())
      .get(`/v1.0.0/artifact/${ART}/2/download`)
      .set('Accept', 'application/vnd.cyclonedx+json')
      .parse(rawBody)
      .expect(200);
    const xml = await request(server())
      .get(`/v1.0.0/artifact/${ART}/2/download`)
      .set('Accept', 'application/vnd.cyclonedx+xml')
      .parse(rawBody)
      .expect(200);
    expect(json.headers.vary).toBe('Accept');
    expect(xml.headers.vary).toBe('Accept');
    expect(Buffer.compare(json.body as Buffer, xml.body as Buffer)).not.toBe(0);

    const headMany = await request(server())
      .head(`/v1.0.0/artifact/${ART}/2/download`)
      .set('Accept', 'application/vnd.cyclonedx+xml')
      .parse(rawBody)
      .expect(200);
    expect(headMany.headers.vary).toBe('Accept');
    expect(emptyPayload(headMany.body)).toBe(true);

    const notModified = await request(server())
      .get(path)
      .set('Accept', 'application/json')
      .set('If-None-Match', matching.headers.etag)
      .parse(rawBody)
      .expect(304);
    expect(notModified.headers.etag).toBe(matching.headers.etag);
    expect(notModified.headers.vary).toBe('Accept');
    expect(emptyPayload(notModified.body)).toBe(true);
  });

  it('reports CLE and token absence without treating a missing object as unimplemented', async () => {
    const present = await request(server())
      .get(`/v1.0.0/product/${PRODUCT}/cle`)
      .expect(404);
    expect(present.body.error).toBe('NOT_IMPLEMENTED');
    const absent = await request(server())
      .get(`/v1.0.0/product/${MISSING}/cle`)
      .expect(404);
    expect(absent.body.error).toBe('OBJECT_UNKNOWN');
    const component = await request(server())
      .get(`/v1.0.0/component/${COMPONENT}/cle`)
      .expect(404);
    expect(component.body.error).toBe('NOT_IMPLEMENTED');
    const release = await request(server())
      .get(`/v1.0.0/productRelease/${RELEASE}/cle`)
      .expect(404);
    expect(release.body.error).toBe('NOT_IMPLEMENTED');
    const componentRelease = await request(server())
      .get(`/v1.0.0/componentRelease/${COMPONENT_RELEASE}/cle`)
      .expect(404);
    expect(componentRelease.body.error).toBe('NOT_IMPLEMENTED');
    const token = await request(server())
      .post('/v1.0.0/token')
      .send('grant_type=client_credentials')
      .expect(404);
    expect(token.body.error).toBe('NOT_IMPLEMENTED');
  });

  it('does not read files from a traversal-shaped identifier', async () => {
    const res = await request(server())
      .get('/v1.0.0/product/..%2F..%2Fetc%2Fpasswd')
      .expect(400);
    expect(res.body.error).toBe('INVALID_REQUEST');
    expect(JSON.stringify(res.body)).not.toContain('root:');
  });

  it('matches the pinned schemas for representative responses', async () => {
    const specPath = path.resolve(__dirname, '../../../tea-spec/openapi.yaml');
    const document = yaml.load(fs.readFileSync(specPath, 'utf8')) as object;
    const ajv = new Ajv2020({
      strict: false,
      allErrors: true,
      validateSchema: false,
    });
    addFormats(ajv);
    ajv.addSchema(document, 'tea');
    const check = async (url: string, schema: string) => {
      const res = await request(server()).get(url).expect(200);
      const valid = ajv.validate(`tea#/components/schemas/${schema}`, res.body);
      if (!valid) {
        throw new Error(
          `${schema}: ${ajv.errorsText(ajv.errors, { separator: '\n' })}`,
        );
      }
    };
    await check(`/v1.0.0/product/${PRODUCT}`, 'product');
    await check(
      `/v1.0.0/productRelease/${RELEASE}`,
      'product-release-with-collection',
    );
    await check(`/v1.0.0/component/${COMPONENT}`, 'component');
    await check(
      `/v1.0.0/componentRelease/${COMPONENT_RELEASE}`,
      'component-release-with-collection',
    );
    await check(
      `/v1.0.0/productRelease/${RELEASE}/collection/latest`,
      'collection',
    );
    await check(`/v1.0.0/artifact/${ART}/2`, 'artifact');
    await check('/v1.0.0/products?pageSize=2', 'paginated-product-response');
    const discovery = await request(server())
      .get('/v1.0.0/discovery')
      .query({
        tei: 'tei://localhost/uuid/22222222-2222-4222-8222-222222222222',
      })
      .expect(200);
    expect(Array.isArray(discovery.body)).toBe(true);
    for (const item of discovery.body as unknown[]) {
      const valid = ajv.validate(
        'tea#/components/schemas/discovery-info',
        item,
      );
      if (!valid) {
        throw new Error(
          `discovery-info: ${ajv.errorsText(ajv.errors, { separator: '\n' })}`,
        );
      }
    }
  });
});
