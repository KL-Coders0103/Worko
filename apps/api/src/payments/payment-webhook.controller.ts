import {Body, Controller, Headers, Post, Req} from '@nestjs/common';
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
    const rawBody = JSON.stringify(req.body);
    return this.service.handle(rawBody, signature, dto);
  }
}
