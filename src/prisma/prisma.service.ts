import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(configService: ConfigService) {
    const connectionString = configService.get<string>('DATABASE_URL');
    const adapter = new PrismaPg({
      connectionString: connectionString,
    });

    super({ adapter });

    if (!connectionString) {
      this.logger.warn(
        'DATABASE_URL not configured. PrismaService operating in disconnected mode.',
      );
    }
  }

  async onModuleInit() {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    if (process.env.DATABASE_URL) {
      try {
        await this.$connect();
        this.logger.log('Prisma connected to PostgreSQL database successfully.');
      } catch (error) {
        this.logger.error('Failed to connect to PostgreSQL database:', error);
      }
    }
  }

  async onModuleDestroy() {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    if (process.env.DATABASE_URL) {
      await this.$disconnect();
      this.logger.log('Prisma disconnected.');
    }
  }
}
