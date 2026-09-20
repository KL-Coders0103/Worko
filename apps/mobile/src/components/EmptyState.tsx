import React from 'react';

import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Ionicons from '@react-native-vector-icons/ionicons';

import {
  spacing,
  typography,
  useTheme,
} from '../theme';

type EmptyStateProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
};

export function EmptyState({
  icon,
  title,
  description,
}: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: colors.surfaceSecondary,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={24}
          color={colors.textSecondary}
        />
      </View>

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

      <Text
        style={[
          styles.description,
          {
            color: colors.textSecondary,
          },
        ]}
      >
        {description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },

  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },

  title: {
    ...typography.bodyMedium,
    textAlign: 'center',
  },

  description: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.xs,
    maxWidth: 280,
  },
});