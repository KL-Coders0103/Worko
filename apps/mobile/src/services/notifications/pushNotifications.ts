import { PermissionsAndroid, Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { apiRequest } from '../api/client';

export async function registerWorkoPushToken(accessToken: string): Promise<(() => void) | undefined> {
  try {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const permission = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      if (permission !== PermissionsAndroid.RESULTS.GRANTED) return undefined;
    }

    await messaging().registerDeviceForRemoteMessages().catch(() => undefined);
    const token = await messaging().getToken();
    if (!token) return undefined;

    await registerTokenWithApi(accessToken, token);

    const unsubscribe = messaging().onTokenRefresh(nextToken => {
      void registerTokenWithApi(accessToken, nextToken);
    });

    return unsubscribe;
  } catch {
    // Push setup must never block authentication or the main application.
    return undefined;
  }
}

async function registerTokenWithApi(accessToken: string, token: string): Promise<void> {
  const response = await apiRequest('/notifications/devices', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      token,
      platform: Platform.OS,
    }),
  });

  if (!response.ok) {
    throw new Error('Unable to register push token.');
  }
}
