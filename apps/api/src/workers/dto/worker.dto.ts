import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateWorkerProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(1000)
  bio?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  experienceYears?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  expectedHourlyRate?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  expectedDailyRate?: number;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

}

export class UpdateWorkerProfileDto extends CreateWorkerProfileDto {}

export class UpdateWorkerSkillsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  skillIds!: string[];
}

export class UpdateWorkerLocationDto {
  @IsNumber({ maxDecimalPlaces: 7 })
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber({ maxDecimalPlaces: 7 })
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  accuracyMeters?: number;
}

export class UpdateWorkerCategoriesDto {
  @IsArray()
  @IsUUID('4', { each: true })
  categoryIds!: string[];
}

