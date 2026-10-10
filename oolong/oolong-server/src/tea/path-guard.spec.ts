import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ContentStore } from './content-store';
import { isSafeSegment, PathGuard } from './path-guard';

describe('PathGuard', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oolong-guard-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('rejects traversal segments', () => {
    expect(isSafeSegment('..')).toBe(false);
    expect(isSafeSegment('.')).toBe(false);
    expect(isSafeSegment('a/b')).toBe(false);
    expect(isSafeSegment('a\\b')).toBe(false);
    expect(isSafeSegment('a\0b')).toBe(false);
    expect(isSafeSegment('%2e%2e')).toBe(true);
    expect(isSafeSegment('v1.yaml')).toBe(true);
  });

  it('refuses a symlink whose target leaves the root', () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'oolong-outside-'));
    fs.writeFileSync(path.join(outside, 'secret.txt'), 'secret');
    fs.symlinkSync(outside, path.join(dir, 'escape'));
    const guard = new PathGuard(dir);
    expect(
      guard.realpathIfInside(path.join(dir, 'escape', 'secret.txt')),
    ).toBeNull();
    expect(guard.child(guard.root, '..')).toBeNull();
    expect(guard.child(guard.root, 'secret.txt')).toBe(
      path.join(guard.root, 'secret.txt'),
    );
    fs.rmSync(outside, { recursive: true, force: true });
  });

  it('does not load artifact bodies that escape the content root', () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'oolong-body-'));
    const uuid = '55555555-5555-4555-8555-555555555555';
    const artifactDir = path.join(dir, 'artifacts', uuid);
    fs.mkdirSync(artifactDir, { recursive: true });
    fs.writeFileSync(path.join(outside, 'secret.json'), '{"secret":true}\n');
    fs.writeFileSync(
      path.join(artifactDir, 'v1.yaml'),
      [
        `uuid: ${uuid}`,
        'version: 1',
        'type: OTHER',
        "createdDate: '2026-01-15T00:00:00Z'",
        'formats:',
        '  - mediaType: application/json',
        '    bodyFile: ../../../../secret.json',
        '    checksums:',
        '      - algType: SHA-256',
        `        algValue: ${'ab'.repeat(32)}`,
      ].join('\n'),
    );
    expect(() => new ContentStore(dir)).toThrow(/bodyFile escapes/);
    fs.rmSync(outside, { recursive: true, force: true });
  });
});
