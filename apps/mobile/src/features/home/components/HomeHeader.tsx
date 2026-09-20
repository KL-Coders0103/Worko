import React from 'react';

import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  spacing,
  typography,
  useTheme,
} from '../../../theme';

import type {
  AuthUser,
} from '../../../context/AuthContext';

type HomeHeaderProps = {
  user: AuthUser;
  workerOnline?: boolean;
};

function getGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Good morning';
  }

  if (hour < 17) {
    return 'Good afternoon';
  }

  if (hour < 21) {
    return 'Good evening';
  }

  return 'Good night';
}

export function HomeHeader({
  user,
  workerOnline = true,
}: HomeHeaderProps) {
  const { colors } = useTheme();

  const firstName =
    user.firstName?.trim() || 'there';

  return (
    <View style={styles.container}>
      <View style={styles.greetingContainer}>
        <Text
          style={[
            styles.greeting,
            {
              color: colors.textSecondary,
            },
          ]}
        >
          {getGreeting()}
        </Text>

        <Text
          style={[
            styles.name,
            {
              color: colors.text,
            },
          ]}
          numberOfLines={1}
        >
          {firstName}
        </Text>
      </View>

      {user.role === 'WORKER' ? (
        <View
          style={[
            styles.status,
            {
              backgroundColor:
                colors.surfaceSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: workerOnline
                  ? colors.success
                  : colors.textSecondary,
              },
            ]}
          />

          <Text
            style={[
              styles.statusText,
              {
                color: colors.text,
              },
            ]}
          >
            {workerOnline
              ? 'ONLINE'
              : 'OFFLINE'}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.md,
    marginBottom: spacing.xxxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  greetingContainer: {
    flex: 1,
    marginRight: spacing.md,
  },

  greeting: {
    ...typography.body,
  },

  name: {
    ...typography.h1,
    marginTop: spacing.xs,
  },

  status: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },

  statusText: {
    ...typography.small,
    fontWeight: '700',
  },
});