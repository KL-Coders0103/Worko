import {
  IsDateString,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import { AttendanceEvidenceType } from '@prisma/client';

export class AttendanceEvidenceDto {
  @IsEnum(AttendanceEvidenceType)
  type!: AttendanceEvidenceType;

  @IsString()
  @IsNotEmpty()
  fileKey!: string;

  @IsLatitude()
  latitude!: number;

  @IsLongitude()
  longitude!: number;

  @IsNumber({
    allowNaN: false,
    allowInfinity: false,
  })
  @Min(0)
  @Max(1000)
  accuracyMeters!: number;

  @IsOptional()
  @IsDateString()
  capturedAt?: string;
}