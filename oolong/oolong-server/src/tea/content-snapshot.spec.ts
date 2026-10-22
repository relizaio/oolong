import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ContentStore } from './content-store';
import {
  CONTENT_POINTER_FILE,
  ContentSnapshotRegistry,
  readContentRevision,
  resolveSnapshotRoot,
} from './content-snapshot';

const PRODUCT = '11111111-1111-4111-8111-111111111111';

function tempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'oolong-snapshot-'));
}

function writeMinimalProduct(root: string, name = 'Snapshot Product'): void {
  const dir = path.join(root, 'products', 'alpha');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'product.yaml'),
    [`uuid: ${PRODUCT}`, `name: ${name}`, 'identifiers: []'].join('\n'),
  );
}

function publishRevision(base: string, revision: string, name: string): void {
  const target = path.join(base, 'revisions', revision);
  fs.rmSync(target, { recursive: true, force: true });
  writeMinimalProduct(target, name);
  const pointer = path.join(base, CONTENT_POINTER_FILE);
  fs.writeFileSync(pointer, revision, 'utf8');
}

describe('content snapshots', () => {
  const roots: string[] = [];
  const previousContentDir = process.env.CONTENT_DIR;

  afterEach(() => {
    if (previousContentDir === undefined) delete process.env.CONTENT_DIR;
    else process.env.CONTENT_DIR = previousContentDir;
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  function registryAt(base: string): ContentSnapshotRegistry {
    process.env.CONTENT_DIR = base;
    return new ContentSnapshotRegistry();
  }

  it('uses the content root directly when no pointer file exists', () => {
    const root = tempRoot();
    roots.push(root);
    writeMinimalProduct(root);
    expect(readContentRevision(root)).toBe('static');
    expect(resolveSnapshotRoot(root).root).toBe(root);
    expect(new ContentStore(resolveSnapshotRoot(root).root).products.size).toBe(
      1,
    );
  });

  it('loads a revision directory named in the pointer file', () => {
    const base = tempRoot();
    roots.push(base);
    publishRevision(base, 'abc123', 'Revision Product');
    expect(resolveSnapshotRoot(base)).toEqual({
      revision: 'abc123',
      root: path.join(base, 'revisions', 'abc123'),
    });
    const registry = registryAt(base);
    expect(registry.capture().revision).toBe('abc123');
    expect(registry.capture().store.products.get(PRODUCT)?.name).toBe(
      'Revision Product',
    );
  });

  it('keeps the last good snapshot when a new revision fails validation', () => {
    const base = tempRoot();
    roots.push(base);
    publishRevision(base, 'good', 'Good Product');
    const registry = registryAt(base);
    expect(registry.capture().store.products.get(PRODUCT)?.name).toBe(
      'Good Product',
    );
    const badDir = path.join(base, 'revisions', 'bad');
    fs.mkdirSync(path.join(badDir, 'products', 'alpha'), { recursive: true });
    fs.writeFileSync(
      path.join(badDir, 'products', 'alpha', 'product.yaml'),
      'uuid: not-a-uuid\nname: Bad\nidentifiers: []\n',
    );
    fs.writeFileSync(path.join(base, CONTENT_POINTER_FILE), 'bad', 'utf8');
    registry.poll();
    expect(registry.capture().revision).toBe('good');
    expect(registry.capture().store.products.get(PRODUCT)?.name).toBe(
      'Good Product',
    );
  });

  it('promotes a valid new revision on poll', () => {
    const base = tempRoot();
    roots.push(base);
    publishRevision(base, 'v1', 'Version One');
    const registry = registryAt(base);
    publishRevision(base, 'v2', 'Version Two');
    registry.poll();
    expect(registry.capture().revision).toBe('v2');
    expect(registry.capture().store.products.get(PRODUCT)?.name).toBe(
      'Version Two',
    );
  });
});
