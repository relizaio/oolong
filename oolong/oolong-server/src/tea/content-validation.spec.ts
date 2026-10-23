import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ContentStore } from './content-store';

const ART = '55555555-5555-4555-8555-555555555555';
const SHA256 = 'ab'.repeat(32);

const DIGESTS: Record<string, number> = {
  'SHA-1': 40,
  'SHA-256': 64,
  'SHA-384': 96,
  'SHA-512': 128,
  'SHA3-256': 64,
  'SHA3-384': 96,
  'SHA3-512': 128,
  'BLAKE2b-256': 64,
  'BLAKE2b-384': 96,
  'BLAKE2b-512': 128,
  BLAKE3: 64,
};

function tempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'oolong-validate-'));
}

function writeArtifact(root: string, body: string): void {
  const dir = path.join(root, 'artifacts', ART);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'v1.yaml'), body);
}

function artifactYaml(formatBody: string): string {
  return [
    `uuid: ${ART}`,
    'version: 1',
    'type: OTHER',
    "createdDate: '2026-01-15T00:00:00Z'",
    'formats:',
    formatBody,
  ].join('\n');
}

describe('content checksum and URI validation', () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('accepts every pinned checksum algorithm at its exact digest length', () => {
    const root = tempRoot();
    roots.push(root);
    const formats = Object.entries(DIGESTS)
      .map(([alg, length], index) =>
        [
          `  - mediaType: application/x-digest-${index}`,
          '    checksums:',
          `      - algType: ${alg}`,
          `        algValue: ${'ab'.repeat(length / 2)}`,
        ].join('\n'),
      )
      .join('\n');
    writeArtifact(root, artifactYaml(formats));
    const store = new ContentStore(root);
    const formatsOut = store.artifact(ART, 1)?.meta.formats ?? [];
    expect(formatsOut).toHaveLength(Object.keys(DIGESTS).length);
    expect(formatsOut.map((format) => format.checksums?.[0].algType)).toEqual(
      Object.keys(DIGESTS),
    );
  });

  it.each([
    ['abc', 'abc'],
    ['uppercase hex', 'AB'.repeat(32)],
    ['non-hex characters', `${'a'.repeat(63)}g`],
    ['one character short', 'a'.repeat(63)],
    ['one character long', 'a'.repeat(65)],
    ['empty value', ''],
    ['algorithm length mismatch', 'a'.repeat(40)],
  ])('rejects a SHA-256 algValue that is %s', (_label, algValue) => {
    const root = tempRoot();
    roots.push(root);
    writeArtifact(
      root,
      artifactYaml(
        [
          '  - mediaType: application/json',
          '    checksums:',
          '      - algType: SHA-256',
          `        algValue: "${algValue}"`,
        ].join('\n'),
      ),
    );
    expect(() => new ContentStore(root)).toThrow(/algValue for SHA-256/);
  });

  it('accepts http and https URIs, including an unreachable host', () => {
    const root = tempRoot();
    roots.push(root);
    writeArtifact(
      root,
      artifactYaml(
        [
          '  - mediaType: application/json',
          '    url: https://example.invalid/fixture-widget-r1.json',
          '    signatureUrl: http://example.com/fixture.sig',
          '    checksums:',
          '      - algType: SHA-256',
          `        algValue: ${SHA256}`,
        ].join('\n'),
      ),
    );
    const format = new ContentStore(root).artifact(ART, 1)?.meta.formats[0];
    expect(format?.url).toBe('https://example.invalid/fixture-widget-r1.json');
    expect(format?.signatureUrl).toBe('http://example.com/fixture.sig');
  });

  it.each([
    ['malformed', 'not-a-uri'],
    ['whitespace', 'https://example.com/a b'],
    ['invalid scheme', '1http://example.com/file'],
    ['malformed percent-encoding', 'https://example.com/%ZZ'],
  ])('rejects a url with %s', (_label, url) => {
    const root = tempRoot();
    roots.push(root);
    writeArtifact(
      root,
      artifactYaml(
        [
          '  - mediaType: application/json',
          `    url: "${url}"`,
          '    checksums:',
          '      - algType: SHA-256',
          `        algValue: ${SHA256}`,
        ].join('\n'),
      ),
    );
    expect(() => new ContentStore(root)).toThrow(/url must be a URI/);
  });

  it('rejects a malformed signatureUrl without rewriting it', () => {
    const root = tempRoot();
    roots.push(root);
    writeArtifact(
      root,
      artifactYaml(
        [
          '  - mediaType: application/json',
          '    signatureUrl: "https://example.com/%ZZ"',
          '    checksums:',
          '      - algType: SHA-256',
          `        algValue: ${SHA256}`,
        ].join('\n'),
      ),
    );
    expect(() => new ContentStore(root)).toThrow(/signatureUrl must be a URI/);
  });

  it('omits a malformed optional preRelease instead of emitting it', () => {
    const root = tempRoot();
    roots.push(root);
    const product = '11111111-1111-4111-8111-111111111111';
    const release = '22222222-2222-4222-8222-222222222222';
    fs.mkdirSync(path.join(root, 'products', 'alpha', 'releases', '1'), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(root, 'products', 'alpha', 'product.yaml'),
      `uuid: ${product}\nname: Alpha\nidentifiers: []\n`,
    );
    fs.writeFileSync(
      path.join(root, 'products', 'alpha', 'releases', '1', 'release.yaml'),
      [
        `uuid: ${release}`,
        `product: ${product}`,
        'version: "1.0.0"',
        "createdDate: '2026-01-15T00:00:00Z'",
        'preRelease: "yes"',
        'components: []',
      ].join('\n'),
    );
    const loaded = new ContentStore(root).productReleases.get(release);
    expect(loaded?.preRelease).toBeUndefined();
  });

  it('keeps distribution checksums and identifiers and rejects a bad digest', () => {
    const root = tempRoot();
    roots.push(root);
    const component = '33333333-3333-4333-8333-333333333333';
    const release = '44444444-4444-4444-8444-444444444444';
    const distribution = '66666666-6666-4666-8666-666666666666';
    fs.mkdirSync(path.join(root, 'components', 'part', 'releases', '1'), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(root, 'components', 'part', 'component.yaml'),
      `uuid: ${component}\nname: Part\nidentifiers: []\n`,
    );
    const releaseYaml = [
      `uuid: ${release}`,
      `component: ${component}`,
      'version: "1.0.0"',
      "createdDate: '2026-01-15T00:00:00Z'",
      'distributions:',
      `  - distributionId: ${distribution}`,
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
    ].join('\n');
    fs.writeFileSync(
      path.join(root, 'components', 'part', 'releases', '1', 'release.yaml'),
      releaseYaml,
    );
    const loaded = new ContentStore(root).componentReleases.get(release);
    expect(loaded?.distributions).toEqual([
      {
        distributionId: distribution,
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
      },
    ]);

    const bad = tempRoot();
    roots.push(bad);
    fs.mkdirSync(path.join(bad, 'components', 'part', 'releases', '1'), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(bad, 'components', 'part', 'component.yaml'),
      `uuid: ${component}\nname: Part\nidentifiers: []\n`,
    );
    fs.writeFileSync(
      path.join(bad, 'components', 'part', 'releases', '1', 'release.yaml'),
      releaseYaml.replace(SHA256, 'abc'),
    );
    expect(() => new ContentStore(bad)).toThrow(/algValue for SHA-256/);
  });
});
