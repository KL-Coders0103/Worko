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

import {
  sendLoginOtp,
  type OtpChannel,
} from '../../../services/authService';

import type {AuthStackParamList} from '../auth.types';

import {Screen} from '../../../components/Screen';

type Props = NativeStackScreenProps<
  AuthStackParamList,
  'Login'
>;

export function LoginScreen({navigation}: Props) {
  const [channel, setChannel] =
    useState<OtpChannel>('EMAIL');

  const [identifier, setIdentifier] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const handleChannelChange = (
    nextChannel: OtpChannel,
  ) => {
    setChannel(nextChannel);
    setIdentifier('');
  };

  const handleContinue = async () => {
    const value = identifier.trim();

    if (!value) {
      Alert.alert(
        'Required',
        channel === 'EMAIL'
          ? 'Enter your email address.'
          : 'Enter your mobile number.',
      );

      return;
    }

    if (
      channel === 'EMAIL' &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    ) {
      Alert.alert(
        'Invalid email',
        'Please enter a valid email address.',
      );

      return;
    }

    if (
      channel === 'SMS' &&
      !/^\+?[1-9]\d{7,14}$/.test(value)
    ) {
      Alert.alert(
        'Invalid mobile number',
        'Enter your mobile number with country code. Example: +919876543210',
      );

      return;
    }

    try {
      setLoading(true);

      await sendLoginOtp(value, channel);

      navigation.navigate('VerifyOtp', {
        identifier: value,
        purpose: 'LOGIN',
        channel,
      });
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        'Unable to send OTP. Please try again.';

      Alert.alert(
        'OTP failed',
        Array.isArray(message)
          ? message.join('\n')
          : message,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.content}>
        <Text style={styles.logo}>
          WORKO
        </Text>

        <Text style={styles.title}>
          Welcome back
        </Text>

        <Text style={styles.subtitle}>
          Login to find work or hire trusted workers.
        </Text>

        <View style={styles.selector}>
          <Pressable
            style={[
              styles.selectorButton,
              channel === 'EMAIL' &&
                styles.selectorButtonActive,
            ]}
            onPress={() =>
              handleChannelChange('EMAIL')
            }
            disabled={loading}>
            <Text
              style={[
                styles.selectorText,
                channel === 'EMAIL' &&
                  styles.selectorTextActive,
              ]}>
              Email
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.selectorButton,
              channel === 'SMS' &&
                styles.selectorButtonActive,
            ]}
            onPress={() =>
              handleChannelChange('SMS')
            }
            disabled={loading}>
            <Text
              style={[
                styles.selectorText,
                channel === 'SMS' &&
                  styles.selectorTextActive,
              ]}>
              Mobile
            </Text>
          </Pressable>
        </View>

        <TextInput
          value={identifier}
          onChangeText={setIdentifier}
          placeholder={
            channel === 'EMAIL'
              ? 'Enter your email'
              : '+91 9876543210'
          }
          placeholderTextColor="#777"
          autoCapitalize="none"
          keyboardType={
            channel === 'EMAIL'
              ? 'email-address'
              : 'phone-pad'
          }
          style={styles.input}
        />

        <Pressable
          style={styles.primaryButton}
          onPress={handleContinue}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text
              style={styles.primaryButtonText}>
              Send OTP
            </Text>
          )}
        </Pressable>

        <View style={styles.registerRow}>
          <Text style={styles.registerText}>
            Don't have an account?{' '}
          </Text>

          <Pressable
            onPress={() =>
              navigation.navigate('Register')
            }>
            <Text style={styles.link}>
              Create account
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
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

  selector: {
    flexDirection: 'row',
    backgroundColor: '#151515',
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
  },

  selectorButton: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 9,
  },

  selectorButtonActive: {
    backgroundColor: '#FF6B00',
  },

  selectorText: {
    color: '#888888',
    fontSize: 14,
    fontWeight: '600',
  },

  selectorTextActive: {
    color: '#FFFFFF',
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