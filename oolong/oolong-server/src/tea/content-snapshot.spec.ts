import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ContentStore } from './content-store';
import {
  CONTENT_ACTIVE_POINTER,
  CONTENT_POINTER_FILE,
  ContentSnapshotRegistry,
  readContentRevision,
  resolveRevisionRoot,
  resolveSnapshotRoot,
  writeActiveRevision,
} from './content-snapshot';

const PRODUCT = '11111111-1111-4111-8111-111111111111';
const SHA_GOOD = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const SHA_BAD = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const SHA_V1 = 'cccccccccccccccccccccccccccccccccccccccc';
const SHA_V2 = 'dddddddddddddddddddddddddddddddddddddddd';
const SHA_ABC = 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

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
  const previousAwait = process.env.CONTENT_AWAIT_GIT_REVISION;
  const previousGitSync = process.env.CONTENT_GIT_SYNC_ENABLED;

  afterEach(() => {
    if (previousContentDir === undefined) delete process.env.CONTENT_DIR;
    else process.env.CONTENT_DIR = previousContentDir;
    if (previousAwait === undefined)
      delete process.env.CONTENT_AWAIT_GIT_REVISION;
    else process.env.CONTENT_AWAIT_GIT_REVISION = previousAwait;
    if (previousGitSync === undefined)
      delete process.env.CONTENT_GIT_SYNC_ENABLED;
    else process.env.CONTENT_GIT_SYNC_ENABLED = previousGitSync;
    delete process.env.CONTENT_RELOAD_INTERVAL_MS;
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
    publishRevision(base, SHA_ABC, 'Revision Product');
    const resolved = resolveSnapshotRoot(base);
    expect(resolved.revision).toBe(SHA_ABC);
    expect(resolved.root).toBe(
      fs.realpathSync(path.join(base, 'revisions', SHA_ABC)),
    );
    const registry = registryAt(base);
    expect(registry.capture().revision).toBe(SHA_ABC);
    expect(registry.capture().store.products.get(PRODUCT)?.name).toBe(
      'Revision Product',
    );
    expect(
      fs.readFileSync(path.join(base, CONTENT_ACTIVE_POINTER), 'utf8'),
    ).toBe(SHA_ABC);
  });

  it('keeps the last good snapshot when a new revision fails validation', () => {
    const base = tempRoot();
    roots.push(base);
    publishRevision(base, SHA_GOOD, 'Good Product');
    const registry = registryAt(base);
    expect(registry.capture().store.products.get(PRODUCT)?.name).toBe(
      'Good Product',
    );
    const badDir = path.join(base, 'revisions', SHA_BAD);
    fs.mkdirSync(path.join(badDir, 'products', 'alpha'), { recursive: true });
    fs.writeFileSync(
      path.join(badDir, 'products', 'alpha', 'product.yaml'),
      'uuid: not-a-uuid\nname: Bad\nidentifiers: []\n',
    );
    fs.writeFileSync(path.join(base, CONTENT_POINTER_FILE), SHA_BAD, 'utf8');
    registry.poll();
    expect(registry.capture().revision).toBe(SHA_GOOD);
    expect(registry.capture().store.products.get(PRODUCT)?.name).toBe(
      'Good Product',
    );
    expect(
      fs.readFileSync(path.join(base, CONTENT_ACTIVE_POINTER), 'utf8'),
    ).toBe(SHA_GOOD);
  });

  it('promotes a valid new revision on poll', () => {
    const base = tempRoot();
    roots.push(base);
    publishRevision(base, SHA_V1, 'Version One');
    const registry = registryAt(base);
    publishRevision(base, SHA_V2, 'Version Two');
    registry.poll();
    expect(registry.capture().revision).toBe(SHA_V2);
    expect(registry.capture().store.products.get(PRODUCT)?.name).toBe(
      'Version Two',
    );
  });

  it('recovers the active revision on restart when the candidate is invalid', () => {
    const base = tempRoot();
    roots.push(base);
    publishRevision(base, SHA_GOOD, 'Good Product');
    const first = registryAt(base);
    expect(first.capture().revision).toBe(SHA_GOOD);

    const badDir = path.join(base, 'revisions', SHA_BAD);
    fs.mkdirSync(path.join(badDir, 'products', 'alpha'), { recursive: true });
    fs.writeFileSync(
      path.join(badDir, 'products', 'alpha', 'product.yaml'),
      'uuid: not-a-uuid\nname: Bad\nidentifiers: []\n',
    );
    fs.writeFileSync(path.join(base, CONTENT_POINTER_FILE), SHA_BAD, 'utf8');
    first.poll();
    expect(first.capture().revision).toBe(SHA_GOOD);

    const second = registryAt(base);
    expect(second.capture().revision).toBe(SHA_GOOD);
    expect(second.capture().store.products.get(PRODUCT)?.name).toBe(
      'Good Product',
    );
  });

  it('keeps the revision snapshot when the candidate pointer is removed', () => {
    const base = tempRoot();
    roots.push(base);
    publishRevision(base, SHA_GOOD, 'Good Product');
    const registry = registryAt(base);
    fs.unlinkSync(path.join(base, CONTENT_POINTER_FILE));
    registry.poll();
    expect(registry.capture().revision).toBe(SHA_GOOD);
    expect(registry.capture().store.products.get(PRODUCT)?.name).toBe(
      'Good Product',
    );
  });

  it('rejects revision paths outside the revisions directory', () => {
    const base = tempRoot();
    roots.push(base);
    const outside = path.join(base, 'outside');
    writeMinimalProduct(outside, 'Outside');
    fs.mkdirSync(path.join(base, 'revisions'), { recursive: true });
    fs.writeFileSync(
      path.join(base, CONTENT_POINTER_FILE),
      '../outside'.padEnd(40, '0').slice(0, 40),
      'utf8',
    );
    expect(() => resolveRevisionRoot(base, '../outside')).toThrow(
      /invalid content revision id/,
    );
    fs.writeFileSync(
      path.join(base, CONTENT_POINTER_FILE),
      'ffffffffffffffffffffffffffffffffffffffff',
      'utf8',
    );
    const link = path.join(
      base,
      'revisions',
      'ffffffffffffffffffffffffffffffffffffffff',
    );
    fs.symlinkSync(outside, link, 'dir');
    expect(() =>
      resolveRevisionRoot(base, 'ffffffffffffffffffffffffffffffffffffffff'),
    ).toThrow(/outside/);
  });

  it('starts without content when awaiting git and promotes on poll', () => {
    const base = tempRoot();
    roots.push(base);
    fs.mkdirSync(path.join(base, 'revisions'), { recursive: true });
    process.env.CONTENT_AWAIT_GIT_REVISION = 'true';
    const registry = registryAt(base);
    expect(registry.isReady()).toBe(false);
    publishRevision(base, SHA_GOOD, 'Git Product');
    registry.poll();
    expect(registry.isReady()).toBe(true);
    expect(registry.capture().store.products.get(PRODUCT)?.name).toBe(
      'Git Product',
    );
  });

  it('persists active revision when promoting from await mode', () => {
    const base = tempRoot();
    roots.push(base);
    publishRevision(base, SHA_V1, 'One');
    writeActiveRevision(base, SHA_V1);
    fs.writeFileSync(path.join(base, CONTENT_POINTER_FILE), SHA_V2, 'utf8');
    const v2 = path.join(base, 'revisions', SHA_V2);
    writeMinimalProduct(v2, 'Two');
    const registry = registryAt(base);
    expect(registry.capture().revision).toBe(SHA_V2);
  });
});
