import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createApp } from '../src/tea/create-app';

describe('content readiness (e2e)', () => {
  let app: INestApplication;
  let root: string;
  const previousContentDir = process.env.CONTENT_DIR;
  const previousAwait = process.env.CONTENT_AWAIT_GIT_REVISION;

  beforeAll(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'oolong-await-'));
    fs.mkdirSync(path.join(root, 'revisions'), { recursive: true });
    process.env.CONTENT_DIR = root;
    process.env.CONTENT_AWAIT_GIT_REVISION = 'true';
    process.env.SERVER_HOST = 'http://127.0.0.1:3000';
    process.env.API_VERSION = 'v1.0.0';
    app = await createApp();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    fs.rmSync(root, { recursive: true, force: true });
    if (previousContentDir === undefined) delete process.env.CONTENT_DIR;
    else process.env.CONTENT_DIR = previousContentDir;
    if (previousAwait === undefined)
      delete process.env.CONTENT_AWAIT_GIT_REVISION;
    else process.env.CONTENT_AWAIT_GIT_REVISION = previousAwait;
  });

  const server = () => app.getHttpServer();

  it('returns 503 from well-known while awaiting the first revision', async () => {
    const res = await request(server()).get('/.well-known/tea');
    expect(res.status).toBe(503);
  });

  it('returns 200 from healthz while awaiting content', async () => {
    await request(server()).get('/healthz').expect(200, { status: 'ok' });
  });
});
