import * as fs from 'fs';
import * as path from 'path';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ContentStore, contentRoot } from './content-store';

export const CONTENT_POINTER_FILE = '.oolong-current-revision';

export interface SnapshotView {
  revision: string;
  store: ContentStore;
}

export function readContentRevision(baseRoot: string): string {
  const pointer = path.join(baseRoot, CONTENT_POINTER_FILE);
  try {
    const text = fs.readFileSync(pointer, 'utf8').trim();
    if (text.length > 0) return text;
  } catch {
    return 'static';
  }
  return 'static';
}

export function resolveSnapshotRoot(baseRoot: string): {
  revision: string;
  root: string;
} {
  const revision = readContentRevision(baseRoot);
  if (revision === 'static') {
    return { revision, root: baseRoot };
  }
  const root = path.join(baseRoot, 'revisions', revision);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error(
      `content revision ${revision} is not available under ${baseRoot}`,
    );
  }
  return { revision, root };
}

function reloadIntervalMs(): number {
  const raw = process.env.CONTENT_RELOAD_INTERVAL_MS;
  if (raw === undefined || raw === '') return 0;
  if (!/^[1-9]\d*$/.test(raw)) return 0;
  return Number(raw);
}

@Injectable()
export class ContentSnapshotRegistry implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ContentSnapshotRegistry.name);
  private readonly baseRoot: string;
  private state: SnapshotView;
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor() {
    this.baseRoot = contentRoot();
    this.state = this.loadSnapshot(this.baseRoot);
  }

  capture(): SnapshotView {
    return this.state;
  }

  onModuleInit(): void {
    const interval = reloadIntervalMs();
    if (interval <= 0) return;
    this.timer = setInterval(() => this.poll(), interval);
  }

  onModuleDestroy(): void {
    if (this.timer !== undefined) clearInterval(this.timer);
  }

  /** Visible for tests. */
  poll(): void {
    let resolved: { revision: string; root: string };
    try {
      resolved = resolveSnapshotRoot(this.baseRoot);
    } catch (error) {
      this.logger.warn(
        `content pointer could not be resolved: ${(error as Error).message}`,
      );
      return;
    }
    if (resolved.revision === this.state.revision) return;
    try {
      const store = new ContentStore(resolved.root);
      this.state = { revision: resolved.revision, store };
      this.logger.log(`content snapshot active: ${resolved.revision}`);
    } catch (error) {
      this.logger.warn(
        `content reload rejected for ${resolved.revision}: ${(error as Error).message}`,
      );
    }
  }

  private loadSnapshot(baseRoot: string): SnapshotView {
    const resolved = resolveSnapshotRoot(baseRoot);
    return {
      revision: resolved.revision,
      store: new ContentStore(resolved.root),
    };
  }
}
