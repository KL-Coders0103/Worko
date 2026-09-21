import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsNotEmpty,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  @IsNotEmpty()
  workerId!: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  skillId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  serviceTitle!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  serviceDescription?: string;

  @IsDateString()
  scheduledStart!: string;

  @IsDateString()
  scheduledEnd!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  address!: string;

  @IsOptional()
  @IsNumber({
    allowNaN: false,
    allowInfinity: false,
  })
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber({
    allowNaN: false,
    allowInfinity: false,
  })
  @Min(-180)
  @Max(180)
  longitude?: number;
}