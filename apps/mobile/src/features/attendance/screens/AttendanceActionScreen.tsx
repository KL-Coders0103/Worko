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
  launchCamera,
} from 'react-native-image-picker';

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
  AttendanceEvidenceType,
  checkIn,
  checkOut,
  createAttendanceEvidence,
  uploadAttendanceEvidence,
} from '../attendance.api';

import {
  getCurrentLocation,
} from '../location';

type Props = NativeStackScreenProps<
  AppStackParamList,
  'AttendanceAction'
>;

export function AttendanceActionScreen({
  route,
  navigation,
}: Props) {
  const {colors} = useTheme();

  const {
    bookingId,
    purpose,
    qrToken,
  } = route.params;

  const [loading, setLoading] =
    useState(false);

  const isCheckIn =
    purpose === 'CHECK_IN';

  const evidenceType: AttendanceEvidenceType =
    isCheckIn
      ? 'BEFORE_PHOTO'
      : 'AFTER_PHOTO';

  const handleCapture = async () => {
    if (!qrToken) {
      Alert.alert(
        'QR Required',
        'Please scan the client QR code first.',
      );

      navigation.replace('QrScanner', {
        bookingId,
        purpose,
      });

      return;
    }

    try {
      setLoading(true);

      const cameraResult =
        await launchCamera({
          mediaType: 'photo',
          cameraType: 'back',
          quality: 0.8,
          saveToPhotos: false,
        });

      if (
        cameraResult.didCancel ||
        !cameraResult.assets?.length
      ) {
        return;
      }

      const asset =
        cameraResult.assets[0];

      if (!asset.uri) {
        throw new Error(
          'Captured image could not be read.',
        );
      }

      const capturedAt =
        new Date().toISOString();

      const location =
        await getCurrentLocation();

      const upload =
        await uploadAttendanceEvidence(
          bookingId,
          asset.uri,
          asset.fileName ||
            `${evidenceType.toLowerCase()}-${Date.now()}.jpg`,
          asset.type ||
            'image/jpeg',
        );

      const fileKey =
        upload?.key ||
        upload?.fileKey;

      if (!fileKey) {
        throw new Error(
          'Evidence upload did not return a storage key.',
        );
      }

      await createAttendanceEvidence(
        bookingId,
        {
          type: evidenceType,
          fileKey,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracyMeters:
            location.accuracyMeters,
          capturedAt,
        },
      );

      const attendancePayload = {
        qrToken,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracyMeters:
          location.accuracyMeters,
        capturedAt,
      };

      if (isCheckIn) {
        await checkIn(
          bookingId,
          attendancePayload,
        );
      } else {
        await checkOut(
          bookingId,
          attendancePayload,
        );
      }

      Alert.alert(
        isCheckIn
          ? 'Check-in Successful'
          : 'Check-out Successful',
        isCheckIn
          ? 'Your attendance has been checked in successfully.'
          : 'Your work has been checked out successfully.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
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
            : error?.message ||
              'Attendance action failed.';

      Alert.alert(
        isCheckIn
          ? 'Check-in Failed'
          : 'Check-out Failed',
        message,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleScanQr = () => {
    navigation.replace('QrScanner', {
      bookingId,
      purpose,
    });
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}>
          <Text
            style={[
              styles.backText,
              {color: colors.primary},
            ]}>
            ← Back
          </Text>
        </Pressable>

        <Text
          style={[
            styles.heading,
            {color: colors.text},
          ]}>
          {isCheckIn
            ? 'Worker Check-in'
            : 'Worker Check-out'}
        </Text>
      </View>

      <Card>
        <Text
          style={[
            styles.title,
            {color: colors.text},
          ]}>
          {isCheckIn
            ? 'Start Attendance'
            : 'Finish Attendance'}
        </Text>

        <Text
          style={[
            styles.description,
            {color: colors.textSecondary},
          ]}>
          {isCheckIn
            ? 'Scan the client QR, capture a before photo and verify your location.'
            : 'Capture an after photo, scan the client QR and verify your location.'}
        </Text>
      </Card>

      <Card>
        <Step
          number="1"
          title="Client QR"
          completed={Boolean(qrToken)}
          colors={colors}
        />

        <Step
          number="2"
          title={
            isCheckIn
              ? 'Before Photo'
              : 'After Photo'
          }
          completed={false}
          colors={colors}
        />

        <Step
          number="3"
          title="GPS Verification"
          completed={false}
          colors={colors}
        />
      </Card>

      <View style={styles.actions}>
        {!qrToken ? (
          <Pressable
            onPress={handleScanQr}
            disabled={loading}
            style={[
              styles.button,
              {
                backgroundColor:
                  colors.primary,
                opacity: loading ? 0.6 : 1,
              },
            ]}>
            <Text
              style={[
                styles.buttonText,
                {color: colors.onPrimary},
              ]}>
              Scan Client QR
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleCapture}
            disabled={loading}
            style={[
              styles.button,
              {
                backgroundColor:
                  colors.primary,
                opacity: loading ? 0.6 : 1,
              },
            ]}>
            {loading ? (
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
                {isCheckIn
                  ? 'Capture Before Photo & Check In'
                  : 'Capture After Photo & Check Out'}
              </Text>
            )}
          </Pressable>
        )}
      </View>
    </Screen>
  );
}

function Step({
  number,
  title,
  completed,
  colors,
}: {
  number: string;
  title: string;
  completed: boolean;
  colors: any;
}) {
  return (
    <View style={styles.step}>
      <View
        style={[
          styles.stepCircle,
          {
            backgroundColor:
              completed
                ? colors.primary
                : colors.surface,
            borderColor:
              colors.primary,
          },
        ]}>
        <Text
          style={[
            styles.stepNumber,
            {
              color: completed
                ? colors.onPrimary
                : colors.primary,
            },
          ]}>
          {completed ? '✓' : number}
        </Text>
      </View>

      <Text
        style={[
          styles.stepTitle,
          {color: colors.text},
        ]}>
        {title}
      </Text>
    </View>
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

  title: {
    ...typography.h3,
  },

  description: {
    ...typography.small,
    lineHeight: 21,
    marginTop: spacing.sm,
  },

  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.sm,
  },

  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },

  stepNumber: {
    fontWeight: '700',
  },

  stepTitle: {
    ...typography.bodyMedium,
  },

  actions: {
    marginTop: spacing.lg,
    marginBottom: spacing.xxxl,
  },

  button: {
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },

  buttonText: {
    ...typography.bodyMedium,
    textAlign: 'center',
  },
});