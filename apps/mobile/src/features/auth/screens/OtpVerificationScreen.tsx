import React, {useState} from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type {NativeStackScreenProps} from '@react-navigation/native-stack';

import {useAuth} from '../../../context/AuthContext';
import type {AuthStackParamList} from '../auth.types';
import {verifyOtp} from '../../../services/authService';
import {Screen} from '../../../components/Screen';

type Props = NativeStackScreenProps<
  AuthStackParamList,
  'VerifyOtp'
>;

export function OtpVerificationScreen({
  route,
  navigation,
}: Props) {
  const {identifier, purpose, channel} = route.params;

  const {setAuthenticatedUser} = useAuth();

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!/^\d{6}$/.test(otp)) {
      Alert.alert(
        'Invalid OTP',
        'Enter the 6-digit OTP.',
      );
      return;
    }

    try {
      setLoading(true);

      const response = await verifyOtp({
        identifier,
        otp,
        purpose,
        channel,
      });

      setAuthenticatedUser(response.user);

      navigation.getParent()?.navigate('App');

      console.log('Authentication successful:', {
        user: response.user,
        expiresIn: response.tokens.expiresIn,
      });

      Alert.alert(
        'Success',
        'Your account has been verified successfully.',
      );
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        'Invalid or expired OTP. Please try again.';

      Alert.alert(
        'Verification failed',
        message,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.content}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>
            ‹ Back
          </Text>
        </Pressable>

        <Text style={styles.title}>
          Verify OTP
        </Text>

        <Text style={styles.subtitle}>
          Enter the 6-digit code sent to
        </Text>

        <Text style={styles.identifier}>
          {identifier}
        </Text>

        <TextInput
          value={otp}
          onChangeText={value =>
            setOtp(
              value.replace(/\D/g, '').slice(0, 6),
            )
          }
          placeholder="000000"
          placeholderTextColor="#777"
          keyboardType="number-pad"
          maxLength={6}
          style={styles.otpInput}
        />

        <Pressable
          style={styles.button}
          onPress={handleVerify}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              Verify OTP
            </Text>
          )}
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
  },

  back: {
    color: '#FF6B00',
    fontSize: 16,
    marginBottom: 30,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 10,
  },

  subtitle: {
    color: '#999999',
    fontSize: 15,
  },

  identifier: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 28,
  },

  otpInput: {
    height: 60,
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 12,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    backgroundColor: '#151515',
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
    marginBottom: 16,
  },

  button: {
    height: 54,
    borderRadius: 12,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});