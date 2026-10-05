import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { useWorkoTheme } from '../../design-system/ThemeProvider';
import type { WorkerTabParamList } from '../../navigation/types';
import { apiRequest } from '../../services/api/client';
import { createMatchingSocket, subscribeToMatchingSocket } from '../../services/matching/matchingSocket';

type DashboardPayload = {
  worker: {
    id: string;
    displayName: string;
    verificationStatus: string;
    availabilityStatus: 'OFFLINE' | 'AVAILABLE' | 'BUSY';
    preferredRadiusKm: number;
    profileCompletion: number;
    categoryCount: number;
  };
  counts: {
    newOffers: number;
    activeJobs: number;
    completedJobs: number;
  };
  wallet: {
    balance: number | null;
    currency: string;
    available: boolean;
  };
  offers: Array<{
    id: string;
    offeredAt: string;
    expiresAt: string;
    requirement: {
      id: string;
      title: string;
      description: string;
      address: string;
      scheduledAt: string | null;
      budget: number | string | null;
      currency: string;
      category: { name: string; slug: string };
    };
  }>;
  activeJob: {
    id: string;
    status: string;
    createdAt: string;
    startedAt: string | null;
    requirement: {
      id: string;
      title: string;
      description: string;
      address: string;
      scheduledAt: string | null;
      budget: number | string | null;
      currency: string;
      category: { name: string; slug: string };
    };
  } | null;
};

const ORANGE = '#FF6B00';
const GREEN = '#0A9F3D';
const BLUE = '#1688E8';
const PURPLE = '#7A3FF2';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning,';
  if (hour < 17) return 'Good Afternoon,';
  return 'Good Evening,';
}

function money(value: number | string | null, currency = 'INR') {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('') || 'W';
}

export function WorkerDashboardScreen() {
  const { theme } = useWorkoTheme();
  const navigation = useNavigation<BottomTabNavigationProp<WorkerTabParamList>>();
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [availabilityBusy, setAvailabilityBusy] = useState(false);

  const loadDashboard = useCallback(async () => {
    const token = await AsyncStorage.getItem('worko.accessToken');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await apiRequest('/worker/dashboard', {
        headers: { Authorization: 'Bearer ' + token },
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok && payload?.data) {
        setDashboard(payload.data as DashboardPayload);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
    const timer = setInterval(() => void loadDashboard(), 10000);
    return () => clearInterval(timer);
  }, [loadDashboard]);

  useEffect(() => {
    let socket: Awaited<ReturnType<typeof createMatchingSocket>> | null = null;
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    const connect = async () => {
      socket = await createMatchingSocket();
      if (cancelled || !socket) return;
      unsubscribe = subscribeToMatchingSocket(socket, {
        offer: () => void loadDashboard(),
        offerExpired: () => void loadDashboard(),
        offerRejected: () => void loadDashboard(),
      });
    };

    void connect();
    return () => {
      cancelled = true;
      unsubscribe?.();
      socket?.disconnect();
    };
  }, [loadDashboard]);

  const setAvailability = async (available: boolean) => {
    if (availabilityBusy || !dashboard) return;
    const token = await AsyncStorage.getItem('worko.accessToken');
    if (!token) return;

    setAvailabilityBusy(true);
    try {
      const response = await apiRequest('/worker/availability', {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ available }),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        setDashboard(current =>
          current
            ? {
                ...current,
                worker: {
                  ...current.worker,
                  availabilityStatus: payload?.data?.availabilityStatus ?? (available ? 'AVAILABLE' : 'OFFLINE'),
                },
              }
            : current,
        );
        void loadDashboard();
      }
    } finally {
      setAvailabilityBusy(false);
    }
  };

  const isAvailable = dashboard?.worker.availabilityStatus === 'AVAILABLE';
  const isBusy = dashboard?.worker.availabilityStatus === 'BUSY';
  const offerCount = dashboard?.counts.newOffers ?? 0;
  const activeJob = dashboard?.activeJob;
  const displayName = dashboard?.worker.displayName ?? 'Worker';
  const topOffers = useMemo(() => dashboard?.offers.slice(0, 2) ?? [], [dashboard]);

  if (loading && !dashboard) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={ORANGE} />
        <Text style={[styles.loadingText, { color: theme.secondaryText }]}>Loading your dashboard…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void loadDashboard();
          }}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.brand}>Worko</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          onPress={() => navigation.navigate('Requests')}
          style={styles.notificationButton}
        >
          <Text style={styles.bell}>♧</Text>
          {offerCount > 0 ? <View style={styles.notificationDot} /> : null}
        </Pressable>
      </View>

      <View style={styles.profileRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(displayName)}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.greeting, { color: theme.secondaryText }]}>{greeting()}</Text>
          <Text style={[styles.name, { color: theme.text }]}>{displayName}</Text>
          <View style={styles.verifiedRow}>
            <View style={styles.verifiedDot}><Text style={styles.check}>✓</Text></View>
            <Text style={[styles.verifiedText, { color: theme.secondaryText }]}>
              {dashboard?.worker.verificationStatus === 'VERIFIED' ? 'Verified Worker' : 'Verification Pending'}
            </Text>
          </View>
        </View>
      </View>

      <View style={[
        styles.availabilityCard,
        { backgroundColor: isAvailable ? '#F1FAF4' : '#F4F5F7', borderColor: isAvailable ? '#DDF1E3' : '#E4E6EA' },
      ]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.availabilityTitle, { color: theme.text }]}>
            {isBusy ? 'You are Busy' : isAvailable ? 'You are Available' : 'You are Unavailable'}
          </Text>
          <Text style={[styles.availabilitySubtitle, { color: theme.secondaryText }]}>
            {isBusy ? 'Finish your active job to receive new offers.' : isAvailable ? 'You can receive eligible work offers from nearby clients.' : 'You will not receive new offers while unavailable.'}
          </Text>
        </View>
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: isAvailable }}
          disabled={availabilityBusy || isBusy}
          onPress={() => void setAvailability(!isAvailable)}
          style={[styles.switch, isAvailable && styles.switchOn, availabilityBusy && { opacity: 0.6 }]}
        >
          <View style={[styles.switchKnob, isAvailable && styles.switchKnobOn]} />
        </Pressable>
      </View>

      <View style={styles.statsGrid}>
        <StatCard icon="▣" iconColor={ORANGE} value={String(offerCount)} label="New Offers" tint="#FFF6EF" theme={theme} />
        <StatCard icon="▶" iconColor={PURPLE} value={String(dashboard?.counts.activeJobs ?? 0)} label="Active Job" tint="#F7F2FF" theme={theme} />
        <StatCard
          icon="▰"
          iconColor={GREEN}
          value={dashboard?.wallet.available ? money(dashboard.wallet.balance, dashboard.wallet.currency) : '—'}
          label="Wallet Balance"
          tint="#F0FAF3"
          theme={theme}
        />
        <StatCard icon="≋" iconColor={BLUE} value={(dashboard?.worker.profileCompletion ?? 0) + '%'} label="Profile Complete" tint="#F2F8FF" theme={theme} />
      </View>

      {topOffers.length > 0 ? (
        <SectionHeader title="Incoming Offers" action="View All" onPress={() => navigation.navigate('Requests')} theme={theme} />
      ) : null}

      {topOffers.map(offer => (
        <View key={offer.id} style={[styles.offerCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.offerIcon}>
            <Text style={styles.offerIconText}>⌂</Text>
          </View>
          <View style={styles.offerBody}>
            <View style={styles.offerTitleRow}>
              <Text style={[styles.offerTitle, { color: theme.text }]} numberOfLines={1}>{offer.requirement.title}</Text>
              <Text style={[styles.offerTime, { color: theme.secondaryText }]}>{relativeTime(offer.offeredAt)}</Text>
            </View>
            <Text style={[styles.offerCategory, { color: theme.text }]}>{offer.requirement.category.name}</Text>
            <Text style={[styles.offerAddress, { color: theme.secondaryText }]} numberOfLines={1}>⌖ {offer.requirement.address}</Text>
            {offer.requirement.budget != null ? (
              <Text style={[styles.offerBudget, { color: theme.text }]}>
                {money(offer.requirement.budget, offer.requirement.currency)}
              </Text>
            ) : null}
          </View>
          <Pressable onPress={() => navigation.navigate('Requests')} style={styles.arrowButton}>
            <Text style={styles.arrowText}>›</Text>
          </Pressable>
        </View>
      ))}

      {topOffers.length === 0 && !activeJob ? (
        <View style={[styles.emptyCard, { backgroundColor: '#F2F8FF', borderColor: '#E1EDF8' }]}>
          <Text style={styles.emptyIcon}>✉</Text>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No Offers Right Now</Text>
          <Text style={[styles.emptySubtitle, { color: theme.secondaryText }]}>
            We'll notify you when new eligible work offers are available in your area.
          </Text>
          <Pressable onPress={() => navigation.navigate('Reels')} style={styles.outlineButton}>
            <Text style={styles.outlineButtonText}>Explore Reels</Text>
          </Pressable>
        </View>
      ) : null}

      {activeJob ? (
        <>
          <SectionHeader title="Active Job" action="View All" onPress={() => navigation.navigate('Requests')} theme={theme} />
          <View style={[styles.activeCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.activeIcon}><Text style={styles.activeIconText}>⌂</Text></View>
            <View style={styles.activeBody}>
              <View style={styles.activeStatus}><Text style={styles.activeStatusText}>{activeJob.status === 'IN_PROGRESS' ? 'In Progress' : 'Confirmed'}</Text></View>
              <Text style={[styles.activeTitle, { color: theme.text }]} numberOfLines={1}>{activeJob.requirement.title}</Text>
              <Text style={[styles.offerAddress, { color: theme.secondaryText }]} numberOfLines={1}>⌖ {activeJob.requirement.address}</Text>
            </View>
          </View>
          <View style={styles.activeActions}>
            <Pressable onPress={() => navigation.navigate('Requests')} style={styles.secondaryAction}>
              <Text style={styles.secondaryActionText}>View Details</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('Requests')} style={styles.primaryAction}>
              <Text style={styles.primaryActionText}>Open Job</Text>
            </Pressable>
          </View>
        </>
      ) : null}

      <SectionHeader title="Quick Actions" theme={theme} />
      <View style={styles.quickGrid}>
        <QuickAction icon="▶" label="Create Reel" onPress={() => navigation.navigate('Reels')} />
        <QuickAction icon="✎" label="Edit Profile" onPress={() => navigation.navigate('Profile')} />
        <QuickAction icon="▣" label="My Earnings" onPress={() => navigation.navigate('Profile')} />
        <QuickAction icon="?" label="Help & Support" onPress={() => navigation.navigate('Profile')} />
      </View>

      {!isAvailable && !isBusy ? (
        <View style={styles.goAvailableCard}>
          <Text style={[styles.goAvailableTitle, { color: theme.text }]}>Turn on availability to start receiving work offers.</Text>
          <Pressable onPress={() => void setAvailability(true)} style={styles.goAvailableButton}>
            <Text style={styles.goAvailableText}>Go Available</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

function StatCard({
  icon,
  iconColor,
  value,
  label,
  tint,
  theme,
}: {
  icon: string;
  iconColor: string;
  value: string;
  label: string;
  tint: string;
  theme: ReturnType<typeof useWorkoTheme>['theme'];
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.statIcon, { backgroundColor: tint }]}>
        <Text style={[styles.statIconText, { color: iconColor }]}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.statValue, { color: theme.text }]} numberOfLines={1}>{value}</Text>
        <Text style={[styles.statLabel, { color: theme.secondaryText }]}>{label}</Text>
      </View>
    </View>
  );
}

function SectionHeader({
  title,
  action,
  onPress,
  theme,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
  theme: ReturnType<typeof useWorkoTheme>['theme'];
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      {action && onPress ? (
        <Pressable onPress={onPress}>
          <Text style={styles.viewAll}>{action} ›</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function QuickAction({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.quickAction}>
      <View style={styles.quickIcon}><Text style={styles.quickIconText}>{icon}</Text></View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

function relativeTime(date: string) {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + ' mins ago';
  const hours = Math.floor(minutes / 60);
  return hours + ' hrs ago';
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  brand: {
    color: ORANGE,
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: -1,
  },
  notificationButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bell: {
    fontSize: 23,
    color: '#111827',
  },
  notificationDot: {
    position: 'absolute',
    top: 5,
    right: 6,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#F04438',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 17,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFE4D3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  avatarText: {
    color: ORANGE,
    fontSize: 20,
    fontWeight: '900',
  },
  profileInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: 13,
    marginBottom: 1,
  },
  name: {
    fontSize: 19,
    fontWeight: '900',
    marginBottom: 4,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedDot: {
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
  },
  check: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '900',
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  availabilityCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  availabilityTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 3,
  },
  availabilitySubtitle: {
    fontSize: 12,
    lineHeight: 18,
    paddingRight: 10,
  },
  switch: {
    width: 51,
    height: 30,
    borderRadius: 16,
    backgroundColor: '#AEB7C5',
    padding: 3,
    justifyContent: 'center',
  },
  switchOn: {
    backgroundColor: '#0DB63D',
  },
  switchKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF',
    alignSelf: 'flex-start',
  },
  switchKnobOn: {
    alignSelf: 'flex-end',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statCard: {
    width: '48.5%',
    minHeight: 67,
    borderWidth: 1,
    borderRadius: 13,
    padding: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconText: {
    fontSize: 18,
    fontWeight: '900',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 10,
    marginTop: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 7,
    marginBottom: 9,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  viewAll: {
    color: ORANGE,
    fontSize: 12,
    fontWeight: '800',
  },
  offerCard: {
    borderWidth: 1,
    borderRadius: 15,
    padding: 9,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
  },
  offerIcon: {
    width: 61,
    height: 70,
    borderRadius: 12,
    backgroundColor: '#F4E6DA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  offerIconText: {
    color: ORANGE,
    fontSize: 25,
    fontWeight: '900',
  },
  offerBody: {
    flex: 1,
    minWidth: 0,
  },
  offerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  offerTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '900',
  },
  offerTime: {
    fontSize: 9,
  },
  offerCategory: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  offerAddress: {
    fontSize: 11,
    marginTop: 5,
  },
  offerBudget: {
    fontSize: 14,
    fontWeight: '900',
    marginTop: 5,
  },
  arrowButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 7,
  },
  arrowText: {
    color: '#FFF',
    fontSize: 27,
    lineHeight: 28,
    fontWeight: '300',
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 18,
    paddingVertical: 20,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 10,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 5,
    color: ORANGE,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 4,
  },
  emptySubtitle: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    maxWidth: 290,
  },
  outlineButton: {
    marginTop: 13,
    minWidth: 170,
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButtonText: {
    color: ORANGE,
    fontWeight: '900',
    fontSize: 12,
  },
  activeCard: {
    borderWidth: 1,
    borderRadius: 15,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeIcon: {
    width: 61,
    height: 70,
    borderRadius: 12,
    backgroundColor: '#E8F4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  activeIconText: {
    color: BLUE,
    fontSize: 25,
    fontWeight: '900',
  },
  activeBody: {
    flex: 1,
  },
  activeStatus: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5F7EA',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginBottom: 4,
  },
  activeStatusText: {
    color: GREEN,
    fontSize: 10,
    fontWeight: '900',
  },
  activeTitle: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 3,
  },
  activeActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  secondaryAction: {
    flex: 1,
    minHeight: 43,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    color: ORANGE,
    fontWeight: '900',
    fontSize: 12,
  },
  primaryAction: {
    flex: 1,
    minHeight: 43,
    borderRadius: 10,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 12,
  },
  quickGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  quickAction: {
    width: '23%',
    alignItems: 'center',
  },
  quickIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#F4F6FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  quickIconText: {
    color: ORANGE,
    fontSize: 19,
    fontWeight: '900',
  },
  quickLabel: {
    fontSize: 10,
    color: '#4B5563',
    textAlign: 'center',
    fontWeight: '700',
  },
  goAvailableCard: {
    backgroundColor: '#EEF6FF',
    borderRadius: 15,
    padding: 13,
    marginTop: 13,
    alignItems: 'center',
  },
  goAvailableTitle: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 9,
  },
  goAvailableButton: {
    minWidth: 170,
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goAvailableText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '900',
  },
});
