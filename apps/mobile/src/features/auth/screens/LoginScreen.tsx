import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { AuthStackParamList } from '../../../app/navigation/types';
import { Button } from '../../../components/buttons/Button';
import { Input } from '../../../components/inputs/Input';
import { Typography } from '../../../components/common/Typography';
import { colors, radius, spacing } from '../../../theme';
import { loginSchema, LoginFormData } from '../schemas/login.schema';
import { useLogin } from '../hooks/useLogin';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const isDark = useColorScheme() === 'dark';

  const { login, isLoading, error } = useLogin();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
    },
    mode: 'onTouched',
  });

  const onSubmit = async (data: LoginFormData) => {
    const identifier = data.identifier.trim();
    const channel = identifier.includes('@') ? 'EMAIL' : 'SMS';

    try {
      await login(identifier, channel);

      navigation.navigate('VerifyOTP', {
        identifier,
        purpose: 'LOGIN',
        channel,
      });
    } catch {
      // useLogin already exposes the user-friendly error.
    }
  };

  const backgroundColor = isDark
    ? colors.background.dark
    : colors.background.light;

  const subtitleColor = isDark
    ? colors.text.secondaryDark
    : colors.text.secondaryLight;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.logo}>
            <Typography
              variant="h2"
              color="#FFFFFF"
              weight="bold"
              align="center"
            >
              W
            </Typography>
          </View>

          <Typography
            variant="h1"
            weight="bold"
            style={styles.title}
          >
            Welcome back
          </Typography>

          <Typography
            variant="body"
            color={subtitleColor}
            align="center"
            style={styles.subtitle}
          >
            Sign in to continue using Worko
          </Typography>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="identifier"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email or phone number"
                placeholder="Enter your email or phone number"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="username"
                returnKeyType="done"
                error={errors.identifier?.message}
                editable={!isLoading}
              />
            )}
          />

          {error ? (
            <View
              style={[
                styles.errorContainer,
                {
                  backgroundColor: isDark
                    ? '#2A1515'
                    : '#FEF2F2',
                  borderColor: colors.status.error,
                },
              ]}
            >
              <Typography
                variant="caption"
                color={colors.status.error}
              >
                {error}
              </Typography>
            </View>
          ) : null}

          <Button
            title="Continue"
            onPress={handleSubmit(onSubmit)}
            isLoading={isLoading}
            disabled={isLoading}
            fullWidth
            style={styles.continueButton}
          />

          <View style={styles.registerRow}>
            <Typography
              variant="body"
              color={subtitleColor}
            >
              Don't have an account?{' '}
            </Typography>

            <TouchableOpacity
              onPress={() => navigation.navigate('Register')}
              disabled={isLoading}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Create a Worko account"
            >
              <Typography
                variant="body"
                color={colors.primary}
                weight="semibold"
              >
                Create account
              </Typography>
            </TouchableOpacity>
          </View>
        </View>

        <Typography
          variant="caption"
          color={subtitleColor}
          align="center"
          style={styles.footer}
        >
          By continuing, you agree to Worko's terms and privacy policy.
        </Typography>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    justifyContent: 'center',
  },

  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },

  logo: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
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
    maxWidth: 300,
  },

  form: {
    width: '100%',
  },

  continueButton: {
    marginTop: spacing.sm,
  },

  errorContainer: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },

  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },

  footer: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
  },
});