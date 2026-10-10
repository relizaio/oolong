import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { INestApplication } from '@nestjs/common';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import * as yaml from 'js-yaml';
import request from 'supertest';
import { createApp } from '../src/tea/create-app';

const COMPONENT = '33333333-3333-4333-8333-333333333333';
const RELEASE = '44444444-4444-4444-8444-444444444444';
const DISTRIBUTION = '66666666-6666-4666-8666-666666666666';
const SHA256 = 'ab'.repeat(32);

describe('distribution representation (e2e)', () => {
  let app: INestApplication;
  let root: string;

  beforeAll(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'oolong-distribution-'));
    const releaseDir = path.join(root, 'components', 'part', 'releases', '1');
    fs.mkdirSync(releaseDir, { recursive: true });
    fs.writeFileSync(
      path.join(root, 'components', 'part', 'component.yaml'),
      `uuid: ${COMPONENT}\nname: Part\nidentifiers: []\n`,
    );
    fs.writeFileSync(
      path.join(releaseDir, 'release.yaml'),
      [
        `uuid: ${RELEASE}`,
        `component: ${COMPONENT}`,
        'version: "1.0.0"',
        "createdDate: '2026-01-15T00:00:00Z'",
        'distributions:',
        `  - distributionId: ${DISTRIBUTION}`,
        '    name: internal-label',
        '    description: Binary',
        '    identifiers:',
        '      - idType: PURL',
        '        idValue: pkg:generic/oolong-fixture/part@1.0.0?type=bin',
        '      - idType: CPE',
        '        idValue: cpe:2.3:a:oolong:part',
        '    checksums:',
        '      - algType: SHA-256',
        `        algValue: ${SHA256}`,
        '    url: https://example.invalid/part.bin',
        '    signatureUrl: https://example.invalid/part.bin.asc',
      ].join('\n'),
    );
    process.env.CONTENT_DIR = root;
    process.env.SERVER_HOST = 'http://127.0.0.1:3000';
    process.env.API_VERSION = 'v1.0.0';
    app = await createApp();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('serves distribution checksums and identifiers', async () => {
    const res = await request(app.getHttpServer())
      .get(`/v1.0.0/componentRelease/${RELEASE}`)
      .expect(200);
    expect(res.body.distributions).toEqual([
      {
        distributionId: DISTRIBUTION,
        name: 'internal-label',
        description: 'Binary',
        identifiers: [
          {
            idType: 'PURL',
            idValue: 'pkg:generic/oolong-fixture/part@1.0.0?type=bin',
          },
          { idType: 'CPE', idValue: 'cpe:2.3:a:oolong:part' },
        ],
        checksums: [{ algType: 'SHA-256', algValue: SHA256 }],
        url: 'https://example.invalid/part.bin',
        signatureUrl: 'https://example.invalid/part.bin.asc',
      },
    ]);
    const specPath = path.resolve(__dirname, '../../../tea-spec/openapi.yaml');
    const document = yaml.load(fs.readFileSync(specPath, 'utf8')) as object;
    const ajv = new Ajv2020({
      strict: false,
      allErrors: true,
      validateSchema: false,
    });
    addFormats(ajv);
    ajv.addSchema(document, 'tea');
    const valid = ajv.validate(
      'tea#/components/schemas/component-release-with-collection',
      res.body,
    );
    if (!valid) {
      throw new Error(ajv.errorsText(ajv.errors, { separator: '\n' }));
    }
  });
});
