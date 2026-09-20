import React from 'react';

import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  radius,
  spacing,
  typography,
  useTheme,
} from '../theme';

type BadgeVariant =
  | 'primary'
  | 'success'
  | 'warning'
  | 'error'
  | 'neutral';

type BadgeProps = {
  label: string;
  variant?: BadgeVariant;
};

export function Badge({
  label,
  variant = 'neutral',
}: BadgeProps) {
  const { colors } = useTheme();

  const backgroundColor = {
    primary: colors.primary,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    neutral: colors.surfaceSecondary,
  }[variant];

  const textColor =
    variant === 'primary'
      ? colors.onPrimary
      : colors.onSurface;

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: textColor,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    minHeight: 28,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  text: {
    ...typography.small,
  },
});