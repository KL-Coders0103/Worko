import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
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
function AppContent() {
  const [page, setPage] = useState(0);
  const [slide, setSlide] = useState(0);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Prefer not to say');
  const [address, setAddress] = useState('');
  const [permissionPrompted, setPermissionPrompted] = useState(false);

  const nextProfile = () => {
    if (name.trim().length < 2 || !/^\\+?[0-9\\s-]{10,15}$/.test(phone.trim()) || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email.trim()) || !/^\\d{2} [A-Za-z]{3} \\d{4}$/.test(dob.trim())) {
      Alert.alert('Check your details', 'Enter a valid name, phone, email, and date of birth (DD MMM YYYY).');
      return;
    }
    setPage(2);
  };
  const confirmLocation = () => {
    if (address.trim().length < 5) {
      Alert.alert('Add your location', 'Enter your area, street, or a complete address.');
      return;
    }
    Alert.alert('Location captured', 'Your address has been saved in this onboarding session. Account and server integration will be connected in the authentication step.');
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
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
          <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={s.formScroll} keyboardShouldPersistTaps="handled">
              <Text style={s.title}>Complete your <Text style={s.orange}>profile</Text></Text>
              <Text style={s.subtitle}>This helps us provide a better experience and find the right worker for you.</Text>
              <Text style={s.label}>Profile photo <Text style={s.muted}>(optional)</Text></Text>
              <View style={s.photoBox}><View style={s.avatar}><Text style={s.avatarText}>●</Text></View><View style={s.photoCopy}><Text style={s.featureTitle}>Add a profile photo</Text><Text style={s.muted}>A clear photo helps build trust with workers.</Text></View><Text style={s.orange}>＋</Text></View>
              <Field label="Full name *" value={name} onChangeText={setName} placeholder="Enter your full name" />
              <Field label="Phone number *" value={phone} onChangeText={setPhone} placeholder="+91 98765 43210" keyboardType="phone-pad" />
              <Field label="Email address *" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
              <Field label="Date of birth *" value={dob} onChangeText={setDob} placeholder="15 Mar 2002 (DD MMM YYYY)" />
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
            <View style={s.map}><View style={s.park}><Text style={s.parkText}>GREEN SPACE</Text></View><View style={s.roadH1}/><View style={s.roadH2}/><View style={s.roadV1}/><View style={s.roadV2}/><View style={s.mapPin}><Text style={{ color: '#FFF' }}>●</Text></View><Pressable style={s.locate} onPress={() => { setPermissionPrompted(true); Alert.alert('Location permission', 'Native GPS permission and reverse-geocoding will be connected in the location integration step. You can enter an address manually now.'); }}><Text style={s.locateText}>◎</Text></Pressable><Text style={s.mapCaption}>Select your service area below</Text></View>
            <Field label="Search for an area, street or landmark" value={address} onChangeText={setAddress} placeholder="Enter your address" />
            <Pressable style={s.locationRow} onPress={() => { setPermissionPrompted(true); Alert.alert('Current location', 'Location services will be connected in the next integration step. Enter your address manually for now.'); }}><Text style={s.orange}>⌖</Text><View style={s.flex}><Text style={s.featureTitle}>Use my current location</Text><Text style={s.muted}>{permissionPrompted ? 'You can continue by entering an address above.' : 'Allow access to find your location automatically.'}</Text></View><Text style={s.muted}>›</Text></Pressable>
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
  formScroll: { paddingHorizontal: 23, paddingBottom: 20 }, title: { color: INK, fontSize: 31, lineHeight: 38, fontWeight: '900' }, field: { marginBottom: 15 }, label: { color: INK, fontSize: 14, fontWeight: '700', marginBottom: 8 }, input: { minHeight: 53, borderWidth: 1.2, borderColor: '#E1E2E5', borderRadius: 12, paddingHorizontal: 15, color: INK, fontSize: 15 }, photoBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFAF5', borderRadius: 15, padding: 12, marginBottom: 20 }, avatar: { width: 76, height: 76, borderRadius: 40, backgroundColor: '#FFE2CB', alignItems: 'center', justifyContent: 'center' }, avatarText: { fontSize: 47, color: '#F7A16B' }, photoCopy: { flex: 1 }, genderRow: { flexDirection: 'row', gap: 7, marginBottom: 16 }, gender: { flex: 1, minHeight: 49, borderWidth: 1, borderColor: '#E1E2E5', borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }, genderSelected: { borderColor: ORANGE, backgroundColor: '#FFF5EC' }, genderText: { color: MUTED, fontSize: 11, textAlign: 'center' }, genderTextSelected: { color: INK, fontWeight: '700' }, bottom: { paddingHorizontal: 23, paddingVertical: 10, gap: 9, borderTopWidth: 1, borderTopColor: '#F2F2F2' },
  why: { backgroundColor: '#FFF3E9', borderRadius: 16, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 17 }, pinBubble: { width: 60, height: 60, borderRadius: 35, backgroundColor: '#FFE1C9', alignItems: 'center', justifyContent: 'center' }, pinText: { color: ORANGE, fontSize: 38 }, whyLine: { color: MUTED, fontSize: 12, lineHeight: 19 }, map: { height: 205, borderRadius: 16, backgroundColor: '#EAF0E9', overflow: 'hidden', marginBottom: 18 }, roadH1: { position: 'absolute', top: 57, left: -10, right: -10, height: 13, backgroundColor: '#FFF', transform: [{ rotate: '-8deg' }] }, roadH2: { position: 'absolute', top: 144, left: -10, right: -10, height: 12, backgroundColor: '#FFF', transform: [{ rotate: '8deg' }] }, roadV1: { position: 'absolute', left: 80, top: -20, bottom: -20, width: 11, backgroundColor: '#FFF', transform: [{ rotate: '16deg' }] }, roadV2: { position: 'absolute', right: 83, top: -20, bottom: -20, width: 12, backgroundColor: '#FFF', transform: [{ rotate: '-13deg' }] }, park: { position: 'absolute', top: 12, right: 13, width: 90, height: 55, borderRadius: 12, backgroundColor: '#D4E8CF', alignItems: 'center', justifyContent: 'center' }, parkText: { color: '#6B9B6B', fontSize: 8, fontWeight: '700' }, mapPin: { position: 'absolute', left: '47%', top: '37%', width: 37, height: 37, borderRadius: 20, backgroundColor: ORANGE, borderColor: '#FFF', borderWidth: 4, alignItems: 'center', justifyContent: 'center', elevation: 4 }, locate: { position: 'absolute', top: 11, right: 11, width: 40, height: 40, borderRadius: 22, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' }, locateText: { color: INK, fontSize: 26 }, mapCaption: { position: 'absolute', bottom: 10, alignSelf: 'center', backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 13, color: INK, fontSize: 11 }, locationRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderWidth: 1, borderColor: '#E1E2E5', borderRadius: 12, marginTop: 12, marginBottom: 12 }, info: { flexDirection: 'row', gap: 10, padding: 13, borderRadius: 12, backgroundColor: '#F7F8F9' }, secondary: { height: 51, borderRadius: 14, borderWidth: 1.5, borderColor: ORANGE, alignItems: 'center', justifyContent: 'center' }, secondaryText: { color: ORANGE, fontSize: 15, fontWeight: '700' },
});