import { BadRequestException, Body, Controller, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentsService } from './payments.service';

type RawBodyRequest = Request & { rawBody?: Buffer };

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('webhook/razorpay')
  async webhook(
    @Req() request: RawBodyRequest,
    @Headers('x-razorpay-signature') signature: string,
    @Body() body: Record<string, any>,
  ) {
    if (!request.rawBody || !signature) throw new BadRequestException('Webhook signature and raw body are required.');
    return this.payments.handleWebhook(request.rawBody, signature, body);
  }

  @Post('requirements/:requirementId/intent')
  @UseGuards(JwtAuthGuard)
  createIntent(@CurrentUser() user: AuthenticatedUser, @Param('requirementId') requirementId: string) {
    return this.payments.createIntent(user.id, requirementId);
  }

  @Post('requirements/:requirementId/verify')
  @UseGuards(JwtAuthGuard)
  verify(
    @CurrentUser() user: AuthenticatedUser,
    @Param('requirementId') requirementId: string,
    @Body() body: unknown,
  ) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('Payment verification payload is required.');
    }
    return this.payments.verifyCallback(user.id, requirementId, body as Record<string, unknown>);
  }
}
