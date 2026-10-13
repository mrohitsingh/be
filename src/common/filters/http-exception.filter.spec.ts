import { describe, expect, it, vi } from 'vitest';
import { ArgumentsHost, BadRequestException, NotFoundException } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter.js';

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();

  function createMockHost(requestIdHeader?: string) {
    const jsonMock = vi.fn();
    const statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    const setHeaderMock = vi.fn();
    const getHeaderMock = vi.fn().mockReturnValue(null);

    const req: Record<string, unknown> = {
      headers: requestIdHeader ? { 'x-request-id': requestIdHeader } : {},
      method: 'GET',
      url: '/api/v1/test',
    };

    const res: Record<string, unknown> = {
      status: statusMock,
      setHeader: setHeaderMock,
      getHeader: getHeaderMock,
    };

    const host = {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
    } as unknown as ArgumentsHost;

    return { host, statusMock, jsonMock, setHeaderMock };
  }

  it('should format NotFoundException into standardized error envelope', () => {
    const { host, statusMock, jsonMock } = createMockHost('req_12345');
    const exception = new NotFoundException('Cannot GET /api/v1/test');

    filter.catch(exception, host);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith({
      status: 404,
      code: 'NOT_FOUND',
      message: 'Cannot GET /api/v1/test',
      request_id: 'req_12345',
      details: null,
    });
  });

  it('should format ValidationPipe BadRequestException with details array', () => {
    const { host, statusMock, jsonMock } = createMockHost('req_val_1');
    const exception = new BadRequestException({
      statusCode: 400,
      message: ['email must be an email', 'name should not be empty'],
      error: 'Bad Request',
    });

    filter.catch(exception, host);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      request_id: 'req_val_1',
      details: [
        { field: 'email', issue: 'email must be an email' },
        { field: 'name', issue: 'name should not be empty' },
      ],
    });
  });

  it('should format unhandled 500 error without exposing stack traces', () => {
    const { host, statusMock, jsonMock } = createMockHost('req_err_500');
    const exception = new Error('Database connection failed');

    filter.catch(exception, host);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An internal server error occurred',
      request_id: 'req_err_500',
      details: null,
    });
  });
});
