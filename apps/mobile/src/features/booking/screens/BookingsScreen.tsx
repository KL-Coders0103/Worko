import React, {
  useCallback,
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
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';

import {
  NavigationProp,
} from '@react-navigation/native';

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
  useAuth,
} from '../../../context/AuthContext';
import { Booking, getMyBookings } from '../../client/bookings.api';

export function BookingsScreen() {
  const {colors} = useTheme();

  const {user} = useAuth();

  const navigation =
    useNavigation<
      NavigationProp<AppStackParamList>
    >();

  const [bookings, setBookings] =
    useState<Booking[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const loadBookings = useCallback(
    async (refresh = false) => {
      try {
        if (refresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const result =
          await getMyBookings();

        setBookings(result);
      } catch (error: any) {
        const rawMessage =
          error?.response?.data?.message;

        const message =
          Array.isArray(rawMessage)
            ? rawMessage.join('\n')
            : typeof rawMessage === 'string'
              ? rawMessage
              : 'Unable to load bookings.';

        Alert.alert(
          'Bookings',
          message,
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      loadBookings();

      return undefined;
    }, [loadBookings]),
  );

  const getOtherPersonName = (
    booking: Booking,
  ) => {
    const otherUser =
      user?.role === 'WORKER'
        ? booking.client.user
        : booking.worker.user;

    const name = [
      otherUser.firstName,
      otherUser.lastName,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    return name || 'Worko User';
  };

  const formatDate = (
    value: string,
  ) => {
    return new Date(value).toLocaleDateString(
      'en-IN',
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      },
    );
  };

  const formatTime = (
    value: string,
  ) => {
    return new Date(value).toLocaleTimeString(
      'en-IN',
      {
        hour: '2-digit',
        minute: '2-digit',
      },
    );
  };

  const getStatusColor = (
    status: Booking['status'],
  ) => {
    if (
      status === 'ACCEPTED' ||
      status === 'IN_PROGRESS' ||
      status === 'COMPLETED'
    ) {
      return colors.primary;
    }

    if (
      status === 'REJECTED' ||
      status === 'CANCELLED'
    ) {
      return colors.error;
    }

    return colors.textSecondary;
  };

  const renderBooking = (
    booking: Booking,
  ) => {
    const statusColor =
      getStatusColor(booking.status);

    return (
      <Pressable
        key={booking.id}
        onPress={() =>
          navigation.navigate(
            'BookingDetails',
            {
              bookingId: booking.id,
            },
          )
        }>
        <Card>
          <View style={styles.topRow}>
            <View style={styles.titleContainer}>
              <Text
                numberOfLines={1}
                style={[
                  styles.title,
                  {
                    color: colors.text,
                  },
                ]}>
                {booking.serviceTitle}
              </Text>

              <Text
                numberOfLines={1}
                style={[
                  styles.person,
                  {
                    color:
                      colors.textSecondary,
                  },
                ]}>
                {user?.role === 'WORKER'
                  ? 'Client'
                  : 'Worker'}{' '}
                • {getOtherPersonName(booking)}
              </Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                {
                  borderColor:
                    statusColor,
                },
              ]}>
              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      statusColor,
                  },
                ]}>
                {booking.status.replace(
                  '_',
                  ' ',
                )}
              </Text>
            </View>
          </View>

          <View style={styles.infoGroup}>
            <Text
              style={[
                styles.info,
                {
                  color: colors.text,
                },
              ]}>
              {formatDate(
                booking.scheduledStart,
              )}{' '}
              •{' '}
              {formatTime(
                booking.scheduledStart,
              )}{' '}
              -{' '}
              {formatTime(
                booking.scheduledEnd,
              )}
            </Text>

            <Text
              numberOfLines={2}
              style={[
                styles.info,
                {
                  color:
                    colors.textSecondary,
                },
              ]}>
              {booking.address}
            </Text>
          </View>

          {booking.categoryName ? (
            <Text
              style={[
                styles.meta,
                {
                  color:
                    colors.textSecondary,
                },
              ]}>
              {booking.categoryName}
              {booking.skillName
                ? ` • ${booking.skillName}`
                : ''}
            </Text>
          ) : null}
        </Card>
      </Pressable>
    );
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text
          style={[
            styles.heading,
            {
              color: colors.text,
            },
          ]}>
          My Bookings
        </Text>

        <Text
          style={[
            styles.subtitle,
            {
              color:
                colors.textSecondary,
            },
          ]}>
          Track your Worko bookings
        </Text>
      </View>

      {loading ? (
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
            Loading bookings...
          </Text>
        </View>
      ) : bookings.length === 0 ? (
        <Card>
          <View style={styles.empty}>
            <Text
              style={[
                styles.emptyTitle,
                {
                  color: colors.text,
                },
              ]}>
              No bookings yet
            </Text>

            <Text
              style={[
                styles.emptyText,
                {
                  color:
                    colors.textSecondary,
                },
              ]}>
              Your booking requests and
              work history will appear here.
            </Text>
          </View>
        </Card>
      ) : (
        <View style={styles.list}>
          {bookings.map(renderBooking)}
        </View>
      )}

      {!loading && bookings.length > 0 ? (
        <Pressable
          onPress={() =>
            loadBookings(true)
          }
          style={[
            styles.refreshButton,
            {
              borderColor:
                colors.border,
            },
          ]}>
          {refreshing ? (
            <ActivityIndicator
              color={colors.primary}
            />
          ) : (
            <Text
              style={[
                styles.refreshText,
                {
                  color:
                    colors.primary,
                },
              ]}>
              Refresh
            </Text>
          )}
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.lg,
  },

  heading: {
    ...typography.h2,
  },

  subtitle: {
    ...typography.body,
    marginTop: spacing.xs,
  },

  list: {
    gap: spacing.md,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  titleContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },

  title: {
    ...typography.bodyMedium,
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

  infoGroup: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },

  info: {
    ...typography.small,
    lineHeight: 20,
  },

  meta: {
    ...typography.caption,
    marginTop: spacing.md,
  },

  state: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    gap: spacing.md,
  },

  stateText: {
    ...typography.body,
  },

  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },

  emptyTitle: {
    ...typography.bodyMedium,
  },

  emptyText: {
    ...typography.small,
    marginTop: spacing.xs,
    textAlign: 'center',
  },

  refreshButton: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xxxl,
  },

  refreshText: {
    ...typography.small,
  },
});