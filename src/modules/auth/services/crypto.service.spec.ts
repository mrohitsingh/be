import { describe, expect, it } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { CryptoService } from './crypto.service.js';

describe('CryptoService', () => {
  const service = new CryptoService();
  const testSecret = 'super-secret-key-for-testing-12345';

  describe('Password Hashing', () => {
    it('should hash a password with scrypt and verify correctly', async () => {
      const password = 'SuperSecurePassword123!';
      const hash = await service.hashPassword(password);

      expect(hash).toMatch(/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/);
      expect(await service.verifyPassword(password, hash)).toBe(true);
      expect(await service.verifyPassword('WrongPassword', hash)).toBe(false);
    });
  });

  describe('Token Hashing', () => {
    it('should hash tokens using SHA-256 deterministically', () => {
      const token = 'my-test-refresh-token';
      const hash1 = service.hashToken(token);
      const hash2 = service.hashToken(token);

      expect(hash1).toHaveLength(64);
      expect(hash1).toBe(hash2);
    });

    it('should generate secure random tokens of requested length', () => {
      const token = service.generateRandomToken(32);
      expect(token).toHaveLength(64); // 32 bytes in hex = 64 characters
    });
  });

  describe('JWT Encoding & Verification', () => {
    it('should sign and verify valid JWT token', () => {
      const payload = {
        sub: 42,
        email: 'teacher@school.com',
        role: 'TEACHER',
        tenant_id: 10,
      };

      const token = service.signJwt(payload, testSecret, 300);
      expect(token.split('.')).toHaveLength(3);

      const decoded = service.verifyJwt(token, testSecret);
      expect(decoded.sub).toBe(42);
      expect(decoded.email).toBe('teacher@school.com');
      expect(decoded.role).toBe('TEACHER');
      expect(decoded.tenant_id).toBe(10);
    });

    it('should reject JWT with invalid secret', () => {
      const token = service.signJwt({ sub: 1 }, testSecret, 300);

      expect(() => service.verifyJwt(token, 'wrong-secret-key')).toThrow(
        UnauthorizedException,
      );
    });

    it('should reject expired JWT', () => {
      // Create already-expired token (-10 seconds)
      const token = service.signJwt({ sub: 1 }, testSecret, -10);

      expect(() => service.verifyJwt(token, testSecret)).toThrow(
        UnauthorizedException,
      );
    });
  });
});
