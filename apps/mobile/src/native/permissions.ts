import {Platform} from 'react-native';
import {
  check,
  checkNotifications,
  PERMISSIONS,
  request,
  requestNotifications,
  RESULTS,
  type Permission,
  type PermissionStatus,
} from 'react-native-permissions';

export type WorkoPermission =
  | 'location'
  | 'camera'
  | 'microphone'
  | 'notifications';

const getPermission = (permission: Exclude<WorkoPermission, 'notifications'>): Permission => {
  if (Platform.OS === 'android') {
    switch (permission) {
      case 'location':
        return PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
      case 'camera':
        return PERMISSIONS.ANDROID.CAMERA;
      case 'microphone':
        return PERMISSIONS.ANDROID.RECORD_AUDIO;
    }
  }

  switch (permission) {
    case 'location':
      return PERMISSIONS.IOS.LOCATION_WHEN_IN_USE;
    case 'camera':
      return PERMISSIONS.IOS.CAMERA;
    case 'microphone':
      return PERMISSIONS.IOS.MICROPHONE;
  }
};

export const checkWorkoPermission = async (
  permission: WorkoPermission,
): Promise<PermissionStatus> => {
  if (permission === 'notifications') {
    const {status} = await checkNotifications();
    return status;
  }

  return check(getPermission(permission));
};

export const requestWorkoPermission = async (
  permission: WorkoPermission,
): Promise<PermissionStatus> => {
  if (permission === 'notifications') {
    const {status} = await requestNotifications(['alert', 'sound', 'badge']);
    return status;
  }

  return request(getPermission(permission));
};

export const isPermissionGranted = (status: PermissionStatus): boolean =>
  status === RESULTS.GRANTED;

export const isPermissionBlocked = (status: PermissionStatus): boolean =>
  status === RESULTS.BLOCKED;

