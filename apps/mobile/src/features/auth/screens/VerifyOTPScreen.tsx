import React, {useEffect} from 'react';

import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
  useColorScheme,
} from 'react-native';

import {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import {useForm, Controller} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';

import {AuthStackParamList} from '../../../app/navigation/types';

import {Screen} from '../../../components/common/Screen';
import {Typography} from '../../../components/common/Typography';
import {Input} from '../../../components/inputs/Input';
import {Button} from '../../../components/buttons/Button';

import {colors, radius, spacing} from '../../../theme';

import {
  otpSchema,
  type OtpFormData,
} from '../schemas/otp.schema';

import {useVerifyOtp} from '../hooks/useVerifyOtp';
import {useResendOtp} from '../hooks/useResendOtp';

type Props = NativeStackScreenProps<
  AuthStackParamList,
  'VerifyOTP'
>;

export function VerifyOTPScreen({route}: Props) {
  const {
    identifier,
    channel,
    purpose,
  } = route.params;

  const isDark = useColorScheme() === 'dark';

  const {
    verify,
    isLoading,
    error: verifyError,
  } = useVerifyOtp();

  const {
    resend,
    isResending,
    error: resendError,
    message,
    cooldown,
  } = useResendOtp();

  const {
    control,
    handleSubmit,
    setValue,
    formState: {errors},
  } = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: '',
    },
    mode: 'onTouched',
  });

  useEffect(() => {
    setValue('otp', '');
  }, [setValue]);

  const onSubmit = async (data: OtpFormData) => {
    try {
      await verify({
        identifier,
        otp: data.otp,
        purpose,
        channel,
      });
    } catch {
      // Error is already exposed through useVerifyOtp.
    }
  };

  const handleResend = async () => {
    try {
      await resend(
        identifier,
        purpose,
        channel,
      );
    } catch {
      // Error is already exposed through useResendOtp.
    }
  };

  const errorMessage =
    verifyError || resendError;

  const backgroundColor = isDark
    ? colors.background.dark
    : colors.background.light;

  const subtitleColor = isDark
    ? colors.text.secondaryDark
    : colors.text.secondaryLight;

  return (
    <Screen>
      <KeyboardAvoidingView
        style={[
          styles.container,
          {backgroundColor},
        ]}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : 'height'
        }
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Typography
                variant="h2"
                color="#FFFFFF"
                weight="bold"
                align="center"
              >
                ✓
              </Typography>
            </View>

            <Typography
              variant="h1"
              weight="bold"
              align="center"
              style={styles.title}
            >
              Verify your identity
            </Typography>

            <Typography
              variant="body"
              color={subtitleColor}
              align="center"
              style={styles.subtitle}
            >
              We sent a verification code to
            </Typography>

            <Typography
              variant="body"
              color={isDark
                ? colors.text.primaryDark
                : colors.text.primaryLight}
              weight="semibold"
              align="center"
              style={styles.identifier}
            >
              {identifier}
            </Typography>
          </View>

          <View style={styles.form}>
            <Controller
              control={control}
              name="otp"
              render={({
                field: {
                  onChange,
                  onBlur,
                  value,
                },
              }) => (
                <Input
                  label="Verification code"
                  placeholder="Enter 6-digit code"
                  value={value}
                  onChangeText={text => {
                    const numericValue =
                      text.replace(/\D/g, '').slice(0, 6);

                    onChange(numericValue);
                  }}
                  onBlur={onBlur}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  editable={!isLoading}
                  error={errors.otp?.message}
                />
              )}
            />

            {errorMessage ? (
              <View
                style={[
                  styles.feedback,
                  {
                    backgroundColor: isDark
                      ? '#2A1515'
                      : '#FEF2F2',
                    borderColor:
                      colors.status.error,
                  },
                ]}
              >
                <Typography
                  variant="caption"
                  color={colors.status.error}
                >
                  {errorMessage}
                </Typography>
              </View>
            ) : null}

            {message ? (
              <View
                style={[
                  styles.feedback,
                  {
                    backgroundColor: isDark
                      ? '#10251D'
                      : '#ECFDF5',
                    borderColor:
                      colors.status.success,
                  },
                ]}
              >
                <Typography
                  variant="caption"
                  color={colors.status.success}
                >
                  {message}
                </Typography>
              </View>
            ) : null}

            <Button
              title="Verify Code"
              onPress={handleSubmit(onSubmit)}
              isLoading={isLoading}
              disabled={isLoading || isResending}
              fullWidth
              style={styles.verifyButton}
            />

            <View style={styles.resendContainer}>
              <Typography
                variant="body"
                color={subtitleColor}
                align="center"
              >
                Didn't receive the code?
              </Typography>

              <Button
                title={
                  cooldown > 0
                    ? `Resend in ${cooldown}s`
                    : 'Resend Code'
                }
                onPress={handleResend}
                variant="ghost"
                isLoading={isResending}
                disabled={
                  isLoading ||
                  isResending ||
                  cooldown > 0
                }
                fullWidth={false}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },

  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },

  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },

  title: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },

  subtitle: {
    marginTop: spacing.xs,
  },

  identifier: {
    marginTop: spacing.xs,
  },

  form: {
    width: '100%',
  },

  feedback: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },

  verifyButton: {
    marginTop: spacing.sm,
  },

  resendContainer: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
});