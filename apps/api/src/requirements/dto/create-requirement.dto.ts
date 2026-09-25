import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class CreateRequirementDto {
  @IsUUID()
  @IsNotEmpty()
  categoryId!: string;

  @IsOptional()
  @IsUUID()
  skillId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  budget?: number;

  @IsDateString()
  scheduledStart!: string;

  @IsDateString()
  scheduledEnd!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  address!: string;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-180)
  @Max(180)
  longitude?: number;
}
