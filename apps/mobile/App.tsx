import React, { useState } from 'react';
import { Alert, Image, Keyboard, KeyboardAvoidingView, PermissionsAndroid, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import MapView, { Marker, UrlTile, type Region } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import DateTimePicker from '@react-native-community/datetimepicker';
import { launchImageLibrary, type Asset } from 'react-native-image-picker';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const ORANGE = '#FF6B00';
const INK = '#101010';
const MUTED = '#777777';
const slides = [
  { title: 'Get your work done', accent: 'easily', body: 'Just describe what you need, and Worko will find an eligible worker near you.', symbol: '✓' },
  { title: 'One request.', accent: 'The right help.', body: 'Tell us what needs to be done. We coordinate with available, verified workers.', symbol: '⌕' },
  { title: 'Get it done with', accent: 'confidence', body: 'Track progress, make secure payments, and rate your experience.', symbol: '♡' },
];

function Brand({ small = false }: { small?: boolean }) {
  return <Text style={[s.brand, small && s.brandSmall]}>W<Text style={s.orange}>o</Text>rk<Text style={s.orange}>o</Text></Text>;
}
function Button({ title, onPress }: { title: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.button, pressed && { opacity: 0.85 }]}><Text style={s.buttonText}>{title}  →</Text></Pressable>;
}
function Field({ label, value, onChangeText, placeholder, keyboardType = 'default' }: { label: string; value: string; onChangeText: (v: string) => void; placeholder: string; keyboardType?: 'default' | 'email-address' | 'phone-pad' }) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#999" keyboardType={keyboardType} autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'} style={s.input} returnKeyType="next" /></View>;
}
function formatDate(date: Date) { return `${String(date.getDate()).padStart(2, '0')} ${date.toLocaleString('en-US', { month: 'short' })} ${date.getFullYear()}`; }
function AppContent() {
  const [page, setPage] = useState(0);
  const [slide, setSlide] = useState(0);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Male');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [address, setAddress] = useState('');
  const [permissionPrompted, setPermissionPrompted] = useState(false);
  const [coordinate, setCoordinate] = useState({ latitude: 18.5204, longitude: 73.8567 });
  const [mapRegion, setMapRegion] = useState<Region>({ latitude: 18.5204, longitude: 73.8567, latitudeDelta: 0.04, longitudeDelta: 0.04 });
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ place_id: number; display_name: string; lat: string; lon: string }>>([]);
  const [locationBusy, setLocationBusy] = useState(false);

  const nextProfile = () => {
    const normalizedPhone = phone.replace(/[\s()-]/g, '');
    const validPhone = /^\+?\d{10,13}$/.test(normalizedPhone);
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    const missingFields: string[] = [];
    if (name.trim().length < 2) missingFields.push('name (at least 2 characters)');
    if (!validEmail) missingFields.push('a valid email address');
    if (!validPhone) missingFields.push('a valid phone number (10–13 digits, with optional + country code)');
    if (!dateOfBirth || dateOfBirth > new Date()) missingFields.push('a valid date of birth');
    if (missingFields.length > 0) {
      Alert.alert('Check your details', `Please enter ${missingFields.join(', ')}.`);
      return;
    }
    Keyboard.dismiss();
    setPage(2);
  };
  const selectProfilePhoto = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 });
    if (result.didCancel) return;
    if (result.errorCode) {
      Alert.alert('Unable to select photo', result.errorMessage || 'Please try again.');
      return;
    }
    const asset: Asset | undefined = result.assets?.[0];
    if (asset?.uri) setPhotoUri(asset.uri);
  };
  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1`, {
        headers: { 'User-Agent': 'WorkoMobile/1.0' },
      });
      if (!response.ok) throw new Error('Address lookup failed');
      const data = await response.json();
      if (data.display_name) {
        setAddress(data.display_name);
      } else {
        Alert.alert('Address unavailable', 'We could not find a readable address for this location.');
      }
    } catch {
      Alert.alert('Address unavailable', 'Please check your internet connection or enter the address manually.');
    }
  };

  const useCurrentLocation = async () => {
    setLocationBusy(true);
    setPermissionPrompted(true);
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) throw new Error('Location permission was not granted.');
      } else {
        const status = await Geolocation.requestAuthorization('whenInUse');
        if (status !== 'granted') throw new Error('Location permission was not granted.');
      }

      Geolocation.getCurrentPosition(
        async position => {
          const next = { latitude: position.coords.latitude, longitude: position.coords.longitude };
          setCoordinate(next);
          setMapRegion({ ...next, latitudeDelta: 0.012, longitudeDelta: 0.012 });
          await reverseGeocode(next.latitude, next.longitude);
          setLocationBusy(false);
        },
        error => {
          setLocationBusy(false);
          Alert.alert('Unable to get location', error.message || 'Check that location services are enabled and try again.');
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000, forceRequestLocation: true, showLocationDialog: true },
      );
    } catch (error) {
      setLocationBusy(false);
      Alert.alert('Location permission', error instanceof Error ? error.message : 'Please enable location access.');
    }
  };

  const searchAddress = async () => {
    const query = searchText.trim();
    if (query.length < 3) {
      Alert.alert('Search address', 'Enter at least 3 characters.');
      return;
    }
    setLocationBusy(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`, {
        headers: { 'User-Agent': 'WorkoMobile/1.0' },
      });
      if (!response.ok) throw new Error('Search request failed');
      const results = await response.json();
      setSearchResults(results);
      if (!results.length) Alert.alert('No results', 'Try a nearby locality, landmark, or PIN code.');
    } catch {
      Alert.alert('Search unavailable', 'Please check your internet connection and try again.');
    } finally {
      setLocationBusy(false);
    }
  };

  const chooseSearchResult = (item: { display_name: string; lat: string; lon: string }) => {
    const next = { latitude: Number(item.lat), longitude: Number(item.lon) };
    setCoordinate(next);
    setMapRegion({ ...next, latitudeDelta: 0.012, longitudeDelta: 0.012 });
    setAddress(item.display_name);
    setSearchResults([]);
    Keyboard.dismiss();
  };

  const confirmLocation = () => {
    if (address.trim().length < 5) {
      Alert.alert('Add your location', 'Use GPS, search for an address, or select a map location.');
      return;
    }
    Alert.alert(
      'Location captured',
      `Address: ${address}\nCoordinates: ${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}\n\nSaved in this onboarding session. Server persistence will be connected with the profile API.`,
    );
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="dark-content" />
        {<>
        {page === 0 && <>
          <View style={s.welcomeHeader}><Brand /><Pressable onPress={() => setPage(1)}><Text style={s.skip}>Skip</Text></Pressable></View>
          <ScrollView contentContainerStyle={s.welcomeScroll}>
            <View style={s.hero}><View style={s.heroBack} /><View style={s.heroCircle}><Text style={s.heroSymbol}>{slides[slide].symbol}</Text></View></View>
            <Text style={s.eyebrow}>WORKO • ON-DEMAND SERVICES</Text>
            <Text style={s.heroTitle}>{slides[slide].title}{'\n'}<Text style={s.orange}>{slides[slide].accent}</Text></Text>
            <Text style={s.subtitle}>{slides[slide].body}</Text>
            <View style={s.features}>
              <Feature symbol="▤" title="Describe your work" body="Tell us what you need and add photos if you like." />
              <Feature symbol="♧" title="We find an eligible worker" body="Worko matches you with a verified worker nearby." />
              <Feature symbol="◇" title="Get it done with confidence" body="Track progress, pay securely, and share feedback." />
            </View>
          </ScrollView>
          <View style={s.welcomeBottom}><View style={s.dots}>{slides.map((item, i) => <Pressable key={item.title} onPress={() => setSlide(i)} style={[s.dot, slide === i && s.dotActive]} />)}</View><Button title={slide === 2 ? 'Get Started' : 'Next'} onPress={() => slide === 2 ? setPage(1) : setSlide(slide + 1)} /></View>
        </>}
        {page === 1 && <>
          <Header onBack={() => setPage(0)} step="2/3" progress={1} />
          <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={s.formScroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
              <Text style={s.title}>Complete your <Text style={s.orange}>profile</Text></Text>
              <Text style={s.subtitle}>This helps us provide a better experience and find the right worker for you.</Text>
              <Text style={s.label}>Profile photo <Text style={s.muted}>(optional)</Text></Text>
              <Pressable accessibilityRole="button" onPress={selectProfilePhoto} style={s.photoBox}><View style={s.avatar}>{photoUri ? <Image source={{ uri: photoUri }} style={s.avatarImage} /> : <Text style={s.avatarText}>●</Text>}</View><View style={s.photoCopy}><Text style={s.featureTitle}>{photoUri ? "Change profile photo" : "Add a profile photo"}</Text><Text style={s.muted}>{photoUri ? "Photo selected" : "A clear photo helps build trust with workers."}</Text></View><Text style={s.orange}>＋</Text></Pressable>
              <Field label="Full name *" value={name} onChangeText={setName} placeholder="Enter your full name" />
              <Field label="Phone number *" value={phone} onChangeText={setPhone} placeholder="+91 98765 43210" keyboardType="phone-pad" />
              <Field label="Email address *" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
              <View style={s.field}><Text style={s.label}>Date of birth *</Text><Pressable accessibilityRole="button" onPress={() => { Keyboard.dismiss(); setShowDatePicker(true); }} style={s.dateInput}><Text style={[s.dateText, !dateOfBirth && s.datePlaceholder]}>{dob || "Select your date of birth"}</Text><Text style={s.dateIcon}>▦</Text></Pressable>{showDatePicker && <DateTimePicker value={dateOfBirth || new Date(2000, 0, 1)} mode="date" display={Platform.OS === "ios" ? "spinner" : "calendar"} maximumDate={new Date()} onChange={(_, selectedDate) => { setShowDatePicker(Platform.OS === "ios"); if (selectedDate) { setDateOfBirth(selectedDate); setDob(formatDate(selectedDate)); } }} />}{Platform.OS === "ios" && showDatePicker && <Pressable onPress={() => setShowDatePicker(false)} style={s.dateDone}><Text style={s.dateDoneText}>Done</Text></Pressable>}</View>
              <Text style={s.label}>Gender <Text style={s.muted}>(optional)</Text></Text>
              <View style={s.genderRow}>{['Male', 'Female', 'Prefer not to say'].map((item) => <Pressable key={item} onPress={() => setGender(item)} style={[s.gender, gender === item && s.genderSelected]}><Text style={[s.genderText, gender === item && s.genderTextSelected]}>{item}</Text></Pressable>)}</View>
              <Text style={s.muted}>Your information is kept private and used to manage your Worko account.</Text>
            </ScrollView>
          </KeyboardAvoidingView>
          <View style={s.bottom}><Button title="Continue" onPress={nextProfile} /></View>
        </>}
        {page === 2 && <>
          <Header onBack={() => setPage(1)} step="3/3" progress={2} />
          <ScrollView contentContainerStyle={s.formScroll} keyboardShouldPersistTaps="handled">
            <Text style={s.title}>Set your <Text style={s.orange}>location</Text></Text>
            <Text style={s.subtitle}>This helps us find eligible workers near you and show accurate availability.</Text>
            <View style={s.why}><View style={s.pinBubble}><Text style={s.pinText}>⌖</Text></View><View style={s.flex}><Text style={s.featureTitle}>Why we need your location</Text><Text style={s.whyLine}>✓  Find nearby workers</Text><Text style={s.whyLine}>✓  Show accurate pricing and time</Text><Text style={s.whyLine}>✓  Faster, better service</Text></View></View>
            <View style={s.map}>
              <MapView
                style={StyleSheet.absoluteFill}
                region={mapRegion}
                onRegionChangeComplete={setMapRegion}
                onPress={event => setCoordinate(event.nativeEvent.coordinate)}
                mapType="none"
                showsUserLocation
                showsMyLocationButton={false}
              >
                <UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} />
                <Marker
                  coordinate={coordinate}
                  draggable
                  onDragEnd={event => {
                    const next = event.nativeEvent.coordinate;
                    setCoordinate(next);
                    setMapRegion(region => ({ ...region, ...next }));
                  }}
                />
              </MapView>
              <View pointerEvents="none" style={s.osmAttribution}><Text style={s.osmText}>© OpenStreetMap contributors</Text></View>
              <Pressable style={s.locate} onPress={useCurrentLocation}><Text style={s.locateText}>◎</Text></Pressable>
            </View>
            <Text style={s.muted}>Drag the pin or move the map, then select “Use map pin location” to resolve its address.</Text>
            <View style={s.searchRow}>
              <TextInput
                accessibilityLabel="Search address"
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Search area, street, landmark or PIN"
                placeholderTextColor="#999"
                style={[s.input, s.searchInput]}
                returnKeyType="search"
                onSubmitEditing={searchAddress}
              />
              <Pressable onPress={searchAddress} style={s.searchButton} disabled={locationBusy}>
                <Text style={s.searchButtonText}>{locationBusy ? '…' : 'Search'}</Text>
              </Pressable>
            </View>
            {searchResults.map(item => (
              <Pressable key={item.place_id} style={s.searchResult} onPress={() => chooseSearchResult(item)}>
                <Text style={s.featureTitle}>{item.display_name}</Text>
              </Pressable>
            ))}
            <Pressable style={s.locationRow} onPress={useCurrentLocation}>
              <Text style={s.orange}>⌖</Text>
              <View style={s.flex}>
                <Text style={s.featureTitle}>{locationBusy ? 'Getting location…' : 'Use my current location'}</Text>
                <Text style={s.muted}>{permissionPrompted ? 'Request or refresh your device GPS position.' : 'Allow access to find your location automatically.'}</Text>
              </View>
              <Text style={s.muted}>›</Text>
            </Pressable>
            <Pressable style={s.locationRow} onPress={() => reverseGeocode(coordinate.latitude, coordinate.longitude)}>
              <Text style={s.orange}>⌖</Text>
              <View style={s.flex}>
                <Text style={s.featureTitle}>Use map pin location</Text>
                <Text style={s.muted}>Get the address for the selected map point.</Text>
              </View>
              <Text style={s.muted}>›</Text>
            </Pressable>
            {address.length > 0 && (
              <View style={s.info}>
                <Text style={s.orange}>●</Text>
                <View style={s.flex}>
                  <Text style={s.featureTitle}>Selected address</Text>
                  <Text style={s.muted}>{address}</Text>
                </View>
              </View>
            )}
            <View style={s.info}><Text style={s.muted}>ⓘ</Text><View style={s.flex}><Text style={s.featureTitle}>Make sure your location is correct</Text><Text style={s.muted}>Workers will be matched based on this location. You can change it later in settings.</Text></View></View>
          </ScrollView>
          <View style={s.bottom}><Button title="Confirm Location" onPress={confirmLocation}/><Pressable onPress={() => Alert.alert('Change location', 'Edit the address in the search field above.')} style={s.secondary}><Text style={s.secondaryText}>Use a different location</Text></Pressable></View>
        </>}
        </>}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
function Feature({ symbol, title, body }: { symbol: string; title: string; body: string }) {
  return <View style={s.featureRow}><View style={s.featureIcon}><Text style={s.featureSymbol}>{symbol}</Text></View><View style={s.flex}><Text style={s.featureTitle}>{title}</Text><Text style={s.muted}>{body}</Text></View></View>;
}
function Header({ onBack, step, progress }: { onBack: () => void; step: string; progress: number }) {
  return <><View style={s.header}><Pressable onPress={onBack}><Text style={s.back}>‹</Text></Pressable><Brand small/><Text style={s.muted}>{step}</Text></View><View style={s.progress}>{[0, 1, 2].map((n) => <View key={n} style={[s.progressSegment, n <= progress && s.progressOn]} />)}</View></>;
}
export default function App() { return <AppContent />; }

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF' }, flex: { flex: 1 }, brand: { color: INK, fontSize: 34, fontWeight: '900', letterSpacing: -2 }, brandSmall: { fontSize: 27 }, orange: { color: ORANGE }, muted: { color: MUTED, fontSize: 13, lineHeight: 19 },
  welcomeHeader: { paddingHorizontal: 25, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, skip: { color: MUTED, fontSize: 16 },
  welcomeScroll: { paddingHorizontal: 27, paddingBottom: 8 }, hero: { height: 190, alignItems: 'center', justifyContent: 'center' }, heroBack: { position: 'absolute', left: '14%', width: 175, height: 175, borderRadius: 90, backgroundColor: '#FFF0E1' }, heroCircle: { width: 135, height: 135, borderRadius: 70, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', elevation: 5 }, heroSymbol: { color: '#FFF', fontSize: 70 }, eyebrow: { color: ORANGE, fontWeight: '800', fontSize: 11, letterSpacing: 1.3, marginBottom: 9 }, heroTitle: { color: INK, fontSize: 35, lineHeight: 41, fontWeight: '900', letterSpacing: -1 }, subtitle: { color: MUTED, fontSize: 16, lineHeight: 23, marginTop: 9, marginBottom: 17 },
  features: { gap: 14, marginTop: 4 }, featureRow: { flexDirection: 'row', alignItems: 'center', gap: 13 }, featureIcon: { width: 53, height: 53, borderRadius: 28, backgroundColor: '#FFF3E9', alignItems: 'center', justifyContent: 'center' }, featureSymbol: { color: INK, fontSize: 25 }, featureTitle: { color: INK, fontWeight: '800', fontSize: 15, marginBottom: 3 }, welcomeBottom: { paddingHorizontal: 25, paddingBottom: 12, paddingTop: 5 }, dots: { flexDirection: 'row', justifyContent: 'center', gap: 9, marginBottom: 15 }, dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#D9DADD' }, dotActive: { width: 22, backgroundColor: ORANGE },
  button: { height: 57, backgroundColor: ORANGE, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, buttonText: { color: '#FFF', fontWeight: '800', fontSize: 18 }, header: { height: 55, paddingHorizontal: 23, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { color: INK, fontSize: 42, lineHeight: 45 }, progress: { flexDirection: 'row', gap: 7, paddingHorizontal: 23, marginTop: 10, marginBottom: 20 }, progressSegment: { flex: 1, height: 8, borderRadius: 5, backgroundColor: '#E3E4E6' }, progressOn: { backgroundColor: ORANGE },
  formScroll: { paddingHorizontal: 23, paddingBottom: 20 }, title: { color: INK, fontSize: 31, lineHeight: 38, fontWeight: '900' }, field: { marginBottom: 15 }, label: { color: INK, fontSize: 14, fontWeight: '700', marginBottom: 8 }, input: { minHeight: 53, borderWidth: 1.2, borderColor: '#E1E2E5', borderRadius: 12, paddingHorizontal: 15, color: INK, fontSize: 15 }, dateInput: { minHeight: 53, borderWidth: 1.2, borderColor: '#E1E2E5', borderRadius: 12, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, dateText: { color: INK, fontSize: 15 }, datePlaceholder: { color: '#999' }, dateIcon: { color: ORANGE, fontSize: 20 }, dateDone: { alignSelf: 'flex-end', padding: 12 }, dateDoneText: { color: ORANGE, fontWeight: '800' }, photoBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFAF5', borderRadius: 15, padding: 12, marginBottom: 20 }, avatarImage: { width: 76, height: 76, borderRadius: 40 }, avatar: { width: 76, height: 76, borderRadius: 40, backgroundColor: '#FFE2CB', alignItems: 'center', justifyContent: 'center' }, avatarText: { fontSize: 47, color: '#F7A16B' }, photoCopy: { flex: 1 }, genderRow: { flexDirection: 'row', gap: 7, marginBottom: 16 }, gender: { flex: 1, minHeight: 49, borderWidth: 1, borderColor: '#E1E2E5', borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }, genderSelected: { borderColor: ORANGE, backgroundColor: '#FFF5EC' }, genderText: { color: MUTED, fontSize: 11, textAlign: 'center' }, genderTextSelected: { color: INK, fontWeight: '700' }, bottom: { paddingHorizontal: 23, paddingVertical: 10, gap: 9, borderTopWidth: 1, borderTopColor: '#F2F2F2' },
  osmAttribution: { position: 'absolute', bottom: 3, right: 5, backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 }, osmText: { color: '#333', fontSize: 9 }, searchRow: { flexDirection: 'row', gap: 8, marginTop: 14, marginBottom: 8 }, searchInput: { flex: 1 }, searchButton: { backgroundColor: ORANGE, borderRadius: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' }, searchButtonText: { color: '#FFF', fontWeight: '800' }, searchResult: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  why: { backgroundColor: '#FFF3E9', borderRadius: 16, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 17 }, pinBubble: { width: 60, height: 60, borderRadius: 35, backgroundColor: '#FFE1C9', alignItems: 'center', justifyContent: 'center' }, pinText: { color: ORANGE, fontSize: 38 }, whyLine: { color: MUTED, fontSize: 12, lineHeight: 19 }, map: { height: 205, borderRadius: 16, backgroundColor: '#EAF0E9', overflow: 'hidden', marginBottom: 18 }, roadH1: { position: 'absolute', top: 57, left: -10, right: -10, height: 13, backgroundColor: '#FFF', transform: [{ rotate: '-8deg' }] }, roadH2: { position: 'absolute', top: 144, left: -10, right: -10, height: 12, backgroundColor: '#FFF', transform: [{ rotate: '8deg' }] }, roadV1: { position: 'absolute', left: 80, top: -20, bottom: -20, width: 11, backgroundColor: '#FFF', transform: [{ rotate: '16deg' }] }, roadV2: { position: 'absolute', right: 83, top: -20, bottom: -20, width: 12, backgroundColor: '#FFF', transform: [{ rotate: '-13deg' }] }, park: { position: 'absolute', top: 12, right: 13, width: 90, height: 55, borderRadius: 12, backgroundColor: '#D4E8CF', alignItems: 'center', justifyContent: 'center' }, parkText: { color: '#6B9B6B', fontSize: 8, fontWeight: '700' }, mapPin: { position: 'absolute', left: '47%', top: '37%', width: 37, height: 37, borderRadius: 20, backgroundColor: ORANGE, borderColor: '#FFF', borderWidth: 4, alignItems: 'center', justifyContent: 'center', elevation: 4 }, locate: { position: 'absolute', top: 11, right: 11, width: 40, height: 40, borderRadius: 22, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' }, locateText: { color: INK, fontSize: 26 }, mapCaption: { position: 'absolute', bottom: 10, alignSelf: 'center', backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 13, color: INK, fontSize: 11 }, locationRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderWidth: 1, borderColor: '#E1E2E5', borderRadius: 12, marginTop: 12, marginBottom: 12 }, info: { flexDirection: 'row', gap: 10, padding: 13, borderRadius: 12, backgroundColor: '#F7F8F9' }, secondary: { height: 51, borderRadius: 14, borderWidth: 1.5, borderColor: ORANGE, alignItems: 'center', justifyContent: 'center' }, secondaryText: { color: ORANGE, fontSize: 15, fontWeight: '700' },
});