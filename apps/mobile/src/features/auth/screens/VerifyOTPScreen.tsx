import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../../app/navigation/types';
import { Screen } from '../../../components/common/Screen';
import { Typography } from '../../../components/common/Typography';
import { Input } from '../../../components/inputs/Input';
import { Button } from '../../../components/buttons/Button';
import { verifyOtp, sendLoginOtp } from '../../../services/authService';
import { spacing } from '../../../theme';
import { useAuth } from '../../../context/AuthContext';

type Props = NativeStackScreenProps<AuthStackParamList, 'VerifyOTP'>;

export function VerifyOTPScreen({ route }: Props) {
  const { identifier, channel, purpose } = route.params;
  const { setAuthenticatedUser } = useAuth();
  
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [message, setMessage] = useState<string | undefined>();

  const handleVerify = async () => {
    Keyboard.dismiss();
    setError(undefined);
    setMessage(undefined);

    if (otp.length < 4) {
      setError('Please enter a valid OTP.');
      return;
    }

    try {
      setIsLoading(true);
      const response = await verifyOtp({
        identifier,
        otp,
        purpose,
        channel,
      });

      setAuthenticatedUser(response.user);
      
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Invalid OTP. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setError(undefined);
    setMessage(undefined);
    try {
      setIsResending(true);
      await sendLoginOtp(identifier, channel);
      setMessage('OTP has been resent successfully.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend OTP.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <Typography variant="h1">Verify your identity</Typography>
          <Typography variant="body" color="gray" style={styles.subtitle}>
            We sent a code to {identifier}.
          </Typography>
        </View>

        <View style={styles.form}>
          <Input
            label="Verification Code"
            placeholder="Enter OTP"
            value={otp}
            onChangeText={(text) => {
              setOtp(text);
              if (error) setError(undefined);
            }}
            keyboardType="number-pad"
            maxLength={6}
            error={error}
          />
          
          {message && (
            <Typography variant="caption" color="green" style={styles.message}>
              {message}
            </Typography>
          )}

          <Button 
            title="Verify Code" 
            onPress={handleVerify} 
            isLoading={isLoading} 
            style={styles.verifyButton}
          />

          <Button 
            title="Resend Code" 
            onPress={handleResend} 
            variant="ghost" 
            isLoading={isResending} 
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
    paddingTop: spacing.xl,
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
  message: {
    marginBottom: spacing.md,
  },
  verifyButton: {
    marginBottom: spacing.md,
  }
});