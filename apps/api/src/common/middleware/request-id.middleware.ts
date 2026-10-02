import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incomingRequestId = req.headers['x-request-id'];

    const requestId =
      typeof incomingRequestId === 'string' &&
      /^[a-zA-Z0-9._-]{1,128}$/.test(incomingRequestId)
        ? incomingRequestId
        : randomUUID();

    res.setHeader('X-Request-Id', requestId);

    (req as Request & { requestId: string }).requestId = requestId;

    next();
  }
}
