import React, {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Screen} from '../../components/ui/Screen';
import {AppText} from '../../components/ui/AppText';
import {AppButton} from '../../components/ui/AppButton';
import {AppInput} from '../../components/ui/AppInput';
import {AuthHeader} from '../../components/ui/AuthHeader';
import {useTheme} from '../../theme/ThemeProvider';
import {useAuthStore} from '../../store/authStore';
import type {AuthStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'VerifyOtp'>;

export const VerifyOtpScreen = ({navigation, route}: Props): React.JSX.Element => {
  const {theme} = useTheme();
  const verifyOtp = useAuthStore(state => state.verifyOtp);
  const sendOtp = useAuthStore(state => state.sendOtp);
  const serverError = useAuthStore(state => state.error);
  const clearError = useAuthStore(state => state.clearError);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [seconds, setSeconds] = useState(30);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setInterval(() => setSeconds(value => value - 1), 1000);
    return () => clearInterval(timer);
  }, [seconds]);

  const submit = async (): Promise<void> => {
    if (otp.length !== 6) return;
    clearError();
    setLoading(true);
    await verifyOtp({
      identifier: route.params.identifier,
      otp,
      purpose: route.params.purpose,
      channel: route.params.channel,
    });
    setLoading(false);
  };

  const resend = async (): Promise<void> => {
    if (seconds > 0 || resending) return;
    clearError();
    setResending(true);
    const success = await sendOtp({
      identifier: route.params.identifier,
      purpose: route.params.purpose,
      channel: route.params.channel,
    });
    setResending(false);
    if (success) {
      setSeconds(30);
      setOtp('');
    }
  };

  return (
    <Screen>
      <View style={styles.container}>
        <AppButton label="Back" variant="ghost" onPress={() => navigation.goBack()} />
        <AuthHeader
          eyebrow="Verification"
          title="Enter your OTP"
          description={'We sent a 6-digit code to ' + route.params.identifier + '.'}
        />

        <View style={styles.form}>
          <AppInput
            label="One-time password"
            value={otp}
            onChangeText={value => setOtp(value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />

          {serverError ? <AppText variant="caption" style={{color: theme.colors.danger}}>{serverError}</AppText> : null}

          <AppButton label="Verify & continue" loading={loading} disabled={otp.length !== 6} onPress={submit} />

          <View style={styles.resend}>
            <AppText variant="caption" muted>Didn’t receive the code?</AppText>
            <AppButton
              label={seconds > 0 ? 'Resend in ' + seconds + 's' : 'Resend OTP'}
              variant="ghost"
              loading={resending}
              disabled={seconds > 0}
              onPress={resend}
            />
          </View>
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, gap: 28, paddingTop: 8},
  form: {gap: 16},
  resend: {alignItems: 'center', gap: 4},
});
