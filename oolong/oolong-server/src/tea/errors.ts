import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import type { Request, Response } from 'express';

/** TEA `unknown-error-type` values from the pinned OpenAPI document. */
export type TeaErrorCode =
  | 'OBJECT_UNKNOWN'
  | 'NOT_IMPLEMENTED'
  | 'NO_ACCEPTABLE_FORMAT'
  | 'SIGNATURE_NOT_FOUND'
  | 'INVALID_REQUEST'
  | 'INVALID_PAGE_TOKEN';

export class TeaException extends Error {
  constructor(
    readonly status: number,
    readonly code: TeaErrorCode,
    readonly detail?: string,
  ) {
    super(detail ?? code);
  }
}

export function isHead(req: Request): boolean {
  return (
    req.method === 'HEAD' ||
    Boolean((req as Request & { teaHead?: boolean }).teaHead)
  );
}

export function sendJson(
  req: Request,
  res: Response,
  status: number,
  body: unknown,
): void {
  const encoded = Buffer.from(JSON.stringify(body));
  res.status(status);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Length', encoded.length);
  if (isHead(req)) {
    res.end();
    return;
  }
  res.end(encoded);
}

@Catch()
export class TeaExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    if (res.headersSent) {
      return;
    }
    if (exception instanceof TeaException) {
      const body: { error: TeaErrorCode; message?: string } = {
        error: exception.code,
      };
      if (exception.detail) {
        body.message = exception.detail;
      }
      sendJson(req, res, exception.status, body);
      return;
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (status === 404 || status === 503) {
        const payload = exception.getResponse();
        sendJson(
          req,
          res,
          status,
          typeof payload === 'string' ? { message: payload } : payload,
        );
        return;
      }
    }
    sendJson(req, res, 500, { message: 'Internal server error' });
  }
}
