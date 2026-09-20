import { IsEmail, IsOptional, IsString, Length, Matches } from 'class-validator';

export class RegisterDto {
  @IsString()
  @Length(2, 50)
  firstName!: string;

  @IsOptional()
  @IsString()
  @Length(2, 50)
  lastName?: string;

  @IsEmail()
  email!: string;

  @IsString()
  @Matches(/^\+?[1-9]\d{7,14}$/, {
    message: 'phoneNumber must be a valid phone number',
  })
  phoneNumber!: string;
}

export class SendOtpDto {
  @IsString()
  @Length(1, 100)
  identifier!: string;

  @IsOptional()
  @IsString()
  purpose?: 'LOGIN' | 'REGISTRATION' | 'PHONE_VERIFICATION' | 'EMAIL_VERIFICATION';
}

export class VerifyOtpDto {
  @IsString()
  @Length(1, 100)
  identifier!: string;

  @IsString()
  @Matches(/^\d{6}$/, {
    message: 'OTP must be a 6-digit code',
  })
  otp!: string;

  @IsOptional()
  @IsString()
  purpose?: 'LOGIN' | 'REGISTRATION' | 'PHONE_VERIFICATION' | 'EMAIL_VERIFICATION';
}

export class LoginDto {
  @IsString()
  @Length(1, 100)
  identifier!: string;

  @IsString()
  @Matches(/^\d{6}$/, {
    message: 'OTP must be a 6-digit code',
  })
  otp!: string;
}

export class RefreshTokenDto {
  @IsString()
  @Length(20, 200)
  refreshToken!: string;
}

export class LogoutDto {
  @IsString()
  @Length(20, 200)
  refreshToken!: string;
}