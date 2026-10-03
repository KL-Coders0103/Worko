import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useWorkoTheme } from '../../design-system/ThemeProvider';

declare const process: { env: { EXPO_PUBLIC_API_URL?: string } };
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000/api/v1';

type Reel = { id: string; caption?: string; description?: string; videoUrl?: string; video_url?: string; thumbnailUrl?: string; thumbnail_url?: string; creator?: { name?: string; username?: string }; worker?: { name?: string }; likesCount?: number; commentsCount?: number };

export function ClientReelsScreen() {
  const { theme } = useWorkoTheme();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Reel | null>(null);
  const [comment, setComment] = useState('');
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [following, setFollowing] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/reels`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Reels are temporarily unavailable.');
      const rows = Array.isArray(payload) ? payload : payload.data ?? payload.reels ?? [];
      setReels(rows.filter((item: Reel) => item?.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load reels.');
      setReels([]);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const creatorName = (reel: Reel) => reel.creator?.name ?? reel.creator?.username ?? reel.worker?.name ?? 'Worko creator';
  const reelText = (reel: Reel) => reel.caption ?? reel.description ?? 'A look at this creator’s work.';
  const hasVideo = (reel: Reel) => Boolean(reel.videoUrl ?? reel.video_url);

  return <View style={[styles.root, { backgroundColor: theme.background }]}>
    <View style={styles.header}><Text style={[styles.title, { color: theme.text }]}>Worko <Text style={{ color: theme.primary }}>Reels</Text></Text><Text style={[styles.subtitle, { color: theme.secondaryText }]}>Discover work, skills and inspiration from the community.</Text></View>
    <View style={styles.filters}><Pressable onPress={() => setFollowing(false)} accessibilityRole="button" accessibilityState={{ selected: !following }} style={[styles.filter, { backgroundColor: !following ? theme.primary : theme.surface }]}><Text style={{ color: !following ? '#FFF' : theme.text, fontWeight: '700' }}>For You</Text></Pressable><Pressable onPress={() => setFollowing(true)} accessibilityRole="button" accessibilityState={{ selected: following }} style={[styles.filter, { backgroundColor: following ? theme.primary : theme.surface }]}><Text style={{ color: following ? '#FFF' : theme.text, fontWeight: '700' }}>Following</Text></Pressable></View>
    {loading ? <View style={styles.center}><ActivityIndicator color={theme.primary} /><Text style={[styles.muted, { color: theme.secondaryText }]}>Loading reels…</Text></View> : error ? <View style={styles.center}><Text style={[styles.emptyTitle, { color: theme.text }]}>Reels unavailable</Text><Text style={[styles.muted, { color: theme.secondaryText }]}>{error}</Text><Pressable onPress={() => { setLoading(true); void load(); }} style={[styles.retry, { backgroundColor: theme.primary }]}><Text style={styles.retryText}>Try again</Text></Pressable></View> : reels.length === 0 ? <View style={styles.center}><Text style={[styles.emptyTitle, { color: theme.text }]}>{following ? 'Your feed is getting ready' : 'No reels yet'}</Text><Text style={[styles.muted, { color: theme.secondaryText }]}>Creator videos will appear here when they are published and approved. Check back soon.</Text></View> : <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={theme.primary} />} contentContainerStyle={styles.list}>{reels.map(reel => <View key={reel.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}><Pressable accessibilityRole="button" onPress={() => setSelected(reel)} style={styles.video}><Text style={styles.play}>{hasVideo(reel) ? '▶' : '▣'}</Text><Text style={styles.videoHint}>{hasVideo(reel) ? 'Open reel' : 'Video preview unavailable'}</Text></Pressable><View style={styles.meta}><Text style={[styles.creator, { color: theme.text }]}>{creatorName(reel)}</Text><Text style={[styles.caption, { color: theme.secondaryText }]}>{reelText(reel)}</Text><View style={styles.actions}><Pressable onPress={() => setLiked(p => ({ ...p, [reel.id]: !p[reel.id] }))}><Text style={[styles.action, { color: liked[reel.id] ? theme.primary : theme.text }]}>{liked[reel.id] ? '♥ Liked' : '♡ Like'} · {reel.likesCount ?? 0}</Text></Pressable><Pressable onPress={() => setSelected(reel)}><Text style={[styles.action, { color: theme.text }]}>◯ Comments · {reel.commentsCount ?? 0}</Text></Pressable><Pressable onPress={() => setSaved(p => ({ ...p, [reel.id]: !p[reel.id] }))}><Text style={[styles.action, { color: saved[reel.id] ? theme.primary : theme.text }]}>{saved[reel.id] ? '▣ Saved' : '▢ Save'}</Text></Pressable></View></View></View>)}</ScrollView>}
    <Modal visible={Boolean(selected)} animationType="slide" onRequestClose={() => setSelected(null)}><View style={[styles.modal, { backgroundColor: theme.background }]}><View style={styles.modalHeader}><Text style={[styles.modalTitle, { color: theme.text }]}>Reel details</Text><Pressable onPress={() => setSelected(null)}><Text style={[styles.close, { color: theme.primary }]}>Close ✕</Text></Pressable></View>{selected ? <><Text style={[styles.creator, { color: theme.text }]}>{creatorName(selected)}</Text><Text style={[styles.caption, { color: theme.secondaryText }]}>{reelText(selected)}</Text><Text style={[styles.section, { color: theme.text }]}>Comments</Text><Text style={[styles.muted, { color: theme.secondaryText }]}>Comments will be shown here once the comments API is connected.</Text><View style={styles.commentRow}><TextInput value={comment} onChangeText={setComment} placeholder="Add a comment…" placeholderTextColor={theme.secondaryText} style={[styles.commentInput, { color: theme.text, borderColor: theme.border }]} /><Pressable onPress={() => setComment('')} style={[styles.send, { backgroundColor: theme.primary }]}><Text style={styles.retryText}>Post</Text></Pressable></View></> : null}</View></Modal>
  </View>;
}
const styles = StyleSheet.create({
 root:{flex:1},header:{paddingHorizontal:20,paddingTop:18,paddingBottom:12},title:{fontSize:27,fontWeight:'900'},subtitle:{fontSize:13,lineHeight:19,marginTop:4},filters:{flexDirection:'row',gap:8,paddingHorizontal:20,paddingBottom:12},filter:{paddingVertical:10,paddingHorizontal:18,borderRadius:22},center:{flex:1,alignItems:'center',justifyContent:'center',padding:28,gap:12},emptyTitle:{fontSize:19,fontWeight:'800',textAlign:'center'},muted:{fontSize:14,lineHeight:21,textAlign:'center'},retry:{paddingHorizontal:20,paddingVertical:12,borderRadius:12,marginTop:8},retryText:{color:'#FFF',fontWeight:'800'},list:{padding:14,gap:14},card:{borderWidth:1,borderRadius:18,overflow:'hidden'},video:{height:310,backgroundColor:'#171717',alignItems:'center',justifyContent:'center'},play:{color:'#FFF',fontSize:36},videoHint:{color:'#DDD',fontSize:12,marginTop:8},meta:{padding:15},creator:{fontSize:16,fontWeight:'800',marginBottom:6},caption:{fontSize:14,lineHeight:20},actions:{flexDirection:'row',justifyContent:'space-between,',gap:10,marginTop:14,flexWrap:'wrap'},action:{fontSize:13,fontWeight:'700'},modal:{flex:1,padding:20,paddingTop:52},modalHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:24},modalTitle:{fontSize:22,fontWeight:'900'},close:{fontSize:15,fontWeight:'800'},section:{fontSize:17,fontWeight:'800',marginTop:30,marginBottom:10},commentRow:{flexDirection:'row',gap:8,marginTop:20},commentInput:{flex:1,borderWidth:1,borderRadius:12,paddingHorizontal:12,minHeight:46},send:{paddingHorizontal:18,justifyContent:'center',borderRadius:12}
});
