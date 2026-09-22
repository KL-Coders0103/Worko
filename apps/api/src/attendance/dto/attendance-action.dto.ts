import {
  IsDateString,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class AttendanceActionDto {
  @IsString()
  @IsNotEmpty()
  qrToken!: string;

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