import React, {useState} from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import {
  AppStackParamList,
} from '../../../navigation/AppNavigator';

import {
  Screen,
} from '../../../components/Screen';

import {
  Card,
} from '../../../components/Card';

import {
  spacing,
  typography,
  useTheme,
} from '../../../theme';

import {
  getPayment,
  simulateDemoPayment,
} from '../../client/bookings.api';

type Props =
  NativeStackScreenProps<
    AppStackParamList,
    'DemoPayment'
  >;

export function DemoPaymentScreen({
  route,
  navigation,
}: Props) {
  const {colors} = useTheme();

  const [loading, setLoading] =
    useState(true);

  const [processing, setProcessing] =
    useState(false);

  const [payment, setPayment] =
    useState<any>(null);

  React.useEffect(() => {
    const loadPayment = async () => {
      try {
        const result =
          await getPayment(
            route.params.paymentId,
          );

        setPayment(result.payment);
      } catch (error: any) {
        const message =
          error?.response?.data?.message ||
          'Unable to load payment.';

        Alert.alert(
          'Demo Payment',
          Array.isArray(message)
            ? message.join('\n')
            : message,
        );

        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    loadPayment();
  }, [
    navigation,
    route.params.paymentId,
  ]);

  const processPayment = async (
    success: boolean,
  ) => {
    if (!payment) {
      return;
    }

    try {
      setProcessing(true);

      const result =
        await simulateDemoPayment(
          payment.id,
          success,
        );

      setPayment(result.payment);

      if (success) {
        Alert.alert(
          'Payment Successful',
          'Demo payment completed successfully.',
          [
            {
              text: 'Continue',
              onPress: () =>
                navigation.goBack(),
            },
          ],
        );
      } else {
        Alert.alert(
          'Payment Failed',
          'Demo payment was intentionally failed.',
        );
      }
    } catch (error: any) {
      const rawMessage =
        error?.response?.data?.message;

      const message =
        Array.isArray(rawMessage)
          ? rawMessage.join('\n')
          : typeof rawMessage === 'string'
            ? rawMessage
            : 'Unable to process demo payment.';

      Alert.alert(
        'Demo Payment',
        message,
      );
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
            color={colors.primary}
          />

          <Text
            style={[
              styles.info,
              {
                color:
                  colors.textSecondary,
              },
            ]}>
            Loading payment...
          </Text>
        </View>
      </Screen>
    );
  }

  if (!payment) {
    return null;
  }

  return (
    <Screen scroll>
      <Text
        style={[
          styles.heading,
          {
            color: colors.text,
          },
        ]}>
        Demo Payment
      </Text>

      <Text
        style={[
          styles.subtitle,
          {
            color:
              colors.textSecondary,
          },
        ]}>
        No real money will be charged.
      </Text>

      <Card>
        <Text
          style={[
            styles.label,
            {
              color:
                colors.textSecondary,
            },
          ]}>
          Amount
        </Text>

        <Text
          style={[
            styles.amount,
            {
              color: colors.text,
            },
          ]}>
          ₹{Number(payment.amount).toFixed(2)}
        </Text>

        <View style={styles.row}>
          <Text
            style={[
              styles.label,
              {
                color:
                  colors.textSecondary,
              },
            ]}>
            Currency
          </Text>

          <Text
            style={[
              styles.info,
              {
                color: colors.text,
              },
            ]}>
            {payment.currency}
          </Text>
        </View>

        <View style={styles.row}>
          <Text
            style={[
              styles.label,
              {
                color:
                  colors.textSecondary,
              },
            ]}>
            Status
          </Text>

          <Text
            style={[
              styles.info,
              {
                color: colors.primary,
              },
            ]}>
            {payment.status}
          </Text>
        </View>
      </Card>

      <Card>
        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.text,
            },
          ]}>
          Demo Controls
        </Text>

        <Text
          style={[
            styles.info,
            {
              color:
                colors.textSecondary,
            },
          ]}>
          Choose a result to simulate the
          payment gateway response.
        </Text>

        <Pressable
          disabled={processing}
          onPress={() =>
            processPayment(true)
          }
          style={[
            styles.button,
            {
              backgroundColor:
                colors.primary,
              opacity: processing
                ? 0.6
                : 1,
            },
          ]}>
          {processing ? (
            <ActivityIndicator
              color={colors.onPrimary}
            />
          ) : (
            <Text
              style={[
                styles.buttonText,
                {
                  color:
                    colors.onPrimary,
                },
              ]}>
              Simulate Success
            </Text>
          )}
        </Pressable>

        <Pressable
          disabled={processing}
          onPress={() =>
            processPayment(false)
          }
          style={[
            styles.button,
            styles.secondaryButton,
            {
              borderColor:
                colors.primary,
              opacity: processing
                ? 0.6
                : 1,
            },
          ]}>
          <Text
            style={[
              styles.buttonText,
              {
                color:
                  colors.primary,
              },
            ]}>
            Simulate Failure
          </Text>
        </Pressable>
      </Card>

      <View style={styles.note}>
        <Text
          style={[
            styles.noteText,
            {
              color:
                colors.textSecondary,
            },
          ]}>
          DEMO MODE — This payment system
          does not process real transactions.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },

  heading: {
    ...typography.h2,
    marginBottom: spacing.xs,
  },

  subtitle: {
    ...typography.small,
    marginBottom: spacing.lg,
  },

  sectionTitle: {
    ...typography.bodyMedium,
    marginBottom: spacing.sm,
  },

  label: {
    ...typography.small,
  },

  amount: {
    fontSize: 32,
    fontWeight: '700',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },

  info: {
    ...typography.small,
    lineHeight: 21,
  },

  button: {
    minHeight: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },

  secondaryButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },

  buttonText: {
    ...typography.bodyMedium,
  },

  note: {
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xxxl,
  },

  noteText: {
    ...typography.caption,
    textAlign: 'center',
  },
});