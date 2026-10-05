import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { useWorkoTheme } from '../design-system/ThemeProvider';
import { ClientHomeScreen, ClientCategoriesScreen } from '../screens/client/ClientHomeScreens';
import { ClientReelsScreen } from '../screens/client/ClientReelsScreen';
import { SavedReelsScreen } from '../screens/client/SavedReelsScreen';
import { RequirementCreationScreen } from '../screens/client/RequirementCreationScreen';
import { ClientBookingFlowScreen } from '../screens/client/ClientBookingFlowScreen';
import { ClientWalletScreen } from '../screens/client/ClientWalletScreen';
import type { ClientTabParamList, WorkerTabParamList } from './types';
import { apiRequest } from '../services/api/client';
import { createMatchingSocket, subscribeToMatchingSocket, type MatchingOfferEvent } from '../services/matching/matchingSocket';
import { WorkerDashboardScreen } from '../screens/worker/WorkerDashboardScreen';
import { AvailabilityControlScreen } from '../screens/worker/AvailabilityControlScreen';
import { WorkPreferencesScreen } from '../screens/worker/WorkPreferencesScreen';
import { WorkerNoOffersScreen } from '../screens/worker/WorkerNoOffersScreen';
import { WorkerIncomingOfferScreen } from '../screens/worker/WorkerIncomingOfferScreen';
import { WorkerOfferDetailScreen } from '../screens/worker/WorkerOfferDetailScreen';
import { WorkerJobFlowScreen } from '../screens/worker/WorkerJobFlowScreen';
import { WorkerAccountFlowScreen } from '../screens/worker/WorkerAccountFlowScreen';
import { AccountManagementScreen } from '../screens/client/AccountManagementScreen';

const ClientTabs = createBottomTabNavigator<ClientTabParamList>();
const WorkerTabs = createBottomTabNavigator<WorkerTabParamList>();

type WorkerOffer = {
  id: string;
  status: string;
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
};

function ScreenShell({ title, subtitle, children }: React.PropsWithChildren<{ title: string; subtitle: string }>) {
  const { theme } = useWorkoTheme();
  return <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={styles.content}>
    <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
    <Text style={[styles.subtitle, { color: theme.secondaryText }]}>{subtitle}</Text>
    {children}
  </ScrollView>;
}

function ActionCard({ title, description }: { title: string; description: string }) {
  const { theme } = useWorkoTheme();
  return <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
    <Text style={[styles.cardTitle, { color: theme.text }]}>{title}</Text>
    <Text style={[styles.subtitle, { color: theme.secondaryText }]}>{description}</Text>
  </View>;
}

function ClientRequests({ accessToken }: { accessToken: string }) {
  return <RequirementCreationScreen accessToken={accessToken} />;
}

function ProfileScreen({ navigation, showSaved = false }: { navigation?: any; showSaved?: boolean }) {
  const { theme, mode, toggleMode } = useWorkoTheme();
  return <ScreenShell title="Profile" subtitle="Manage your Worko preferences.">
    <ActionCard title="Appearance" description={'Current theme: ' + (mode === 'dark' ? 'Dark' : 'Light')} />
    <Pressable accessibilityRole="button" onPress={toggleMode} style={[styles.toggle, { backgroundColor: theme.primary }]}>
      <Text style={styles.toggleText}>Switch to {mode === 'dark' ? 'light' : 'dark'} theme</Text>
    </Pressable>
    {showSaved ? <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Saved')} style={[styles.toggle, { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }]}>
      <Text style={{ color: theme.text, fontWeight: '800' }}>Saved reels  →</Text>
    </Pressable> : null}
    <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Bookings', { stage: 'list' })} style={[styles.toggle, { backgroundColor: theme.primary }]}>
      <Text style={styles.toggleText}>My bookings  →</Text>
    </Pressable>
    <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Account')} style={[styles.toggle, { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }]}>
      <Text style={{ color: theme.text, fontWeight: '800' }}>Notifications  →</Text>
    </Pressable>
    <ActionCard title="Account" description="Your profile and saved location are managed securely with your Worko account." />
  </ScreenShell>;
}

function WorkerRequests() {
  const { theme } = useWorkoTheme();
  const [offers, setOffers] = useState<WorkerOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyOfferId, setBusyOfferId] = useState<string | null>(null);

  const loadOffers = useCallback(async () => {
    const token = await AsyncStorage.getItem('worko.accessToken');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const response = await apiRequest('/worker/offers', { headers: { Authorization: 'Bearer ' + token } });
      const payload = await response.json().catch(() => ({}));
      if (response.ok && Array.isArray(payload?.data)) setOffers(payload.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOffers();
    const timer = setInterval(() => { void loadOffers(); }, 5000);
    return () => clearInterval(timer);
  }, [loadOffers]);

  const respond = async (offerId: string, action: 'accept' | 'reject') => {
    if (busyOfferId) return;
    const token = await AsyncStorage.getItem('worko.accessToken');
    if (!token) return;
    setBusyOfferId(offerId);
    try {
      const response = await apiRequest('/worker/offers/' + offerId + '/' + action, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || ('Unable to ' + action + ' offer.'));
      Alert.alert(action === 'accept' ? 'Booking confirmed' : 'Offer rejected', action === 'accept'
        ? 'You accepted the Worko request. The client can now see the confirmed booking.'
        : 'The request has been removed from your active offers.');
      await loadOffers();
    } catch (error) {
      Alert.alert(action === 'accept' ? 'Accept failed' : 'Reject failed', error instanceof Error ? error.message : 'Please try again.');
      await loadOffers();
    } finally {
      setBusyOfferId(null);
    }
  };

  return <View style={{ flex: 1, backgroundColor: theme.background }}>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: theme.text }]}>Work requests</Text>
      <Text style={[styles.subtitle, { color: theme.secondaryText }]}>New eligible opportunities arrive here in real time.</Text>
      {loading ? <ActionCard title="Loading offers…" description="Checking your active matching offers." /> : null}
      {!loading && offers.length === 0 ? <ActionCard title="Waiting for opportunities" description="Keep your worker status available. When Worko finds a matching requirement, this screen updates automatically." /> : null}
      {offers.map(offer => (
        <View key={offer.id} style={[styles.offerCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.offerHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{offer.requirement.title}</Text>
              <Text style={{ color: theme.primary, fontWeight: '800' }}>{offer.requirement.category.name}</Text>
            </View>
            <Text style={styles.offerBadge}>NEW</Text>
          </View>
          <Text style={[styles.offerDescription, { color: theme.secondaryText }]}>{offer.requirement.description || 'Work requirement'}</Text>
          <Text style={[styles.offerMeta, { color: theme.secondaryText }]}>📍 {offer.requirement.address || 'Location provided'}</Text>
          {offer.requirement.scheduledAt ? <Text style={[styles.offerMeta, { color: theme.secondaryText }]}>🗓 {new Date(offer.requirement.scheduledAt).toLocaleString()}</Text> : null}
          {offer.requirement.budget != null ? <Text style={[styles.offerBudget, { color: theme.text }]}>Budget: {offer.requirement.currency} {Number(offer.requirement.budget).toFixed(0)}</Text> : null}
          <Text style={[styles.offerExpiry, { color: theme.secondaryText }]}>Offer expires {new Date(offer.expiresAt).toLocaleTimeString()}</Text>
          <View style={styles.offerActions}>
            <Pressable disabled={busyOfferId === offer.id} onPress={() => { void respond(offer.id, 'reject'); }} style={[styles.rejectButton, busyOfferId === offer.id && { opacity: 0.5 }]}>
              <Text style={styles.rejectText}>Reject</Text>
            </Pressable>
            <Pressable disabled={busyOfferId === offer.id} onPress={() => { void respond(offer.id, 'accept'); }} style={[styles.acceptButton, busyOfferId === offer.id && { opacity: 0.5 }]}>
              <Text style={styles.acceptText}>{busyOfferId === offer.id ? 'Processing…' : 'Accept offer'}</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </ScrollView>
  </View>;
}

function WorkerReels() {
  return <ScreenShell title="Your reels" subtitle="Share examples of your work with the Worko community.">
    <ActionCard title="Create your portfolio" description="Reel publishing will be available when media upload and moderation are connected." />
  </ScreenShell>;
}

function WorkerMatchingBridge() {
  const navigation = useNavigation<BottomTabNavigationProp<WorkerTabParamList>>();
  useEffect(() => {
    let socket: Awaited<ReturnType<typeof createMatchingSocket>> | null = null;
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    const connect = async () => {
      socket = await createMatchingSocket();
      if (cancelled || !socket) return;
      unsubscribe = subscribeToMatchingSocket(socket, {
        offer: (offer: MatchingOfferEvent) => {
          navigation.navigate('IncomingOffer', { offerId: offer.offerId });
        },
      });
    };

    void connect();
    return () => {
      cancelled = true;
      unsubscribe?.();
      socket?.disconnect();
    };
  }, []);
  return null;
}

const tabOptions = (theme: ReturnType<typeof useWorkoTheme>['theme']) => ({
  headerShown: false,
  tabBarActiveTintColor: theme.primary,
  tabBarInactiveTintColor: theme.secondaryText,
  tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border, height: 62, paddingBottom: 7, paddingTop: 7 },
  tabBarLabelStyle: { fontSize: 11, fontWeight: '600' as const },
});

export function ClientAppNavigator({ route }: { route: { params: { accessToken: string } } }) {
  const { theme } = useWorkoTheme();
  return <ClientTabs.Navigator screenOptions={tabOptions(theme)}>
    <ClientTabs.Screen name="Home" options={{ tabBarLabel: 'Home', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 19 }}>⌂</Text> }}>
      {props => <ClientHomeScreen navigation={props.navigation} accessToken={route.params.accessToken} />}
    </ClientTabs.Screen>
    <ClientTabs.Screen name="Discover" component={ClientCategoriesScreen} options={{ tabBarLabel: 'Discover', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 19 }}>⌕</Text> }} />
    <ClientTabs.Screen name="Reels" options={{ tabBarLabel: 'Reels', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 19 }}>▷</Text> }}>
      {() => <ClientReelsScreen accessToken={route.params.accessToken} />}
    </ClientTabs.Screen>
    <ClientTabs.Screen name="Saved" options={{ tabBarLabel: 'Saved', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 19 }}>♡</Text> }}>
      {() => <SavedReelsScreen accessToken={route.params.accessToken} />}
    </ClientTabs.Screen>
    <ClientTabs.Screen name="Requests" options={{ tabBarLabel: 'Create', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 19 }}>＋</Text> }}>
      {() => <ClientRequests accessToken={route.params.accessToken} />}
    </ClientTabs.Screen>
    <ClientTabs.Screen name="Profile" options={{ tabBarLabel: 'Profile', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 19 }}>○</Text> }}>
      {props => <ProfileScreen navigation={props.navigation} showSaved />}
    </ClientTabs.Screen>
    <ClientTabs.Screen name="Bookings" component={ClientBookingFlowScreen} options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
    <ClientTabs.Screen name="Account" component={AccountManagementScreen} options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
  </ClientTabs.Navigator>;
}

export function WorkerAppNavigator() {
  const { theme } = useWorkoTheme();
  return <View style={{ flex: 1, backgroundColor: theme.background }}>
    <WorkerMatchingBridge />
    <WorkerTabs.Navigator screenOptions={tabOptions(theme)}>
      <WorkerTabs.Screen name="Dashboard" component={WorkerDashboardScreen} options={{ tabBarLabel: 'Home' }} />
      <WorkerTabs.Screen name="Availability" component={AvailabilityControlScreen} options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <WorkerTabs.Screen name="Preferences" component={WorkPreferencesScreen} options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <WorkerTabs.Screen name="NoOffers" component={WorkerNoOffersScreen} options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <WorkerTabs.Screen name="IncomingOffer" component={WorkerIncomingOfferScreen} options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <WorkerTabs.Screen name="OfferDetail" component={WorkerOfferDetailScreen} options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <WorkerTabs.Screen name="JobFlow" component={WorkerJobFlowScreen} options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <WorkerTabs.Screen name="WorkerAccount" component={WorkerAccountFlowScreen} options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <WorkerTabs.Screen name="WorkerWallet" component={ClientWalletScreen} options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <WorkerTabs.Screen name="Account" component={AccountManagementScreen} options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      <WorkerTabs.Screen name="Requests" component={WorkerRequests} options={{ tabBarLabel: 'Requests' }} />
      <WorkerTabs.Screen name="Reels" component={WorkerReels} options={{ tabBarLabel: 'Reels' }} />
      <WorkerTabs.Screen name="Profile" component={WorkerAccountFlowScreen} options={{ tabBarLabel: 'Profile' }} />
    </WorkerTabs.Navigator>
  </View>;
}

const styles = StyleSheet.create({
  content: { padding: 22, paddingBottom: 36 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '900', marginBottom: 7 },
  subtitle: { fontSize: 14, lineHeight: 21, marginBottom: 18 },
  card: { borderWidth: 1, borderRadius: 16, padding: 17, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 5 },
  toggle: { minHeight: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  toggleText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  offerCard: { borderWidth: 1, borderRadius: 18, padding: 17, marginBottom: 14 },
  offerHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  offerBadge: { color: '#FFF', backgroundColor: '#FF6B00', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, fontSize: 11, fontWeight: '900' },
  offerDescription: { fontSize: 14, lineHeight: 21, marginTop: 10 },
  offerMeta: { fontSize: 13, lineHeight: 20, marginTop: 8 },
  offerBudget: { fontSize: 17, fontWeight: '900', marginTop: 10 },
  offerExpiry: { fontSize: 12, marginTop: 9 },
  offerActions: { flexDirection: 'row', gap: 10, marginTop: 15 },
  rejectButton: { flex: 1, minHeight: 48, borderWidth: 1.5, borderColor: '#D14343', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rejectText: { color: '#D14343', fontWeight: '900' },
  acceptButton: { flex: 1, minHeight: 48, backgroundColor: '#FF6B00', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  acceptText: { color: '#FFF', fontWeight: '900' },
});
