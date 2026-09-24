import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../../app/navigation/types';
import { Screen } from '../../../components/common/Screen';
import { Typography } from '../../../components/common/Typography';
import { Input } from '../../../components/inputs/Input';
import { Button } from '../../../components/buttons/Button';
import { registerUser, OtpChannel } from '../../../services/authService';
import { spacing } from '../../../theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState<'CLIENT' | 'WORKER'>('CLIENT');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleRegister = async () => {
    setError(undefined);

    if (!firstName || !email || !phoneNumber) {
      setError('First name, email, and phone number are required.');
      return;
    }

    try {
      setIsLoading(true);
      await registerUser({
        firstName,
        lastName,
        email,
        phoneNumber,
        role,
      });
      
      // Backend should trigger OTP on registration, proceed to verify
      const channel: OtpChannel = 'SMS'; // Defaulting to SMS for phone registration
      navigation.navigate('VerifyOTP', { 
        identifier: phoneNumber, 
        channel, 
        purpose: 'REGISTRATION' 
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <Typography variant="h1" style={styles.title}>Create Account</Typography>
          
          <Input label="First Name" value={firstName} onChangeText={setFirstName} />
          <Input label="Last Name (Optional)" value={lastName} onChangeText={setLastName} />
          <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <Input label="Phone Number" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" />

          {/* Simple Role Toggle for now */}
          <View style={styles.roleContainer}>
            <Button 
              title="I am a Client" 
              variant={role === 'CLIENT' ? 'primary' : 'outline'} 
              onPress={() => setRole('CLIENT')} 
              style={styles.roleButton}
            />
            <Button 
              title="I am a Worker" 
              variant={role === 'WORKER' ? 'primary' : 'outline'} 
              onPress={() => setRole('WORKER')} 
              style={styles.roleButton}
            />
          </View>

          {error && <Typography color="red" style={styles.error}>{error}</Typography>}

          <Button title="Register" onPress={handleRegister} isLoading={isLoading} style={styles.registerButton} />
          <Button title="Back to Login" variant="ghost" onPress={() => navigation.goBack()} disabled={isLoading} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingTop: spacing.xl, paddingBottom: spacing.xxl },
  title: { marginBottom: spacing.xl },
  roleContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  roleButton: { flex: 0.48 },
  error: { marginBottom: spacing.md, textAlign: 'center' },
  registerButton: { marginBottom: spacing.md }
});