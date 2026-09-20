import React from 'react';

import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Ionicons from '@react-native-vector-icons/ionicons';

import {
  Card,
} from '../../../components/Card';

import {
  radius,
  spacing,
  typography,
  useTheme,
} from '../../../theme';

type QuickActionCardProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
  onPress?: () => void;
};

export function QuickActionCard({
  icon,
  title,
  description,
  onPress,
}: QuickActionCardProps) {
  const { colors } = useTheme();

  return (
    <Card
      onPress={onPress}
      style={styles.card}
    >
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: colors.primary,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={22}
          color={colors.primary}
        />
      </View>

      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            {
              color: colors.text,
            },
          ]}
          numberOfLines={1}
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
          numberOfLines={2}
        >
          {description}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={20}
        color={colors.textSecondary}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 88,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },

  content: {
    flex: 1,
    marginRight: spacing.sm,
  },

  title: {
    ...typography.bodyMedium,
  },

  description: {
    ...typography.small,
    marginTop: spacing.xs,
  },
});