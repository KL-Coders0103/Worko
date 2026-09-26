import Geolocation from 'react-native-geolocation-service';
import {checkWorkoPermission, requestWorkoPermission, isPermissionBlocked} from '../native';
import type {Coordinates, LocationPermissionState} from './types';

export const getLocationPermission = async (): Promise<LocationPermissionState> => {
  const current = await checkWorkoPermission('location');
  if (current === 'granted') return 'granted';
  if (isPermissionBlocked(current)) return 'blocked';
  const requested = await requestWorkoPermission('location');
  if (requested === 'granted') return 'granted';
  if (isPermissionBlocked(requested)) return 'blocked';
  return 'denied';
};

export const getCurrentLocation = async (): Promise<Coordinates> => {
  const permission = await getLocationPermission();
  if (permission !== 'granted') {
    throw new Error(
      permission === 'blocked'
        ? 'Location permission is blocked. Enable location permission for Worko in Settings.'
        : 'Location permission is required to use your current location.',
    );
  }

  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      position => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters: position.coords.accuracy ?? undefined,
      }),
      error => reject(new Error(error.message || 'Unable to determine your current location.')),
      {
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 30_000,
        forceRequestLocation: true,
        showLocationDialog: true,
      },
    );
  });
};
