import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useWorkoTheme } from '../../design-system/ThemeProvider';

declare const process: { env: { EXPO_PUBLIC_API_URL?: string } };
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000/api/v1';
type SavedReel = { id: string; mediaUrl?: string; caption?: string; publishedAt?: string; creator?: { id?: string; role?: string } };

export function SavedReelsScreen({ accessToken }: { accessToken: string }) {
  const { theme } = useWorkoTheme();
  const [reels, setReels] = useState<SavedReel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/reels/saved`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Saved reels are temporarily unavailable.');
      const rows = Array.isArray(payload) ? payload : payload.data ?? payload.reels ?? [];
      setReels(rows.filter((item: SavedReel) => item?.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load saved reels.');
      setReels([]);
    } finally { setLoading(false); setRefreshing(false); }
  }, [accessToken]);
  useEffect(() => { void load(); }, [load]);

  const unsave = async (id: string) => {
    setBusyId(id);
    try {
      const response = await fetch(`${API_BASE_URL}/reels/${encodeURIComponent(id)}/save`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'Could not remove saved reel.');
      setReels(current => current.filter(reel => reel.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove saved reel.');
    } finally { setBusyId(null); }
  };

  return <View style={[styles.root, { backgroundColor: theme.background }]}>
    <View style={styles.header}><Text style={[styles.title, { color: theme.text }]}>Saved Reels</Text><Text style={[styles.subtitle, { color: theme.secondaryText }]}>Videos you've saved to revisit.</Text></View>
    {loading ? <View style={styles.center}><ActivityIndicator color={theme.primary} /><Text style={{ color: theme.secondaryText }}>Loading saved reels…</Text></View> : error && reels.length === 0 ? <View style={styles.center}><Text style={[styles.heading, { color: theme.text }]}>Saved reels unavailable</Text><Text style={[styles.subtitle, { color: theme.secondaryText }]}>{error}</Text><Pressable onPress={() => { setLoading(true); void load(); }} style={[styles.button, { backgroundColor: theme.primary }]}><Text style={styles.buttonText}>Try again</Text></Pressable></View> : reels.length === 0 ? <View style={styles.center}><Text style={[styles.heading, { color: theme.text }]}>Nothing saved yet</Text><Text style={[styles.subtitle, { color: theme.secondaryText }]}>Save reels from the discovery feed and they'll appear here.</Text></View> : <ScrollView contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={theme.primary} />}>
      {error ? <Text style={{ color: theme.primary, marginBottom: 10 }}>{error}</Text> : null}
      {reels.map(reel => <View key={reel.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.video}>{reel.mediaUrl ? <WebView source={{ html: `<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><body style="margin:0;background:#000"><video controls playsinline style="width:100%;height:100%;object-fit:contain" src="${reel.mediaUrl}"></video></body></html>` }} javaScriptEnabled allowsInlineMediaPlayback mediaPlaybackRequiresUserAction style={{ backgroundColor: '#000' }} /> : <Text style={styles.videoHint}>Video source unavailable</Text>}</View>
        <View style={styles.meta}><Text style={[styles.creator, { color: theme.text }]}>Worko creator</Text><Text style={[styles.caption, { color: theme.secondaryText }]}>{reel.caption || 'A look at this creator’s work.'}</Text><Pressable accessibilityRole="button" disabled={busyId === reel.id} onPress={() => void unsave(reel.id)} style={[styles.button, { backgroundColor: theme.primary, opacity: busyId === reel.id ? 0.6 : 1 }]}><Text style={styles.buttonText}>{busyId === reel.id ? 'Removing…' : 'Remove from saved'}</Text></Pressable></View>
      </View>)}
    </ScrollView>}
  </View>;
}
const styles = StyleSheet.create({
 root:{flex:1},header:{padding:20,paddingBottom:12},title:{fontSize:27,fontWeight:'900'},subtitle:{fontSize:14,lineHeight:21,marginTop:5},center:{flex:1,alignItems:'center',justifyContent:'center',padding:28,gap:12},heading:{fontSize:19,fontWeight:'800',textAlign:'center'},list:{padding:14,gap:14},card:{borderWidth:1,borderRadius:18,overflow:'hidden'},video:{height:300,backgroundColor:'#171717',alignItems:'center',justifyContent:'center'},videoHint:{color:'#DDD'},meta:{padding:15},creator:{fontSize:16,fontWeight:'800',marginBottom:6},caption:{fontSize:14,lineHeight:20,marginBottom:14},button:{minHeight:44,borderRadius:12,alignItems:'center',justifyContent:'center',paddingHorizontal:16},buttonText:{color:'#FFF',fontWeight:'800'}
});
