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
  acceptBooking,
  cancelBooking,
  completeBooking,
  getBooking,
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

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState(false);

  const loadBooking = useCallback(
    async () => {
      try {
        setLoading(true);

        const result =
          await getBooking(
            route.params.bookingId,
          );

        setBooking(result);
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
});