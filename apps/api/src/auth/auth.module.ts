import { Module } from '@nestjs/common';

import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthJwtService } from './jwt.service';
import { GoogleAuthService } from './google-auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/role.guards';
import { OtpDeliveryService } from './otp-delivery.service';

@Module({
  imports: [
    JwtModule.register({}),
  ],
  controllers: [
    AuthController,
  ],
  providers: [
    AuthService,
    AuthJwtService,
    GoogleAuthService,
    OtpDeliveryService,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [
  JwtModule,
  AuthService,
  AuthJwtService,
  GoogleAuthService,
  OtpDeliveryService,
  JwtAuthGuard,
  RolesGuard,
],
})
export class AuthModule {}