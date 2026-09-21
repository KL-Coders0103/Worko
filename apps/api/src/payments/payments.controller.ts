import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/role.guards';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentActionDto } from './dto/payment-action.dto';
import { DemoPaymentDto } from './dto/demo-payment.dto';

type AuthenticatedRequest = Request & {
  user: {
    sub: string;
    role: string;
  };
};

@Controller({
  path: 'payments',
  version: '1'
})
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
  ) {}

  @Post()
  @Roles('CLIENT')
  async createPayment(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.createPayment(
      req.user.sub,
      dto,
    );
  }

  // IMPORTANT:
  // Specific route must come before /:id
  @Get('booking/:bookingId')
  async getBookingPayment(
    @Req() req: AuthenticatedRequest,
    @Param('bookingId') bookingId: string,
  ) {
    return this.paymentsService.getBookingPayment(
      req.user.sub,
      bookingId,
    );
  }

  @Get(':id')
  async getPayment(
    @Req() req: AuthenticatedRequest,
    @Param('id') paymentId: string,
  ) {
    return this.paymentsService.getPayment(
      req.user.sub,
      paymentId,
    );
  }

  @Post(':id/cancel')
  async cancelPayment(
    @Req() req: AuthenticatedRequest,
    @Param('id') paymentId: string,
    @Body() dto: PaymentActionDto,
  ) {
    return this.paymentsService.cancelPayment(
      req.user.sub,
      paymentId,
      dto,
    );
  }

  @Post(':id/demo/complete')
  @Roles('CLIENT')
  async simulateDemoPayment(
    @Req() req: AuthenticatedRequest,
    @Param('id') paymentId: string,
    @Body() dto: DemoPaymentDto,
  ) {
    return this.paymentsService.simulateDemoPayment(
      req.user.sub,
      paymentId,
      dto.success,
    );
  }
}