import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useWorkoTheme } from '../design-system/ThemeProvider';
import type { ClientTabParamList, WorkerTabParamList } from './types';

type TabDefinition = { name: string; title: string; subtitle: string; icon: string };
const ClientTabs = createBottomTabNavigator<ClientTabParamList>();
const WorkerTabs = createBottomTabNavigator<WorkerTabParamList>();

function ScreenShell({ title, subtitle, children }: React.PropsWithChildren<{ title: string; subtitle: string }>) {
  const { theme } = useWorkoTheme();
  return <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={styles.content}>
    <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
    <Text style={[styles.subtitle, { color: theme.secondaryText }]}>{subtitle}</Text>
    {children}
  </ScrollView>;
}
function ActionCard({ title, description, action }: { title: string; description: string; action?: string }) {
  const { theme } = useWorkoTheme();
  return <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
    <Text style={[styles.cardTitle, { color: theme.text }]}>{title}</Text>
    <Text style={[styles.subtitle, { color: theme.secondaryText }]}>{description}</Text>
    {action ? <Text style={[styles.action, { color: theme.primary }]}>{action} →</Text> : null}
  </View>;
}
function ClientHome() {
  const { theme } = useWorkoTheme();
  return <ScreenShell title="What can we help you with?" subtitle="Tell us what you need. Worko will coordinate with available workers nearby.">
    <View style={[styles.hero, { backgroundColor: theme.primary }]}>
      <Text style={styles.heroEyebrow}>WORKO • ON-DEMAND HELP</Text>
      <Text style={styles.heroTitle}>Your next task, made easier.</Text>
      <Text style={styles.heroBody}>Create a request and let eligible workers respond.</Text>
    </View>
    <Text style={[styles.sectionTitle, { color: theme.text }]}>Get started</Text>
    <ActionCard title="Explore services" description="Browse service categories and discover workers through their work." action="Explore" />
    <ActionCard title="Create a work request" description="Describe the job, add details, and broadcast it to eligible workers." action="Create request" />
    <ActionCard title="Your requests" description="Track request status and review worker responses." action="View requests" />
  </ScreenShell>;
}
function ClientDiscover() { return <ScreenShell title="Discover" subtitle="Explore services and worker-created content."><ActionCard title="Categories" description="Service categories will appear here as the discovery catalog is connected." /></ScreenShell>; }
function ClientRequests() { return <ScreenShell title="Your requests" subtitle="Follow the progress of work requests you have created."><ActionCard title="No requests to show yet" description="When you create a request, its status and worker responses will appear here." /></ScreenShell>; }
function ProfileScreen() {
  const { theme, mode, toggleMode } = useWorkoTheme();
  return <ScreenShell title="Profile" subtitle="Manage your Worko preferences.">
    <ActionCard title="Appearance" description={`Current theme: ${mode === 'dark' ? 'Dark' : 'Light'}`} />
    <Pressable accessibilityRole="button" onPress={toggleMode} style={[styles.toggle, { backgroundColor: theme.primary }]}><Text style={styles.toggleText}>Switch to {mode === 'dark' ? 'light' : 'dark'} theme</Text></Pressable>
    <ActionCard title="Account" description="Your profile and saved location are managed securely with your Worko account." />
  </ScreenShell>;
}
function WorkerDashboard() { return <ScreenShell title="Worker dashboard" subtitle="Your work activity at a glance."><ActionCard title="You're all set" description="New eligible work opportunities will be shown here when the worker marketplace is connected." /></ScreenShell>; }
function WorkerRequests() { return <ScreenShell title="Work requests" subtitle="Review opportunities and manage your responses."><ActionCard title="No opportunities yet" description="Eligible requests will appear here." /></ScreenShell>; }
function WorkerReels() { return <ScreenShell title="Your reels" subtitle="Share examples of your work with the Worko community."><ActionCard title="Create your portfolio" description="Reel publishing will be available when media upload and moderation are connected." /></ScreenShell>; }

const tabOptions = (theme: ReturnType<typeof useWorkoTheme>['theme']) => ({
  headerShown: false,
  tabBarActiveTintColor: theme.primary,
  tabBarInactiveTintColor: theme.secondaryText,
  tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border, height: 62, paddingBottom: 7, paddingTop: 7 },
  tabBarLabelStyle: { fontSize: 11, fontWeight: '600' as const },
});
export function ClientAppNavigator() {
  const { theme } = useWorkoTheme();
  return <ClientTabs.Navigator screenOptions={tabOptions(theme)}>
    <ClientTabs.Screen name="Home" component={ClientHome} options={{ tabBarLabel: 'Home', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 19 }}>⌂</Text> }} />
    <ClientTabs.Screen name="Discover" component={ClientDiscover} options={{ tabBarLabel: 'Discover', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 19 }}>⌕</Text> }} />
    <ClientTabs.Screen name="Requests" component={ClientRequests} options={{ tabBarLabel: 'Requests', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 19 }}>▤</Text> }} />
    <ClientTabs.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 19 }}>○</Text> }} />
  </ClientTabs.Navigator>;
}
export function WorkerAppNavigator() {
  const { theme } = useWorkoTheme();
  return <WorkerTabs.Navigator screenOptions={tabOptions(theme)}>
    <WorkerTabs.Screen name="Dashboard" component={WorkerDashboard} options={{ tabBarLabel: 'Home' }} />
    <WorkerTabs.Screen name="Requests" component={WorkerRequests} options={{ tabBarLabel: 'Requests' }} />
    <WorkerTabs.Screen name="Reels" component={WorkerReels} options={{ tabBarLabel: 'Reels' }} />
    <WorkerTabs.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
  </WorkerTabs.Navigator>;
}
const styles = StyleSheet.create({
  content: { padding: 22, paddingBottom: 36 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '900', marginBottom: 7 },
  subtitle: { fontSize: 14, lineHeight: 21, marginBottom: 18 },
  hero: { borderRadius: 22, padding: 22, marginBottom: 24 },
  heroEyebrow: { color: '#FFF', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 13 },
  heroTitle: { color: '#FFF', fontSize: 26, lineHeight: 31, fontWeight: '900', marginBottom: 8 },
  heroBody: { color: '#FFF', fontSize: 14, lineHeight: 20, opacity: 0.94 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  card: { borderWidth: 1, borderRadius: 16, padding: 17, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 5 },
  action: { fontSize: 14, fontWeight: '800', marginTop: 12 },
  toggle: { minHeight: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  toggleText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});
