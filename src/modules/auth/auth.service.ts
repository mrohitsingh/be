import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CryptoService, JwtPayload } from './services/crypto.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh.dto.js';
import { AcceptInvitationDto } from './dto/accept-invitation.dto.js';

@Injectable()
export class AuthService {
  private readonly jwtAccessSecret: string;
  private readonly jwtExpiresInSeconds = 900; // 15 minutes
  private readonly refreshExpiresInMs = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
    private readonly configService: ConfigService,
  ) {
    this.jwtAccessSecret =
      this.configService.get<string>('JWT_ACCESS_SECRET') ??
      'default-insecure-dev-secret-change-in-production-123456';
  }

  async login(
    dto: LoginDto,
    metadata?: { ip?: string; userAgent?: string; deviceName?: string },
  ) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: dto.email.toLowerCase(),
        deleted_at: null,
      },
      include: {
        role: true,
        tenant: true,
        user_access: {
          where: { deleted_at: null },
        },
      },
    });

    if (!user || !user.password_hash || user.status !== 1) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      });
    }

    // Verify tenant scope if user is tenant-bound
    if (user.tenant_id) {
      if (dto.tenant_id && user.tenant_id !== dto.tenant_id) {
        throw new UnauthorizedException({
          code: 'TENANT_MISMATCH',
          message: 'User does not belong to the requested school tenant.',
        });
      }
      if (user.tenant && user.tenant.status !== 1) {
        throw new UnauthorizedException({
          code: 'TENANT_INACTIVE',
          message: 'School tenant account is currently suspended or inactive.',
        });
      }
    }

    // Verify password hash
    const isValid = await this.cryptoService.verifyPassword(
      dto.password,
      user.password_hash,
    );

    if (!isValid) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      });
    }

    // Extract effective permissions
    const userAccess = (user as any).user_access?.find((ua: any) => ua.is_individual && !ua.deleted_at)
      || (user as any).user_access?.find((ua: any) => !ua.deleted_at)
      || (user as any).user_access?.[0];
    const rawPerms = userAccess?.permission ?? (user as any).user_permission?.permissions ?? (user as any).user_permissions;
    const permissions = this.extractPermissionCodes(rawPerms);

    // Generate JWT access token
    const tokenPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role.code,
      tenant_id: user.tenant_id,
      permissions,
    };

    const accessToken = this.cryptoService.signJwt(
      tokenPayload as unknown as Record<string, unknown>,
      this.jwtAccessSecret,
      this.jwtExpiresInSeconds,
    );

    // Generate refresh token and save hash in Session table
    const refreshToken = this.cryptoService.generateRandomToken(32);
    const refreshTokenHash = this.cryptoService.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + this.refreshExpiresInMs);

    await this.prisma.$transaction(async (tx) => {
      await tx.session.create({
        data: {
          user_id: user.id,
          tenant_id: user.tenant_id,
          refresh_token_hash: refreshTokenHash,
          expires_at: expiresAt,
          ip_address: metadata?.ip,
          user_agent: metadata?.userAgent,
          device_name: metadata?.deviceName,
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { last_login_at: new Date() },
      });

      await tx.auditLog.create({
        data: {
          tenant_id: user.tenant_id,
          user_id: user.id,
          action: 'USER_LOGIN',
          entity_type: 'User',
          entity_id: user.id,
          ip_address: metadata?.ip,
          user_agent: metadata?.userAgent,
        },
      });
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: this.jwtExpiresInSeconds,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role.code,
        tenant_id: user.tenant_id,
      },
    };
  }

  async refresh(
    dto: RefreshTokenDto,
    metadata?: { ip?: string; userAgent?: string },
  ) {
    const incomingHash = this.cryptoService.hashToken(dto.refresh_token);

    const session = await this.prisma.session.findUnique({
      where: { refresh_token_hash: incomingHash },
      include: {
        user: {
          include: {
            role: true,
            user_access: {
              where: { deleted_at: null },
            },
          },
        },
      },
    });

    if (!session) {
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid or unrecognized refresh token.',
      });
    }

    // Token reuse detection: if revoked session is presented again, revoke entire user family
    if (session.revoked_at !== null) {
      await this.prisma.session.updateMany({
        where: { user_id: session.user_id, revoked_at: null },
        data: { revoked_at: new Date() },
      });

      await this.prisma.auditLog.create({
        data: {
          tenant_id: session.tenant_id,
          user_id: session.user_id,
          action: 'TOKEN_REUSE_DETECTED',
          entity_type: 'Session',
          entity_id: session.id,
          ip_address: metadata?.ip,
          user_agent: metadata?.userAgent,
        },
      });

      throw new UnauthorizedException({
        code: 'SUSPICIOUS_TOKEN_REUSE',
        message: 'Refresh token reuse detected. All active sessions have been terminated.',
      });
    }

    if (session.expires_at < new Date()) {
      throw new UnauthorizedException({
        code: 'REFRESH_TOKEN_EXPIRED',
        message: 'Refresh token has expired. Please log in again.',
      });
    }

    const user = session.user;
    if (user.status !== 1 || user.deleted_at !== null) {
      throw new UnauthorizedException({
        code: 'USER_INACTIVE',
        message: 'User account is no longer active.',
      });
    }

    // Refresh Token Rotation: issue brand-new refresh token and rotate hash in-place
    const newRefreshToken = this.cryptoService.generateRandomToken(32);
    const newRefreshTokenHash = this.cryptoService.hashToken(newRefreshToken);
    const newExpiresAt = new Date(Date.now() + this.refreshExpiresInMs);

    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        refresh_token_hash: newRefreshTokenHash,
        expires_at: newExpiresAt,
        last_used_at: new Date(),
        ip_address: metadata?.ip ?? session.ip_address,
        user_agent: metadata?.userAgent ?? session.user_agent,
      },
    });

    const userAccess = (user as any).user_access?.find((ua: any) => ua.is_individual && !ua.deleted_at)
      || (user as any).user_access?.find((ua: any) => !ua.deleted_at)
      || (user as any).user_access?.[0];
    const rawPerms = userAccess?.permission ?? (user as any).user_permission?.permissions ?? (user as any).user_permissions;
    const permissions = this.extractPermissionCodes(rawPerms);
    const tokenPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role.code,
      tenant_id: user.tenant_id,
      permissions,
    };

    const newAccessToken = this.cryptoService.signJwt(
      tokenPayload as unknown as Record<string, unknown>,
      this.jwtAccessSecret,
      this.jwtExpiresInSeconds,
    );

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      token_type: 'Bearer',
      expires_in: this.jwtExpiresInSeconds,
    };
  }

  async logout(refreshToken: string) {
    const hash = this.cryptoService.hashToken(refreshToken);

    await this.prisma.session.updateMany({
      where: { refresh_token_hash: hash, revoked_at: null },
      data: { revoked_at: new Date() },
    });

    return {
      success: true,
      message: 'Logged out successfully.',
    };
  }

  async logoutAll(userId: number) {
    await this.prisma.session.updateMany({
      where: { user_id: userId, revoked_at: null },
      data: { revoked_at: new Date() },
    });

    return {
      success: true,
      message: 'Logged out from all active sessions.',
    };
  }

  async acceptInvitation(dto: AcceptInvitationDto) {
    const tokenHash = this.cryptoService.hashToken(dto.token);

    const invitation = await this.prisma.invitation.findUnique({
      where: { token_hash: tokenHash },
      include: { tenant: true, role: true },
    });

    if (!invitation || invitation.status !== 1) {
      throw new BadRequestException({
        code: 'INVALID_OR_USED_INVITATION',
        message: 'Invitation is invalid, revoked, or already accepted.',
      });
    }

    if (invitation.expires_at < new Date()) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 4 }, // EXPIRED
      });
      throw new BadRequestException({
        code: 'INVITATION_EXPIRED',
        message: 'Invitation link has expired.',
      });
    }

    // Atomic acceptance & user creation
    return this.prisma.$transaction(async (tx) => {
      // Check if user already exists
      const existingUser = await tx.user.findFirst({
        where: { email: invitation.email.toLowerCase(), deleted_at: null },
      });

      if (existingUser) {
        throw new ConflictException({
          code: 'USER_ALREADY_EXISTS',
          message: `A user with email '${invitation.email}' already exists.`,
        });
      }

      const passwordHash = await this.cryptoService.hashPassword(dto.password);

      const user = await tx.user.create({
        data: {
          tenant_id: invitation.tenant_id,
          role_id: invitation.role_id,
          email: invitation.email.toLowerCase(),
          password_hash: passwordHash,
          first_name: dto.first_name ?? 'User',
          last_name: dto.last_name ?? '',
          status: 1, // ACTIVE
          email_verified_at: new Date(),
        },
        include: { role: true },
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: 2, // ACCEPTED
          accepted_at: new Date(),
        },
      });

      // Generate tokens
      const tokenPayload: JwtPayload = {
        sub: user.id,
        email: user.email,
        role: user.role.code,
        tenant_id: user.tenant_id,
        permissions: [],
      };

      const accessToken = this.cryptoService.signJwt(
        tokenPayload as unknown as Record<string, unknown>,
        this.jwtAccessSecret,
        this.jwtExpiresInSeconds,
      );

      const refreshToken = this.cryptoService.generateRandomToken(32);
      const refreshTokenHash = this.cryptoService.hashToken(refreshToken);

      await tx.session.create({
        data: {
          user_id: user.id,
          tenant_id: user.tenant_id,
          refresh_token_hash: refreshTokenHash,
          expires_at: new Date(Date.now() + this.refreshExpiresInMs),
        },
      });

      await tx.auditLog.create({
        data: {
          tenant_id: invitation.tenant_id,
          user_id: user.id,
          action: 'INVITATION_ACCEPTED',
          entity_type: 'Invitation',
          entity_id: invitation.id,
        },
      });

      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'Bearer',
        expires_in: this.jwtExpiresInSeconds,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role.code,
          tenant_id: user.tenant_id,
        },
      };
    });
  }

  async getMe(userId: number) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deleted_at: null },
      include: {
        role: true,
        tenant: true,
        user_access: {
          where: { deleted_at: null },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: 'USER_NOT_FOUND',
        message: 'Authenticated user not found.',
      });
    }

    const userAccess = (user as any).user_access?.find((ua: any) => ua.is_individual && !ua.deleted_at)
      || (user as any).user_access?.find((ua: any) => !ua.deleted_at)
      || (user as any).user_access?.[0];
    const rawPerms = userAccess?.permission ?? (user as any).user_permission?.permissions ?? (user as any).user_permissions;
    const permissions = this.extractPermissionCodes(rawPerms);

    return {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone,
      role: {
        id: user.role.id,
        code: user.role.code,
        name: user.role.name,
        scope: user.role.scope,
      },
      tenant: user.tenant
        ? {
            id: user.tenant.id,
            name: user.tenant.name,
            slug: user.tenant.slug,
            timezone: user.tenant.timezone,
          }
        : null,
      permissions,
      permission_map: typeof userAccess?.permission === 'string'
        ? (() => {
            try {
              return JSON.parse(userAccess.permission);
            } catch {
              return userAccess.permission;
            }
          })()
        : userAccess?.permission || {},
    };
  }

  extractPermissionCodes(rawPermissions: unknown): string[] {
    if (!rawPermissions) return [];

    if (typeof rawPermissions === 'string') {
      try {
        const parsed = JSON.parse(rawPermissions);
        return this.extractPermissionCodes(parsed);
      } catch {
        return [rawPermissions];
      }
    }

    if (Array.isArray(rawPermissions)) {
      return rawPermissions.flatMap((item) => {
        if (typeof item === 'string') return [item];
        if (typeof item === 'object' && item !== null) {
          if ('permission' in item && typeof (item as any).permission === 'object' && (item as any).permission?.code) {
            return [(item as any).permission.code];
          }
          if ('code' in item && typeof (item as any).code === 'string') {
            return [(item as any).code];
          }
          return Object.values(item).flatMap((val) => this.extractPermissionCodes(val));
        }
        return [];
      });
    }

    if (typeof rawPermissions === 'object' && rawPermissions !== null) {
      const codes: string[] = [];
      for (const [moduleCode, actions] of Object.entries(rawPermissions)) {
        if (Array.isArray(actions)) {
          for (const action of actions) {
            if (typeof action === 'string') {
              codes.push(`${moduleCode}:${action}`);
              codes.push(action);
            } else if (typeof action === 'object' && action !== null && 'code' in action) {
              const code = String((action as any).code);
              codes.push(`${moduleCode}:${code}`);
              codes.push(code);
            }
          }
        }
      }
      return Array.from(new Set(codes));
    }

    return [];
  }

  verifyAccessToken(token: string): JwtPayload {
    return this.cryptoService.verifyJwt(token, this.jwtAccessSecret);
  }
}
