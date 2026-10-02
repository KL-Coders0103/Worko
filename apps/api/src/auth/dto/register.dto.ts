import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export enum RegistrationRole {
  CLIENT = 'CLIENT',
  WORKER = 'WORKER',
}

export class RegisterDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsString()
  @Matches(/^\+?[1-9]\d{7,14}$/)
  phone!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsEnum(RegistrationRole)
  role!: RegistrationRole;
}