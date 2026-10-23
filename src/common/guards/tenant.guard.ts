import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const rawTenantId =
      request.user?.tenant_id ?? request.headers['x-tenant-id'];

    if (!rawTenantId) {
      throw new BadRequestException({
        code: 'MISSING_TENANT_CONTEXT',
        message: 'A valid tenant context (x-tenant-id header or session) is required.',
      });
    }

    const tenantId = Number(rawTenantId);
    if (!Number.isInteger(tenantId) || tenantId <= 0) {
      throw new BadRequestException({
        code: 'INVALID_TENANT_CONTEXT',
        message: 'Tenant identifier must be a positive integer.',
      });
    }

    request.tenantId = tenantId;
    return true;
  }
}
