import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface RequestWithId extends Request {
  requestId?: string;
}

interface ErrorResponse {
  statusCode: number;
  code: string;
  message: string;
  requestId: string;
  details: unknown[];
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<RequestWithId>();
    const response = context.getResponse<Response>();

    const requestId = request.requestId ?? 'unknown';

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : null;

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : this.extractMessage(exceptionResponse);

    const code = this.getErrorCode(statusCode);

    const details =
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'message' in exceptionResponse &&
      Array.isArray(exceptionResponse.message)
        ? exceptionResponse.message
        : [];

    const errorResponse: ErrorResponse = {
      statusCode,
      code,
      message,
      requestId,
      details,
    };

    if (statusCode >= 500) {
      this.logger.error(
        JSON.stringify({
          event: 'http_exception',
          requestId,
          method: request.method,
          path: request.originalUrl,
          statusCode,
          error:
            exception instanceof Error
              ? exception.message
              : 'Unknown error',
        }),
      );
    }

    response.status(statusCode).json(errorResponse);
  }

  private extractMessage(response: unknown): string {
    if (
      typeof response === 'object' &&
      response !== null &&
      'message' in response
    ) {
      const message = response.message;

      if (typeof message === 'string') {
        return message;
      }

      if (Array.isArray(message)) {
        return 'Request validation failed';
      }
    }

    return 'Internal server error';
  }

  private getErrorCode(statusCode: number): string {
    switch (statusCode) {
      case 400:
        return 'VALIDATION_ERROR';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      case 422:
        return 'UNPROCESSABLE_ENTITY';
      case 429:
        return 'RATE_LIMIT_EXCEEDED';
      default:
        return statusCode >= 500
          ? 'INTERNAL_SERVER_ERROR'
          : 'HTTP_ERROR';
    }
  }
}