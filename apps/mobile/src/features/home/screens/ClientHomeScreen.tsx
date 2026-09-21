import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Geolocation from '@react-native-community/geolocation';

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

import {useNavigation} from '@react-navigation/native';

import {
  discoverWorkers,
  DiscoveryWorker,
} from '../../client/discovery.api';

const categories = [
  'Industrial',
  'Security',
  'Domestic',
  'Technical',
];

export function ClientHomeScreen() {
  const {colors} = useTheme();
  const {user} = useAuth();
  const navigation = useNavigation();

  const [nearbyWorkers, setNearbyWorkers] =
    useState<DiscoveryWorker[]>([]);

  const [nearbyLoading, setNearbyLoading] =
    useState(true);

  const requestLocationPermission =
    async (): Promise<boolean> => {
      if (Platform.OS !== 'android') {
        return true;
      }

      const fineGranted =
        await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS
            .ACCESS_FINE_LOCATION,
        );

      const coarseGranted =
        await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS
            .ACCESS_COARSE_LOCATION,
        );

      if (fineGranted || coarseGranted) {
        return true;
      }

      const granted =
        await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS
            .ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS
            .ACCESS_COARSE_LOCATION,
        ]);

      return (
        granted[
          PermissionsAndroid.PERMISSIONS
            .ACCESS_FINE_LOCATION
        ] === PermissionsAndroid.RESULTS.GRANTED ||
        granted[
          PermissionsAndroid.PERMISSIONS
            .ACCESS_COARSE_LOCATION
        ] === PermissionsAndroid.RESULTS.GRANTED
      );
    };

  const loadNearbyWorkers = useCallback(
    async (
      latitude: number,
      longitude: number,
    ) => {
      try {
        const response =
          await discoverWorkers({
            available: true,
            verified: true,
            latitude,
            longitude,
            radiusKm: 10,
          });

        setNearbyWorkers(
          response.workers.slice(0, 5),
        );
      } catch {
        setNearbyWorkers([]);
      } finally {
        setNearbyLoading(false);
      }
    },
    [],
  );

  const loadHomeLocation = useCallback(
    async () => {
      try {
        const permitted =
          await requestLocationPermission();

        if (!permitted) {
          setNearbyLoading(false);
          return;
        }

        Geolocation.getCurrentPosition(
          position => {
            loadNearbyWorkers(
              position.coords.latitude,
              position.coords.longitude,
            );
          },
          () => {
            setNearbyLoading(false);
          },
          {
            enableHighAccuracy: false,
            timeout: 30000,
            maximumAge: 30000,
          },
        );
      } catch {
        setNearbyLoading(false);
      }
    },
    [loadNearbyWorkers],
  );

  useEffect(() => {
    loadHomeLocation();
  }, [loadHomeLocation]);

  if (!user) {
    return null;
  }

  const openDiscovery = () => {
    navigation.navigate(
      'Discover' as never,
    );
  };

  return (
    <Screen scroll>
      <HomeHeader user={user} />

      <Section title="Quick Actions">
        <QuickActionCard
          icon="search"
          title="Find a Worker"
          description="Search trusted workers by skill and location."
          onPress={openDiscovery}
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
              onPress={openDiscovery}
              style={styles.categoryCard}>
              <Text
                style={[
                  styles.categoryText,
                  {
                    color: colors.text,
                  },
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
        onActionPress={openDiscovery}>
        {nearbyLoading ? (
          <Card>
            <View style={styles.nearbyLoading}>
              <ActivityIndicator
                color={colors.primary}
              />

              <Text
                style={[
                  styles.loadingText,
                  {
                    color:
                      colors.textSecondary,
                  },
                ]}>
                Finding nearby workers...
              </Text>
            </View>
          </Card>
        ) : nearbyWorkers.length === 0 ? (
          <Card>
            <EmptyState
              icon="people-outline"
              title="No workers nearby"
              description="Verified workers available in your area will appear here."
            />
          </Card>
        ) : (
          <View style={styles.nearbyList}>
            {nearbyWorkers.map(worker => (
              <NearbyWorkerCard
                key={worker.id}
                worker={worker}
                colors={colors}
                onPress={openDiscovery}
              />
            ))}
          </View>
        )}
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

function NearbyWorkerCard({
  worker,
  colors,
  onPress,
}: {
  worker: DiscoveryWorker;
  colors: any;
  onPress: () => void;
}) {
  return (
    <Card>
      <View style={styles.workerHeader}>
        <View
          style={[
            styles.avatar,
            {
              backgroundColor:
                colors.primary,
            },
          ]}>
          <Text
            style={[
              styles.avatarText,
              {
                color:
                  colors.onPrimary,
              },
            ]}>
            {getInitials(worker.name)}
          </Text>
        </View>

        <View style={styles.workerInfo}>
          <View style={styles.nameRow}>
            <Text
              numberOfLines={1}
              style={[
                styles.workerName,
                {
                  color: colors.text,
                },
              ]}>
              {worker.name ||
                'Worko Worker'}
            </Text>

            {worker.verified ? (
              <View
                style={[
                  styles.verifiedBadge,
                  {
                    backgroundColor:
                      colors.primary,
                  },
                ]}>
                <Text
                  style={[
                    styles.verifiedText,
                    {
                      color:
                        colors.onPrimary,
                    },
                  ]}>
                  ✓
                </Text>
              </View>
            ) : null}
          </View>

          <Text
            style={[
              styles.workerAvailability,
              {
                color:
                  colors.textSecondary,
              },
            ]}>
            Available for work
          </Text>
        </View>
      </View>

      <View style={styles.nearbyMeta}>
        {worker.distanceKm !== null ? (
          <Text
            style={[
              styles.metaText,
              {
                color:
                  colors.textSecondary,
              },
            ]}>
            {worker.distanceKm} km away
          </Text>
        ) : null}

        {worker.experienceYears !== null ? (
          <Text
            style={[
              styles.metaText,
              {
                color:
                  colors.textSecondary,
              },
            ]}>
            {worker.experienceYears} yrs exp.
          </Text>
        ) : null}
      </View>

      {worker.skills.length > 0 ? (
        <Text
          numberOfLines={1}
          style={[
            styles.workerSkills,
            {
              color:
                colors.textSecondary,
            },
          ]}>
          {worker.skills
            .slice(0, 3)
            .map(item => item.name)
            .join(' • ')}
        </Text>
      ) : null}

      <Pressable
        onPress={onPress}
        style={[
          styles.workerButton,
          {
            backgroundColor:
              colors.primary,
          },
        ]}>
        <Text
          style={[
            styles.workerButtonText,
            {
              color:
                colors.onPrimary,
            },
          ]}>
          View Workers
        </Text>
      </Pressable>
    </Card>
  );
}

function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return 'W';
  }

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();
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

  nearbyList: {
    gap: spacing.md,
  },

  nearbyLoading: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },

  loadingText: {
    ...typography.small,
  },

  workerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    ...typography.bodyMedium,
  },

  workerInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  workerName: {
    flex: 1,
    ...typography.bodyMedium,
  },

  verifiedBadge: {
    width: 19,
    height: 19,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
  },

  workerAvailability: {
    ...typography.small,
    marginTop: 2,
  },

  nearbyMeta: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },

  metaText: {
    ...typography.small,
  },

  workerSkills: {
    ...typography.small,
    marginTop: spacing.sm,
  },

  workerButton: {
    minHeight: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },

  workerButtonText: {
    ...typography.small,
  },
});