import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { api } from './api';
import { saveTokens } from './authStorage';

export async function signInWithGoogle() {
  await GoogleSignin.hasPlayServices({
    showPlayServicesUpdateDialog: true,
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