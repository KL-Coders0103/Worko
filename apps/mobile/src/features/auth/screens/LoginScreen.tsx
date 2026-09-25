import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../../app/navigation/types';
import { Screen } from '../../../components/common/Screen';
import { Typography } from '../../../components/common/Typography';
import { Input } from '../../../components/inputs/Input';
import { Button } from '../../../components/buttons/Button';
import { sendLoginOtp, OtpChannel } from '../../../services/authService';
import { spacing } from '../../../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const [identifier, setIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleLogin = async () => {
    if (!identifier) {
      setError('Please enter your email or phone number.');
      return;
    }

    try {
      setIsLoading(true);
      const trimmedId = identifier.trim();
      
      // Smart detection: matches your backend logic
      const isEmail = trimmedId.includes('@');
      const channel: OtpChannel = isEmail ? 'EMAIL' : 'SMS';

      await sendLoginOtp(trimmedId, channel);

      navigation.navigate('VerifyOTP', {
        identifier: trimmedId,
        channel: channel,
        purpose: 'LOGIN'
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <Typography variant="h1">Welcome to Worko</Typography>
          <Typography variant="body" color="gray" style={styles.subtitle}>
            Enter your phone number or email to login or register.
          </Typography>
        </View>

        <View style={styles.form}>
          <Input
            label="Phone Number or Email"
            placeholder="e.g. +919876543210 or name@mail.com"
            value={identifier}
            onChangeText={(text) => {
              setIdentifier(text);
              if (error) setError(undefined);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            error={error}
          />
          
          <Button 
            title="Continue" 
            onPress={handleLogin} 
            isLoading={isLoading} 
            style={styles.button}
          />

          <Button 
            title="Don't have an account? Register" 
            variant="ghost"
            onPress={() => navigation.navigate('Register')} 
            disabled={isLoading}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: spacing.xxl,
  },
  header: {
    marginBottom: spacing.xxl,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  form: {
    flex: 1,
  },
  button: {
    marginTop: spacing.md,
  }
});