import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';

import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Controller, useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';

import {AuthStackParamList} from '../../../app/navigation/types';

import {Typography} from '../../../components/common/Typography';
import {Input} from '../../../components/inputs/Input';
import {Button} from '../../../components/buttons/Button';

import {colors, radius, spacing} from '../../../theme';

import {
  registerSchema,
  type RegisterFormData,
} from '../schemas/register.schema';

import {useRegister} from '../hooks/useRegister';

type Props = NativeStackScreenProps<
  AuthStackParamList,
  'Register'
>;

export function RegisterScreen({navigation}: Props) {
  const isDark = useColorScheme() === 'dark';

  const {
    register,
    isLoading,
    error,
  } = useRegister();

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: {errors},
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      role: 'CLIENT',
    },
    mode: 'onTouched',
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await register({
        firstName: data.firstName.trim(),
        lastName: data.lastName?.trim() || undefined,
        email: data.email.trim().toLowerCase(),
        phoneNumber: data.phoneNumber.trim(),
        role: data.role,
      });

      navigation.navigate('VerifyOTP', {
        identifier: data.email.trim().toLowerCase(),
        channel: 'EMAIL',
        purpose: 'REGISTRATION',
      });
    } catch {
      // useRegister already exposes the user-friendly error.
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
      style={[
        styles.container,
        {backgroundColor},
      ]}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
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
            align="center"
            style={styles.title}
          >
            Create your account
          </Typography>

          <Typography
            variant="body"
            color={subtitleColor}
            align="center"
            style={styles.subtitle}
          >
            Join Worko and get started
          </Typography>
        </View>

        <View style={styles.form}>
          <View style={styles.nameRow}>
            <View style={styles.nameField}>
              <Controller
                control={control}
                name="firstName"
                render={({
                  field: {
                    onChange,
                    onBlur,
                    value,
                  },
                }) => (
                  <Input
                    label="First name"
                    placeholder="First name"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    autoCapitalize="words"
                    autoCorrect={false}
                    editable={!isLoading}
                    error={errors.firstName?.message}
                  />
                )}
              />
            </View>

            <View style={styles.nameField}>
              <Controller
                control={control}
                name="lastName"
                render={({
                  field: {
                    onChange,
                    onBlur,
                    value,
                  },
                }) => (
                  <Input
                    label="Last name"
                    placeholder="Last name"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    autoCapitalize="words"
                    autoCorrect={false}
                    editable={!isLoading}
                    error={errors.lastName?.message}
                  />
                )}
              />
            </View>
          </View>

          <Controller
            control={control}
            name="email"
            render={({
              field: {
                onChange,
                onBlur,
                value,
              },
            }) => (
              <Input
                label="Email"
                placeholder="Enter your email"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                editable={!isLoading}
                error={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="phoneNumber"
            render={({
              field: {
                onChange,
                onBlur,
                value,
              },
            }) => (
              <Input
                label="Phone number"
                placeholder="Enter your phone number"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="phone-pad"
                autoComplete="tel"
                editable={!isLoading}
                error={errors.phoneNumber?.message}
              />
            )}
          />

          <View style={styles.roleSection}>
            <Typography
              variant="body"
              weight="semibold"
              style={styles.roleLabel}
            >
              I want to join Worko as
            </Typography>

            <View style={styles.roleContainer}>
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={isLoading}
                onPress={() =>
                  setValue('role', 'CLIENT', {
                    shouldValidate: true,
                  })
                }
                style={[
                  styles.roleCard,
                  {
                    backgroundColor:
                      selectedRole === 'CLIENT'
                        ? colors.primary
                        : isDark
                        ? colors.background.cardDark
                        : colors.background.cardLight,
                    borderColor:
                      selectedRole === 'CLIENT'
                        ? colors.primary
                        : isDark
                        ? colors.border.dark
                        : colors.border.light,
                  },
                ]}
              >
                <Typography
                  variant="h3"
                  color={
                    selectedRole === 'CLIENT'
                      ? '#FFFFFF'
                      : undefined
                  }
                  align="center"
                >
                  Client
                </Typography>

                <Typography
                  variant="caption"
                  color={
                    selectedRole === 'CLIENT'
                      ? '#FFFFFF'
                      : subtitleColor
                  }
                  align="center"
                  style={styles.roleDescription}
                >
                  Post requirements
                </Typography>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                disabled={isLoading}
                onPress={() =>
                  setValue('role', 'WORKER', {
                    shouldValidate: true,
                  })
                }
                style={[
                  styles.roleCard,
                  {
                    backgroundColor:
                      selectedRole === 'WORKER'
                        ? colors.primary
                        : isDark
                        ? colors.background.cardDark
                        : colors.background.cardLight,
                    borderColor:
                      selectedRole === 'WORKER'
                        ? colors.primary
                        : isDark
                        ? colors.border.dark
                        : colors.border.light,
                  },
                ]}
              >
                <Typography
                  variant="h3"
                  color={
                    selectedRole === 'WORKER'
                      ? '#FFFFFF'
                      : undefined
                  }
                  align="center"
                >
                  Worker
                </Typography>

                <Typography
                  variant="caption"
                  color={
                    selectedRole === 'WORKER'
                      ? '#FFFFFF'
                      : subtitleColor
                  }
                  align="center"
                  style={styles.roleDescription}
                >
                  Find work
                </Typography>
              </TouchableOpacity>
            </View>

            {errors.role?.message ? (
              <Typography
                variant="caption"
                color={colors.status.error}
                style={styles.roleError}
              >
                {errors.role.message}
              </Typography>
            ) : null}
          </View>

          {error ? (
            <View
              style={[
                styles.errorContainer,
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
                {error}
              </Typography>
            </View>
          ) : null}

          <Button
            title="Create Account"
            onPress={handleSubmit(onSubmit)}
            isLoading={isLoading}
            disabled={isLoading}
            fullWidth
            style={styles.registerButton}
          />

          <View style={styles.loginRow}>
            <Typography
              variant="body"
              color={subtitleColor}
            >
              Already have an account?{' '}
            </Typography>

            <TouchableOpacity
              activeOpacity={0.7}
              disabled={isLoading}
              onPress={() =>
                navigation.navigate('Login')
              }
              accessibilityRole="button"
              accessibilityLabel="Go to login"
            >
              <Typography
                variant="body"
                color={colors.primary}
                weight="semibold"
              >
                Sign in
              </Typography>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },

  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },

  logo: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },

  title: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },

  subtitle: {
    maxWidth: 280,
  },

  form: {
    width: '100%',
  },

  nameRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  nameField: {
    flex: 1,
  },

  roleSection: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },

  roleLabel: {
    marginBottom: spacing.sm,
  },

  roleContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  roleCard: {
    flex: 1,
    minHeight: 88,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    justifyContent: 'center',
  },

  roleDescription: {
    marginTop: spacing.xs,
  },

  roleError: {
    marginTop: spacing.xs,
  },

  errorContainer: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },

  registerButton: {
    marginTop: spacing.sm,
  },

  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
});