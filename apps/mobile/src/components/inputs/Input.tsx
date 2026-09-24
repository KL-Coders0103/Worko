import React from 'react';
import { View, TextInput, TextInputProps, StyleSheet, useColorScheme } from 'react-native';
import { Typography } from '../common/Typography';
import { colors, spacing, radius, typography } from '../../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...props }: InputProps) {
  const isDark = useColorScheme() === 'dark';
  
  const backgroundColor = isDark ? colors.background.cardDark : colors.background.cardLight;
  const borderColor = error ? colors.status.error : (isDark ? colors.border.dark : colors.border.light);
  const textColor = isDark ? colors.text.primaryDark : colors.text.primaryLight;
  const placeholderColor = isDark ? colors.text.secondaryDark : colors.text.secondaryLight;

  return (
    <View style={styles.container}>
      {label && (
        <Typography variant="caption" weight="medium" style={styles.label}>
          {label}
        </Typography>
      )}
      <TextInput
        style={[
          styles.input,
          { backgroundColor, borderColor, color: textColor },
          style
        ]}
        placeholderTextColor={placeholderColor}
        {...props}
      />
      {error && (
        <Typography variant="caption" color={colors.status.error} style={styles.error}>
          {error}
        </Typography>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    width: '100%',
  },
  label: {
    marginBottom: spacing.xs,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: typography.sizes.md,
  },
  error: {
    marginTop: spacing.xs,
  }
});