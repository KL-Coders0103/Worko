import {BadRequestException, Body, Controller, Headers, Post, Req} from '@nestjs/common';
import {Request} from 'express';
import {PaymentWebhookDto} from './dto/payment-webhook.dto';
import {PaymentWebhookService} from './payment-webhook.service';

@Controller({path: 'payments/webhook', version: '1'})
export class PaymentWebhookController {
  constructor(private readonly service: PaymentWebhookService) {}

  @Post()
  async handle(
    @Req() req: Request,
    @Headers('x-worko-signature') signature: string | undefined,
    @Body() dto: PaymentWebhookDto,
  ) {
    const rawBody = (req as Request & {rawBody?: Buffer}).rawBody?.toString('utf8');
    if (!rawBody) {
      throw new BadRequestException('Raw webhook body is unavailable');
    }
    return this.service.handle(rawBody, signature, dto);
  }
}
