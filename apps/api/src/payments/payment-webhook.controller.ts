import {BadRequestException, Body, Controller, Headers, Post, Req} from '@nestjs/common';
import type {Request} from 'express';

type RawBodyRequest = Request & {rawBody?: Buffer};
import {PaymentWebhookDto} from './dto/payment-webhook.dto';
import {PaymentWebhookService} from './payment-webhook.service';

@Controller({path: 'payments/webhook', version: '1'})
export class PaymentWebhookController {
  constructor(private readonly service: PaymentWebhookService) {}

  @Post()
  async handle(
    @Req() req: RawBodyRequest,
    @Headers('x-worko-signature') signature: string | undefined,
    @Body() dto: PaymentWebhookDto,
  ) {
    const rawBody = req.rawBody?.toString('utf8');
    if (!rawBody) {
      throw new BadRequestException('Raw webhook body is unavailable');
    }
    return this.service.handle(rawBody, signature, dto);
  }
}
