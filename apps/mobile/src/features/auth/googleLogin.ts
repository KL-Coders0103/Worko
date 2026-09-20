import { signInWithGoogle } from '../../services/googleAuthService';

export const handleGoogleLogin = async () => {
  try {
    const result = await signInWithGoogle();

    console.log('Google login successful:', {
      user: result.user,
      expiresIn: result.tokens?.expiresIn,
    });

    return result;
  } catch (error) {
    console.error('Google login failed:', error);
    throw error;
  }
};