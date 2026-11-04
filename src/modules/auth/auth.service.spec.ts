import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service.js';
import { CryptoService } from './services/crypto.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

describe('AuthService', () => {
  let service: AuthService;
  let prismaMock: any;
  let cryptoService: CryptoService;
  let configService: ConfigService;

  beforeEach(() => {
    prismaMock = {
      user: {
        findFirst: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
      },
      session: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      invitation: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback(prismaMock)),
    };

    cryptoService = new CryptoService();
    configService = new ConfigService({
      JWT_ACCESS_SECRET: 'test-secret-key-1234567890',
    });

    service = new AuthService(
      prismaMock as unknown as PrismaService,
      cryptoService,
      configService,
    );
  });

  describe('login', () => {
    it('should authenticate valid user, create session, and return tokens', async () => {
      const password = 'CorrectPassword123';
      const passwordHash = await cryptoService.hashPassword(password);

      prismaMock.user.findFirst.mockResolvedValue({
        id: 1,
        email: 'admin@school.com',
        password_hash: passwordHash,
        status: 1,
        tenant_id: 10,
        first_name: 'Admin',
        last_name: 'User',
        role: { id: 2, code: 'SCHOOL_ADMIN' },
        tenant: { id: 10, status: 1 },
        user_access: [],
      });

      const res = await service.login({
        email: 'admin@school.com',
        password,
      });

      expect(res.access_token).toBeDefined();
      expect(res.refresh_token).toBeDefined();
      expect(res.user.email).toBe('admin@school.com');
      expect(res.user.role).toBe('SCHOOL_ADMIN');
      expect(prismaMock.session.create).toHaveBeenCalled();
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { last_login_at: expect.any(Date) },
        }),
      );
    });

    it('should reject invalid password with UnauthorizedException without leaking details', async () => {
      const passwordHash = await cryptoService.hashPassword('OriginalPassword');

      prismaMock.user.findFirst.mockResolvedValue({
        id: 1,
        email: 'admin@school.com',
        password_hash: passwordHash,
        status: 1,
        tenant_id: 10,
        role: { code: 'SCHOOL_ADMIN' },
        tenant: { status: 1 },
        user_access: [],
      });

      await expect(
        service.login({
          email: 'admin@school.com',
          password: 'WrongPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject login if tenant account is inactive/suspended', async () => {
      const password = 'CorrectPassword123';
      const passwordHash = await cryptoService.hashPassword(password);

      prismaMock.user.findFirst.mockResolvedValue({
        id: 1,
        email: 'admin@school.com',
        password_hash: passwordHash,
        status: 1,
        tenant_id: 10,
        role: { code: 'SCHOOL_ADMIN' },
        tenant: { id: 10, status: 2 }, // SUSPENDED / INACTIVE
        user_access: [],
      });

      await expect(
        service.login({
          email: 'admin@school.com',
          password,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh & Token Reuse Detection', () => {
    it('should rotate refresh token on valid refresh request', async () => {
      const oldRefreshToken = 'valid-active-refresh-token';
      const oldHash = cryptoService.hashToken(oldRefreshToken);

      prismaMock.session.findUnique.mockResolvedValue({
        id: 101,
        user_id: 1,
        tenant_id: 10,
        refresh_token_hash: oldHash,
        revoked_at: null,
        expires_at: new Date(Date.now() + 1000000),
        user: {
          id: 1,
          email: 'admin@school.com',
          status: 1,
          deleted_at: null,
          role: { code: 'SCHOOL_ADMIN' },
          user_access: [],
        },
      });

      const res = await service.refresh({ refresh_token: oldRefreshToken });

      expect(res.access_token).toBeDefined();
      expect(res.refresh_token).toBeDefined();
      expect(res.refresh_token).not.toBe(oldRefreshToken); // Rotated!
      expect(prismaMock.session.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 101 },
          data: expect.objectContaining({
            refresh_token_hash: expect.any(String),
            last_used_at: expect.any(Date),
          }),
        }),
      );
    });

    it('should detect token reuse, revoke all user sessions, and throw SUSPICIOUS_TOKEN_REUSE', async () => {
      const stolenToken = 'already-rotated-or-revoked-token';
      const stolenHash = cryptoService.hashToken(stolenToken);

      prismaMock.session.findUnique.mockResolvedValue({
        id: 101,
        user_id: 5,
        tenant_id: 10,
        refresh_token_hash: stolenHash,
        revoked_at: new Date(), // Already revoked!
        expires_at: new Date(Date.now() + 1000000),
        user: { id: 5 },
      });

      await expect(
        service.refresh({ refresh_token: stolenToken }),
      ).rejects.toThrow(UnauthorizedException);

      // All sessions for that user must be revoked
      expect(prismaMock.session.updateMany).toHaveBeenCalledWith({
        where: { user_id: 5, revoked_at: null },
        data: { revoked_at: expect.any(Date) },
      });
      // Security audit log created
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'TOKEN_REUSE_DETECTED',
            user_id: 5,
          }),
        }),
      );
    });
  });

  describe('acceptInvitation', () => {
    it('should accept pending invitation, hash password, and create user', async () => {
      const rawToken = 'secret-invitation-token-123';
      const tokenHash = cryptoService.hashToken(rawToken);

      prismaMock.invitation.findUnique.mockResolvedValue({
        id: 50,
        tenant_id: 10,
        role_id: 3,
        email: 'newteacher@school.com',
        token_hash: tokenHash,
        status: 1, // PENDING
        expires_at: new Date(Date.now() + 1000000),
      });

      prismaMock.user.findFirst.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: 77,
        email: 'newteacher@school.com',
        first_name: 'Sarah',
        last_name: 'Connor',
        role: { code: 'TEACHER' },
        tenant_id: 10,
      });

      const res = await service.acceptInvitation({
        token: rawToken,
        password: 'SecurePassword123!',
        first_name: 'Sarah',
        last_name: 'Connor',
      });

      expect(res.user.id).toBe(77);
      expect(res.access_token).toBeDefined();
      expect(res.refresh_token).toBeDefined();
      expect(prismaMock.invitation.update).toHaveBeenCalledWith({
        where: { id: 50 },
        data: {
          status: 2, // ACCEPTED
          accepted_at: expect.any(Date),
        },
      });
    });

    it('should reject already accepted invitation', async () => {
      prismaMock.invitation.findUnique.mockResolvedValue({
        id: 50,
        status: 2, // ALREADY ACCEPTED
        expires_at: new Date(Date.now() + 1000000),
      });

      await expect(
        service.acceptInvitation({
          token: 'token',
          password: 'Password123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
