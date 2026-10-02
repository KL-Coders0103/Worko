import { IsEmail, IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { AuthOtpPurpose } from '@prisma/client';

export class RequestOtpDto {
  @IsString()
  identifier!: string;

  @IsEnum(AuthOtpPurpose)
  purpose!: AuthOtpPurpose;
}