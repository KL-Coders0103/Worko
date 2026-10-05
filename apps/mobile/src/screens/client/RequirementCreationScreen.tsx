import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, PermissionsAndroid, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { launchImageLibrary, type Asset } from 'react-native-image-picker';
import Geolocation from 'react-native-geolocation-service';
import { useWorkoTheme } from '../../design-system/ThemeProvider';
import { apiAssetUrl, apiRequest, uploadRequirementPhotos } from '../../services/api/client';

type Category = { id: string; name: string; slug: string; isActive?: boolean };
type Draft = {
  categoryId: string; title: string; description: string; photos: string[];
  address: string; latitude: number | null; longitude: number | null; building: string; floor: string; landmark: string;
  scheduleType: 'ASAP' | 'LATER' | 'FLEXIBLE'; scheduledAt: string; duration: '1-2 hours' | '2-4 hours' | 'Full day';
  verifiedOnly: boolean; experiencedOnly: boolean; instructions: string;
};
const EMPTY: Draft = { categoryId: '', title: '', description: '', photos: [], address: '', latitude: null, longitude: null, building: '', floor: '', landmark: '', scheduleType: 'ASAP', scheduledAt: new Date(Date.now() + 86400000).toISOString(), duration: '1-2 hours', verifiedOnly: true, experiencedOnly: false, instructions: '' };
const STORAGE_KEY = 'worko.requirement.draft.v1';
const ORANGE = '#FF6B00';


export function RequirementCreationScreen({ accessToken }: { accessToken: string }) {
  const { theme } = useWorkoTheme();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryQuery, setCategoryQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [datePicker, setDatePicker] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft(old => ({ ...old, [key]: value }));

  const persistDraft = async (showError = false): Promise<boolean> => {
    const serialized = JSON.stringify(draft);
    setSaving(true);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, serialized);
      const response = await apiRequest('/requirements/draft', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: serialized,
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || 'Unable to save your draft.');
      }
      return true;
    } catch (error) {
      if (showError) Alert.alert('Draft not saved', error instanceof Error ? error.message : 'Please try again.');
      return false;
    } finally {
      setSaving(false);
    }
  };
  const selectedCategory = categories.find(item => item.id === draft.categoryId);
  const filteredCategories = useMemo(() => categories.filter(item => item.name.toLowerCase().includes(categoryQuery.trim().toLowerCase())), [categories, categoryQuery]);
  

  useEffect(() => {
    let active = true;
    Promise.all([
      apiRequest('/categories').then(async response => { const payload = await response.json(); if (!response.ok) throw new Error(payload.message || 'Unable to load categories'); return Array.isArray(payload) ? payload : payload.data ?? payload.categories ?? []; }),
      AsyncStorage.getItem(STORAGE_KEY),
      apiRequest('/requirements/draft', { headers: { Authorization: `Bearer ${accessToken}` } }).then(async response => {
        if (!response.ok) return null;
        const payload = await response.json().catch(() => null);
        return payload?.data?.payload ?? null;
      }).catch(() => null),
    ]).then(([rows, saved, remoteDraft]) => {
      if (!active) return;
      setCategories(rows.filter((item: Category) => item?.id && item?.name && item.isActive !== false));
      const localDraft = saved ? (() => { try { return JSON.parse(saved); } catch { void AsyncStorage.removeItem(STORAGE_KEY); return null; } })() : null;
      const restored = remoteDraft ?? localDraft;
      if (restored && typeof restored === 'object') setDraft({ ...EMPTY, ...restored });
    }).catch(error => Alert.alert('Unable to load', error instanceof Error ? error.message : 'Please try again.')).finally(() => { if (active) { setLoading(false); setDraftLoaded(true); } });
    return () => { active = false; };
  }, [accessToken]);


  const useCurrentLocation = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) { Alert.alert('Location permission required', 'Allow location access to use your current position.'); return; }
      }
      Geolocation.getCurrentPosition(position => {
        setDraft(old => ({ ...old, latitude: position.coords.latitude, longitude: position.coords.longitude }));
        Alert.alert('Location confirmed', 'Your current coordinates have been saved. Please enter or verify the address.');
      }, error => Alert.alert('Unable to get location', error.message || 'Check location services and try again.'), { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 });
    } catch (error) { Alert.alert('Location unavailable', error instanceof Error ? error.message : 'Please try again.'); }
  };
  const addPhotos = async () => {
    if (draft.photos.length >= 5) { Alert.alert('Photo limit', 'You can attach up to 5 photos.'); return; }
    const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 5 - draft.photos.length, quality: 0.8 });
    if (result.didCancel) return;
    if (result.errorCode) { Alert.alert('Photo selection failed', result.errorMessage || 'Please try again.'); return; }
    const uris = (result.assets ?? []).map((asset: Asset) => asset.uri).filter((uri): uri is string => Boolean(uri));
    update('photos', [...draft.photos, ...uris].slice(0, 5));
  };
  const next = async () => {
    if (step === 0 && !draft.categoryId) { Alert.alert('Choose a category', 'Select the service category to continue.'); return; }
    if (step === 1 && (draft.title.trim().length < 4 || draft.title.trim().length > 80 || draft.description.trim().length < 10 || draft.description.trim().length > 500)) { Alert.alert('Check work details', 'Enter a title between 4 and 80 characters and a description between 10 and 500 characters.'); return; }
    if (step === 2 && (draft.address.trim().length < 5 || draft.latitude === null || draft.longitude === null)) { Alert.alert('Confirm your location', 'Enter the address and use Current location to confirm the service coordinates.'); return; }
    if (step === 3 && draft.scheduleType === 'LATER' && (!Number.isFinite(new Date(draft.scheduledAt).getTime()) || new Date(draft.scheduledAt).getTime() <= Date.now())) { Alert.alert('Choose a future time', 'The scheduled date and time must be in the future.'); return; }

    const saved = await persistDraft(true);
    if (!saved) return;
    setStep(current => Math.min(4, current + 1));
  };
  const submit = async () => {
    if (!selectedCategory) { setStep(0); Alert.alert('Choose a category', 'Select an active service category before submitting.'); return; }
    if (draft.address.trim().length < 5 || draft.latitude === null || draft.longitude === null) { setStep(2); Alert.alert('Confirm your location', 'A complete address and coordinates are required.'); return; }
    if (draft.title.trim().length < 4 || draft.description.trim().length < 10) { setStep(1); Alert.alert('Check work details', 'Add a valid title and detailed description.'); return; }

    setSubmitting(true);
    setUploadProgress(0);
    try {
      const localPhotos = draft.photos.filter(uri => !uri.startsWith('/uploads/requirements/') && !/^https?:\\/\\//i.test(uri));
      const uploadedPhotos = localPhotos.length
        ? await uploadRequirementPhotos(localPhotos, accessToken, setUploadProgress)
        : [];
      const existingRemotePhotos = draft.photos.filter(uri => !localPhotos.includes(uri));
      const photos = [...existingRemotePhotos, ...uploadedPhotos].slice(0, 5);

      const response = await apiRequest('/requirements', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({
        categoryId: draft.categoryId, title: draft.title.trim(), description: draft.description.trim(),
        address: [draft.address.trim(), draft.building.trim(), draft.floor.trim(), draft.landmark.trim() ? `Near ${draft.landmark.trim()}` : ''].filter(Boolean).join(', '),
        latitude: draft.latitude, longitude: draft.longitude, scheduledAt: draft.scheduleType === 'LATER' ? draft.scheduledAt : null,
        budget: null, photos, preferences: { verifiedOnly: draft.verifiedOnly, experiencedOnly: draft.experiencedOnly, duration: draft.duration, instructions: draft.instructions.trim() },
      }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'Could not submit your requirement.');

      await AsyncStorage.removeItem(STORAGE_KEY);
      await apiRequest('/requirements/draft', { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }).catch(() => undefined);
      Alert.alert('Requirement submitted', 'Your requirement is saved as payment pending. Complete secure payment from your requests to start worker matching.', [{ text: 'Done', onPress: () => { setDraft(EMPTY); setStep(0); setUploadProgress(0); } }]);
    } catch (error) {
      Alert.alert('Submission failed', error instanceof Error ? error.message : 'Please try again. Your draft is still saved.');
    } finally { setSubmitting(false); }
  };
  const card = (children: React.ReactNode, selected = false) => <View style={[styles.card, { backgroundColor: theme.surface, borderColor: selected ? theme.primary : theme.border }]}>{children}</View>;
  const field = (label: string, value: string, onChangeText: (value: string) => void, placeholder: string, multiline = false, maxLength?: number) => <View style={styles.field}><Text style={[styles.label, { color: theme.text }]}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={theme.secondaryText} maxLength={maxLength} multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'} style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }, multiline && styles.multiline]} /></View>;
  const pill = (label: string, active: boolean, onPress: () => void) => <Pressable onPress={onPress} style={[styles.pill, { borderColor: active ? theme.primary : theme.border, backgroundColor: active ? '#FFF2E8' : theme.surface }]}><Text style={{ color: active ? ORANGE : theme.text, fontWeight: active ? '800' : '600' }}>{label}</Text></Pressable>;
  if (loading) return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator color={theme.primary}/><Text style={{ color: theme.secondaryText, marginTop: 10 }}>Preparing your requirement…</Text></View>;
  return <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={[styles.header, { borderBottomColor: theme.border }]}><Pressable onPress={() => step > 0 ? setStep(step - 1) : Alert.alert('Leave requirement?', 'Your progress is saved as a draft.', [{ text: 'Stay' }, { text: 'Leave', onPress: () => setStep(0) }])}><Text style={[styles.back, { color: theme.text }]}>‹</Text></Pressable><Text style={[styles.brand, { color: theme.text }]}>W<Text style={{ color: ORANGE }}>o</Text>rk<Text style={{ color: ORANGE }}>o</Text></Text><Text style={{ color: theme.secondaryText }}>Step {step + 1} of 5</Text></View>
    <View style={styles.progress}>{[0,1,2,3,4].map(i => <View key={i} style={[styles.segment, { backgroundColor: i <= step ? theme.primary : theme.border }]}/>)}</View>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={[styles.title, { color: theme.text }]}>{['What work do you need?','Describe your work','Select work location','Schedule your work','Review your requirement'][step]}</Text>
      <Text style={[styles.subtitle, { color: theme.secondaryText }]}>{['Select a category and we’ll find eligible workers near you.','Tell us what you need so workers can understand the task.','Choose the exact location where the work needs to be done.','Let us know when you need the work completed.','Review the details before proceeding to secure payment.'][step]}</Text>
      {step === 0 && <>
        <TextInput value={categoryQuery} onChangeText={setCategoryQuery} placeholder="Search for a service (e.g. cleaning, plumbing…)" placeholderTextColor={theme.secondaryText} style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface, marginBottom: 14 }]}/>
        <View style={styles.categoryGrid}>{filteredCategories.map(item => <Pressable key={item.id} onPress={() => update('categoryId', item.id)} style={[styles.category, { backgroundColor: theme.surface, borderColor: draft.categoryId === item.id ? theme.primary : theme.border, borderWidth: draft.categoryId === item.id ? 2 : 1 }]}><Text style={[styles.categoryIcon, { color: theme.primary }]}>{item.name.slice(0,1).toUpperCase()}</Text><Text style={{ color: theme.text, fontWeight: '800' }}>{item.name}</Text><Text style={{ color: theme.secondaryText, fontSize: 12 }}>{draft.categoryId === item.id ? '✓ Selected' : 'Tap to select'}</Text></Pressable>)}</View>
        {card(<><Text style={{ color: theme.secondaryText }}>Selected category</Text><Text style={[styles.cardTitle, { color: theme.text }]}>{selectedCategory?.name ?? 'Choose a category above'}</Text></>)}
      </>}
      {step === 1 && <>
        {card(<><Text style={{ color: theme.secondaryText }}>Selected category</Text><Text style={[styles.cardTitle, { color: theme.text }]}>{selectedCategory?.name ?? 'Category'}</Text></>)}
        {field('Title *', draft.title, v => update('title', v), 'e.g. Install ceiling fan, fix leaking tap…', false, 80)}
        <Text style={[styles.counter, { color: theme.secondaryText }]}>{draft.title.length}/80</Text>
        {field('Description *', draft.description, v => update('description', v), 'Describe the work in detail, special requirements, and other information.', true, 500)}
        <Text style={[styles.counter, { color: theme.secondaryText }]}>{draft.description.length}/500</Text>
        <Text style={[styles.label, { color: theme.text, marginTop: 16 }]}>Add photos (optional) · {draft.photos.length}/5</Text><Text style={{ color: theme.secondaryText, marginBottom: 10 }}>Clear photos help workers understand your requirement.</Text>
        <View style={styles.photos}><Pressable onPress={addPhotos} style={[styles.addPhoto, { borderColor: theme.border }]}><Text style={{ fontSize: 30, color: theme.primary }}>＋</Text><Text style={{ color: theme.secondaryText }}>Add photo</Text></Pressable>{draft.photos.map((uri, index) => <View key={uri + index} style={styles.photo}><Image source={{ uri: apiAssetUrl(uri) }} style={styles.photoImage}/><Pressable onPress={() => update('photos', draft.photos.filter((_, i) => i !== index))} style={styles.removePhoto}><Text style={{ color: '#FFF', fontWeight: '900' }}>×</Text></Pressable></View>)}</View>
        <Text style={[styles.label, { color: theme.text, marginTop: 18 }]}>Additional preferences</Text>
        <View style={styles.switchRow}><Text style={{ color: theme.text, flex: 1 }}>Prefer verified workers only</Text><Switch value={draft.verifiedOnly} onValueChange={v => update('verifiedOnly',v)} trackColor={{ true: ORANGE }}/></View>
        <View style={styles.switchRow}><Text style={{ color: theme.text, flex: 1 }}>Prefer experienced workers (3+ years)</Text><Switch value={draft.experiencedOnly} onValueChange={v => update('experiencedOnly',v)} trackColor={{ true: ORANGE }}/></View>
        {field('Additional instructions (optional)', draft.instructions, v => update('instructions',v), 'Any access instructions or details…', true, 500)}
      </>}
      {step === 2 && <>
        {field('Search or enter address *', draft.address, v => update('address',v), 'Address, area, or landmark')}
        <Pressable onPress={useCurrentLocation} style={[styles.pill, { borderColor: theme.primary, alignSelf: 'flex-start', marginBottom: 12 }]}><Text style={{ color: ORANGE, fontWeight: '800' }}>◎ Use current location</Text></Pressable>
        <Text style={{ color: theme.secondaryText, marginBottom: 12 }}>{draft.latitude !== null && draft.longitude !== null ? `Coordinates confirmed: ${draft.latitude.toFixed(5)}, ${draft.longitude.toFixed(5)}` : 'Confirm your coordinates with current location before continuing.'}</Text>
        <Text style={{ color: theme.secondaryText, marginBottom: 14 }}>Enter a complete address. You can adjust the map coordinates in a future map-picker enhancement; the address is used for this request.</Text>
        {field('Flat / house / building', draft.building, v => update('building',v), 'Flat / House / Building name')}
        {field('Floor / house number', draft.floor, v => update('floor',v), 'Floor / House no.')}
        {field('Landmark (optional)', draft.landmark, v => update('landmark',v), 'e.g. Near the park')}
        {card(<><Text style={{ color: theme.text, fontWeight: '800' }}>Location privacy</Text><Text style={{ color: theme.secondaryText, marginTop: 5 }}>Your location is shared with eligible workers only as needed to respond to this requirement.</Text></>)}
      </>}
      {step === 3 && <>
        <Text style={[styles.label, { color: theme.text }]}>When should work happen?</Text><View style={styles.row}>{pill('As soon as possible', draft.scheduleType === 'ASAP', () => update('scheduleType','ASAP'))}{pill('Schedule for later', draft.scheduleType === 'LATER', () => update('scheduleType','LATER'))}{pill('Flexible date', draft.scheduleType === 'FLEXIBLE', () => update('scheduleType','FLEXIBLE'))}</View>
        {draft.scheduleType === 'LATER' && <>{card(<Pressable onPress={() => setDatePicker(true)}><Text style={{ color: theme.secondaryText }}>Selected date & time</Text><Text style={[styles.cardTitle, { color: theme.text }]}>{new Date(draft.scheduledAt).toLocaleString()}</Text><Text style={{ color: ORANGE, marginTop: 8 }}>Change date and time ›</Text></Pressable>)}{datePicker && <DateTimePicker value={new Date(draft.scheduledAt)} minimumDate={new Date(Date.now()+60000)} mode="datetime" onChange={(_, date) => { setDatePicker(false); if (date) update('scheduledAt',date.toISOString()); }}/>}</>}
        <Text style={[styles.label, { color: theme.text, marginTop: 20 }]}>Estimated duration</Text><View style={styles.row}>{(['1-2 hours','2-4 hours','Full day'] as Draft['duration'][]).map(d => pill(d, draft.duration === d, () => update('duration',d)))}</View>
        {card(<><Text style={{ color: theme.text, fontWeight: '800' }}>ⓘ Estimated time only</Text><Text style={{ color: theme.secondaryText, marginTop: 5 }}>Final duration may vary depending on the work and worker assessment.</Text></>)}
      </>}
      {step === 4 && <>
        {card(<><Text style={{ color: theme.secondaryText }}>Service category</Text><Text style={[styles.cardTitle, { color: theme.text }]}>{selectedCategory?.name}</Text><Pressable onPress={() => setStep(0)}><Text style={{ color: ORANGE, marginTop: 8 }}>Edit category ›</Text></Pressable></>)}
        {card(<><Text style={{ color: theme.secondaryText }}>Work details</Text><Text style={[styles.cardTitle, { color: theme.text }]}>{draft.title}</Text><Text style={{ color: theme.secondaryText }}>{draft.description}</Text><View style={styles.photos}>{draft.photos.map((uri,i)=><Image key={uri+i} source={{ uri: apiAssetUrl(uri) }} style={styles.reviewPhoto}/>)}</View><Pressable onPress={() => setStep(1)}><Text style={{ color: ORANGE, marginTop: 8 }}>Edit details ›</Text></Pressable></>)}
        {card(<><Text style={{ color: theme.secondaryText }}>Work location</Text><Text style={[styles.cardTitle, { color: theme.text }]}>{[draft.address,draft.building,draft.floor,draft.landmark].filter(Boolean).join(', ')}</Text><Pressable onPress={() => setStep(2)}><Text style={{ color: ORANGE, marginTop: 8 }}>Edit location ›</Text></Pressable></>)}
        {card(<><Text style={{ color: theme.secondaryText }}>Schedule</Text><Text style={[styles.cardTitle, { color: theme.text }]}>{draft.scheduleType === 'ASAP' ? 'As soon as possible' : draft.scheduleType === 'FLEXIBLE' ? 'Flexible date' : new Date(draft.scheduledAt).toLocaleString()}</Text><Text style={{ color: theme.secondaryText }}>Estimated duration: {draft.duration}</Text><Pressable onPress={() => setStep(3)}><Text style={{ color: ORANGE, marginTop: 8 }}>Edit schedule ›</Text></Pressable></>)}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Estimated pricing</Text>
        {card(<><Text style={{ color: theme.secondaryText }}>Estimated service cost</Text><Text style={[styles.price, { color: theme.text }]}>Quote pending</Text><Text style={{ color: theme.secondaryText }}>A verified estimate will be shown when configured pricing rules are available. No price has been invented for this request.</Text></>)}
        {card(<><Text style={{ color: theme.text, fontWeight: '800' }}>Secure payment to start matching</Text><Text style={{ color: theme.secondaryText, marginTop: 6 }}>Payment is handled separately. Worker matching must not begin until payment is confirmed.</Text></>)}
      </>}
      <Text style={[styles.saveStatus, { color: theme.secondaryText }]}>{saving ? 'Saving draft…' : 'Draft is saved at each step'}</Text>
    </ScrollView>
    <View style={[styles.footer, { backgroundColor: theme.surface, borderTopColor: theme.border }]}><Pressable disabled={saving} onPress={() => { void persistDraft(true).then(saved => { if (saved) Alert.alert('Draft saved', 'You can resume this requirement later.'); }); }}><Text style={{ color: theme.secondaryText, fontWeight: '700' }}>Save draft</Text></Pressable><Pressable disabled={submitting} onPress={step === 4 ? submit : next} style={[styles.next, submitting && { opacity: 0.65 }]}>{submitting ? <View style={styles.submitProgress}><ActivityIndicator color="#FFF"/><Text style={styles.nextText}>{uploadProgress > 0 && uploadProgress < 100 ? `Uploading photos ${uploadProgress}%` : 'Submitting…'}</Text></View> : <Text style={styles.nextText}>{step === 4 ? 'Proceed to payment →' : 'Next →'}</Text>}</Pressable></View>
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({
  center:{flex:1,alignItems:'center',justifyContent:'center'}, header:{height:58,paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:StyleSheet.hairlineWidth},back:{fontSize:36,width:35},brand:{fontSize:26,fontWeight:'900',letterSpacing:-1.2},progress:{flexDirection:'row',gap:6,paddingHorizontal:20,paddingTop:12},segment:{height:6,flex:1,borderRadius:5},content:{padding:20,paddingBottom:30},title:{fontSize:29,lineHeight:35,fontWeight:'900'},subtitle:{fontSize:15,lineHeight:22,marginTop:7,marginBottom:20},categoryGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},category:{width:'48%',minHeight:110,borderRadius:14,padding:12,justifyContent:'space-between'},categoryIcon:{fontSize:26,fontWeight:'900'},card:{borderWidth:1,borderRadius:15,padding:15,marginTop:12},cardTitle:{fontSize:17,fontWeight:'800',marginTop:5},field:{marginTop:13},label:{fontSize:15,fontWeight:'800',marginBottom:8},input:{minHeight:52,borderWidth:1,borderRadius:12,paddingHorizontal:14,fontSize:15},multiline:{height:120,paddingTop:13},counter:{textAlign:'right',fontSize:12,marginTop:4},photos:{flexDirection:'row',flexWrap:'wrap',gap:9,marginTop:10},addPhoto:{width:104,height:104,borderWidth:1,borderStyle:'dashed',borderRadius:12,alignItems:'center',justifyContent:'center'},photo:{width:104,height:104},photoImage:{width:'100%',height:'100%',borderRadius:12},removePhoto:{position:'absolute',right:4,top:4,backgroundColor:'#222',width:24,height:24,borderRadius:12,alignItems:'center',justifyContent:'center'},row:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:10},pill:{borderWidth:1,borderRadius:12,paddingVertical:13,paddingHorizontal:12},switchRow:{flexDirection:'row',alignItems:'center',paddingVertical:10,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#DDD'},reviewPhoto:{width:75,height:75,borderRadius:8},sectionTitle:{fontSize:20,fontWeight:'900',marginTop:20},price:{fontSize:28,fontWeight:'900',marginVertical:8},saveStatus:{textAlign:'center',fontSize:12,marginTop:18},footer:{paddingHorizontal:18,paddingVertical:12,borderTopWidth:StyleSheet.hairlineWidth,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:15},next:{backgroundColor:ORANGE,borderRadius:14,minHeight:54,flex:1,alignItems:'center',justifyContent:'center'},nextText:{color:'#FFF',fontWeight:'900',fontSize:17},submitProgress:{flexDirection:'row',alignItems:'center',gap:8},
});
