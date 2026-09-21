import {api} from '../../services/api';

export type Wallet = {
  id: string;
  userId: string;
  balance: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
};

export type WalletBalance = {
  walletId: string;
  balance: string;
  currency: string;
};

export type WalletTransactionType = 'CREDIT' | 'DEBIT';

export type WalletTransactionStatus =
  | 'PENDING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REVERSED';

export type WalletTransactionSource =
  | 'PAYMENT'
  | 'REFUND'
  | 'BONUS'
  | 'ADJUSTMENT'
  | 'DEMO';

export type WalletTransaction = {
  id: string;
  walletId: string;
  type: WalletTransactionType;
  status: WalletTransactionStatus;
  source: WalletTransactionSource;
  amount: string;
  currency: string;
  referenceId: string | null;
  description: string | null;
  balanceBefore: string;
  balanceAfter: string;
  createdAt: string;
};

export async function getWallet(): Promise<{
  wallet: Wallet;
}> {
  const response = await api.get<{wallet: Wallet}>('/wallet');

  return response.data;
}

export async function getWalletBalance(): Promise<WalletBalance> {
  const response =
    await api.get<WalletBalance>('/wallet/balance');

  return response.data;
}

export async function getWalletTransactions(
  limit = 50,
): Promise<{
  transactions: WalletTransaction[];
}> {
  const response =
    await api.get<{transactions: WalletTransaction[]}>(
      `/wallet/transactions?limit=${limit}`,
    );

  return response.data;
}

export async function getWalletTransaction(
  transactionId: string,
): Promise<{
  transaction: WalletTransaction;
}> {
  const response =
    await api.get<{transaction: WalletTransaction}>(
      `/wallet/transactions/${transactionId}`,
    );

  return response.data;
}