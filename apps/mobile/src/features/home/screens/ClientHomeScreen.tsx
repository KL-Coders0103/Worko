import React from 'react';

import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {useAuth} from '../../../context/AuthContext';

import {HomeHeader} from '../components/HomeHeader';
import {QuickActionCard} from '../components/QuickActionCard';

import {
  spacing,
  typography,
  useTheme,
} from '../../../theme';

import {Screen} from '../../../components/Screen';
import {Section} from '../../../components/Section';
import {Card} from '../../../components/Card';
import {EmptyState} from '../../../components/EmptyState';

const categories = [
  'Industrial',
  'Security',
  'Domestic',
  'Technical',
];

export function ClientHomeScreen() {
  const {colors} = useTheme();
  const {user} = useAuth();

  if (!user) {
    return null;
  }

  return (
    <Screen scroll>
      <HomeHeader user={user} />

      <Section title="Quick Actions">
        <QuickActionCard
          icon="search"
          title="Find a Worker"
          description="Search trusted workers by skill and location."
          onPress={() => {}}
        />

        <View style={styles.actionSpacing} />

        <QuickActionCard
          icon="calendar-outline"
          title="My Bookings"
          description="View your upcoming and active bookings."
          onPress={() => {}}
        />

        <View style={styles.actionSpacing} />

        <QuickActionCard
          icon="play-circle-outline"
          title="Explore Worko Reels"
          description="Discover workers and see their work."
          onPress={() => {}}
        />
      </Section>

      <Section title="Categories">
        <View style={styles.categoryGrid}>
          {categories.map(category => (
            <Card
              key={category}
              onPress={() => {}}
              style={styles.categoryCard}>
              <Text
                style={[
                  styles.categoryText,
                  {color: colors.text},
                ]}>
                {category}
              </Text>
            </Card>
          ))}
        </View>
      </Section>

      <Section
        title="Nearby Workers"
        actionLabel="View all"
        onActionPress={() => {}}>
        <Card>
          <EmptyState
            icon="people-outline"
            title="No workers nearby"
            description="Verified workers available in your area will appear here."
          />
        </Card>
      </Section>

      <Section title="Worko Reels">
        <Card>
          <EmptyState
            icon="play-circle-outline"
            title="No reels yet"
            description="Discover work reels and professional profiles here."
          />
        </Card>
      </Section>

      <Section
        title="Bookings"
        actionLabel="View all"
        onActionPress={() => {}}>
        <Card>
          <EmptyState
            icon="calendar-outline"
            title="No bookings yet"
            description="Your upcoming and active bookings will appear here."
          />
        </Card>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionSpacing: {
    height: spacing.md,
  },

  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },

  categoryCard: {
    width: '47%',
    minHeight: 88,
    justifyContent: 'center',
  },

  categoryText: {
    ...typography.bodyMedium,
  },
});