import {
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export enum ClientType {
  INDIVIDUAL = 'INDIVIDUAL',
  BUSINESS = 'BUSINESS',
}

export class UpdateClientProfileDto {
  @IsEnum(ClientType)
  type!: ClientType;

  @ValidateIf((object) => object.type === ClientType.BUSINESS)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Matches(/^[A-Za-z0-9-]+$/, {
    message: 'GSTIN must contain only letters, numbers, and hyphens',
  })
  gstin?: string;

  @ValidateIf((object) => object.type === ClientType.BUSINESS)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  contactPerson?: string;

  @ValidateIf((object) => object.type === ClientType.BUSINESS)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  businessAddress?: string;
}

export class UpdateClientLocationDto {
  @IsLatitude()
  latitude!: number;

  @IsLongitude()
  longitude!: number;

  @IsOptional()
  @IsNumber()
  @Max(10000)
  accuracyMeters?: number;
}