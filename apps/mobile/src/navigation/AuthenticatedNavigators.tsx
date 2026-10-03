import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useWorkoTheme } from '../design-system/ThemeProvider';
import { ClientHomeScreen, ClientCategoriesScreen } from '../screens/client/ClientHomeScreens';
import { ClientReelsScreen } from '../screens/client/ClientReelsScreen';
import { SavedReelsScreen } from '../screens/client/SavedReelsScreen';
import type { ClientTabParamList, WorkerTabParamList } from './types';

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
function ActionCard({ title, description }: { title: string; description: string }) {
  const { theme } = useWorkoTheme();
  return <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
    <Text style={[styles.cardTitle, { color: theme.text }]}>{title}</Text>
    <Text style={[styles.subtitle, { color: theme.secondaryText }]}>{description}</Text>
  </View>;
}
function ClientRequests() { return <ScreenShell title="Your requests" subtitle="Follow the progress of work requests you have created."><ActionCard title="No requests to show yet" description="When you create a request, its status and worker responses will appear here." /></ScreenShell>; }
function ProfileScreen({ navigation, showSaved = false }: { navigation?: any; showSaved?: boolean }) {
  const { theme, mode, toggleMode } = useWorkoTheme();
  return <ScreenShell title="Profile" subtitle="Manage your Worko preferences.">
    <ActionCard title="Appearance" description={`Current theme: ${mode === 'dark' ? 'Dark' : 'Light'}`} />
    <Pressable accessibilityRole="button" onPress={toggleMode} style={[styles.toggle, { backgroundColor: theme.primary }]}><Text style={styles.toggleText}>Switch to {mode === 'dark' ? 'light' : 'dark'} theme</Text></Pressable>
    {showSaved ? <Pressable accessibilityRole="button" onPress={() => navigation.navigate("Saved")} style={[styles.toggle, { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }]}><Text style={{ color: theme.text, fontWeight: "800" }}>Saved reels  →</Text></Pressable> : null}
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
export function ClientAppNavigator({ route }: { route: { params: { accessToken: string } } }) {
  const { theme } = useWorkoTheme();
  return <ClientTabs.Navigator screenOptions={tabOptions(theme)}>
    <ClientTabs.Screen name="Home" component={ClientHomeScreen} options={{ tabBarLabel: 'Home', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 19 }}>⌂</Text> }} />
    <ClientTabs.Screen name="Discover" component={ClientCategoriesScreen} options={{ tabBarLabel: 'Discover', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 19 }}>⌕</Text> }} />
    <ClientTabs.Screen name="Reels" options={{ tabBarLabel: 'Reels', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 19 }}>▷</Text> }}>{() => <ClientReelsScreen accessToken={route.params.accessToken} />}</ClientTabs.Screen>
    <ClientTabs.Screen name="Saved" options={{ tabBarLabel: "Saved", tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 19 }}>♡</Text> }}>{() => <SavedReelsScreen accessToken={route.params.accessToken} />}</ClientTabs.Screen>
    <ClientTabs.Screen name="Requests" component={ClientRequests} options={{ tabBarLabel: 'Requests', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 19 }}>▤</Text> }} />
    <ClientTabs.Screen name="Profile" options={{ tabBarLabel: "Profile", tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 19 }}>○</Text> }}>{props => <ProfileScreen navigation={props.navigation} showSaved />}</ClientTabs.Screen>
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
  card: { borderWidth: 1, borderRadius: 16, padding: 17, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 5 },
  toggle: { minHeight: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  toggleText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});
