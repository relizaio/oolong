import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ContentStore } from './content-store';

const PRODUCT_UUID = '11111111-1111-4111-8111-111111111111';

function tempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'oolong-symlink-'));
}

function writeProduct(dir: string, name = 'Loop Product'): void {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'product.yaml'),
    [`uuid: ${PRODUCT_UUID}`, `name: ${name}`, 'identifiers: []'].join('\n'),
  );
}

describe('content directory traversal with symlinks', () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('terminates when a directory symlink points at an ancestor', () => {
    const root = tempRoot();
    roots.push(root);
    const products = path.join(root, 'products');
    writeProduct(path.join(products, 'alpha'));
    fs.symlinkSync('..', path.join(products, 'loop'));
    const store = new ContentStore(root);
    expect(store.products.get(PRODUCT_UUID)?.name).toBe('Loop Product');
  });

  it('terminates when a directory symlink points at itself', () => {
    const root = tempRoot();
    roots.push(root);
    const products = path.join(root, 'products');
    writeProduct(path.join(products, 'alpha'));
    fs.symlinkSync('.', path.join(products, 'self'));
    const store = new ContentStore(root);
    expect(store.products.size).toBe(1);
  });

  it('follows two directory aliases to the same tree without looping', () => {
    const root = tempRoot();
    roots.push(root);
    const canonical = path.join(root, 'products', 'canonical');
    writeProduct(canonical, 'Canonical Product');
    fs.symlinkSync('canonical', path.join(root, 'products', 'alias-a'));
    fs.symlinkSync('canonical', path.join(root, 'products', 'alias-b'));
    const store = new ContentStore(root);
    expect(store.products.size).toBe(1);
    expect(store.products.get(PRODUCT_UUID)?.name).toBe('Canonical Product');
  });

  it('ignores symlinks that resolve outside the content root', () => {
    const root = tempRoot();
    roots.push(root);
    const outside = tempRoot();
    roots.push(outside);
    writeProduct(outside, 'Outside Product');
    fs.mkdirSync(path.join(root, 'products'), { recursive: true });
    writeProduct(path.join(root, 'products', 'inside'), 'Inside Product');
    const insideUuid = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
    fs.writeFileSync(
      path.join(root, 'products', 'inside', 'product.yaml'),
      [`uuid: ${insideUuid}`, 'name: Inside Product', 'identifiers: []'].join(
        '\n',
      ),
    );
    fs.symlinkSync(outside, path.join(root, 'products', 'escape'));
    const store = new ContentStore(root);
    expect(store.products.has(insideUuid)).toBe(true);
    expect(store.products.has(PRODUCT_UUID)).toBe(false);
  });
});
