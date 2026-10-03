import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useWorkoTheme } from '../../design-system/ThemeProvider';

declare const process: { env: { EXPO_PUBLIC_API_URL?: string } };
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000/api/v1';

type Category = { id: string; name: string; slug: string; isActive?: boolean };
type RequestSummary = { id: string; title: string; status: string; category?: { name: string } };

function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/categories`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Could not load categories.');
      const rows = Array.isArray(payload) ? payload : payload.data ?? payload.categories ?? [];
      setCategories(rows.filter((item: Category) => item?.id && item?.name && item?.slug && item.isActive !== false));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load categories.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  return { categories, loading, error, reload: load };
}

function SectionHeading({ title, onPress, action = 'View all' }: { title: string; onPress?: () => void; action?: string }) {
  const { theme } = useWorkoTheme();
  return <View style={styles.sectionHeading}><Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>{onPress ? <Pressable accessibilityRole="button" onPress={onPress}><Text style={[styles.link, { color: theme.primary }]}>{action} ›</Text></Pressable> : null}</View>;
}
function EmptyState({ title, body, retry }: { title: string; body: string; retry?: () => void }) {
  const { theme } = useWorkoTheme();
  return <View style={[styles.empty, { backgroundColor: theme.surface, borderColor: theme.border }]}><Text style={[styles.emptyTitle, { color: theme.text }]}>{title}</Text><Text style={[styles.body, { color: theme.secondaryText }]}>{body}</Text>{retry ? <Pressable onPress={retry} accessibilityRole="button"><Text style={[styles.link, { color: theme.primary }]}>Try again</Text></Pressable> : null}</View>;
}
export function ClientHomeScreen({ navigation, accessToken }: { navigation: any; accessToken: string }) {
  const { theme } = useWorkoTheme();
  const { categories, loading, error, reload } = useCategories();
  const [requests, setRequests] = useState<RequestSummary[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    try {
      const response = await fetch(`${API_BASE_URL}/requirements/my`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (response.ok) {
        const payload = await response.json();
        setRequests(Array.isArray(payload) ? payload : payload.data ?? payload.requirements ?? []);
      }
    } catch { /* The request list has its own empty state when unavailable. */ }
    setRefreshing(false);
  }, [reload, accessToken]);
  useEffect(() => { void refresh(); }, [refresh]);
  const activeRequest = requests.find(item => !['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(item.status));
  return <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={styles.page} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.primary} />}>
    <View style={styles.topRow}><View><Text style={[styles.brand, { color: theme.text }]}>W<Text style={{ color: theme.primary }}>o</Text>rk<Text style={{ color: theme.primary }}>o</Text></Text><Text style={[styles.location, { color: theme.secondaryText }]}>⌖  Your saved location</Text></View><Pressable accessibilityRole="button" onPress={() => navigation.navigate('Profile')} style={[styles.bell, { backgroundColor: theme.surface }]}><Text style={{ color: theme.text, fontSize: 22 }}>♧</Text></Pressable></View>
    <Text style={[styles.greeting, { color: theme.secondaryText }]}>Good day,</Text><Text style={[styles.headline, { color: theme.text }]}>What do you need help with?</Text><Text style={[styles.body, { color: theme.secondaryText }]}>Tell us what needs doing. We'll find eligible workers nearby.</Text>
    <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Requests')} style={[styles.hero, { backgroundColor: theme.primary }]}><View style={{ flex: 1 }}><Text style={styles.heroTitle}>What work do you need?</Text><Text style={styles.heroBody}>Describe your task and we'll find an eligible worker for you.</Text><Text style={styles.heroAction}>Create a requirement  →</Text></View><Text style={styles.heroEmoji}>✦</Text></Pressable>
    <SectionHeading title="Popular categories" onPress={() => navigation.navigate('Discover')} />
    {loading ? <ActivityIndicator color={theme.primary} /> : error ? <EmptyState title="Categories unavailable" body={error} retry={reload} /> : categories.length === 0 ? <EmptyState title="No categories yet" body="Active service categories will appear here once they are available." /> : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontal}>{categories.slice(0, 8).map(category => <Pressable key={category.id} accessibilityRole="button" onPress={() => navigation.navigate('Discover', { categoryId: category.id })} style={[styles.categoryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}><View style={[styles.categoryIcon, { backgroundColor: theme.primary + '18' }]}><Text style={{ color: theme.primary, fontSize: 22 }}>⌁</Text></View><Text numberOfLines={2} style={[styles.categoryName, { color: theme.text }]}>{category.name}</Text></Pressable>)}</ScrollView>}
    <SectionHeading title="Active request" onPress={() => navigation.navigate('Requests')} />
    {activeRequest ? <View style={[styles.requestCard, { backgroundColor: theme.surface, borderColor: theme.border }]}><Text style={[styles.requestStatus, { color: theme.primary }]}>{activeRequest.status.replace(/_/g, ' ')}</Text><Text style={[styles.cardTitle, { color: theme.text }]}>{activeRequest.title}</Text><Text style={[styles.body, { color: theme.secondaryText }]}>{activeRequest.category?.name ?? 'Work request'} · Tap to view progress</Text></View> : <View style={[styles.requestCard, { backgroundColor: theme.surface, borderColor: theme.border }]}><Text style={[styles.cardTitle, { color: theme.text }]}>No active requests</Text><Text style={[styles.body, { color: theme.secondaryText }]}>Your submitted requirements and their matching status will appear here.</Text></View>}
    <SectionHeading title="Worko Reels" onPress={() => navigation.navigate('Reels')} action="Explore" />
    <View style={[styles.reelsPlaceholder, { backgroundColor: theme.surface, borderColor: theme.border }]}><Text style={[styles.cardTitle, { color: theme.text }]}>Discover real work and useful ideas</Text><Text style={[styles.body, { color: theme.secondaryText }]}>Explore approved videos from workers across the Worko community. Reels help you discover skills; they do not directly book a worker.</Text><Pressable accessibilityRole="button" onPress={() => navigation.navigate('Reels')} style={{ marginTop: 14 }}><Text style={[styles.link, { color: theme.primary }]}>Explore reels →</Text></Pressable></View>
  </ScrollView>;
}

export function ClientCategoriesScreen({ route }: { route?: any }) {
  const { theme } = useWorkoTheme();
  const { categories, loading, error, reload } = useCategories();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(route?.params?.categoryId ?? null);
  const filtered = useMemo(() => categories.filter(item => item.name.toLowerCase().includes(query.trim().toLowerCase())), [categories, query]);
  return <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
    <Text style={[styles.brand, { color: theme.text }]}>W<Text style={{ color: theme.primary }}>o</Text>rk<Text style={{ color: theme.primary }}>o</Text></Text>
    <Text style={[styles.headline, { color: theme.text }]}>Choose a <Text style={{ color: theme.primary }}>category</Text></Text><Text style={[styles.body, { color: theme.secondaryText }]}>Select the type of work you need. We'll find eligible workers for your request.</Text>
    <View style={[styles.search, { backgroundColor: theme.surface, borderColor: theme.border }]}><Text style={{ fontSize: 20, color: theme.secondaryText }}>⌕</Text><TextInput value={query} onChangeText={setQuery} placeholder="Search services (e.g. cleaning, plumbing...)" placeholderTextColor={theme.secondaryText} style={[styles.searchInput, { color: theme.text }]} returnKeyType="search" /></View>
    {loading ? <ActivityIndicator color={theme.primary} /> : error ? <EmptyState title="Couldn't load categories" body={error} retry={reload} /> : filtered.length === 0 ? <EmptyState title={query ? 'No matching services' : 'No categories available'} body={query ? 'Try a different search term.' : 'Active categories will be shown here when they are configured.'} /> : <View style={styles.grid}>{filtered.map(category => <Pressable key={category.id} accessibilityRole="button" accessibilityState={{ selected: selectedId === category.id }} onPress={() => setSelectedId(category.id)} style={[styles.gridCard, { backgroundColor: theme.surface, borderColor: selectedId === category.id ? theme.primary : theme.border, borderWidth: selectedId === category.id ? 2 : 1 }]}><View style={[styles.categoryIcon, { backgroundColor: theme.primary + '18' }]}><Text style={{ fontSize: 26, color: theme.primary }}>⌁</Text></View><Text style={[styles.categoryName, { color: theme.text }]}>{category.name}</Text><Text style={[styles.body, { color: theme.secondaryText }]}>Select this service</Text>{selectedId === category.id ? <Text style={[styles.selected, { color: theme.primary }]}>✓ Selected</Text> : null}</Pressable>)}</View>}
    {selectedId ? <View style={[styles.selectedBar, { backgroundColor: theme.surface, borderColor: theme.border }]}><View style={{ flex: 1 }}><Text style={[styles.body, { color: theme.secondaryText }]}>Selected category</Text><Text style={[styles.cardTitle, { color: theme.text }]}>{categories.find(item => item.id === selectedId)?.name ?? 'Category'}</Text></View><Pressable accessibilityRole="button" onPress={() => setSelectedId(null)}><Text style={[styles.link, { color: theme.primary }]}>Change</Text></Pressable></View> : null}
    <View style={[styles.notice, { backgroundColor: theme.surface }]}><Text style={[styles.body, { color: theme.secondaryText }]}>Next, create a work requirement. Workers respond to your request through Worko's matching process; selecting a category does not book anyone.</Text></View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 36 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  brand: { fontSize: 31, fontWeight: '900', letterSpacing: -1.5, marginBottom: 4 },
  location: { fontSize: 13, marginTop: 3 },
  bell: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  greeting: { fontSize: 21, marginBottom: 2 },
  headline: { fontSize: 30, lineHeight: 36, fontWeight: '900', marginBottom: 8 },
  body: { fontSize: 14, lineHeight: 21 },
  hero: { borderRadius: 22, padding: 22, marginTop: 22, marginBottom: 27, flexDirection: 'row', alignItems: 'center' },
  heroTitle: { color: '#FFF', fontSize: 24, lineHeight: 29, fontWeight: '900', marginBottom: 8, maxWidth: 245 },
  heroBody: { color: '#FFF', fontSize: 14, lineHeight: 20, opacity: 0.94, maxWidth: 260 },
  heroAction: { color: '#FFF', fontSize: 15, fontWeight: '800', marginTop: 16 },
  heroEmoji: { color: '#FFF', fontSize: 45, marginLeft: 8 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, marginTop: 5 },
  sectionTitle: { fontSize: 19, fontWeight: '900' },
  link: { fontSize: 15, fontWeight: '700' },
  horizontal: { paddingBottom: 18, gap: 10 },
  categoryCard: { width: 104, minHeight: 128, borderRadius: 18, borderWidth: 1, padding: 12, alignItems: 'center', justifyContent: 'center' },
  categoryIcon: { width: 62, height: 62, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  categoryName: { fontSize: 14, lineHeight: 19, fontWeight: '700', textAlign: 'center' },
  requestCard: { padding: 18, borderRadius: 18, borderWidth: 1, marginBottom: 24 },
  requestStatus: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', marginBottom: 8 },
  cardTitle: { fontSize: 17, fontWeight: '800', marginBottom: 6 },
  reelsPlaceholder: { borderRadius: 18, borderWidth: 1, padding: 18 },
  empty: { padding: 18, borderRadius: 16, borderWidth: 1, alignItems: 'flex-start', marginBottom: 18 },
  emptyTitle: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  search: { borderWidth: 1, borderRadius: 15, minHeight: 54, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20, marginBottom: 18 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  gridCard: { width: '48%', minHeight: 170, borderRadius: 18, padding: 14 },
  selected: { fontWeight: '800', fontSize: 13, marginTop: 7 },
  selectedBar: { borderWidth: 1, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 12 },
  notice: { borderRadius: 14, padding: 15 },
});
