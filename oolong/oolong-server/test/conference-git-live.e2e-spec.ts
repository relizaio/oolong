import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ContentSnapshotRegistry } from '../src/tea/content-snapshot';
import { createApp } from '../src/tea/create-app';

const CONFERENCE_CONTENT = path.resolve(
  __dirname,
  '../../../../conferences-oolong-content-2025-11',
);
const PUBLISH_INC = path.resolve(
  __dirname,
  '../../../helm-chart/oolong/scripts/git-publish.inc.sh',
);
const KAUF = '8ab3c557-7f36-4ebd-a593-026c28337630';

function git(cwd: string, ...args: string[]): void {
  execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null' },
  });
}

function publish(contentDir: string, workDir: string): void {
  execFileSync(
    'sh',
    [
      '-c',
      `
set -e
CONTENT_DIR="$1"
WORK_DIR="$2"
REVISIONS_DIR="$CONTENT_DIR/revisions"
POINTER_FILE="$CONTENT_DIR/.oolong-current-revision"
REVISION_RETENTION_COUNT=5
mkdir -p "$REVISIONS_DIR"
. "$3"
publish_revision
`,
      'publish',
      contentDir,
      workDir,
      PUBLISH_INC,
    ],
    { encoding: 'utf8' },
  );
}

const describeLive = fs.existsSync(path.join(CONFERENCE_CONTENT, 'products'))
  ? describe
  : describe.skip;

describeLive('conference git live reload (e2e)', () => {
  let app: INestApplication;
  let contentDir: string;
  let workDir: string;
  const previous = {
    CONTENT_DIR: process.env.CONTENT_DIR,
    CONTENT_AWAIT_GIT_REVISION: process.env.CONTENT_AWAIT_GIT_REVISION,
    SERVER_HOST: process.env.SERVER_HOST,
    API_VERSION: process.env.API_VERSION,
  };

  beforeAll(async () => {
    contentDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oolong-conference-'));
    workDir = path.join(contentDir, '_work');
    fs.cpSync(CONFERENCE_CONTENT, workDir, {
      recursive: true,
      filter: (src) => path.basename(src) !== '.git',
    });
    const template = fs.mkdtempSync(path.join(os.tmpdir(), 'git-template-'));
    git(contentDir, 'init', '-q', '--template', template, workDir);
    fs.rmSync(template, { recursive: true, force: true });
    git(workDir, 'config', 'user.email', 'review@example.invalid');
    git(workDir, 'config', 'user.name', 'review');
    git(workDir, 'add', '.');
    git(workDir, 'commit', '-q', '-m', 'tea-1.0 conference content');
    publish(contentDir, workDir);

    process.env.CONTENT_DIR = contentDir;
    process.env.CONTENT_AWAIT_GIT_REVISION = 'true';
    process.env.SERVER_HOST = 'http://127.0.0.1:3000';
    process.env.API_VERSION = 'v1.0.0';
    app = await createApp();
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
    fs.rmSync(contentDir, { recursive: true, force: true });
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('serves the conference products and picks up a committed rename', async () => {
    const products = await request(app.getHttpServer())
      .get('/v1.0.0/products')
      .expect(200);
    const names = (
      products.body.results as { uuid: string; name: string }[]
    ).map((item) => item.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'Kauf Bulb',
        'Apache Log4j2',
        'Apache Log4j2 Core',
      ]),
    );

    const productFile = path.join(
      workDir,
      'products',
      'kauf_bulb',
      'product.yaml',
    );
    fs.writeFileSync(
      productFile,
      fs
        .readFileSync(productFile, 'utf8')
        .replace('name: Kauf Bulb', 'name: Kauf Bulb Live'),
    );
    git(workDir, 'add', 'products/kauf_bulb/product.yaml');
    git(workDir, 'commit', '-q', '-m', 'rename Kauf Bulb');
    publish(contentDir, workDir);
    app.get(ContentSnapshotRegistry).poll();

    const updated = await request(app.getHttpServer())
      .get('/v1.0.0/products')
      .expect(200);
    const byId = new Map(
      (updated.body.results as { uuid: string; name: string }[]).map((item) => [
        item.uuid,
        item.name,
      ]),
    );
    expect(byId.get(KAUF)).toBe('Kauf Bulb Live');
    expect(byId.get(KAUF)).not.toBe('Kauf Bulb');
  });
});
