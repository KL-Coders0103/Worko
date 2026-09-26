import React, {useState} from 'react';
import {KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Screen} from '../../components/ui/Screen';
import {AppText} from '../../components/ui/AppText';
import {AppButton} from '../../components/ui/AppButton';
import {AppInput} from '../../components/ui/AppInput';
import {AuthHeader} from '../../components/ui/AuthHeader';
import {useTheme} from '../../theme/ThemeProvider';
import {useAuthStore} from '../../store/authStore';
import type {AuthStackParamList} from '../../navigation/types';
import type {RegisterInput, UserRole} from '../../auth/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const RegisterScreen = ({navigation}: Props): React.JSX.Element => {
  const {theme} = useTheme();
  const register = useAuthStore(state => state.register);
  const serverError = useAuthStore(state => state.error);
  const clearError = useAuthStore(state => state.clearError);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState<Extract<UserRole, 'CLIENT' | 'WORKER'>>('CLIENT');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = async (): Promise<void> => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phoneNumber.replace(/\D/g, '');
    const normalizedFirstName = firstName.trim();

    if (!normalizedFirstName) {
      setLocalError('Enter your first name.');
      return;
    }
    if (!emailPattern.test(normalizedEmail)) {
      setLocalError('Enter a valid email address.');
      return;
    }
    if (normalizedPhone.length !== 10) {
      setLocalError('Enter a valid 10-digit phone number.');
      return;
    }

    setLocalError(null);
    clearError();
    setLoading(true);

    const input: RegisterInput = {
      firstName: normalizedFirstName,
      lastName: lastName.trim() || undefined,
      email: normalizedEmail,
      phoneNumber: normalizedPhone,
      role,
    };

    const response = await register(input);
    setLoading(false);

    if (response) {
      navigation.navigate('VerifyOtp', {
        identifier: normalizedEmail,
        purpose: 'REGISTRATION',
        channel: 'EMAIL',
      });
    }
  };

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, {paddingHorizontal: theme.spacing.lg}]}>
          <View style={styles.top}>
            <AppButton label="Back" variant="ghost" onPress={() => navigation.goBack()} />
            <AuthHeader
              eyebrow="Join Worko"
              title="Create your account"
              description="Choose how you’ll use Worko. You can update your profile later."
            />
          </View>

          <View style={styles.form}>
            <AppText variant="caption" muted>Account type</AppText>
            <View style={styles.roleRow}>
              {(['CLIENT', 'WORKER'] as const).map(item => {
                const selected = role === item;
                return (
                  <View key={item} style={styles.roleButton}>
                    <AppButton
                      label={item === 'CLIENT' ? 'I need work' : 'I do work'}
                      variant={selected ? 'primary' : 'secondary'}
                      onPress={() => setRole(item)}
                    />
                  </View>
                );
              })}
            </View>

            <AppInput label="First name" value={firstName} onChangeText={setFirstName} placeholder="Your first name" autoCapitalize="words" />
            <AppInput label="Last name" value={lastName} onChangeText={setLastName} placeholder="Optional" autoCapitalize="words" />
            <AppInput label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
            <AppInput label="Phone number" value={phoneNumber} onChangeText={setPhoneNumber} placeholder="10-digit mobile number" keyboardType="phone-pad" maxLength={10} />

            {localError || serverError ? (
              <AppText variant="caption" style={{color: theme.colors.danger}}>
                {localError ?? serverError}
              </AppText>
            ) : null}

            <AppButton label="Continue" loading={loading} onPress={submit} />

            <AppText variant="caption" muted style={styles.switchText}>
              Already have an account?{' '}
              <AppText variant="caption" style={{color: theme.colors.accent, fontWeight: '700'}} onPress={() => navigation.navigate('Login')}>
                Sign in
              </AppText>
            </AppText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1},
  content: {paddingTop: 8, paddingBottom: 32, gap: 28},
  top: {gap: 18},
  form: {gap: 14},
  roleRow: {flexDirection: 'row', gap: 10},
  roleButton: {flex: 1},
  switchText: {textAlign: 'center'},
});
