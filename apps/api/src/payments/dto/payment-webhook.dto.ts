import {IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength} from 'class-validator';

export enum PaymentWebhookEventType {
  PAYMENT_SUCCEEDED = 'payment.succeeded',
  PAYMENT_FAILED = 'payment.failed',
}

export class PaymentWebhookDto {
  @IsUUID()
  @IsNotEmpty()
  paymentId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  eventId!: string;

  @IsEnum(PaymentWebhookEventType)
  type!: PaymentWebhookEventType;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  gatewayPaymentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  gatewaySignature?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  failureCode?: string;

  @IsOptional()
  @IsString()
  failureMessage?: string;
}
