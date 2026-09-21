import {
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreatePaymentDto {
  @IsUUID()
  @IsNotEmpty()
  bookingId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  idempotencyKey!: string;
}