import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useWorkoTheme } from '../../design-system/ThemeProvider';
import { WebView } from 'react-native-webview';

declare const process: { env: { EXPO_PUBLIC_API_URL?: string } };
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000/api/v1';

type Reel = { id: string; caption?: string; mediaUrl?: string; publishedAt?: string; creator?: { id?: string; role?: string }; savedCount?: number };

export function ClientReelsScreen({ accessToken }: { accessToken: string }) {
  const { theme } = useWorkoTheme();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Reel | null>(null);
  const [following, setFollowing] = useState(false);
  const [profileCreatorId, setProfileCreatorId] = useState<string | null>(null);\n  const [savedIds, setSavedIds] = useState<string[]>([]);\n  const [saving, setSaving] = useState(false);\n  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/reels`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Reels are temporarily unavailable.');
      const rows = Array.isArray(payload) ? payload : payload.data ?? payload.reels ?? [];
      setReels(rows.filter((item: Reel) => item?.id));
      const savedResponse = await fetch(`${API_BASE_URL}/reels/saved`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (savedResponse.ok) { const savedPayload = await savedResponse.json(); const savedRows = Array.isArray(savedPayload) ? savedPayload : savedPayload.data ?? savedPayload.reels ?? []; setSavedIds(savedRows.map((item: Reel) => item.id).filter(Boolean)); }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load reels.');
      setReels([]);
    } finally { setLoading(false); setRefreshing(false); }
  }, [accessToken]);
  useEffect(() => { void load(); }, [load]);
  const toggleSave = async (reel: Reel) => {
    setSaving(true); setActionError('');
    const isSaved = savedIds.includes(reel.id);
    try {
      const response = await fetch(`${API_BASE_URL}/reels/${encodeURIComponent(reel.id)}/save`, { method: isSaved ? 'DELETE' : 'POST', headers: { Authorization: `Bearer ${accessToken}` } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'Could not update saved reels.');
      setSavedIds(current => isSaved ? current.filter(id => id !== reel.id) : [...current, reel.id]);
    } catch (e) { setActionError(e instanceof Error ? e.message : 'Could not update saved reels.'); }
    finally { setSaving(false); }
  };
  const shareReel = async (reel: Reel) => {
    try { await Share.share({ message: [reel.caption, reel.mediaUrl].filter(Boolean).join('\\n') || 'Check out this Worko reel' }); }
    catch { setActionError('Sharing is unavailable right now.'); }
  };

  const creatorName = (_reel: Reel) => 'Worko creator';
  const reelText = (reel: Reel) => reel.caption ?? 'A look at this creator’s work.';
  const videoUrl = (reel: Reel) => reel.mediaUrl;

  return <View style={[styles.root, { backgroundColor: theme.background }]}>
    <View style={styles.header}><Text style={[styles.title, { color: theme.text }]}>Worko <Text style={{ color: theme.primary }}>Reels</Text></Text><Text style={[styles.subtitle, { color: theme.secondaryText }]}>Discover work, skills and inspiration from the community.</Text></View>
    <View style={styles.filters}><Pressable onPress={() => setFollowing(false)} accessibilityRole="button" accessibilityState={{ selected: !following }} style={[styles.filter, { backgroundColor: !following ? theme.primary : theme.surface }]}><Text style={{ color: !following ? '#FFF' : theme.text, fontWeight: '700' }}>For You</Text></Pressable><Pressable onPress={() => setFollowing(true)} accessibilityRole="button" accessibilityState={{ selected: following }} style={[styles.filter, { backgroundColor: following ? theme.primary : theme.surface }]}><Text style={{ color: following ? '#FFF' : theme.text, fontWeight: '700' }}>Following</Text></Pressable></View>
    {loading ? <View style={styles.center}><ActivityIndicator color={theme.primary} /><Text style={[styles.muted, { color: theme.secondaryText }]}>Loading reels…</Text></View> : error ? <View style={styles.center}><Text style={[styles.emptyTitle, { color: theme.text }]}>Reels unavailable</Text><Text style={[styles.muted, { color: theme.secondaryText }]}>{error}</Text><Pressable onPress={() => { setLoading(true); void load(); }} style={[styles.retry, { backgroundColor: theme.primary }]}><Text style={styles.retryText}>Try again</Text></Pressable></View> : reels.length === 0 ? <View style={styles.center}><Text style={[styles.emptyTitle, { color: theme.text }]}>{following ? 'Your feed is getting ready' : 'No reels yet'}</Text><Text style={[styles.muted, { color: theme.secondaryText }]}>Creator videos will appear here when they are published and approved. Check back soon.</Text></View> : <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={theme.primary} />} contentContainerStyle={styles.list}>{reels.map(reel => <Pressable key={reel.id} onPress={() => setSelected(reel)} accessibilityRole="button" accessibilityLabel="Open reel details" style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}><View style={styles.video}>{videoUrl(reel) ? <WebView source={{ html: `<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><body style="margin:0;background:#000"><video controls playsinline style="width:100%;height:100%;object-fit:contain" src="${videoUrl(reel)}"></video></body></html>` }} javaScriptEnabled allowsInlineMediaPlayback mediaPlaybackRequiresUserAction style={{ backgroundColor: '#000' }} /> : <Text style={styles.videoHint}>Video source unavailable</Text>}</View><View style={styles.meta}><Text style={[styles.creator, { color: theme.text }]}>{creatorName(reel)}</Text><Text style={[styles.caption, { color: theme.secondaryText }]}>{reelText(reel)}</Text><Text style={[styles.muted, { color: theme.secondaryText, textAlign: 'left', marginTop: 10 }]}>Likes, comments and saves will be enabled when their endpoints are available.</Text></View></Pressable>)}</ScrollView>}
    <Modal visible={Boolean(selected)} animationType="slide" onRequestClose={() => setSelected(null)}><View style={[styles.modal, { backgroundColor: theme.background }]}><View style={styles.modalHeader}><Text style={[styles.modalTitle, { color: theme.text }]}>Reel details</Text><Pressable onPress={() => setSelected(null)}><Text style={[styles.close, { color: theme.primary }]}>Close ✕</Text></Pressable></View>{selected ? <><View style={styles.detailVideo}>{videoUrl(selected) ? <WebView source={{ html: `<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><body style="margin:0;background:#000"><video controls playsinline style="width:100%;height:100%;object-fit:contain" src="${videoUrl(selected)}"></video></body></html>` }} javaScriptEnabled allowsInlineMediaPlayback mediaPlaybackRequiresUserAction style={{ backgroundColor: "#000" }} /> : <Text style={styles.videoHint}>Video source unavailable</Text>}</View><Pressable accessibilityRole="button" disabled={!selected.creator?.id} onPress={() => setProfileCreatorId(selected?.creator?.id ?? null)}><Text style={[styles.creator, { color: theme.primary }]}>{creatorName(selected)} · View profile</Text></Pressable><Text style={[styles.caption, { color: theme.secondaryText }]}>{reelText(selected)}</Text><Text style={[styles.section, { color: theme.text }]}>Comments</Text><Text style={[styles.muted, { color: theme.secondaryText }]}>Comments are not available yet.</Text><View style={{ flexDirection: 'row', gap: 12, marginTop: 18 }}><Pressable disabled={saving} onPress={() => void toggleSave(selected)} style={[styles.retry, { backgroundColor: theme.primary }]}><Text style={styles.retryText}>{savedIds.includes(selected.id) ? 'Remove saved' : 'Save reel'}</Text></Pressable><Pressable onPress={() => void shareReel(selected)} style={[styles.retry, { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }]}><Text style={{ color: theme.text, fontWeight: '800' }}>Share</Text></Pressable></View>{actionError ? <Text style={{ color: theme.primary, marginTop: 10 }}>{actionError}</Text> : null}</> : null}</View></Modal>
    <Modal visible={Boolean(profileCreatorId)} animationType="slide" onRequestClose={() => setProfileCreatorId(null)}><View style={[styles.modal, { backgroundColor: theme.background }]}><View style={styles.modalHeader}><Text style={[styles.modalTitle, { color: theme.text }]}>Creator profile</Text><Pressable onPress={() => setProfileCreatorId(null)}><Text style={[styles.close, { color: theme.primary }]}>Close ✕</Text></Pressable></View><View style={[styles.profileAvatar, { backgroundColor: theme.primary }]}><Text style={styles.avatarText}>W</Text></View><Text style={[styles.modalTitle, { color: theme.text, textAlign: 'center' }]}>Worko creator</Text><Text style={[styles.muted, { color: theme.secondaryText, marginTop: 8 }]}>Public profile details and biography are not currently available.</Text><Text style={[styles.section, { color: theme.text }]}>Published reels</Text><ScrollView>{reels.filter(item => item.creator?.id === profileCreatorId).map(item => <Pressable key={item.id} onPress={() => { setProfileCreatorId(null); setSelected(item); }} style={[styles.profileReel, { borderColor: theme.border }]}><Text style={[styles.caption, { color: theme.text }]}>{reelText(item)}</Text><Text style={{ color: theme.primary, marginTop: 6 }}>View reel →</Text></Pressable>)}</ScrollView></View></Modal>
  </View>;
}
const styles = StyleSheet.create({
 root:{flex:1},header:{paddingHorizontal:20,paddingTop:18,paddingBottom:12},title:{fontSize:27,fontWeight:'900'},subtitle:{fontSize:13,lineHeight:19,marginTop:4},filters:{flexDirection:'row',gap:8,paddingHorizontal:20,paddingBottom:12},filter:{paddingVertical:10,paddingHorizontal:18,borderRadius:22},center:{flex:1,alignItems:'center',justifyContent:'center',padding:28,gap:12},emptyTitle:{fontSize:19,fontWeight:'800',textAlign:'center'},muted:{fontSize:14,lineHeight:21,textAlign:'center'},retry:{paddingHorizontal:20,paddingVertical:12,borderRadius:12,marginTop:8},retryText:{color:'#FFF',fontWeight:'800'},list:{padding:14,gap:14},card:{borderWidth:1,borderRadius:18,overflow:'hidden'},detailVideo:{height:280,backgroundColor:"#171717",borderRadius:16,overflow:"hidden",marginBottom:20},video:{height:310,backgroundColor:'#171717',alignItems:'center',justifyContent:'center'},play:{color:'#FFF',fontSize:36},videoHint:{color:'#DDD',fontSize:12,marginTop:8},meta:{padding:15},creator:{fontSize:16,fontWeight:'800',marginBottom:6},caption:{fontSize:14,lineHeight:20},actions:{flexDirection:'row',justifyContent:'space-between',gap:10,marginTop:14,flexWrap:'wrap'},action:{fontSize:13,fontWeight:'700'},profileAvatar:{width:84,height:84,borderRadius:42,alignSelf:'center',alignItems:'center',justifyContent:'center',marginBottom:14},avatarText:{color:'#FFF',fontSize:32,fontWeight:'900'},profileReel:{padding:14,borderWidth:1,borderRadius:12,marginBottom:10},modal:{flex:1,padding:20,paddingTop:52},modalHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:24},modalTitle:{fontSize:22,fontWeight:'900'},close:{fontSize:15,fontWeight:'800'},section:{fontSize:17,fontWeight:'800',marginTop:30,marginBottom:10},commentRow:{flexDirection:'row',gap:8,marginTop:20},commentInput:{flex:1,borderWidth:1,borderRadius:12,paddingHorizontal:12,minHeight:46},send:{paddingHorizontal:18,justifyContent:'center',borderRadius:12}
});
