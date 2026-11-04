import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { AuthService } from '../../modules/auth/auth.service.js';
import type { JwtPayload } from '../../modules/auth/services/crypto.service.js';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      tenantId?: number;
    }
  }
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly authService: AuthService) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    const authHeader = req.headers['authorization'];

    // If no authorization header is supplied, let the request continue to downstream handlers/guards
    if (!authHeader || typeof authHeader !== 'string') {
      return next();
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException({
        code: 'INVALID_AUTHORIZATION_SCHEME',
        message: 'Authorization header must use Bearer scheme.',
      });
    }

    try {
      const payload = this.authService.verifyAccessToken(token);
      req.user = payload;

      if (payload.tenant_id) {
        req.tenantId = payload.tenant_id;
      }

      next();
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: 'Provided access token is invalid or expired.',
      });
    }
  }
}
