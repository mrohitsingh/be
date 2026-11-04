import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../../modules/auth/auth.service.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // Fast-path if already authenticated and decoded by AuthMiddleware
    if (request.user) {
      return true;
    }

    const authHeader = request.headers['authorization'];

    if (!authHeader || typeof authHeader !== 'string') {
      throw new UnauthorizedException({
        code: 'MISSING_AUTHORIZATION_HEADER',
        message: 'Authorization header is required (Bearer <token>).',
      });
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
      request.user = payload;

      // Automatically populate tenant context if present on token
      if (payload.tenant_id) {
        request.tenantId = payload.tenant_id;
      }

      return true;
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
