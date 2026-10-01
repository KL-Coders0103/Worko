import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { Request, Response } from 'express';

interface RequestWithId extends Request {
  requestId?: string;
}

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const httpContext = context.switchToHttp();

    const request =
      httpContext.getRequest<RequestWithId>();

    const response =
      httpContext.getResponse<Response>();

    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.logRequest(request, response, startedAt),
        error: () => this.logRequest(request, response, startedAt),
      }),
    );
  }

  private logRequest(
    request: RequestWithId,
    response: Response,
    startedAt: number,
  ): void {
    this.logger.log(
      JSON.stringify({
        event: 'http_request',
        requestId: request.requestId ?? 'unknown',
        method: request.method,
        path: request.originalUrl,
        statusCode: response.statusCode,
        durationMs: Date.now() - startedAt,
      }),
    );
  }
}