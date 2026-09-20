import React from 'react';

import {
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import {
  spacing,
  typography,
  useTheme,
} from '../theme';

type SectionProps = {
  title?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
};

export function Section({
  title,
  actionLabel,
  onActionPress,
  children,
  style,
}: SectionProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      {(title || actionLabel) && (
        <View style={styles.header}>
          {title ? (
            <Text
              style={[
                styles.title,
                {
                  color: colors.text,
                },
              ]}
            >
              {title}
            </Text>
          ) : (
            <View />
          )}

          {actionLabel && onActionPress ? (
            <Text
              onPress={onActionPress}
              style={[
                styles.action,
                {
                  color: colors.primary,
                },
              ]}
            >
              {actionLabel}
            </Text>
          ) : null}
        </View>
      )}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.section,
  },

  header: {
    minHeight: 32,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  title: {
    ...typography.h3,
  },

  action: {
    ...typography.caption,
    fontWeight: '600',
  },
});