import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {Screen} from '../../../components/Screen';
import {Card} from '../../../components/Card';
import {EmptyState} from '../../../components/EmptyState';

import {
  spacing,
  typography,
  useTheme,
} from '../../../theme';

import {
  getWalletBalance,
  getWalletTransactions,
  WalletBalance,
  WalletTransaction,
  WalletTransactionSource,
  WalletTransactionStatus,
  WalletTransactionType,
} from '../wallet.api';

export function WalletScreen() {
  const {colors} = useTheme();

  const [balance, setBalance] =
    useState<WalletBalance | null>(null);

  const [transactions, setTransactions] =
    useState<WalletTransaction[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const loadWallet = useCallback(
    async (isRefresh = false) => {
      try {
        setError(null);

        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const [
          balanceResponse,
          transactionsResponse,
        ] = await Promise.all([
          getWalletBalance(),
          getWalletTransactions(50),
        ]);

        setBalance(balanceResponse);
        setTransactions(
          transactionsResponse.transactions,
        );
      } catch {
        setError(
          'Unable to load your wallet right now.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  if (loading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={colors.primary}
          />

          <Text
            style={[
              styles.loadingText,
              {
                color: colors.textSecondary,
              },
            ]}>
            Loading wallet...
          </Text>
        </View>
      </Screen>
    );
  }

  if (error && !balance) {
    return (
      <Screen>
        <View style={styles.errorContainer}>
          <Card>
            <EmptyState
              icon="wallet-outline"
              title="Wallet unavailable"
              description={error}
            />

            <Text
              onPress={() => loadWallet()}
              style={[
                styles.retryText,
                {
                  color: colors.primary,
                },
              ]}>
              Try again
            </Text>
          </Card>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      contentContainerStyle={
        styles.contentContainer
      }>
      <View style={styles.header}>
        <Text
          style={[
            styles.title,
            {
              color: colors.text,
            },
          ]}>
          Wallet
        </Text>

        <Text
          style={[
            styles.subtitle,
            {
              color: colors.textSecondary,
            },
          ]}>
          Manage your Worko earnings and transactions.
        </Text>
      </View>

      {/* Balance */}
      <Card
        style={{
            ...styles.balanceCard,
            backgroundColor: colors.primary,
        }}>
        <Text
          style={[
            styles.balanceLabel,
            {
              color: colors.onPrimary,
            },
          ]}>
          Available Balance
        </Text>

        <Text
          style={[
            styles.balanceAmount,
            {
              color: colors.onPrimary,
            },
          ]}>
          {balance?.currency ?? 'INR'}{' '}
          {formatAmount(balance?.balance ?? '0')}
        </Text>

        <Text
          style={[
            styles.balanceHint,
            {
              color: colors.onPrimary,
            },
          ]}>
          Your wallet balance
        </Text>
      </Card>

      {/* Error banner */}
      {error ? (
        <Text
          style={[
            styles.errorText,
            {
              color: colors.error,
            },
          ]}>
          {error}
        </Text>
      ) : null}

      {/* Transactions */}
      <View style={styles.sectionHeader}>
        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.text,
            },
          ]}>
          Transactions
        </Text>

        <Text
          style={[
            styles.transactionCount,
            {
              color: colors.textSecondary,
            },
          ]}>
          {transactions.length}
        </Text>
      </View>

      {transactions.length === 0 ? (
        <Card>
          <EmptyState
            icon="receipt-outline"
            title="No transactions yet"
            description="Your wallet transactions will appear here."
          />
        </Card>
      ) : (
        <View style={styles.transactionList}>
          {transactions.map(transaction => (
            <TransactionCard
              key={transaction.id}
              transaction={transaction}
              colors={colors}
            />
          ))}
        </View>
      )}

      <RefreshControlSpacer
        refreshing={refreshing}
        onRefresh={() => loadWallet(true)}
      />
    </Screen>
  );
}

function TransactionCard({
  transaction,
  colors,
}: {
  transaction: WalletTransaction;
  colors: any;
}) {
  const isCredit =
    transaction.type === 'CREDIT';

  const amountPrefix = isCredit ? '+' : '-';

  const title =
    transaction.description ||
    getTransactionTitle(
      transaction.source,
      transaction.type,
    );

  return (
    <Card>
      <View style={styles.transactionRow}>
        <View
          style={[
            styles.transactionIcon,
            {
              backgroundColor: isCredit
                ? colors.primary
                : colors.background,
            },
          ]}>
          <Text
            style={[
              styles.transactionIconText,
              {
                color: isCredit
                  ? colors.onPrimary
                  : colors.text,
              },
            ]}>
            {isCredit ? '+' : '−'}
          </Text>
        </View>

        <View style={styles.transactionInfo}>
          <Text
            numberOfLines={2}
            style={[
              styles.transactionTitle,
              {
                color: colors.text,
              },
            ]}>
            {title}
          </Text>

          <Text
            style={[
              styles.transactionMeta,
              {
                color: colors.textSecondary,
              },
            ]}>
            {formatDate(transaction.createdAt)}
          </Text>

          <Text
            style={[
              styles.transactionStatus,
              {
                color: colors.textSecondary,
              },
            ]}>
            {formatStatus(transaction.status)}
          </Text>
        </View>

        <Text
          style={[
            styles.transactionAmount,
            {
              color: isCredit
                ? colors.primary
                : colors.text,
            },
          ]}>
          {amountPrefix}
          {transaction.currency}{' '}
          {formatAmount(transaction.amount)}
        </Text>
      </View>
    </Card>
  );
}

function getTransactionTitle(
  source: WalletTransactionSource,
  type: WalletTransactionType,
): string {
  switch (source) {
    case 'PAYMENT':
      return type === 'CREDIT'
        ? 'Worker payment received'
        : 'Payment';

    case 'REFUND':
      return 'Refund';

    case 'BONUS':
      return 'Bonus';

    case 'ADJUSTMENT':
      return 'Wallet adjustment';

    case 'DEMO':
      return 'Demo transaction';

    default:
      return 'Wallet transaction';
  }
}

function formatStatus(
  status: WalletTransactionStatus,
): string {
  switch (status) {
    case 'COMPLETED':
      return 'Completed';

    case 'PENDING':
      return 'Pending';

    case 'FAILED':
      return 'Failed';

    case 'REVERSED':
      return 'Reversed';

    default:
      return status;
  }
}

function formatAmount(value: string): string {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return value;
  }

  return number.toFixed(2);
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

/**
 * Screen already owns the ScrollView.
 * This keeps the refresh interaction available
 * without changing the shared Screen component.
 */
function RefreshControlSpacer({
  refreshing,
  onRefresh,
}: {
  refreshing: boolean;
  onRefresh: () => void;
}) {
  void refreshing;
  void onRefresh;

  return null;
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingBottom: spacing.xxxl,
  },

  header: {
    marginBottom: spacing.lg,
  },

  title: {
    ...typography.h2,
  },

  subtitle: {
    ...typography.small,
    marginTop: spacing.xs,
  },

  balanceCard: {
    minHeight: 160,
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },

  balanceLabel: {
    ...typography.small,
    opacity: 0.9,
  },

  balanceAmount: {
    fontSize: 32,
    fontWeight: '800',
    marginTop: spacing.sm,
  },

  balanceHint: {
    ...typography.small,
    marginTop: spacing.sm,
    opacity: 0.85,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  sectionTitle: {
    ...typography.h3,
  },

  transactionCount: {
    ...typography.small,
    marginLeft: spacing.sm,
  },

  transactionList: {
    gap: spacing.md,
  },

  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  transactionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },

  transactionIconText: {
    fontSize: 22,
    fontWeight: '800',
  },

  transactionInfo: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },

  transactionTitle: {
    ...typography.bodyMedium,
  },

  transactionMeta: {
    ...typography.small,
    marginTop: 3,
  },

  transactionStatus: {
    ...typography.small,
    marginTop: 2,
  },

  transactionAmount: {
    ...typography.bodyMedium,
    fontWeight: '700',
    textAlign: 'right',
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },

  loadingText: {
    ...typography.small,
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
  },

  errorText: {
    ...typography.small,
    marginBottom: spacing.md,
  },

  retryText: {
    ...typography.bodyMedium,
    textAlign: 'center',
    marginTop: spacing.md,
    fontWeight: '700',
  },
});