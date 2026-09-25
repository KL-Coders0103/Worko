import {IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID} from 'class-validator';

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
  eventId!: string;

  @IsEnum(PaymentWebhookEventType)
  type!: PaymentWebhookEventType;

  @IsOptional()
  @IsString()
  gatewayPaymentId?: string;

  @IsOptional()
  @IsString()
  gatewaySignature?: string;

  @IsOptional()
  @IsString()
  failureCode?: string;

  @IsOptional()
  @IsString()
  failureMessage?: string;
}
