import React, {useState} from 'react';

import {
  Alert,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import type {WorkerOnboardingParamList} from '../../../navigation/WorkerOnboardingNavigator';

import Geolocation from '@react-native-community/geolocation';

import {Button} from '../../../components/Button';
import {Screen} from '../../../components/Screen';

import {
  spacing,
  typography,
  useTheme,
} from '../../../theme';

import {updateWorkerLocation} from '../worker.api';

type Coordinates = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

export function WorkerLocationScreen() {
  const {colors} = useTheme();

  const navigation =
    useNavigation<
      NativeStackNavigationProp<WorkerOnboardingParamList>
    >();

  const [coordinates, setCoordinates] =
    useState<Coordinates | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const requestLocationPermission =
    async (): Promise<boolean> => {
      if (Platform.OS !== 'android') {
        return true;
      }

      const fineGranted =
        await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS
            .ACCESS_FINE_LOCATION,
        );

      const coarseGranted =
        await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS
            .ACCESS_COARSE_LOCATION,
        );

      if (fineGranted || coarseGranted) {
        return true;
      }

      const granted =
        await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS
            .ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS
            .ACCESS_COARSE_LOCATION,
        ]);

      return (
        granted[
          PermissionsAndroid.PERMISSIONS
            .ACCESS_FINE_LOCATION
        ] ===
          PermissionsAndroid.RESULTS.GRANTED ||
        granted[
          PermissionsAndroid.PERMISSIONS
            .ACCESS_COARSE_LOCATION
        ] ===
          PermissionsAndroid.RESULTS.GRANTED
      );
    };

  const getCurrentLocation = async () => {
    try {
      setLoading(true);

      const permitted =
        await requestLocationPermission();

      if (!permitted) {
        Alert.alert(
          'Location permission required',
          'Please allow location permission from the app settings to continue.',
        );
        setLoading(false);
        return;
      }

      Geolocation.getCurrentPosition(
        position => {
          setCoordinates({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy:
              position.coords.accuracy ?? 0,
          });

          setLoading(false);
        },
        error => {
          setLoading(false);

          if (error.code === 1) {
            Alert.alert(
              'Location permission denied',
              'Please allow location permission for Worko.',
            );
            return;
          }

          if (error.code === 2) {
            Alert.alert(
              'Location unavailable',
              'Please make sure Location/GPS is turned on and try again.',
            );
            return;
          }

          if (error.code === 3) {
            Alert.alert(
              'Location timeout',
              'We could not get your location quickly enough. Please make sure GPS is enabled and try again.',
            );
            return;
          }

          Alert.alert(
            'Unable to get location',
            error.message ||
              'Please make sure location services are enabled.',
          );
        },
        {
          enableHighAccuracy: false,
          timeout: 30000,
          maximumAge: 30000,
        },
      );
    } catch {
      setLoading(false);

      Alert.alert(
        'Location error',
        'Unable to access your location.',
      );
    }
  };

  const handleSave = async () => {
    if (!coordinates) {
      Alert.alert(
        'Location required',
        'Please get your current location first.',
      );
      return;
    }

    try {
      setSaving(true);

      await updateWorkerLocation(
        coordinates.latitude,
        coordinates.longitude,
        coordinates.accuracy,
      );

      navigation.navigate('WorkerReview');

      Alert.alert(
        'Location saved',
        'Your work location has been updated.',
      );
    } catch (error: any) {
      const message =
        error?.response?.data?.message;

      Alert.alert(
        'Unable to save location',
        Array.isArray(message)
          ? message.join('\n')
          : message || 'Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            {color: colors.text},
          ]}>
          Your Work Location
        </Text>

        <Text
          style={[
            styles.subtitle,
            {color: colors.textSecondary},
          ]}>
          Your location helps Worko show you
          relevant work opportunities nearby.
        </Text>

        <View
          style={[
            styles.locationCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}>
          <Text
            style={[
              styles.icon,
              {color: colors.primary},
            ]}>
            ◎
          </Text>

          {coordinates ? (
            <>
              <Text
                style={[
                  styles.status,
                  {color: colors.text},
                ]}>
                Location captured
              </Text>

              <Text
                style={[
                  styles.coordinates,
                  {
                    color:
                      colors.textSecondary,
                  },
                ]}>
                Latitude:{' '}
                {coordinates.latitude.toFixed(6)}
              </Text>

              <Text
                style={[
                  styles.coordinates,
                  {
                    color:
                      colors.textSecondary,
                  },
                ]}>
                Longitude:{' '}
                {coordinates.longitude.toFixed(6)}
              </Text>

              <Text
                style={[
                  styles.accuracy,
                  {
                    color:
                      colors.textSecondary,
                  },
                ]}>
                Accuracy: ±
                {Math.round(
                  coordinates.accuracy,
                )}
                m
              </Text>
            </>
          ) : (
            <>
              <Text
                style={[
                  styles.status,
                  {color: colors.text},
                ]}>
                Location not captured
              </Text>

              <Text
                style={[
                  styles.coordinates,
                  {
                    color:
                      colors.textSecondary,
                  },
                ]}>
                Tap the button below to detect your
                current location.
              </Text>
            </>
          )}
        </View>

        <View style={styles.actions}>
          <Button
            title={
              coordinates
                ? 'Update Location'
                : 'Use Current Location'
            }
            onPress={getCurrentLocation}
            loading={loading}
          />

          <Button
            title="Save & Continue"
            onPress={handleSave}
            loading={saving}
            disabled={!coordinates}
            variant="outline"
            style={styles.saveButton}
          />
        </View>

        <Text
          style={[
            styles.privacy,
            {color: colors.textSecondary},
          ]}>
          Your location is used for Worko services
          and is not displayed as your exact address
          to other users.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
  },

  title: {
    ...typography.h2,
    marginBottom: spacing.sm,
  },

  subtitle: {
    ...typography.body,
    marginBottom: spacing.xl,
  },

  locationCard: {
    minHeight: 230,
    borderWidth: 1,
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },

  icon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },

  status: {
    ...typography.h3,
    marginBottom: spacing.md,
    textAlign: 'center',
  },

  coordinates: {
    ...typography.small,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },

  accuracy: {
    ...typography.caption,
    marginTop: spacing.sm,
    textAlign: 'center',
  },

  actions: {
    width: '100%',
  },

  saveButton: {
    marginTop: spacing.md,
  },

  privacy: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.xl,
    lineHeight: 20,
  },
});