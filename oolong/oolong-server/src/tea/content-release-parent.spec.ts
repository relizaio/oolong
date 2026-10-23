import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ContentStore } from './content-store';

const PRODUCT = '11111111-1111-4111-8111-111111111111';
const OTHER_PRODUCT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const COMPONENT = '33333333-3333-4333-8333-333333333333';
const OTHER_COMPONENT = '33333333-3333-4333-8333-333333333334';
const RELEASE = '22222222-2222-4222-8222-222222222222';

function tempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'oolong-parent-'));
}

function writeProduct(root: string, folder: string, uuid: string): void {
  const dir = path.join(root, 'products', folder);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'product.yaml'),
    [`uuid: ${uuid}`, `name: ${folder}`, 'identifiers: []'].join('\n'),
  );
}

function writeComponent(root: string, folder: string, uuid: string): void {
  const dir = path.join(root, 'components', folder);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'component.yaml'),
    [`uuid: ${uuid}`, `name: ${folder}`, 'identifiers: []'].join('\n'),
  );
}

function productReleaseYaml(productField?: string): string {
  const lines = [
    `uuid: ${RELEASE}`,
    'version: "1.0.0"',
    "createdDate: '2026-01-15T00:00:00Z'",
    'components: []',
  ];
  if (productField !== undefined) {
    lines.splice(1, 0, `product: ${productField}`);
  }
  return lines.join('\n');
}

function componentReleaseYaml(componentField?: string): string {
  const lines = [
    `uuid: ${RELEASE}`,
    'version: "1.0.0"',
    "createdDate: '2026-01-15T00:00:00Z'",
  ];
  if (componentField !== undefined) {
    lines.splice(1, 0, `component: ${componentField}`);
  }
  return lines.join('\n');
}

describe('release parent ownership', () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('defaults an omitted product field to the enclosing product', () => {
    const root = tempRoot();
    roots.push(root);
    writeProduct(root, 'alpha', PRODUCT);
    const releaseDir = path.join(root, 'products', 'alpha', 'releases', '1');
    fs.mkdirSync(releaseDir, { recursive: true });
    fs.writeFileSync(
      path.join(releaseDir, 'release.yaml'),
      productReleaseYaml(),
    );
    const release = new ContentStore(root).productReleases.get(RELEASE);
    expect(release?.product).toBe(PRODUCT);
  });

  it('accepts an explicit product field that matches the enclosing product', () => {
    const root = tempRoot();
    roots.push(root);
    writeProduct(root, 'alpha', PRODUCT);
    const releaseDir = path.join(root, 'products', 'alpha', 'releases', '1');
    fs.mkdirSync(releaseDir, { recursive: true });
    fs.writeFileSync(
      path.join(releaseDir, 'release.yaml'),
      productReleaseYaml(PRODUCT),
    );
    expect(new ContentStore(root).productReleases.get(RELEASE)?.product).toBe(
      PRODUCT,
    );
  });

  it('rejects a product release that declares a different product', () => {
    const root = tempRoot();
    roots.push(root);
    writeProduct(root, 'alpha', PRODUCT);
    const releaseDir = path.join(root, 'products', 'alpha', 'releases', '1');
    fs.mkdirSync(releaseDir, { recursive: true });
    fs.writeFileSync(
      path.join(releaseDir, 'release.yaml'),
      productReleaseYaml(OTHER_PRODUCT),
    );
    expect(() => new ContentStore(root)).toThrow(
      new RegExp(
        `product ${OTHER_PRODUCT} does not match enclosing product ${PRODUCT}`,
      ),
    );
  });

  it('defaults an omitted component field to the enclosing component', () => {
    const root = tempRoot();
    roots.push(root);
    writeComponent(root, 'part', COMPONENT);
    const releaseDir = path.join(root, 'components', 'part', 'releases', '1');
    fs.mkdirSync(releaseDir, { recursive: true });
    fs.writeFileSync(
      path.join(releaseDir, 'release.yaml'),
      componentReleaseYaml(),
    );
    expect(
      new ContentStore(root).componentReleases.get(RELEASE)?.component,
    ).toBe(COMPONENT);
  });

  it('rejects a component release that declares a different component', () => {
    const root = tempRoot();
    roots.push(root);
    writeComponent(root, 'part', COMPONENT);
    const releaseDir = path.join(root, 'components', 'part', 'releases', '1');
    fs.mkdirSync(releaseDir, { recursive: true });
    fs.writeFileSync(
      path.join(releaseDir, 'release.yaml'),
      componentReleaseYaml(OTHER_COMPONENT),
    );
    expect(() => new ContentStore(root)).toThrow(
      new RegExp(
        `component ${OTHER_COMPONENT} does not match enclosing component ${COMPONENT}`,
      ),
    );
  });
});
