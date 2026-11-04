import { Global, Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { CryptoService } from './services/crypto.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';

@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthService, CryptoService, JwtAuthGuard, RolesGuard],
  exports: [AuthService, CryptoService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
