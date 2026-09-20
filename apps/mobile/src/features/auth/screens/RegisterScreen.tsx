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

import type { AuthStackParamList } from '../auth.types';
import { registerUser } from '../../../services/authService';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
  const normalizedFirstName = firstName.trim();
  const normalizedLastName = lastName.trim();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhone = phoneNumber.trim();

  if (
    !normalizedFirstName ||
    !normalizedEmail ||
    !normalizedPhone
  ) {
    Alert.alert(
      'Required',
      'First name, email and phone number are required.',
    );
    return;
  }

  try {
    setLoading(true);

    await registerUser({
      firstName: normalizedFirstName,
      lastName: normalizedLastName || undefined,
      email: normalizedEmail,
      phoneNumber: normalizedPhone,
    });

    navigation.navigate('VerifyOtp', {
      identifier: normalizedEmail,
      purpose: 'REGISTRATION',
    });
  } catch (error: any) {
    const message =
      error?.response?.data?.message ||
      'Unable to create your account. Please try again.';

    Alert.alert('Registration failed', message);
  } finally {
    setLoading(false);
  }
};

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>

        <Text style={styles.title}>Create your account</Text>

        <Text style={styles.subtitle}>
          Join Worko and get started.
        </Text>

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
          style={styles.button}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create account</Text>
          )}
        </Pressable>
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
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});