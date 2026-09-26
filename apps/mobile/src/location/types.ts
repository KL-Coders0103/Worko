export type Coordinates = {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
};

export type LocationPermissionState =
  | 'granted'
  | 'denied'
  | 'blocked'
  | 'unavailable';
