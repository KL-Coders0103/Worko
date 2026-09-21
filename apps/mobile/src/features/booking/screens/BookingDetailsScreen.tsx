import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

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
  Booking,
  Payment,
  acceptBooking,
  cancelBooking,
  completeBooking,
  createPayment,
  getBooking,
  getBookingPayment,
  rejectBooking,
  startBooking,
} from '../../client/bookings.api';

import {
  useAuth,
} from '../../../context/AuthContext';

type Props =
  NativeStackScreenProps<
    AppStackParamList,
    'BookingDetails'
  >;

export function BookingDetailsScreen({
  route,
  navigation,
}: Props) {
  const {colors} = useTheme();

  const {user} = useAuth();

  const [booking, setBooking] =
    useState<Booking | null>(null);

  const [payment, setPayment] =
    useState<Payment | null>(null);

  const [paymentLoading, setPaymentLoading] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState(false);

  const loadBooking = useCallback(
    async () => {
      try {
        setLoading(true);

        const [bookingResult, paymentResult] =
          await Promise.all([
            getBooking(
              route.params.bookingId,
            ),
            getBookingPayment(
              route.params.bookingId,
            ),
          ]);

        setBooking(bookingResult);
        setPayment(paymentResult.payment);
      } catch (error: any) {
        const rawMessage =
          error?.response?.data?.message;

        const message =
          Array.isArray(rawMessage)
            ? rawMessage.join('\n')
            : typeof rawMessage === 'string'
              ? rawMessage
              : 'Unable to load booking.';

        Alert.alert(
          'Booking',
          message,
        );
      } finally {
        setLoading(false);
      }
    },
    [route.params.bookingId],
  );

  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

  const calculateEstimatedAmount = () => {
    if (!booking) {
      return null;
    }

    if (booking.dailyRate) {
      const start =
        new Date(booking.scheduledStart);

      const end =
        new Date(booking.scheduledEnd);

      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      const millisecondsPerDay =
        24 * 60 * 60 * 1000;

      const days =
        Math.max(
          1,
          Math.ceil(
            (end.getTime() -
              start.getTime()) /
              millisecondsPerDay,
          ),
        );

      return {
        amount:
          Number(booking.dailyRate) * days,
        label:
          `${days} day${days > 1 ? 's' : ''}`,
      };
    }

    if (booking.hourlyRate) {
      const durationMs =
        new Date(
          booking.scheduledEnd,
        ).getTime() -
        new Date(
          booking.scheduledStart,
        ).getTime();

      const hours =
        durationMs /
        (60 * 60 * 1000);

      return {
        amount:
          Number(booking.hourlyRate) *
          hours,
        label:
          `${hours.toFixed(2)} hour${hours > 1 ? 's' : ''}`,
      };
    }

    return null;
  };

  const handleCreatePayment = async () => {
    if (!booking) {
      return;
    }

    if (payment?.status === 'SUCCESS') {
      Alert.alert(
        'Payment',
        'This booking has already been paid.',
      );
      return;
    }

    if (
      payment?.status === 'PENDING' ||
      payment?.status === 'PROCESSING'
    ) {
      Alert.alert(
        'Payment',
        'A payment is already in progress for this booking.',
      );
      return;
    }

    try {
      setPaymentLoading(true);

      const idempotencyKey =
        `${booking.id}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 10)}`;

      const result =
        await createPayment({
          bookingId: booking.id,
          idempotencyKey,
        });

      setPayment(result.payment);

      navigation.navigate('DemoPayment', {
        paymentId: result.payment.id
      });
    } catch (error: any) {
      const rawMessage =
        error?.response?.data?.message;

      const message =
        Array.isArray(rawMessage)
          ? rawMessage.join('\n')
          : typeof rawMessage === 'string'
            ? rawMessage
            : 'Unable to initialize payment.';

      Alert.alert(
        'Payment',
        message,
      );
    } finally {
      setPaymentLoading(false);
    }
  };

  const performAction = async (
    action: () => Promise<Booking>,
    successMessage: string,
  ) => {
    try {
      setActionLoading(true);

      const updated =
        await action();

      setBooking(updated);

      Alert.alert(
        'Booking Updated',
        successMessage,
      );
    } catch (error: any) {
      const rawMessage =
        error?.response?.data?.message;

      const message =
        Array.isArray(rawMessage)
          ? rawMessage.join('\n')
          : typeof rawMessage === 'string'
            ? rawMessage
            : 'Unable to update booking.';

      Alert.alert(
        'Booking',
        message,
      );
    } finally {
      setActionLoading(false);
    }
  };

  const confirmAction = (
    title: string,
    message: string,
    action: () => Promise<Booking>,
    successMessage: string,
  ) => {
    Alert.alert(
      title,
      message,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Confirm',
          onPress: () =>
            performAction(
              action,
              successMessage,
            ),
        },
      ],
    );
  };

  const getUserName = (
    person: Booking['worker'] | Booking['client'],
  ) => {
    const name = [
      person.user.firstName,
      person.user.lastName,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    return name || 'Worko User';
  };

  const formatDateTime = (
    value: string,
  ) => {
    return new Date(value).toLocaleString(
      'en-IN',
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      },
    );
  };

  if (loading) {
    return (
      <Screen>
        <View style={styles.state}>
          <ActivityIndicator
            size="large"
            color={colors.primary}
          />

          <Text
            style={[
              styles.stateText,
              {
                color:
                  colors.textSecondary,
              },
            ]}>
            Loading booking...
          </Text>
        </View>
      </Screen>
    );
  }

  if (!booking) {
    return (
      <Screen>
        <View style={styles.state}>
          <Text
            style={[
              styles.emptyTitle,
              {
                color: colors.text,
              },
            ]}>
            Booking not found
          </Text>

          <Pressable
            onPress={() =>
              navigation.goBack()
            }>
            <Text
              style={[
                styles.backText,
                {
                  color:
                    colors.primary,
                },
              ]}>
              Go Back
            </Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const isWorker =
    user?.role === 'WORKER';

  const canAccept =
    isWorker &&
    booking.status === 'PENDING';

  const canReject =
    isWorker &&
    booking.status === 'PENDING';

  const canStart =
    isWorker &&
    booking.status === 'ACCEPTED';

  const canComplete =
    isWorker &&
    booking.status === 'IN_PROGRESS';

  const canCancel =
    booking.status === 'PENDING' ||
    booking.status === 'ACCEPTED';

  const otherPerson = isWorker
    ? booking.client
    : booking.worker;

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Pressable
          onPress={() =>
            navigation.goBack()
          }>
          <Text
            style={[
              styles.backText,
              {
                color:
                  colors.primary,
              },
            ]}>
            ← Back
          </Text>
        </Pressable>

        <Text
          style={[
            styles.heading,
            {
              color: colors.text,
            },
          ]}>
          Booking Details
        </Text>
      </View>

      <Card>
        <View style={styles.titleRow}>
          <View style={styles.titleContainer}>
            <Text
              style={[
                styles.title,
                {
                  color: colors.text,
                },
              ]}>
              {booking.serviceTitle}
            </Text>

            <Text
              style={[
                styles.person,
                {
                  color:
                    colors.textSecondary,
                },
              ]}>
              {isWorker
                ? 'Client'
                : 'Worker'}{' '}
              • {getUserName(otherPerson)}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                borderColor:
                  colors.primary,
              },
            ]}>
            <Text
              style={[
                styles.statusText,
                {
                  color:
                    colors.primary,
                },
              ]}>
              {booking.status.replace(
                '_',
                ' ',
              )}
            </Text>
          </View>
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
          Schedule
        </Text>

        <Text
          style={[
            styles.info,
            {
              color: colors.text,
            },
          ]}>
          Start: {formatDateTime(
            booking.scheduledStart,
          )}
        </Text>

        <Text
          style={[
            styles.info,
            {
              color: colors.text,
            },
          ]}>
          End: {formatDateTime(
            booking.scheduledEnd,
          )}
        </Text>
      </Card>

      <Card>
        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.text,
            },
          ]}>
          Work Details
        </Text>

        {booking.categoryName ? (
          <Text
            style={[
              styles.info,
              {
                color: colors.text,
              },
            ]}>
            Category: {booking.categoryName}
          </Text>
        ) : null}

        {booking.skillName ? (
          <Text
            style={[
              styles.info,
              {
                color: colors.text,
              },
            ]}>
            Skill: {booking.skillName}
          </Text>
        ) : null}

        {booking.serviceDescription ? (
          <Text
            style={[
              styles.description,
              {
                color:
                  colors.textSecondary,
              },
            ]}>
            {booking.serviceDescription}
          </Text>
        ) : null}
      </Card>

      <Card>
        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.text,
            },
          ]}>
          Location
        </Text>

        <Text
          style={[
            styles.info,
            {
              color: colors.text,
            },
          ]}>
          {booking.address}
        </Text>
      </Card>

      <Card>
        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.text,
            },
          ]}>
          Rate
        </Text>

        {booking.hourlyRate ? (
          <Text
            style={[
              styles.info,
              {
                color: colors.text,
              },
            ]}>
            ₹{booking.hourlyRate}/hour
          </Text>
        ) : null}

        {booking.dailyRate ? (
          <Text
            style={[
              styles.info,
              {
                color: colors.text,
              },
            ]}>
            ₹{booking.dailyRate}/day
          </Text>
        ) : null}

        {!booking.hourlyRate &&
        !booking.dailyRate ? (
          <Text
            style={[
              styles.info,
              {
                color:
                  colors.textSecondary,
              },
            ]}>
            Rate on request
          </Text>
        ) : null}
      </Card>

      {!isWorker &&
booking.status !== 'REJECTED' &&
booking.status !== 'CANCELLED' ? (
  <Card>
    <Text
      style={[
        styles.sectionTitle,
        {
          color: colors.text,
        },
      ]}>
      Payment
    </Text>

    {(() => {
      const estimate =
        calculateEstimatedAmount();

      return (
        <>
          {estimate ? (
            <>
              <Text
                style={[
                  styles.info,
                  {
                    color:
                      colors.textSecondary,
                  },
                ]}>
                Pricing:{' '}
                {booking.dailyRate
                  ? 'Daily'
                  : 'Hourly'}
              </Text>

              <Text
                style={[
                  styles.info,
                  {
                    color:
                      colors.textSecondary,
                  },
                ]}>
                Duration: {estimate.label}
              </Text>

              <Text
                style={[
                  styles.paymentAmount,
                  {
                    color: colors.text,
                  },
                ]}>
                Estimated Total: ₹
                {estimate.amount.toFixed(2)}
              </Text>
            </>
          ) : (
            <Text
              style={[
                styles.info,
                {
                  color:
                    colors.textSecondary,
                },
              ]}>
              Payment amount is currently
              unavailable.
            </Text>
          )}

          {payment ? (
            <View
              style={[
                styles.paymentStatus,
                {
                  borderColor:
                    colors.primary,
                },
              ]}>
              <Text
                style={[
                  styles.info,
                  {
                    color:
                      colors.primary,
                  },
                ]}>
                Payment Status:{' '}
                {payment.status.replace(
                  '_',
                  ' ',
                )}
              </Text>

              {payment.status ===
              'SUCCESS' ? (
                <Text
                  style={[
                    styles.paymentSuccess,
                    {
                      color:
                        colors.primary,
                    },
                  ]}>
                  Payment completed
                </Text>
              ) : null}
            </View>
          ) : null}

          {estimate &&
          payment?.status !== 'SUCCESS' &&
          payment?.status !== 'PENDING' &&
          payment?.status !== 'PROCESSING' ? (
            <Pressable
              disabled={paymentLoading}
              onPress={
                handleCreatePayment
              }
              style={[
                styles.paymentButton,
                {
                  backgroundColor:
                    colors.primary,
                  opacity:
                    paymentLoading
                      ? 0.6
                      : 1,
                },
              ]}>
              {paymentLoading ? (
                <ActivityIndicator
                  color={
                    colors.onPrimary
                  }
                />
              ) : (
                <Text
                  style={[
                    styles.paymentButtonText,
                    {
                      color:
                        colors.onPrimary,
                    },
                  ]}>
                  Pay ₹
                  {estimate.amount.toFixed(
                    2,
                  )}
                </Text>
              )}
            </Pressable>
          ) : null}

          {payment?.status ===
          'PENDING' ||
          payment?.status ===
            'PROCESSING' ? (
            <Text
              style={[
                styles.info,
                {
                  color:
                    colors.textSecondary,
                },
              ]}>
              Payment is initialized and
              awaiting gateway processing.
            </Text>
          ) : null}
        </>
      );
    })()}
  </Card>
) : null}

      {booking.rejectionReason ? (
        <Card>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: colors.error,
              },
            ]}>
            Rejection Reason
          </Text>

          <Text
            style={[
              styles.info,
              {
                color:
                  colors.textSecondary,
              },
            ]}>
            {booking.rejectionReason}
          </Text>
        </Card>
      ) : null}

      {booking.cancellationReason ? (
        <Card>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: colors.error,
              },
            ]}>
            Cancellation Reason
          </Text>

          <Text
            style={[
              styles.info,
              {
                color:
                  colors.textSecondary,
              },
            ]}>
            {booking.cancellationReason}
          </Text>
        </Card>
      ) : null}

      <View style={styles.actions}>
        {canAccept ? (
          <ActionButton
            title="Accept Booking"
            loading={actionLoading}
            colors={colors}
            onPress={() =>
              performAction(
                () =>
                  acceptBooking(
                    booking.id,
                  ),
                'Booking accepted.',
              )
            }
          />
        ) : null}

        {canReject ? (
          <ActionButton
            title="Reject Booking"
            loading={actionLoading}
            colors={colors}
            secondary
            onPress={() =>
              confirmAction(
                'Reject Booking',
                'Are you sure you want to reject this booking?',
                () =>
                  rejectBooking(
                    booking.id,
                    'Rejected by worker',
                  ),
                'Booking rejected.',
              )
            }
          />
        ) : null}

        {canStart ? (
          <ActionButton
            title="Start Work"
            loading={actionLoading}
            colors={colors}
            onPress={() =>
              performAction(
                () =>
                  startBooking(
                    booking.id,
                  ),
                'Booking is now in progress.',
              )
            }
          />
        ) : null}

        {canComplete ? (
          <ActionButton
            title="Complete Work"
            loading={actionLoading}
            colors={colors}
            onPress={() =>
              confirmAction(
                'Complete Booking',
                'Mark this booking as completed?',
                () =>
                  completeBooking(
                    booking.id,
                  ),
                'Booking completed.',
              )
            }
          />
        ) : null}

        {canCancel ? (
          <ActionButton
            title="Cancel Booking"
            loading={actionLoading}
            colors={colors}
            secondary
            onPress={() =>
              confirmAction(
                'Cancel Booking',
                'Are you sure you want to cancel this booking?',
                () =>
                  cancelBooking(
                    booking.id,
                    'Cancelled by user',
                  ),
                'Booking cancelled.',
              )
            }
          />
        ) : null}
      </View>
    </Screen>
  );
}

function ActionButton({
  title,
  loading,
  colors,
  secondary = false,
  onPress,
}: {
  title: string;
  loading: boolean;
  colors: any;
  secondary?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={loading}
      onPress={onPress}
      style={[
        styles.actionButton,
        {
          backgroundColor: secondary
            ? colors.surface
            : colors.primary,
          borderColor:
            colors.primary,
          opacity: loading ? 0.6 : 1,
        },
      ]}>
      {loading ? (
        <ActivityIndicator
          color={
            secondary
              ? colors.primary
              : colors.onPrimary
          }
        />
      ) : (
        <Text
          style={[
            styles.actionText,
            {
              color: secondary
                ? colors.primary
                : colors.onPrimary,
            },
          ]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.lg,
  },

  backText: {
    ...typography.small,
    marginBottom: spacing.md,
  },

  heading: {
    ...typography.h2,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  titleContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },

  title: {
    ...typography.h3,
  },

  person: {
    ...typography.small,
    marginTop: spacing.xs,
  },

  statusBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },

  statusText: {
    ...typography.caption,
  },

  sectionTitle: {
    ...typography.bodyMedium,
    marginBottom: spacing.sm,
  },

  info: {
    ...typography.small,
    lineHeight: 21,
    marginTop: spacing.xs,
  },

  description: {
    ...typography.small,
    lineHeight: 21,
    marginTop: spacing.md,
  },

  actions: {
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.xxxl,
  },

  actionButton: {
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionText: {
    ...typography.bodyMedium,
  },

  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },

  stateText: {
    ...typography.body,
  },

  emptyTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
  },

  paymentAmount: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: spacing.md,
  },

  paymentStatus: {
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.sm,
    marginTop: spacing.md,
  },

  paymentSuccess: {
    ...typography.small,
    fontWeight: '600',
    marginTop: spacing.xs,
  },

  paymentButton: {
    minHeight: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },

  paymentButtonText: {
    ...typography.bodyMedium,
  },
});