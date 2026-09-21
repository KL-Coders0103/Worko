import React, {useState} from 'react';

import {
  Alert,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Geolocation from '@react-native-community/geolocation';

import {Button} from '../../../components/Button';

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

  const [coordinates, setCoordinates] =
    useState<Coordinates | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const requestLocationPermission =
    async (): Promise<boolean> => {
      if (Platform.OS !== 'android') {
        return true;
      }

      const granted =
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message:
              'Worko needs your location to help clients find workers available near them.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          },
        );

      return (
        granted ===
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
          'Please allow location permission to continue.',
        );
        return;
      }

      Geolocation.getCurrentPosition(
        position => {
          setCoordinates({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy:
              position.coords.accuracy,
          });

          setLoading(false);
        },
        error => {
          setLoading(false);

          Alert.alert(
            'Unable to get location',
            error.message ||
              'Please make sure location services are enabled.',
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
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
          : message ||
              'Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {backgroundColor: colors.background},
      ]}>
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
                  {color: colors.textSecondary},
                ]}>
                Latitude:{' '}
                {coordinates.latitude.toFixed(6)}
              </Text>

              <Text
                style={[
                  styles.coordinates,
                  {color: colors.textSecondary},
                ]}>
                Longitude:{' '}
                {coordinates.longitude.toFixed(6)}
              </Text>

              <Text
                style={[
                  styles.accuracy,
                  {color: colors.textSecondary},
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
                  {color: colors.textSecondary},
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    flex: 1,
    padding: spacing.xl,
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