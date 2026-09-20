import { Body, Controller, Get, Post, Req, UseGuards, Version } from '@nestjs/common';
import {LoginDto, LogoutDto, RefreshTokenDto, RegisterDto, SendOtpDto, VerifyOtpDto,
} from './dto/auth.dto';
import { AuthService } from './auth.service';
import { AuthJwtService } from './jwt.service';
import { GoogleAuthService } from './google-auth.service';
import { GoogleAuthDto } from './dto/google-auth.dto';
import type { Request } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AccessTokenPayload } from './jwt.service';

type AuthenticatedRequest = Request & {
  user: AccessTokenPayload;
};

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authJwtService: AuthJwtService,
    private readonly googleAuthService: GoogleAuthService,
  ) {}

  @Post('register')
  @Version('1')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('send-otp')
  @Version('1')
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  @Post('verify-otp')
  @Version('1')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Post('login')
  @Version('1')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @Version('1')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authJwtService.rotateRefreshToken(dto.refreshToken);
  }

  @Post('logout')
  @Version('1')
  async logout(@Body() dto: LogoutDto) {
    await this.authJwtService.revokeRefreshToken(dto.refreshToken);

    return {
      message: 'Logged out successfully',
    };
  }

  @Post('google')
  @Version('1')
  async googleAuth(@Body() dto: GoogleAuthDto) {
    return this.googleAuthService.authenticate(dto.idToken);
  }

  @Get('me')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  async me(@Req() request: AuthenticatedRequest) {
    return this.authService.getCurrentUser(
      request.user.sub,
    );
  }
}

