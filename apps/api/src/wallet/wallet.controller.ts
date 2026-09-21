import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import {Request} from 'express';

import {JwtAuthGuard} from '../auth/guards/jwt-auth.guard';
import {RolesGuard} from '../auth/guards/role.guards';

import {WalletService} from './wallet.service';

type AuthenticatedRequest = Request & {
  user: {
    sub: string;
    role: string;
  };
};

@Controller({
  path: 'wallet',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
  ) {}

  @Get()
  async getWallet(
    @Req() req: AuthenticatedRequest,
  ) {
    return {
      wallet:
        await this.walletService.getWallet(
          req.user.sub,
        ),
    };
  }

  @Get('balance')
  async getBalance(
    @Req() req: AuthenticatedRequest,
  ) {
    return this.walletService.getBalance(
      req.user.sub,
    );
  }

  @Get('transactions')
  async getTransactions(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit
      ? Number(limit)
      : 50;

    return this.walletService.getTransactions(
      req.user.sub,
      Number.isFinite(parsedLimit)
        ? parsedLimit
        : 50,
    );
  }

  @Get('transactions/:id')
  async getTransaction(
    @Req() req: AuthenticatedRequest,
    @Param('id') transactionId: string,
  ) {
    return this.walletService.getTransaction(
      req.user.sub,
      transactionId,
    );
  }
}