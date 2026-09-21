import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  Prisma,
  WalletTransactionStatus,
  WalletTransactionType,
} from '@prisma/client';

import {PrismaService} from '../common/prisma/prisma.service';

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Get or create the authenticated user's wallet.
   *
   * Wallet creation is idempotent because userId is unique.
   */
  async getOrCreateWallet(userId: string) {
    const existingWallet =
      await this.prisma.wallet.findUnique({
        where: {
          userId,
        },
      });

    if (existingWallet) {
      return existingWallet;
    }

    return this.prisma.wallet.create({
      data: {
        userId,
        balance: new Prisma.Decimal(0),
        currency: 'INR',
      },
    });
  }

  /**
   * Return wallet balance.
   */
  async getBalance(userId: string) {
    const wallet =
      await this.getOrCreateWallet(userId);

    return {
      walletId: wallet.id,
      balance: wallet.balance,
      currency: wallet.currency,
    };
  }

  /**
   * Return wallet details.
   */
  async getWallet(userId: string) {
    return this.getOrCreateWallet(userId);
  }

  /**
   * Return wallet transaction history.
   */
  async getTransactions(
    userId: string,
    limit = 50,
  ) {
    const wallet =
      await this.getOrCreateWallet(userId);

    const safeLimit = Math.min(
      Math.max(limit, 1),
      100,
    );

    const transactions =
      await this.prisma.walletTransaction.findMany({
        where: {
          walletId: wallet.id,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: safeLimit,
      });

    return {
      transactions,
    };
  }

  /**
   * Credit wallet.
   *
   * This method is intentionally not exposed directly
   * through the controller.
   */
  async creditWallet(
    userId: string,
    amount: Prisma.Decimal | number | string,
    source: 'PAYMENT' | 'REFUND' | 'BONUS' | 'ADJUSTMENT' | 'DEMO',
    referenceId?: string,
    description?: string,
  ) {
    const creditAmount =
      new Prisma.Decimal(amount);

    if (creditAmount.lte(0)) {
      throw new BadRequestException(
        'Credit amount must be greater than zero',
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        const wallet =
          await tx.wallet.upsert({
            where: {
              userId,
            },
            create: {
              userId,
              balance: new Prisma.Decimal(0),
              currency: 'INR',
            },
            update: {},
          });

        const balanceBefore =
          new Prisma.Decimal(wallet.balance);

        const balanceAfter =
          balanceBefore.add(creditAmount);

        const updatedWallet =
          await tx.wallet.update({
            where: {
              id: wallet.id,
            },
            data: {
              balance: balanceAfter,
            },
          });

        const transaction =
          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              type: WalletTransactionType.CREDIT,
              status:
                WalletTransactionStatus.COMPLETED,
              source,
              amount: creditAmount,
              currency: wallet.currency,
              referenceId,
              description,
              balanceBefore,
              balanceAfter,
            },
          });

        return {
          wallet: updatedWallet,
          transaction,
        };
      },
    );
  }

  /**
   * Debit wallet.
   *
   * This method is intentionally not exposed directly
   * through the controller.
   */
  async debitWallet(
    userId: string,
    amount: Prisma.Decimal | number | string,
    source: 'PAYMENT' | 'REFUND' | 'BONUS' | 'ADJUSTMENT' | 'DEMO',
    referenceId?: string,
    description?: string,
  ) {
    const debitAmount =
      new Prisma.Decimal(amount);

    if (debitAmount.lte(0)) {
      throw new BadRequestException(
        'Debit amount must be greater than zero',
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        const wallet =
          await tx.wallet.findUnique({
            where: {
              userId,
            },
          });

        if (!wallet) {
          throw new NotFoundException(
            'Wallet not found',
          );
        }

        const balanceBefore =
          new Prisma.Decimal(wallet.balance);

        if (balanceBefore.lt(debitAmount)) {
          throw new BadRequestException(
            'Insufficient wallet balance',
          );
        }

        const balanceAfter =
          balanceBefore.sub(debitAmount);

        const updatedWallet =
          await tx.wallet.update({
            where: {
              id: wallet.id,
            },
            data: {
              balance: balanceAfter,
            },
          });

        const transaction =
          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              type: WalletTransactionType.DEBIT,
              status:
                WalletTransactionStatus.COMPLETED,
              source,
              amount: debitAmount,
              currency: wallet.currency,
              referenceId,
              description,
              balanceBefore,
              balanceAfter,
            },
          });

        return {
          wallet: updatedWallet,
          transaction,
        };
      },
    );
  }

  async creditWalletInTransaction(
    tx: Prisma.TransactionClient,
    userId: string,
    amount: Prisma.Decimal | number | string,
    source:
        | 'PAYMENT'
        | 'REFUND'
        | 'BONUS'
        | 'ADJUSTMENT'
        | 'DEMO',
    referenceId?: string,
    description?: string,
    ) {
    const creditAmount =
        new Prisma.Decimal(amount);

    if (creditAmount.lte(0)) {
        throw new BadRequestException(
        'Credit amount must be greater than zero',
        );
    }

    const wallet = await tx.wallet.upsert({
        where: {
        userId,
        },
        create: {
        userId,
        balance: new Prisma.Decimal(0),
        currency: 'INR',
        },
        update: {},
    });

    const balanceBefore =
        new Prisma.Decimal(wallet.balance);

    const balanceAfter =
        balanceBefore.add(creditAmount);

    const updatedWallet =
        await tx.wallet.update({
        where: {
            id: wallet.id,
        },
        data: {
            balance: balanceAfter,
        },
        });

    const transaction =
        await tx.walletTransaction.create({
        data: {
            walletId: wallet.id,
            type: WalletTransactionType.CREDIT,
            status:
            WalletTransactionStatus.COMPLETED,
            source,
            amount: creditAmount,
            currency: wallet.currency,
            referenceId,
            description,
            balanceBefore,
            balanceAfter,
        },
        });

    return {
        wallet: updatedWallet,
        transaction,
    };
    }

  /**
   * Get a transaction only if it belongs
   * to the authenticated user's wallet.
   */
  async getTransaction(
    userId: string,
    transactionId: string,
  ) {
    const wallet =
      await this.prisma.wallet.findUnique({
        where: {
          userId,
        },
        select: {
          id: true,
        },
      });

    if (!wallet) {
      throw new NotFoundException(
        'Wallet not found',
      );
    }

    const transaction =
      await this.prisma.walletTransaction.findUnique({
        where: {
          id: transactionId,
        },
      });

    if (!transaction) {
      throw new NotFoundException(
        'Wallet transaction not found',
      );
    }

    if (transaction.walletId !== wallet.id) {
      throw new ForbiddenException(
        'You do not have access to this transaction',
      );
    }

    return {
      transaction,
    };
  }
}