import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useWorkoTheme} from '../../design-system/ThemeProvider';
import {apiRequest} from '../../services/api/client';
import type {WorkerTabParamList} from '../../navigation/types';
import type {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';

type Stage =
  | 'notifications'
  | 'chat'
  | 'profile'
  | 'editProfile'
  | 'settings'
  | 'support'
  | 'dispute'
  | 'safety'
  | 'logout';

type Me = {
  id: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
  workerProfile: {
    id: string;
    displayName: string | null;
    photoUrl: string | null;
    verificationStatus: string;
    availabilityStatus: string;
    preferredRadiusKm: number;
    serviceAreaAddress: string | null;
    minimumPayment: number | null;
    categories: Array<{id: string; name: string; slug: string}>;
  };
};

type Offer = {
  id: string;
  offeredAt: string;
  expiresAt: string;
  requirement: {title: string; category: {name: string}; address: string; scheduledAt: string | null; budget: number | string | null; currency: string};
};

type ActiveJob = {
  id: string;
  status: string;
  requirement: {title: string; address: string; scheduledAt: string | null; budget: number | string | null; currency: string; client?: {phone: string | null}};
};

const ORANGE = '#FF6B00';
const GREEN = '#0A9F3D';
const RED = '#D92D20';

export function WorkerAccountFlowScreen() {
  const {theme, mode, toggleMode} = useWorkoTheme();
  const navigation = useNavigation<BottomTabNavigationProp<WorkerTabParamList>>();
  const route = useRoute<any>();
  const stage = ((route.params?.stage ?? 'profile') as Stage);
  const [me, setMe] = useState<Me | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [activeJob, setActiveJob] = useState<ActiveJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [disputeText, setDisputeText] = useState('');
  const [chatText, setChatText] = useState('');

  const token = async () => AsyncStorage.getItem('worko.accessToken');

  const load = useCallback(async () => {
    const accessToken = await token();
    if (!accessToken) { setLoading(false); return; }
    try {
      const [meResponse, dashboardResponse] = await Promise.all([
        apiRequest('/worker/offers/profile', {headers: {Authorization: 'Bearer ' + accessToken}}),
        apiRequest('/worker/offers/dashboard', {headers: {Authorization: 'Bearer ' + accessToken}}),
      ]);
      const mePayload = await meResponse.json().catch(() => ({}));
      const dashboardPayload = await dashboardResponse.json().catch(() => ({}));
      if (meResponse.ok && mePayload?.data) {
        setMe(mePayload.data);
        setDisplayName(mePayload.data.workerProfile?.displayName ?? '');
      }
      if (dashboardResponse.ok && dashboardPayload?.data) {
        setOffers(Array.isArray(dashboardPayload.data.offers) ? dashboardPayload.data.offers : []);
        setActiveJob(dashboardPayload.data.activeJob ?? null);
      }
    } catch {
      Alert.alert('Unable to load', 'Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const saveProfile = async () => {
    const accessToken = await token();
    if (!accessToken) return;
    if (displayName.trim().length < 2) {
      Alert.alert('Invalid name', 'Enter at least 2 characters.');
      return;
    }
    setBusy(true);
    try {
      const response = await apiRequest('/worker/offers/profile', {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json', Authorization: 'Bearer ' + accessToken},
        body: JSON.stringify({displayName: displayName.trim()}),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || 'Could not save your profile.');
      Alert.alert('Profile updated', 'Your worker profile has been saved.');
      await load();
      navigation.navigate('WorkerAccount', {stage: 'profile'});
    } catch (error) {
      Alert.alert('Save failed', error instanceof Error ? error.message : 'Please try again.');
    } finally { setBusy(false); }
  };

  const sendSupportMail = (subject: string, body: string) => {
    void Linking.openURL(
      'mailto:support@worko.app?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body),
    ).catch(() => Alert.alert('Support', 'No email app is configured on this device.'));
  };

  const openChat = () => {
    if (!activeJob) {
      Alert.alert('No active job', 'Chat becomes available when you have an active booking.');
      return;
    }
    const phone = activeJob?.requirement.client?.phone ?? undefined;
    if (phone) {
      void Linking.openURL('sms:' + phone + '?body=' + encodeURIComponent(chatText || 'Hi, I am your Worko service worker.'));
    } else {
      Alert.alert('Client contact unavailable', 'The client contact number is not available for this booking.');
    }
  };

  const logout = async () => {
    const refreshToken = await AsyncStorage.getItem('worko.refreshToken');
    setBusy(true);
    try {
      if (refreshToken) {
        await apiRequest('/auth/logout', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({refreshToken}),
        });
      }
    } finally {
      await AsyncStorage.multiRemove(['worko.accessToken', 'worko.refreshToken', 'worko.role']);
      const parent = navigation.getParent();
      if (parent) {
        parent.reset({index: 0, routes: [{name: 'Auth'}] as never});
      }
      setBusy(false);
    }
  };

  const Header = ({title, subtitle}: {title: string; subtitle?: string}) => (
    <View style={styles.header}>
      <Pressable onPress={() => navigation.goBack()}><Text style={[styles.back, {color: theme.text}]}>‹</Text></Pressable>
      <View style={{flex: 1}}>
        <Text style={styles.brand}>Worko</Text>
        <Text style={[styles.headerTitle, {color: theme.text}]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, {color: theme.secondaryText}]}>{subtitle}</Text> : null}
      </View>
    </View>
  );

  const Card = ({children}: React.PropsWithChildren) => (
    <View style={[styles.card, {backgroundColor: theme.surface, borderColor: theme.border}]}>{children}</View>
  );

  const Action = ({title, description, onPress, danger = false}: {title: string; description?: string; onPress: () => void; danger?: boolean}) => (
    <Pressable onPress={onPress} style={[styles.action, {backgroundColor: theme.surface, borderColor: danger ? '#F2B8B5' : theme.border}]}>
      <View style={{flex: 1}}><Text style={[styles.actionTitle, {color: danger ? RED : theme.text}]}>{title}</Text>{description ? <Text style={[styles.actionText, {color: theme.secondaryText}]}>{description}</Text> : null}</View>
      <Text style={{color: danger ? RED : ORANGE, fontSize: 25}}>›</Text>
    </Pressable>
  );

  if (loading) return <View style={[styles.center, {backgroundColor: theme.background}]}><ActivityIndicator color={ORANGE}/><Text style={[styles.subtitle, {color: theme.secondaryText}]}>Loading…</Text></View>;

  if (stage === 'notifications') return (
    <Page>
      <Header title="Notifications" subtitle="Stay updated on your Worko activity."/>
      {offers.map(offer => <Card key={offer.id}><Text style={styles.badge}>NEW WORK OFFER</Text><Text style={[styles.cardTitle, {color: theme.text}]}>{offer.requirement.title}</Text><Text style={[styles.cardText, {color: theme.secondaryText}]}>{offer.requirement.category.name} · {offer.requirement.address}</Text><Text style={[styles.small, {color: theme.secondaryText}]}>Expires {new Date(offer.expiresAt).toLocaleTimeString()}</Text><Pressable style={styles.primary} onPress={() => navigation.navigate('IncomingOffer', {offerId: offer.id})}><Text style={styles.primaryText}>View Offer</Text></Pressable></Card>)}
      {activeJob ? <Card><Text style={styles.badge}>ACTIVE JOB</Text><Text style={[styles.cardTitle, {color: theme.text}]}>{activeJob.requirement.title}</Text><Text style={[styles.cardText, {color: theme.secondaryText}]}>Your booking is {activeJob.status.toLowerCase().replace('_', ' ')}.</Text><Pressable style={styles.primary} onPress={() => navigation.navigate('JobFlow', {bookingId: activeJob.id, stage: activeJob.status === 'IN_PROGRESS' ? 'progress' : 'navigate'})}><Text style={styles.primaryText}>Open Job</Text></Pressable></Card> : null}
      {!offers.length && !activeJob ? <Card><Text style={[styles.cardTitle, {color: theme.text}]}>You're all caught up</Text><Text style={[styles.cardText, {color: theme.secondaryText}]}>No active worker notifications right now.</Text></Card> : null}
    </Page>
  );

  if (stage === 'chat') return (
    <Page>
      <Header title="Chat" subtitle="Contact the client for your active booking."/>
      {activeJob ? <Card><Text style={[styles.cardTitle, {color: theme.text}]}>{activeJob.requirement.title}</Text><Text style={[styles.cardText, {color: theme.secondaryText}]}>{activeJob.requirement.address}</Text><TextInput value={chatText} onChangeText={setChatText} placeholder="Write a message…" placeholderTextColor="#98A2B3" style={[styles.input, {color: theme.text, borderColor: theme.border}]}/><Pressable style={styles.primary} onPress={openChat}><Text style={styles.primaryText}>Open Messages</Text></Pressable><Text style={[styles.small, {color: theme.secondaryText}]}>The current Worko chat action opens your phone's SMS composer with the client contact.</Text></Card> : <Card><Text style={[styles.cardTitle, {color: theme.text}]}>No active conversation</Text><Text style={[styles.cardText, {color: theme.secondaryText}]}>Accept a work offer to contact a client.</Text></Card>}
    </Page>
  );

  if (stage === 'profile') return (
    <Page>
      <Header title="Worker Profile" subtitle="Your Worko professional profile."/>
      <Card><View style={styles.avatar}><Text style={styles.avatarText}>{(me?.workerProfile.displayName || me?.email || 'W').slice(0, 1).toUpperCase()}</Text></View><Text style={[styles.profileName, {color: theme.text}]}>{me?.workerProfile.displayName || me?.email?.split('@')[0] || 'Worker'}</Text><Text style={[styles.cardText, {color: theme.secondaryText}]}>{me?.email || 'Email not provided'}</Text><Text style={[styles.cardText, {color: theme.secondaryText}]}>{me?.phone || 'Phone not provided'}</Text><View style={styles.verified}><Text style={styles.verifiedText}>✓ {me?.workerProfile.verificationStatus || 'PENDING'}</Text></View></Card>
      <Card><Text style={[styles.sectionTitle, {color: theme.text}]}>Professional details</Text><Text style={[styles.cardText, {color: theme.secondaryText}]}>Categories: {me?.workerProfile.categories.map(x => x.name).join(', ') || 'Not selected'}</Text><Text style={[styles.cardText, {color: theme.secondaryText}]}>Service area: {me?.workerProfile.serviceAreaAddress || 'Not set'}</Text><Text style={[styles.cardText, {color: theme.secondaryText}]}>Preferred radius: {me?.workerProfile.preferredRadiusKm || 10} km</Text><Text style={[styles.cardText, {color: theme.secondaryText}]}>Minimum payment: {me?.workerProfile.minimumPayment == null ? 'Not set' : '₹' + me.workerProfile.minimumPayment}</Text></Card>
      <Action title="Edit Profile" description="Update your worker display name." onPress={() => navigation.navigate('WorkerAccount', {stage: 'editProfile'})}/>
      <Action title="Work Preferences" description="Categories, radius, schedule and minimum payment." onPress={() => navigation.navigate('Preferences')}/>
      <Action title="Notifications" description="View offers and active job updates." onPress={() => navigation.navigate('WorkerAccount', {stage: 'notifications'})}/>\n      <Action title="Settings" description="Appearance, availability and account controls." onPress={() => navigation.navigate('WorkerAccount', {stage: 'settings'})}/>\n      <Action title="Help & Support" description="Get help with jobs, payments and your account." onPress={() => navigation.navigate('WorkerAccount', {stage: 'support'})}/>\n      <Action title="Safety & SOS" description="Emergency assistance and safety reporting." onPress={() => navigation.navigate('WorkerAccount', {stage: 'safety'})}/>
    </Page>
  );

  if (stage === 'editProfile') return (
    <Page>
      <Header title="Edit Worker Profile" subtitle="Keep your public worker details up to date."/>
      <Card><Text style={[styles.label, {color: theme.text}]}>Display name</Text><TextInput value={displayName} onChangeText={setDisplayName} placeholder="Your name" placeholderTextColor="#98A2B3" style={[styles.input, {color: theme.text, borderColor: theme.border}]}/><Text style={[styles.small, {color: theme.secondaryText}]}>Email and phone remain tied to your verified Worko account.</Text><Pressable disabled={busy} style={[styles.primary, busy && {opacity: .5}]} onPress={() => void saveProfile()}><Text style={styles.primaryText}>{busy ? 'Saving…' : 'Save Profile'}</Text></Pressable></Card>
    </Page>
  );

  if (stage === 'settings') return (
    <Page>
      <Header title="Settings" subtitle="Control your Worko app experience."/>
      <Card><Text style={[styles.sectionTitle, {color: theme.text}]}>Appearance</Text><Text style={[styles.cardText, {color: theme.secondaryText}]}>Current theme: {mode === 'dark' ? 'Dark' : 'Light'}</Text><Pressable style={styles.primary} onPress={toggleMode}><Text style={styles.primaryText}>Switch to {mode === 'dark' ? 'Light' : 'Dark'} Theme</Text></Pressable></Card>
      <Action title="Availability" description="Change whether you receive new work offers." onPress={() => navigation.navigate('Availability')}/>
      <Action title="Work Preferences" description="Manage service area, radius and schedule." onPress={() => navigation.navigate('Preferences')}/>
      <Action title="Safety & SOS" description="Emergency actions and safety guidance." onPress={() => navigation.navigate('WorkerAccount', {stage: 'safety'})}/>
      <Action title="Logout" description="Securely sign out of this device." danger onPress={() => navigation.navigate('WorkerAccount', {stage: 'logout'})}/>
    </Page>
  );

  if (stage === 'support') return (
    <Page>
      <Header title="Help & Support" subtitle="Get help with Worko, jobs and payments."/>
      <Action title="How offers work" description="Offers are time-limited and can be accepted or rejected from Incoming Offers." onPress={() => Alert.alert('Work offers', 'Keep your availability ON. Worko sends eligible requirements progressively based on distance and worker preferences.')}/>
      <Action title="Job execution help" description="Use the job flow for arrival, check-in, evidence, tasks and completion." onPress={() => Alert.alert('Job flow', 'Complete each required step in order. Before-work and after-work evidence are required for completion.')}/>
      <Action title="Payment help" description="Payment is secured by the client before matching." onPress={() => Alert.alert('Payment', 'Worker payment is handled through the Worko booking and payment lifecycle.')}/>
      <Action title="Contact Worko Support" description="Open your email app with a support request." onPress={() => sendSupportMail('Worko Worker Support', 'Worker account: ' + (me?.email || me?.id || 'unknown'))}/>
      <Action title="Report a problem" description="Send a technical or account issue to support." onPress={() => navigation.navigate('WorkerAccount', {stage: 'dispute'})}/>
    </Page>
  );

  if (stage === 'dispute') return (
    <Page>
      <Header title="Worker Dispute" subtitle="Report a problem with a completed or active job."/>
      {activeJob ? <Card><Text style={[styles.cardTitle, {color: theme.text}]}>{activeJob.requirement.title}</Text><Text style={[styles.cardText, {color: theme.secondaryText}]}>Booking: {activeJob.id.slice(0, 8).toUpperCase()}</Text></Card> : null}
      <Card><Text style={[styles.label, {color: theme.text}]}>Describe the issue</Text><TextInput value={disputeText} onChangeText={setDisputeText} multiline maxLength={1200} placeholder="Explain what happened…" placeholderTextColor="#98A2B3" style={[styles.input, styles.multiline, {color: theme.text, borderColor: theme.border}]}/><Pressable style={styles.primary} onPress={() => sendSupportMail('Worko Worker Dispute' + (activeJob ? ' - ' + activeJob.id : ''), disputeText || 'I need help with a Worko job.') }><Text style={styles.primaryText}>Submit Dispute</Text></Pressable></Card>
    </Page>
  );

  if (stage === 'safety') return (
    <Page>
      <Header title="Safety & SOS" subtitle="Use these actions when you need immediate help."/>
      <Card><View style={styles.sos}><Text style={styles.sosText}>SOS</Text></View><Text style={[styles.cardTitle, {color: theme.text, textAlign: 'center'}]}>Need emergency assistance?</Text><Text style={[styles.cardText, {color: theme.secondaryText, textAlign: 'center'}]}>For immediate danger in India, call the national emergency number 112.</Text><Pressable style={styles.sosButton} onPress={() => void Linking.openURL('tel:112')}><Text style={styles.sosButtonText}>Call 112</Text></Pressable></Card>
      <Action title="Call Client" description="Contact the client for the current booking." onPress={() => { if (activeJob) Alert.alert('Client contact', 'Use the Chat screen to contact the client for the active booking.'); else Alert.alert('No active job', 'There is no active booking right now.'); }}/>
      <Action title="Report a safety issue" description="Send an urgent safety report to Worko support." onPress={() => sendSupportMail('URGENT Worko Safety Report', 'Worker: ' + (me?.email || me?.id || 'unknown') + '\nPlease describe the safety issue.')}/>
    </Page>
  );

  return (
    <Page>
      <Header title="Logout" subtitle="Sign out of this Worko account on this device."/>
      <Card><Text style={styles.logoutIcon}>↪</Text><Text style={[styles.big, {color: theme.text}]}>Are you sure you want to logout?</Text><Text style={[styles.cardText, {color: theme.secondaryText, textAlign: 'center'}]}>Your active Worko session will be removed from this device.</Text><Pressable disabled={busy} style={[styles.primary, busy && {opacity: .5}]} onPress={() => void logout()}><Text style={styles.primaryText}>{busy ? 'Logging out…' : 'Logout'}</Text></Pressable><Pressable style={styles.secondary} onPress={() => navigation.goBack()}><Text style={styles.secondaryText}>Cancel</Text></Pressable></Card>
    </Page>
  );

  function Page({children}: React.PropsWithChildren) { return <View style={[styles.page, {backgroundColor: theme.background}]}><ScrollView contentContainerStyle={styles.container}>{children}</ScrollView></View>; }
}

const styles = StyleSheet.create({
  page: {flex: 1},
  container: {padding: 18, paddingBottom: 40},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  header: {flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18, gap: 10},
  back: {fontSize: 36, lineHeight: 36},
  brand: {color: ORANGE, fontSize: 25, fontWeight: '900'},
  headerTitle: {fontSize: 24, fontWeight: '900', marginTop: 2},
  subtitle: {fontSize: 13, lineHeight: 19, marginTop: 3},
  card: {borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12},
  cardTitle: {fontSize: 17, fontWeight: '900', marginBottom: 6},
  cardText: {fontSize: 13, lineHeight: 20},
  small: {fontSize: 11, lineHeight: 17, marginTop: 8},
  sectionTitle: {fontSize: 16, fontWeight: '900', marginBottom: 9},
  badge: {alignSelf: 'flex-start', backgroundColor: '#FFF0E8', color: ORANGE, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, fontSize: 10, fontWeight: '900', marginBottom: 8},
  action: {minHeight: 64, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center'},
  actionTitle: {fontSize: 14, fontWeight: '900', marginBottom: 3},
  actionText: {fontSize: 11, lineHeight: 17},
  primary: {minHeight: 49, borderRadius: 12, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', marginTop: 13},
  primaryText: {color: '#FFF', fontSize: 14, fontWeight: '900'},
  secondary: {minHeight: 49, borderWidth: 1.5, borderColor: ORANGE, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 10},
  secondaryText: {color: ORANGE, fontWeight: '900'},
  input: {minHeight: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, marginTop: 8, fontSize: 14},
  multiline: {height: 150, textAlignVertical: 'top', paddingTop: 13},
  avatar: {width: 76, height: 76, borderRadius: 38, backgroundColor: '#FFE4D3', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 10},
  avatarText: {fontSize: 28, fontWeight: '900', color: ORANGE},
  profileName: {fontSize: 21, fontWeight: '900', textAlign: 'center', marginBottom: 4},
  verified: {alignSelf: 'center', marginTop: 10, backgroundColor: '#EAFBF0', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6},
  verifiedText: {color: GREEN, fontSize: 11, fontWeight: '900'},
  label: {fontSize: 12, fontWeight: '900'},
  sos: {width: 84, height: 84, borderRadius: 42, backgroundColor: '#FEE4E2', alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 14},
  sosText: {color: RED, fontSize: 22, fontWeight: '900'},
  sosButton: {height: 52, borderRadius: 13, backgroundColor: RED, alignItems: 'center', justifyContent: 'center', marginTop: 14},
  sosButtonText: {color: '#FFF', fontSize: 16, fontWeight: '900'},
  logoutIcon: {fontSize: 48, textAlign: 'center', color: ORANGE, marginBottom: 10},
  big: {fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 8},
});

