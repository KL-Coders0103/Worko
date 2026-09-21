import React, {
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import {
  useNavigation,
} from '@react-navigation/native';

import Geolocation from '@react-native-community/geolocation';

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
  createBooking,
} from '../bookings.api';

type Props =
  NativeStackScreenProps<
    AppStackParamList,
    'ClientBookingCreate'
  >;

export function ClientBookingCreateScreen({
  route,
}: Props) {
  const {colors} = useTheme();

  const navigation = useNavigation();

  const {
    workerId,
    workerName,
    categoryId,
    categoryName,
    skillId,
    skillName,
  } = route.params;

  const [serviceTitle, setServiceTitle] =
    useState(
      skillName ||
        categoryName ||
        'Worker Service',
    );

  const [
    serviceDescription,
    setServiceDescription,
  ] = useState('');

  const [date, setDate] =
    useState('');

  const [startTime, setStartTime] =
    useState('');

  const [endTime, setEndTime] =
    useState('');

  const [address, setAddress] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [locationLoading, setLocationLoading] =
    useState(false);

  const [location, setLocation] =
    useState<{
      latitude: number;
      longitude: number;
    } | null>(null);

  const getCurrentLocation = () => {
    try {
      setLocationLoading(true);

      Geolocation.getCurrentPosition(
        position => {
          setLocation({
            latitude:
              position.coords.latitude,
            longitude:
              position.coords.longitude,
          });

          setLocationLoading(false);
        },
        error => {
          setLocationLoading(false);

          Alert.alert(
            'Location unavailable',
            error.message ||
              'Unable to get your current location.',
          );
        },
        {
          enableHighAccuracy: false,
          timeout: 30000,
          maximumAge: 30000,
        },
      );
    } catch {
      setLocationLoading(false);

      Alert.alert(
        'Location error',
        'Unable to access your location.',
      );
    }
  };

  const submitBooking = async () => {
    if (!serviceTitle.trim()) {
      Alert.alert(
        'Service required',
        'Please enter the service you need.',
      );
      return;
    }

    if (!date.trim()) {
      Alert.alert(
        'Date required',
        'Please enter the booking date.',
      );
      return;
    }

    if (!startTime.trim()) {
      Alert.alert(
        'Start time required',
        'Please enter the start time.',
      );
      return;
    }

    if (!endTime.trim()) {
      Alert.alert(
        'End time required',
        'Please enter the end time.',
      );
      return;
    }

    if (!address.trim()) {
      Alert.alert(
        'Address required',
        'Please enter the work location.',
      );
      return;
    }

    const scheduledStart =
      new Date(
        `${date.trim()}T${startTime.trim()}:00`,
      );

    const scheduledEnd =
      new Date(
        `${date.trim()}T${endTime.trim()}:00`,
      );

    if (
      Number.isNaN(
        scheduledStart.getTime(),
      ) ||
      Number.isNaN(
        scheduledEnd.getTime(),
      )
    ) {
      Alert.alert(
        'Invalid date or time',
        'Use date format YYYY-MM-DD and time format HH:mm.',
      );
      return;
    }

    if (
      scheduledStart >= scheduledEnd
    ) {
      Alert.alert(
        'Invalid time',
        'End time must be after start time.',
      );
      return;
    }

    try {
      setLoading(true);

      await createBooking({
        workerId,

        categoryId,

        skillId,

        serviceTitle:
          serviceTitle.trim(),

        serviceDescription:
          serviceDescription.trim() ||
          undefined,

        scheduledStart:
          scheduledStart.toISOString(),

        scheduledEnd:
          scheduledEnd.toISOString(),

        address: address.trim(),

        latitude:
          location?.latitude,

        longitude:
          location?.longitude,
      });

      Alert.alert(
        'Booking Request Sent',
        `${workerName} has received your booking request.`,
        [
          {
            text: 'View Bookings',
            onPress: () => {
              navigation.goBack();
            },
          },
        ],
      );
    } catch (error: any) {
      const rawMessage =
        error?.response?.data?.message;

      const message =
        Array.isArray(rawMessage)
          ? rawMessage.join('\n')
          : typeof rawMessage === 'string'
            ? rawMessage
            : 'Unable to create booking.';

      Alert.alert(
        'Booking Failed',
        message,
      );
    } finally {
      setLoading(false);
    }
  };

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
            styles.title,
            {
              color: colors.text,
            },
          ]}>
          Book Worker
        </Text>

        <Text
          style={[
            styles.subtitle,
            {
              color:
                colors.textSecondary,
            },
          ]}>
          Send a booking request to{' '}
          {workerName}
        </Text>
      </View>

      <Card>
        <Text
          style={[
            styles.workerLabel,
            {
              color:
                colors.textSecondary,
            },
          ]}>
          Worker
        </Text>

        <Text
          style={[
            styles.workerName,
            {
              color: colors.text,
            },
          ]}>
          {workerName}
        </Text>

        {categoryName ? (
          <Text
            style={[
              styles.workerMeta,
              {
                color:
                  colors.textSecondary,
              },
            ]}>
            Category: {categoryName}
          </Text>
        ) : null}

        {skillName ? (
          <Text
            style={[
              styles.workerMeta,
              {
                color:
                  colors.textSecondary,
              },
            ]}>
            Skill: {skillName}
          </Text>
        ) : null}
      </Card>

      <View style={styles.section}>
        <Text
          style={[
            styles.label,
            {
              color: colors.text,
            },
          ]}>
          Service
        </Text>

        <TextInput
          value={serviceTitle}
          onChangeText={setServiceTitle}
          placeholder="What work do you need?"
          placeholderTextColor={
            colors.textSecondary
          }
          style={[
            styles.input,
            {
              color: colors.text,
              backgroundColor:
                colors.surface,
              borderColor:
                colors.border,
            },
          ]}
        />

        <TextInput
          value={serviceDescription}
          onChangeText={
            setServiceDescription
          }
          placeholder="Describe the work..."
          placeholderTextColor={
            colors.textSecondary
          }
          multiline
          numberOfLines={4}
          style={[
            styles.textArea,
            {
              color: colors.text,
              backgroundColor:
                colors.surface,
              borderColor:
                colors.border,
            },
          ]}
        />
      </View>

      <View style={styles.section}>
        <Text
          style={[
            styles.label,
            {
              color: colors.text,
            },
          ]}>
          Schedule
        </Text>

        <TextInput
          value={date}
          onChangeText={setDate}
          placeholder="Date: YYYY-MM-DD"
          placeholderTextColor={
            colors.textSecondary
          }
          style={[
            styles.input,
            {
              color: colors.text,
              backgroundColor:
                colors.surface,
              borderColor:
                colors.border,
            },
          ]}
        />

        <View style={styles.timeRow}>
          <TextInput
            value={startTime}
            onChangeText={setStartTime}
            placeholder="Start: HH:mm"
            placeholderTextColor={
              colors.textSecondary
            }
            style={[
              styles.timeInput,
              {
                color: colors.text,
                backgroundColor:
                  colors.surface,
                borderColor:
                  colors.border,
              },
            ]}
          />

          <TextInput
            value={endTime}
            onChangeText={setEndTime}
            placeholder="End: HH:mm"
            placeholderTextColor={
              colors.textSecondary
            }
            style={[
              styles.timeInput,
              {
                color: colors.text,
                backgroundColor:
                  colors.surface,
                borderColor:
                  colors.border,
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.locationHeader}>
          <Text
            style={[
              styles.label,
              {
                color: colors.text,
              },
            ]}>
            Work Location
          </Text>

          <Pressable
            onPress={getCurrentLocation}>
            {locationLoading ? (
              <ActivityIndicator
                size="small"
                color={
                  colors.primary
                }
              />
            ) : (
              <Text
                style={[
                  styles.locationAction,
                  {
                    color:
                      colors.primary,
                  },
                ]}>
                Use Current
              </Text>
            )}
          </Pressable>
        </View>

        <TextInput
          value={address}
          onChangeText={setAddress}
          placeholder="Enter complete work address"
          placeholderTextColor={
            colors.textSecondary
          }
          multiline
          numberOfLines={3}
          style={[
            styles.textArea,
            {
              color: colors.text,
              backgroundColor:
                colors.surface,
              borderColor:
                colors.border,
            },
          ]}
        />

        {location ? (
          <Text
            style={[
              styles.locationStatus,
              {
                color:
                  colors.primary,
              },
            ]}>
            ✓ Current location attached
          </Text>
        ) : null}
      </View>

      <Pressable
        disabled={loading}
        onPress={submitBooking}
        style={[
          styles.submitButton,
          {
            backgroundColor:
              colors.primary,
            opacity: loading ? 0.7 : 1,
          },
        ]}>
        {loading ? (
          <ActivityIndicator
            color={
              colors.onPrimary
            }
          />
        ) : (
          <Text
            style={[
              styles.submitText,
              {
                color:
                  colors.onPrimary,
              },
            ]}>
            Send Booking Request
          </Text>
        )}
      </Pressable>
    </Screen>
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

  title: {
    ...typography.h2,
  },

  subtitle: {
    ...typography.body,
    marginTop: spacing.xs,
  },

  workerLabel: {
    ...typography.caption,
  },

  workerName: {
    ...typography.h3,
    marginTop: spacing.xs,
  },

  workerMeta: {
    ...typography.small,
    marginTop: spacing.xs,
  },

  section: {
    marginTop: spacing.lg,
  },

  label: {
    ...typography.bodyMedium,
    marginBottom: spacing.sm,
  },

  input: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    ...typography.body,
  },

  textArea: {
    minHeight: 100,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    textAlignVertical: 'top',
    marginBottom: spacing.sm,
    ...typography.body,
  },

  timeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  timeInput: {
    flex: 1,
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    ...typography.body,
  },

  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  locationAction: {
    ...typography.small,
  },

  locationStatus: {
    ...typography.small,
    marginTop: spacing.xs,
  },

  submitButton: {
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xxxl,
  },

  submitText: {
    ...typography.bodyMedium,
  },
});