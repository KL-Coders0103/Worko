import React, {useState} from 'react';
import {KeyboardAvoidingView, Platform, StyleSheet, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Screen} from '../../components/ui/Screen';
import {AppText} from '../../components/ui/AppText';
import {AppButton} from '../../components/ui/AppButton';
import {AppInput} from '../../components/ui/AppInput';
import {AuthHeader} from '../../components/ui/AuthHeader';
import {useTheme} from '../../theme/ThemeProvider';
import {useAuthStore} from '../../store/authStore';
import type {AuthStackParamList} from '../../navigation/types';
import type {OtpChannel} from '../../auth/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const getChannel = (identifier: string): OtpChannel => identifier.includes('@') ? 'EMAIL' : 'SMS';

export const LoginScreen = ({navigation}: Props): React.JSX.Element => {
  const {theme} = useTheme();
  const sendOtp = useAuthStore(state => state.sendOtp);
  const serverError = useAuthStore(state => state.error);
  const clearError = useAuthStore(state => state.clearError);
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (): Promise<void> => {
    const value = identifier.trim().toLowerCase();
    if (!value) return;

    clearError();
    setLoading(true);
    const channel = getChannel(value);
    const success = await sendOtp({identifier: value, purpose: 'LOGIN', channel});
    setLoading(false);

    if (success) {
      navigation.navigate('VerifyOtp', {identifier: value, purpose: 'LOGIN', channel});
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
          <AppButton label="Back" variant="ghost" onPress={() => navigation.goBack()} />
          <AuthHeader
            eyebrow="Welcome back"
            title="Sign in to Worko"
            description="Enter your email or phone number and we’ll send you a one-time code."
          />

          <View style={styles.form}>
            <AppInput
              label="Email or phone"
              value={identifier}
              onChangeText={setIdentifier}
              placeholder="you@example.com or 9876543210"
              keyboardType={identifier.includes('@') ? 'email-address' : 'phone-pad'}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {serverError ? <AppText variant="caption" style={{color: theme.colors.danger}}>{serverError}</AppText> : null}

            <AppButton label="Send OTP" loading={loading} disabled={!identifier.trim()} onPress={submit} />

            <View style={styles.divider}>
              <View style={[styles.line, {backgroundColor: theme.colors.border}]} />
              <AppText variant="caption" muted>or</AppText>
              <View style={[styles.line, {backgroundColor: theme.colors.border}]} />
            </View>

            <AppButton
              label="Continue with Google"
              variant="secondary"
              onPress={() => {
                // Native Google identity is wired in the Google authentication phase.
              }}
            />

            <AppText variant="caption" muted style={styles.switchText}>
              New to Worko?{' '}
              <AppText variant="caption" style={{color: theme.colors.accent, fontWeight: '700'}} onPress={() => navigation.navigate('Register')}>
                Create account
              </AppText>
            </AppText>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1},
  container: {flex: 1, gap: 28, paddingTop: 8},
  form: {gap: 16},
  divider: {flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4},
  line: {height: 1, flex: 1},
  switchText: {textAlign: 'center'},
});
