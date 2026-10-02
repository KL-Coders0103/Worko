import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyRegistrationDto } from './dto/verify-registration.dto';
import { VerifyLoginOtpDto } from './dto/verify-login-otp.dto';
import { PasswordLoginDto } from './dto/password-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { SaveClientProfileDto } from './dto/save-client-profile.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import type { AuthenticatedUser } from './current-user.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('otp/request')
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestOtp(dto.identifier, dto.purpose);
  }

  @Post('otp/verify')
  verifyRegistration(@Body() dto: VerifyRegistrationDto) {
    return this.authService.verifyRegistration(dto.userId, dto.code);
  }

  @Post('login/password')
  loginWithPassword(@Body() dto: PasswordLoginDto) {
    return this.authService.loginWithPassword(dto);
  }

  @Post('login/otp/verify')
  loginWithOtp(@Body() dto: VerifyLoginOtpDto) {
    return this.authService.loginWithOtp(dto.identifier, dto.code);
  }

  @Post('token/refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshSession(dto.refreshToken);
  }

  @Post('logout')
  logout(@Body() dto: LogoutDto) {
    return this.authService.logout(dto.refreshToken);
  }


  @Patch('client/profile')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  saveClientProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SaveClientProfileDto,
  ) {
    return this.authService.saveClientProfile(user.id, dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getProfile(user.id);
  }
}