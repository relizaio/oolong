import { INestApplication } from '@nestjs/common';
import * as path from 'path';
import request from 'supertest';
import { createApp } from '../src/tea/create-app';

describe('App (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.CONTENT_DIR = path.resolve(
      __dirname,
      '../../fixtures/tea-1.0.0',
    );
    process.env.SERVER_HOST = 'http://127.0.0.1:3000';
    process.env.API_VERSION = 'v1.0.0';
    app = await createApp();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('does not publish Hello World on the versioned API', () => {
    return request(app.getHttpServer()).get('/v1.0.0/').expect(404);
  });
});
