import * as fs from 'fs';
import * as path from 'path';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ContentStore, contentRoot } from './content-store';

/** Written by the git sync sidecar when a revision is published. */
export const CONTENT_POINTER_FILE = '.oolong-current-revision';
/** Written by the server after a revision passes validation (last good). */
export const CONTENT_ACTIVE_POINTER = '.oolong-active-revision';

const REVISION_ID_RE = /^[0-9a-f]{40}$/;

export interface SnapshotView {
  revision: string;
  store: ContentStore;
}

export function assertRevisionId(revision: string): void {
  if (!REVISION_ID_RE.test(revision)) {
    throw new Error(`invalid content revision id: ${revision}`);
  }
}

export function hasStaticContentLayout(baseRoot: string): boolean {
  const products = path.join(baseRoot, 'products');
  return fs.existsSync(products) && fs.statSync(products).isDirectory();
}

function readPointerRevision(
  baseRoot: string,
  fileName: string,
): string | undefined {
  const pointer = path.join(baseRoot, fileName);
  if (!fs.existsSync(pointer)) return undefined;
  const text = fs.readFileSync(pointer, 'utf8').trim();
  if (text.length === 0) {
    throw new Error(`content pointer ${fileName} is empty`);
  }
  assertRevisionId(text);
  return text;
}

export function readCandidateRevision(baseRoot: string): string | undefined {
  return readPointerRevision(baseRoot, CONTENT_POINTER_FILE);
}

export function readActiveRevision(baseRoot: string): string | undefined {
  return readPointerRevision(baseRoot, CONTENT_ACTIVE_POINTER);
}

export function writeActiveRevision(baseRoot: string, revision: string): void {
  assertRevisionId(revision);
  const pointer = path.join(baseRoot, CONTENT_ACTIVE_POINTER);
  const next = `${pointer}.new`;
  fs.writeFileSync(next, revision, 'utf8');
  fs.renameSync(next, pointer);
}

export function resolveRevisionRoot(
  baseRoot: string,
  revision: string,
): string {
  assertRevisionId(revision);
  const revisionsRoot = path.join(baseRoot, 'revisions');
  const revisionPath = path.join(revisionsRoot, revision);
  if (!fs.existsSync(revisionPath)) {
    throw new Error(
      `content revision ${revision} is not available under ${baseRoot}`,
    );
  }
  const realRevision = fs.realpathSync(revisionPath);
  const realRevisions = fs.realpathSync(revisionsRoot);
  const prefix = `${realRevisions}${path.sep}`;
  if (realRevision !== realRevisions && !realRevision.startsWith(prefix)) {
    throw new Error(
      `content revision ${revision} resolves outside ${revisionsRoot}`,
    );
  }
  if (!fs.statSync(realRevision).isDirectory()) {
    throw new Error(`content revision ${revision} is not a directory`);
  }
  return realRevision;
}

/** Effective revision label for static fixture layouts (no git pointer). */
export function readContentRevision(baseRoot: string): string {
  try {
    const candidate = readCandidateRevision(baseRoot);
    if (candidate !== undefined) return candidate;
  } catch {
    return 'static';
  }
  if (hasStaticContentLayout(baseRoot)) return 'static';
  return 'static';
}

export function resolveSnapshotRoot(baseRoot: string): {
  revision: string;
  root: string;
} {
  const candidate = readCandidateRevision(baseRoot);
  if (candidate !== undefined) {
    return {
      revision: candidate,
      root: resolveRevisionRoot(baseRoot, candidate),
    };
  }
  if (hasStaticContentLayout(baseRoot)) {
    return { revision: 'static', root: baseRoot };
  }
  throw new Error(`no content snapshot available under ${baseRoot}`);
}

function awaitingGitRevision(): boolean {
  return process.env.CONTENT_AWAIT_GIT_REVISION === 'true';
}

function gitSyncEnabled(): boolean {
  return process.env.CONTENT_GIT_SYNC_ENABLED === 'true';
}

function reloadIntervalMs(): number {
  const raw = process.env.CONTENT_RELOAD_INTERVAL_MS;
  if (raw !== undefined && raw !== '' && /^[1-9]\d*$/.test(raw)) {
    return Number(raw);
  }
  if (gitSyncEnabled()) return 60_000;
  return 0;
}

function tryLoadRevision(
  baseRoot: string,
  revision: string,
): SnapshotView | undefined {
  try {
    const root = resolveRevisionRoot(baseRoot, revision);
    return { revision, store: new ContentStore(root) };
  } catch {
    return undefined;
  }
}

function resolveStartupSnapshot(baseRoot: string): SnapshotView | undefined {
  let candidate: string | undefined;
  try {
    candidate = readCandidateRevision(baseRoot);
  } catch {
    candidate = undefined;
  }

  if (candidate !== undefined) {
    const fromCandidate = tryLoadRevision(baseRoot, candidate);
    if (fromCandidate !== undefined) {
      writeActiveRevision(baseRoot, candidate);
      return fromCandidate;
    }
  }

  let active: string | undefined;
  try {
    active = readActiveRevision(baseRoot);
  } catch {
    active = undefined;
  }
  if (active !== undefined) {
    const fromActive = tryLoadRevision(baseRoot, active);
    if (fromActive !== undefined) return fromActive;
  }

  if (awaitingGitRevision()) {
    return undefined;
  }

  return { revision: 'static', store: new ContentStore(baseRoot) };
}

@Injectable()
export class ContentSnapshotRegistry implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ContentSnapshotRegistry.name);
  private readonly baseRoot: string;
  private state: SnapshotView | undefined;
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor() {
    this.baseRoot = contentRoot();
    this.state = resolveStartupSnapshot(this.baseRoot);
    if (this.state !== undefined) {
      this.logger.log(`content snapshot active: ${this.state.revision}`);
    } else {
      this.logger.warn('content snapshot not ready; awaiting git publication');
    }
  }

  isReady(): boolean {
    return this.state !== undefined;
  }

  capture(): SnapshotView {
    if (this.state === undefined) {
      throw new Error('content snapshot is not ready');
    }
    return this.state;
  }

  onModuleInit(): void {
    if (!this.isReady()) this.poll();
    const interval = reloadIntervalMs();
    if (interval <= 0) return;
    this.timer = setInterval(() => this.poll(), interval);
  }

  onModuleDestroy(): void {
    if (this.timer !== undefined) clearInterval(this.timer);
  }

  /** Visible for tests. */
  poll(): void {
    let candidate: string | undefined;
    try {
      candidate = readCandidateRevision(this.baseRoot);
    } catch (error) {
      this.logger.warn(
        `content candidate pointer rejected: ${(error as Error).message}`,
      );
      return;
    }

    if (candidate === undefined) {
      if (this.state !== undefined && this.state.revision !== 'static') {
        this.logger.warn(
          'content candidate pointer missing; keeping active revision snapshot',
        );
      }
      return;
    }

    if (this.state !== undefined && candidate === this.state.revision) return;

    try {
      const root = resolveRevisionRoot(this.baseRoot, candidate);
      const store = new ContentStore(root);
      writeActiveRevision(this.baseRoot, candidate);
      this.state = { revision: candidate, store };
      this.logger.log(`content snapshot active: ${candidate}`);
    } catch (error) {
      this.logger.warn(
        `content reload rejected for ${candidate}: ${(error as Error).message}`,
      );
    }
  }
}
