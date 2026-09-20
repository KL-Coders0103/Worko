import { GoogleSignin } from '@react-native-google-signin/google-signin';

export const configureGoogleSignIn = (): void => {
  GoogleSignin.configure({
    webClientId:
      '38095577029-muoc24cbqg3nrcta5sndt0oekot4b328.apps.googleusercontent.com',
    offlineAccess: false,
  });
};