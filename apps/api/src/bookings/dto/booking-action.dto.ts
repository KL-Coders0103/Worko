import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class BookingActionDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason?: string;
}