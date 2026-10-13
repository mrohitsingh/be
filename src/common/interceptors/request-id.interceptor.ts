import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Observable } from 'rxjs';
import type { Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';

export interface RequestWithId extends Request {
  requestId?: string;
}

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<RequestWithId>();
    const res = http.getResponse<Response>();

    const existingId = req.headers[REQUEST_ID_HEADER];
    const requestId =
      typeof existingId === 'string' && existingId.trim().length > 0
        ? existingId
        : randomUUID();

    req.requestId = requestId;
    req.headers[REQUEST_ID_HEADER] = requestId;

    if (res && typeof res.setHeader === 'function') {
      res.setHeader(REQUEST_ID_HEADER, requestId);
    }

    return next.handle();
  }
}
