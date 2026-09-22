import {
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

import { AttendanceQrPurpose } from '@prisma/client';

export class AttendanceQrPurposeDto {
  @IsEnum(AttendanceQrPurpose)
  purpose!: AttendanceQrPurpose;
}

export class ValidateAttendanceQrDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  token!: string;

  @IsEnum(AttendanceQrPurpose)
  purpose!: AttendanceQrPurpose;
}