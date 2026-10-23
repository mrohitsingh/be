import { describe, expect, it, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { AuthMiddleware } from './auth.middleware.js';
import { AuthService } from '../../modules/auth/auth.service.js';

describe('AuthMiddleware', () => {
  let middleware: AuthMiddleware;
  let authServiceMock: any;

  beforeEach(() => {
    authServiceMock = {
      verifyAccessToken: vi.fn(),
    };
    middleware = new AuthMiddleware(authServiceMock as unknown as AuthService);
  });

  it('should pass through to next() when no authorization header is present', () => {
    const req = { headers: {} } as any;
    const res = {} as any;
    const next = vi.fn();

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeUndefined();
    expect(req.tenantId).toBeUndefined();
  });

  it('should reject requests with invalid authorization scheme (not Bearer)', () => {
    const req = {
      headers: { authorization: 'Basic dXNlcjpwYXNz' },
    } as any;
    const res = {} as any;
    const next = vi.fn();

    expect(() => middleware.use(req, res, next)).toThrow(UnauthorizedException);
    expect(next).not.toHaveBeenCalled();
  });

  it('should reject requests when token verification fails', () => {
    authServiceMock.verifyAccessToken.mockImplementation(() => {
      throw new UnauthorizedException({
        code: 'TOKEN_EXPIRED',
        message: 'Authentication token has expired.',
      });
    });

    const req = {
      headers: { authorization: 'Bearer expired-or-invalid-token' },
    } as any;
    const res = {} as any;
    const next = vi.fn();

    expect(() => middleware.use(req, res, next)).toThrow(UnauthorizedException);
    expect(next).not.toHaveBeenCalled();
  });

  it('should attach req.user and req.tenantId and proceed on valid Bearer token', () => {
    authServiceMock.verifyAccessToken.mockReturnValue({
      sub: 15,
      email: 'teacher@school.com',
      role: 'TEACHER',
      tenant_id: 42,
    });

    const req = {
      headers: { authorization: 'Bearer valid-jwt-token' },
    } as any;
    const res = {} as any;
    const next = vi.fn();

    middleware.use(req, res, next);

    expect(authServiceMock.verifyAccessToken).toHaveBeenCalledWith('valid-jwt-token');
    expect(req.user).toEqual({
      sub: 15,
      email: 'teacher@school.com',
      role: 'TEACHER',
      tenant_id: 42,
    });
    expect(req.tenantId).toBe(42);
    expect(next).toHaveBeenCalled();
  });
});
