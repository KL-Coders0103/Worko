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

import type {AuthStackParamList} from '../auth.types';
import {registerUser} from '../../../services/authService';
import {Screen} from '../../../components/Screen';

type Props = NativeStackScreenProps<
  AuthStackParamList,
  'Register'
>;

export function RegisterScreen({navigation}: Props) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const [role, setRole] = useState<
    'CLIENT' | 'WORKER' | null
  >(null);

  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phoneNumber.trim();

    if (
      !normalizedFirstName ||
      !normalizedEmail ||
      !normalizedPhone ||
      !role
    ) {
      Alert.alert(
        'Required',
        'Please enter your details and select whether you want to work or hire.',
      );
      return;
    }

    try {
      setLoading(true);

      await registerUser({
        firstName: normalizedFirstName,
        lastName:
          normalizedLastName || undefined,
        email: normalizedEmail,
        phoneNumber: normalizedPhone,
        role,
      });

      navigation.navigate('VerifyOtp', {
        identifier: normalizedEmail,
        purpose: 'REGISTRATION',
      });
    } catch (error: any) {
      const rawMessage =
        error?.response?.data?.message;

      const message = Array.isArray(rawMessage)
        ? rawMessage.join('\n')
        : typeof rawMessage === 'string'
          ? rawMessage
          : 'Unable to create your account. Please try again.';

      Alert.alert(
        'Registration failed',
        message,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <View style={styles.content}>
        <Pressable
          onPress={() => navigation.goBack()}>
          <Text style={styles.back}>
            ‹ Back
          </Text>
        </Pressable>

        <Text style={styles.title}>
          Create your account
        </Text>

        <Text style={styles.subtitle}>
          Join Worko and get started.
        </Text>

        <Text style={styles.roleTitle}>
          I want to
        </Text>

        <View style={styles.roleContainer}>
          <Pressable
            style={[
              styles.roleButton,
              role === 'WORKER' &&
                styles.roleButtonActive,
            ]}
            onPress={() => setRole('WORKER')}>
            <Text
              style={[
                styles.roleButtonText,
                role === 'WORKER' &&
                  styles.roleButtonTextActive,
              ]}>
              Work
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.roleButton,
              role === 'CLIENT' &&
                styles.roleButtonActive,
            ]}
            onPress={() => setRole('CLIENT')}>
            <Text
              style={[
                styles.roleButtonText,
                role === 'CLIENT' &&
                  styles.roleButtonTextActive,
              ]}>
              Hire
            </Text>
          </Pressable>
        </View>

        <TextInput
          value={firstName}
          onChangeText={setFirstName}
          placeholder="First name"
          placeholderTextColor="#777"
          style={styles.input}
        />

        <TextInput
          value={lastName}
          onChangeText={setLastName}
          placeholder="Last name"
          placeholderTextColor="#777"
          style={styles.input}
        />

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor="#777"
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />

        <TextInput
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          placeholder="+919876543210"
          placeholderTextColor="#777"
          keyboardType="phone-pad"
          style={styles.input}
        />

        <Pressable
          style={[
            styles.button,
            loading && styles.buttonDisabled,
          ]}
          onPress={handleRegister}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              Create account
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
    marginBottom: 28,
    fontSize: 15,
  },

  roleTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },

  roleContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },

  roleButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#151515',
    justifyContent: 'center',
    alignItems: 'center',
  },

  roleButtonActive: {
    borderColor: '#FF6B00',
    backgroundColor: '#FF6B00',
  },

  roleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  roleButtonTextActive: {
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

  button: {
    height: 54,
    borderRadius: 12,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});