import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { ApiErrorDetail, ApiErrorResponse } from '../interfaces/api-error.interface.js';
import { REQUEST_ID_HEADER, RequestWithId } from '../interceptors/request-id.interceptor.js';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();

    const requestId =
      request.requestId ||
      (typeof request.headers[REQUEST_ID_HEADER] === 'string'
        ? (request.headers[REQUEST_ID_HEADER] as string)
        : randomUUID());

    if (response.setHeader && !response.getHeader(REQUEST_ID_HEADER)) {
      response.setHeader(REQUEST_ID_HEADER, requestId);
    }

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'An internal server error occurred';
    let details: ApiErrorDetail[] | null = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resObj = exceptionResponse as Record<string, unknown>;

        // Handle class-validator messages array from ValidationPipe
        if (Array.isArray(resObj.message)) {
          code = 'VALIDATION_ERROR';
          message = 'Validation failed';
          details = resObj.message.map((msg) => {
            const strMsg = String(msg);
            const firstSpace = strMsg.indexOf(' ');
            return {
              field: firstSpace > 0 ? strMsg.substring(0, firstSpace) : undefined,
              issue: strMsg,
            };
          });
        } else {
          code =
            typeof resObj.code === 'string'
              ? resObj.code
              : (HttpStatus[status] ?? 'HTTP_EXCEPTION');
          message =
            typeof resObj.message === 'string'
              ? resObj.message
              : exception.message;
          details =
            Array.isArray(resObj.details)
              ? (resObj.details as ApiErrorDetail[])
              : null;
        }
      } else if (typeof exceptionResponse === 'string') {
        code = HttpStatus[status] ?? 'HTTP_EXCEPTION';
        message = exceptionResponse;
      }
    } else {
      // Unhandled / 500 error: log internal details server-side, never expose stack traces to client
      const err = exception instanceof Error ? exception : new Error(String(exception));
      this.logger.error(
        `[${requestId}] ${request.method} ${request.url} - ${err.message}`,
        err.stack,
      );
    }

    const errorPayload: ApiErrorResponse = {
      status,
      code,
      message,
      request_id: requestId,
      details,
    };

    response.status(status).json(errorPayload);
  }
}
