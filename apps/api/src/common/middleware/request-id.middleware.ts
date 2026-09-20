import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');
  use(req: Request, res: Response, next: NextFunction): void {
    const incomingRequestId = req.header('x-request-id');
    const requestId = incomingRequestId || randomUUID();
    const startTime = process.hrtime.bigint();

    req.headers['x-request-id'] = requestId;
    res.setHeader('x-request-id', requestId);

    res.on('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - startTime)/1_000_000;
        this.logger.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(2)}ms requestId=${requestId}`);
    });

    next();
  }
}