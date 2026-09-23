import { GoogleSignin } from '@react-native-google-signin/google-signin';

import { api } from './api';
import { saveTokens } from './authStorage';

const GOOGLE_WEB_CLIENT_ID =
  '38095577029-muoc24cbqg3nrcta5sndt0oekot4b328.apps.googleusercontent.com';

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  offlineAccess: false,
});

export async function signInWithGoogle() {
  await GoogleSignin.hasPlayServices({
    showPlayServicesUpdateDialog: true,
  });

  await GoogleSignin.signOut().catch(() => {
    // Ignore previous Google session.
  });

  const result = await GoogleSignin.signIn();

  const idToken = result.data?.idToken;

  if (!idToken) {
    throw new Error('Google ID token was not returned');
  }

  const response = await api.post('/auth/google', {
    idToken,
  });

  await saveTokens(response.data.tokens);

  return response.data;
}