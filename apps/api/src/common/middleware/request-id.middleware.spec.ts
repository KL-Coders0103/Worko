import { RequestIdMiddleware } from './request-id.middleware';
import type { NextFunction, Request, Response } from 'express';
import { jest } from '@jest/globals';
describe('RequestIdMiddleware', () => {
  let middleware: RequestIdMiddleware;

  beforeEach(() => {
    middleware = new RequestIdMiddleware();
  });

  function execute(headers: Record<string, string> = {}) {
    const request = {
      headers,
    } as unknown as Request & { requestId?: string };

    const response = {
      setHeader: jest.fn(),
    } as unknown as Response;

    const next = jest.fn() as NextFunction;

    middleware.use(request, response, next);

    return { request, response, next };
  }

  it('generates a request ID when none is provided', () => {
    const { request, response, next } = execute();

    expect(request.requestId).toBeDefined();
    expect(response.setHeader).toHaveBeenCalledWith(
      'X-Request-Id',
      request.requestId,
    );
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('preserves a valid incoming request ID', () => {
    const { request } = execute({
      'x-request-id': 'client-request-123',
    });

    expect(request.requestId).toBe('client-request-123');
  });

  it('replaces an invalid incoming request ID', () => {
    const { request } = execute({
      'x-request-id': 'invalid request id',
    });

    expect(request.requestId).not.toBe('invalid request id');
  });
});