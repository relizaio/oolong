import { ServiceUnavailableException } from '@nestjs/common';
import { TeaExceptionFilter } from './errors';
import type { Request, Response } from 'express';

function mockHost(req: Partial<Request>, res: Partial<Response>) {
  return {
    switchToHttp: () => ({
      getRequest: () => req as Request,
      getResponse: () => res as Response,
    }),
  };
}

describe('TeaExceptionFilter', () => {
  it('preserves HTTP 503 from ServiceUnavailableException', () => {
    const filter = new TeaExceptionFilter();
    const end = jest.fn();
    const setHeader = jest.fn();
    const status = jest.fn(() => ({ setHeader, end }));
    const res = { headersSent: false, status, setHeader, end };
    const req = { method: 'GET' };

    filter.catch(
      new ServiceUnavailableException('content is not ready'),
      mockHost(req, res) as never,
    );

    expect(status).toHaveBeenCalledWith(503);
    expect(end).toHaveBeenCalled();
  });
});
