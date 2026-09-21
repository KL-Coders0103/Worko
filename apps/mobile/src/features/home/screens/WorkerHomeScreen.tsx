import React from 'react';

import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuth } from '../../../context/AuthContext';
import { HomeHeader } from '../components/HomeHeader';
import { QuickActionCard } from '../components/QuickActionCard';
import {
  useNavigation,
} from '@react-navigation/native';

import type {
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';

import type {
  AppStackParamList,
} from '../../../navigation/AppNavigator';
import {
  spacing,
  typography,
  useTheme,
} from '../../../theme';
import { Screen } from '../../../components/Screen';
import { Section } from '../../../components/Section';
import { Card } from '../../../components/Card';
import { EmptyState } from '../../../components/EmptyState';


export function WorkerHomeScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  if (!user) {
    return null;
  }

  return (
    <Screen scroll>
      <HomeHeader user={user} />

      <Section title="Quick Actions">
        <QuickActionCard
          icon="person-outline"
          title="Complete Your Profile"
          description="Add your work details, skills and location."
          onPress={() =>
            navigation.navigate('WorkerOnboarding')
          }
        />

        <View style={styles.actionSpacing} />

        <QuickActionCard
          icon="search"
          title="Find Nearby Jobs"
          description="Explore available work near your location."
          onPress={() => {}}
        />

        <View style={styles.actionSpacing} />

        <QuickActionCard
          icon="calendar-outline"
          title="Manage Availability"
          description="Set when you are available for work."
          onPress={() => {}}
        />

        <View style={styles.actionSpacing} />

        <QuickActionCard
          icon="briefcase-outline"
          title="My Bookings"
          description="View your upcoming and active work."
          onPress={() => {}}
        />
      </Section>

      <Section title="Today's Earnings">
        <Card>
          <Text
            style={[
              styles.amount,
              {
                color: colors.text,
              },
            ]}
          >
            ₹0
          </Text>

          <Text
            style={[
              styles.secondaryText,
              {
                color: colors.textSecondary,
              },
            ]}
          >
            Earnings from completed work today
          </Text>
        </Card>
      </Section>

      <Section
        title="Nearby Jobs"
        actionLabel="View all"
        onActionPress={() => {}}
      >
        <Card>
          <EmptyState
            icon="briefcase-outline"
            title="No nearby jobs yet"
            description="Available jobs will appear here when matching work is available."
          />
        </Card>
      </Section>

      <Section
        title="Recommended Jobs"
        actionLabel="View all"
        onActionPress={() => {}}
      >
        <Card>
          <EmptyState
            icon="sparkles-outline"
            title="No recommendations yet"
            description="Recommendations will appear after your profile and skills are set up."
          />
        </Card>
      </Section>

      <Section title="Worko Reels">
        <Card>
          <EmptyState
            icon="play-circle-outline"
            title="No reels yet"
            description="Work-related reels will appear here."
          />
        </Card>
      </Section>

      <Section title="Performance">
        <View style={styles.performanceRow}>
          <Card style={styles.performanceCard}>
            <Text
              style={[
                styles.performanceValue,
                {
                  color: colors.text,
                },
              ]}
            >
              0
            </Text>

            <Text
              style={[
                styles.secondaryText,
                {
                  color: colors.textSecondary,
                },
              ]}
            >
              Jobs
            </Text>
          </Card>

          <Card style={styles.performanceCard}>
            <Text
              style={[
                styles.performanceValue,
                {
                  color: colors.text,
                },
              ]}
            >
              0.0
            </Text>

            <Text
              style={[
                styles.secondaryText,
                {
                  color: colors.textSecondary,
                },
              ]}
            >
              Rating
            </Text>
          </Card>
        </View>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionSpacing: {
    height: spacing.md,
  },

  amount: {
    ...typography.display,
  },

  secondaryText: {
    ...typography.caption,
    marginTop: spacing.xs,
  },

  performanceRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },

  performanceCard: {
    flex: 1,
  },

  performanceValue: {
    ...typography.h2,
  },
});