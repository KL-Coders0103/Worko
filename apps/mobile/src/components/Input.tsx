import React from 'react';

import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';

import {
  radius,
  spacing,
  typography,
  useTheme,
} from '../theme';

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
};

export function Input({
  label,
  error,
  style,
  ...props
}: InputProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {label ? (
        <Text
          style={[
            styles.label,
            {
              color: colors.text,
            },
          ]}
        >
          {label}
        </Text>
      ) : null}

      <TextInput
        {...props}
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor: error
              ? colors.error
              : colors.border,
            color: colors.text,
          },
          style,
        ]}
      />

      {error ? (
        <Text
          style={[
            styles.error,
            {
              color: colors.error,
            },
          ]}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: spacing.lg,
  },

  label: {
    ...typography.caption,
    marginBottom: spacing.sm,
  },

  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    ...typography.body,
  },

  error: {
    ...typography.small,
    marginTop: spacing.xs,
  },
});