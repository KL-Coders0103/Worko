import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { sendLoginOtp } from '../../../services/authService';
import { signInWithGoogle } from '../../../services/googleAuthService';
import { useAuth } from '../../../context/AuthContext';
import type { AuthStackParamList } from '../auth.types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuthenticatedUser } = useAuth();

  const handleContinue = async () => {
    const value = identifier.trim();

    if (!value) {
      Alert.alert(
        'Required',
        'Enter your email or phone number.',
      );
      return;
    }

    try {
      setLoading(true);

      await sendLoginOtp(value);

      navigation.navigate('VerifyOtp', {
        identifier: value,
        purpose: 'LOGIN',
      });
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        'Unable to send OTP. Please try again.';

      Alert.alert('Login failed', message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);

      const response = await signInWithGoogle();
      setAuthenticatedUser(response.user);

      navigation.getParent()?.navigate('App');
    } catch (error: any) {
      if (
        error?.code === 'SIGN_IN_CANCELLED' ||
        error?.code === '12501'
      ) {
        return;
      }

      Alert.alert(
        'Google Login Failed',
        error?.response?.data?.message ||
          error?.message ||
          'Unable to continue with Google.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>WORKO</Text>

        <Text style={styles.title}>Welcome back</Text>

        <Text style={styles.subtitle}>
          Login to find work or hire trusted workers.
        </Text>

        <TextInput
          value={identifier}
          onChangeText={setIdentifier}
          placeholder="Email or phone number"
          placeholderTextColor="#777"
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />

        <Pressable
          style={styles.primaryButton}
          onPress={handleContinue}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Continue with OTP</Text>
          )}
        </Pressable>

        <Pressable style={styles.secondaryButton} disabled={loading} onPress={handleGoogleLogin}>
          <Text style={styles.secondaryButtonText}>
            Continue with Google
          </Text>
        </Pressable>

        <View style={styles.registerRow}>
          <Text style={styles.registerText}>Don't have an account? </Text>

          <Pressable onPress={() => navigation.navigate('Register')}>
            <Text style={styles.link}>Create account</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0B',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logo: {
    color: '#FF6B00',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 40,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 10,
  },
  subtitle: {
    color: '#A3A3A3',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 28,
  },
  input: {
    height: 54,
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 12,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    backgroundColor: '#151515',
    marginBottom: 14,
  },
  primaryButton: {
    height: 54,
    borderRadius: 12,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    height: 54,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
  },
  registerText: {
    color: '#888888',
  },
  link: {
    color: '#FF6B00',
    fontWeight: '700',
  },
});