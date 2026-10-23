import { describe, expect, it } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service.js';

describe('PrismaService', () => {
  it('should instantiate gracefully without DATABASE_URL in disconnected mode', () => {
    const configService = new ConfigService({});
    const service = new PrismaService(configService);
    expect(service).toBeDefined();
  });

  it('should instantiate with DATABASE_URL provided', () => {
    const configService = new ConfigService({
      DATABASE_URL: 'postgresql://test_user:test_pass@localhost:5432/test_db',
    });
    const service = new PrismaService(configService);
    expect(service).toBeDefined();
  });
});
