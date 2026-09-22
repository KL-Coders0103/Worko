import {
  PermissionsAndroid,
  Platform,
} from 'react-native';

import Geolocation from '@react-native-community/geolocation';

export type CurrentLocation = {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  capturedAt: string;
};

export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  const result =
    await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    ]);

  return (
    result[
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    ] === PermissionsAndroid.RESULTS.GRANTED ||
    result[
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
    ] === PermissionsAndroid.RESULTS.GRANTED
  );
}

export async function getCurrentLocation(): Promise<CurrentLocation> {
  const permitted =
    await requestLocationPermission();

  if (!permitted) {
    throw new Error(
      'Location permission is required for attendance.',
    );
  }

  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      position => {
        const {
          latitude,
          longitude,
          accuracy,
        } = position.coords;

        resolve({
          latitude,
          longitude,
          accuracyMeters: accuracy ?? 0,
          capturedAt: new Date(
            position.timestamp,
          ).toISOString(),
        });
      },
      error => {
        reject(
          new Error(
            error.message ||
              'Unable to determine your current location.',
          ),
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      },
    );
  });
}