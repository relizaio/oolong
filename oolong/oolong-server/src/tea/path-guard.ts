import * as fs from 'fs';
import * as path from 'path';

const MAX_SEGMENT = 240;

/** A single path component that cannot encode traversal. */
export function isSafeSegment(name: string): boolean {
  if (name.length === 0 || name.length > MAX_SEGMENT) {
    return false;
  }
  if (name === '.' || name === '..') {
    return false;
  }
  if (name.includes('/') || name.includes('\\') || name.includes('\0')) {
    return false;
  }
  if (name.includes('..')) {
    return false;
  }
  return true;
}

/**
 * Canonical containment for the content root.
 * Symlinks are followed only when the target stays inside the root.
 */
export class PathGuard {
  readonly root: string;

  constructor(root: string) {
    const resolved = path.resolve(root);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Content root does not exist: ${resolved}`);
    }
    this.root = fs.realpathSync(resolved);
  }

  inside(candidate: string): boolean {
    const rel = path.relative(this.root, candidate);
    return (
      rel === '' ||
      (!rel.startsWith(`..${path.sep}`) &&
        rel !== '..' &&
        !path.isAbsolute(rel))
    );
  }

  realpathIfInside(candidate: string): string | null {
    let real: string;
    try {
      real = fs.realpathSync(candidate);
    } catch {
      return null;
    }
    return this.inside(real) ? real : null;
  }

  /** Join a safe segment onto a directory that is already inside the root. */
  child(parent: string, name: string): string | null {
    if (!isSafeSegment(name) || !this.inside(parent)) {
      return null;
    }
    const joined = path.resolve(parent, name);
    return this.inside(joined) ? joined : null;
  }
}
