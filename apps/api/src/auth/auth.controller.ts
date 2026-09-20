import { Body, Controller, Post, Version } from '@nestjs/common';
import {LoginDto, LogoutDto, RefreshTokenDto, RegisterDto, SendOtpDto, VerifyOtpDto,
} from './dto/auth.dto';
import { AuthService } from './auth.service';
import { AuthJwtService } from './jwt.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authJwtService: AuthJwtService,
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
}

