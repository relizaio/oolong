import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from '../app.module';
import { TeaExceptionFilter } from './errors';
import { API_PREFIX, assertAdvertisedVersion } from './representation';

export async function createApp(): Promise<INestApplication> {
  assertAdvertisedVersion();
  const app = await NestFactory.create(AppModule, { logger: false });
  const expressApp = app.getHttpAdapter().getInstance() as {
    set: (key: string, value: unknown) => void;
    disable: (key: string) => void;
    use: (
      fn: (req: Request, res: Response, next: NextFunction) => void,
    ) => void;
  };
  expressApp.set('etag', false);
  expressApp.disable('x-powered-by');
  expressApp.use((req, res, next) => {
    if (req.method !== 'HEAD') {
      next();
      return;
    }
    res.json = ((body: unknown) => {
      const encoded = Buffer.from(JSON.stringify(body));
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Length', encoded.length);
      res.end();
      return res;
    }) as Response['json'];
    next();
  });
  app.setGlobalPrefix(API_PREFIX, { exclude: ['.well-known/tea'] });
  app.useGlobalFilters(new TeaExceptionFilter());
  return app;
}
