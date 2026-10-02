import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ORANGE = '#FF6B00';
const INK = '#101010';
const MUTED = '#777777';

type Props = { onExit: () => void };
type IdType = 'Aadhaar Card' | 'PAN Card' | 'Driving License';
type ReviewStatus = 'pending' | 'approved' | 'rejected';

function PrimaryButton({ title, onPress, secondary = false }: { title: string; onPress: () => void; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={[styles.button, secondary && styles.secondaryButton]}><Text style={[styles.buttonText, secondary && styles.secondaryText]}>{title}</Text></Pressable>;
}

function InfoCard({ title, body, icon = 'ⓘ' }: { title: string; body: string; icon?: string }) {
  return <View style={styles.infoCard}><Text style={styles.infoIcon}>{icon}</Text><View style={styles.infoCopy}><Text style={styles.infoTitle}>{title}</Text><Text style={styles.infoBody}>{body}</Text></View></View>;
}

export default function WorkerVerification({ onExit }: Props) {
  const [step, setStep] = useState(0);
  const [idType, setIdType] = useState<IdType>('Aadhaar Card');
  const [frontSelected, setFrontSelected] = useState(false);
  const [backSelected, setBackSelected] = useState(false);
  const [selfieSelected, setSelfieSelected] = useState(false);
  const [status, setStatus] = useState<ReviewStatus>('pending');

  const chooseFile = (side: 'front' | 'back' | 'selfie') => {
    Alert.alert('Media integration required', 'This screen is ready for the native camera/gallery integration. No document has been uploaded yet.');
    if (side === 'front') setFrontSelected(true);
    if (side === 'back') setBackSelected(true);
    if (side === 'selfie') setSelfieSelected(true);
  };

  const goNext = () => {
    if (step === 2 && (!frontSelected || (idType === 'Aadhaar Card' && !backSelected))) {
      Alert.alert('Documents required', 'Select the required document sides before continuing.');
      return;
    }
    if (step === 3 && !selfieSelected) {
      Alert.alert('Selfie required', 'Capture a selfie before submitting your verification.');
      return;
    }
    if (step < 7) setStep((current) => current + 1);
    else onExit();
  };

  const headerTitle = step <= 4 ? ['Identity Verification', 'Select ID Type', 'Upload Document', 'Take a Selfie', 'Verification in Progress'][step] : step === 5 ? 'Verification Status' : step === 6 ? 'Complete Your Profile' : 'Onboarding Complete';

  const renderContent = () => {
    switch (step) {
      case 0:
        return <>
          <View style={styles.heroIcon}><Text style={styles.heroGlyph}>✓</Text></View>
          <Text style={styles.title}>Verify Your Identity</Text>
          <Text style={styles.centerBody}>Identity verification helps build trust with clients and keeps the Worko community safe.</Text>
          <InfoCard icon="▣" title="Secure and Private" body="Your data is handled securely and used only for verification." />
          <InfoCard icon="♧" title="Build Client Trust" body="Verified workers may become eligible for more work opportunities." />
          <InfoCard icon="▤" title="Government ID Required" body="Aadhaar Card, PAN Card, or Driving License." />
        </>;
      case 1:
        return <>
          <Text style={styles.sectionTitle}>Choose a government-issued ID</Text>
          {(['Aadhaar Card', 'PAN Card', 'Driving License'] as IdType[]).map((item, index) => <Pressable key={item} onPress={() => setIdType(item)} style={[styles.idOption, idType === item && styles.idOptionActive]}><View style={styles.idIcon}><Text style={styles.idGlyph}>{['▤', '▣', '◉'][index]}</Text></View><View style={styles.infoCopy}><Text style={styles.idTitle}>{item}</Text><Text style={styles.infoBody}>{index === 0 ? 'Recommended' : index === 1 ? 'For identity verification' : 'Also accepted'}</Text></View><Text style={styles.radio}>{idType === item ? '◉' : '○'}</Text></Pressable>)}
          <InfoCard body="Make sure the ID is clear, valid, and matches your personal information." />
        </>;
      case 2:
        return <>
          <Text style={styles.sectionTitle}>{idType} (Front Side)</Text>
          <Pressable onPress={() => chooseFile('front')} style={styles.uploadBox}><Text style={styles.uploadGlyph}>{frontSelected ? '✓' : '▧'}</Text><Text style={styles.uploadTitle}>{frontSelected ? 'Front image selected (not uploaded)' : 'Tap to add front image'}</Text><Text style={styles.infoBody}>JPG or PNG • Clear and readable</Text></Pressable>
          {idType !== 'PAN Card' ? <><Text style={styles.sectionTitle}>{idType} (Back Side)</Text><Pressable onPress={() => chooseFile('back')} style={styles.uploadBox}><Text style={styles.uploadGlyph}>{backSelected ? '✓' : '▧'}</Text><Text style={styles.uploadTitle}>{backSelected ? 'Back image selected (not uploaded)' : 'Tap to add back image'}</Text><Text style={styles.infoBody}>Include all required details</Text></Pressable></> : null}
          <InfoCard icon="⬟" title="Keep your details safe" body="Never upload altered, expired, or someone else's documents." />
        </>;
      case 3:
        return <>
          <Text style={styles.centerBody}>Take a clear selfie of your face. Make sure your face is clearly visible and well lit.</Text>
          <View style={styles.selfieFrame}><Text style={styles.selfieGlyph}>{selfieSelected ? '✓' : '◉'}</Text><Text style={styles.infoBody}>{selfieSelected ? 'Selfie capture selected (not uploaded)' : 'Camera preview placeholder'}</Text></View>
          <View style={styles.guidelines}><Text style={styles.infoTitle}>Selfie Guidelines</Text>{['Look directly at the camera', 'Make sure your face is well lit', 'No sunglasses or masks', 'Keep a neutral expression'].map((v) => <Text key={v} style={styles.guideline}>✓  {v}</Text>)}</View>
          <PrimaryButton title="◎  Capture Selfie" onPress={() => chooseFile('selfie')} secondary />
        </>;
      case 4:
        return <>
          <View style={styles.heroIcon}><Text style={styles.heroGlyph}>⌕</Text></View>
          <Text style={styles.title}>Verification in Progress</Text>
          <Text style={styles.centerBody}>Your documents are ready for review. In production, the verification service will confirm receipt and update this status.</Text>
          <View style={styles.timeline}>{[['Document selection', 'Details entered'], ['Selfie selection', 'Capture requested'], ['Under review', 'Awaiting secure submission']].map(([title, desc], i) => <View key={title} style={styles.timelineRow}><View style={[styles.timelineDot, i < 2 && styles.timelineDone]}><Text style={styles.timelineMark}>{i < 2 ? '✓' : '•'}</Text></View><View style={styles.infoCopy}><Text style={styles.infoTitle}>{title}</Text><Text style={styles.infoBody}>{desc}</Text></View></View>)}</View>
          <InfoCard body="No verification has been submitted to the server yet. Document upload and review integration are still required." />
        </>;
      case 5:
        return <>
          <View style={[styles.heroIcon, status === 'approved' && styles.approvedIcon, status === 'rejected' && styles.rejectedIcon]}><Text style={styles.heroGlyph}>{status === 'approved' ? '✓' : status === 'rejected' ? '×' : '⌕'}</Text></View>
          <Text style={styles.title}>{status === 'approved' ? 'Verification Complete!' : status === 'rejected' ? 'Verification Not Approved' : 'Verification Under Review'}</Text>
          <Text style={styles.centerBody}>{status === 'approved' ? 'Your identity has been verified. You can continue to profile review.' : status === 'rejected' ? 'We could not verify your documents. Review the reason and submit clear documents again.' : 'Your verification status is pending. We will notify you when the review is complete.'}</Text>
          {status === 'rejected' ? <View style={styles.rejection}><Text style={styles.rejectionTitle}>Reason for Rejection</Text><Text style={styles.infoBody}>Document review has not been connected. A real rejection reason will be provided by the verification service.</Text></View> : <InfoCard icon={status === 'approved' ? '✓' : '◷'} title={status === 'approved' ? 'Identity verified' : 'Under review'} body={status === 'approved' ? 'Identity check approved.' : 'Review is awaiting backend verification.'} />}
          <InfoCard body="This is a UI preview. Status changes must come from the backend or an authorized reviewer, not from a client-side action." />
          <View style={styles.previewControls}><PrimaryButton title="Preview: Pending" secondary onPress={() => setStatus('pending')} /><PrimaryButton title="Preview: Approved" secondary onPress={() => setStatus('approved')} /><PrimaryButton title="Preview: Rejected" secondary onPress={() => setStatus('rejected')} /></View>
        </>;
      case 6:
        return <>
          <View style={styles.progressCircle}><Text style={styles.progressNumber}>4/6</Text><Text style={styles.progressCaption}>Steps completed</Text></View>
          <Text style={styles.title}>Almost There!</Text><Text style={styles.centerBody}>Complete the remaining steps to become eligible to receive work offers.</Text>
          {[
            ['Basic Information', 'Name, photo, contact details', true],
            ['Skills & Experience', 'Your skills and work description', true],
            ['Location & Service Radius', 'Work location and preferred radius', true],
            ['Availability', 'Working days and time slots', true],
            ['Identity Verification', status === 'approved' ? 'Identity verified' : 'Verification pending', status === 'approved'],
            ['Profile Review', 'Final review and submit', false],
          ].map(([title, detail, complete]) => <View key={String(title)} style={styles.checkRow}><View style={[styles.checkCircle, complete && styles.checkCircleDone]}><Text style={styles.checkGlyph}>{complete ? '✓' : '○'}</Text></View><View style={styles.infoCopy}><Text style={styles.infoTitle}>{String(title)}</Text><Text style={styles.infoBody}>{String(detail)}</Text></View><Text style={[styles.checkStatus, !complete && styles.pendingText]}>{complete ? 'Complete' : 'Pending'}</Text></View>)}
          <InfoCard body="Workers cannot receive offers until all required steps are complete and their profile is approved." />
        </>;
      default:
        return <>
          <View style={[styles.heroIcon, styles.approvedIcon]}><Text style={styles.heroGlyph}>✓</Text></View>
          <Text style={styles.title}>Onboarding Preview Complete</Text>
          <Text style={styles.centerBody}>This is the success-state preview. In production, a worker becomes active only after the server confirms profile completion and verification approval.</Text>
          <InfoCard icon="▣" title="Receive Work Offers" body="Get matched with clients based on your skills and availability." />
          <InfoCard icon="⌖" title="Work in Your Preferred Area" body="Receive eligible offers within your selected radius." />
          <InfoCard icon="▦" title="Work on Your Schedule" body="You decide when you are available." />
        </>;
    }
  };

  const onPrimary = () => {
    if (step === 5 && status === 'rejected') {
      setStep(2);
      setFrontSelected(false);
      setBackSelected(false);
      setSelfieSelected(false);
      return;
    }
    if (step === 6 && status !== 'approved') {
      Alert.alert('Verification pending', 'The profile cannot be submitted until the backend confirms identity verification.');
      return;
    }
    if (step === 6 && status === 'approved') {
      Alert.alert('Preview only', 'The backend profile submission and approval flow is not connected yet.', [{ text: 'Continue preview', onPress: () => setStep(7) }]);
      return;
    }
    goNext();
  };

  return <SafeAreaView style={styles.safe}><StatusBar barStyle="dark-content" backgroundColor="#FFF" /><View style={styles.header}><Pressable onPress={() => step === 0 ? onExit() : setStep((current) => Math.max(0, current - 1))}><Text style={styles.back}>‹</Text></Pressable><Text style={styles.headerTitle}>{headerTitle}</Text><Text style={styles.headerStep}>{step + 1}/8</Text></View><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">{renderContent()}</ScrollView><View style={styles.footer}>{step === 7 ? <><PrimaryButton title="Go to Home" onPress={onExit} /><PrimaryButton title="View My Profile" onPress={onExit} secondary /></> : <PrimaryButton title={step === 4 ? 'View Verification Status' : step === 5 && status === 'rejected' ? 'Resubmit Documents' : step === 6 ? 'Submit Profile' : 'Continue'} onPress={onPrimary} />}</View></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF' },
  header: { height: 54, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { fontSize: 38, color: INK, width: 32 },
  headerTitle: { color: INK, fontSize: 15, fontWeight: '700', flex: 1, textAlign: 'center' },
  headerStep: { width: 36, textAlign: 'right', color: MUTED, fontSize: 12 },
  content: { padding: 22, paddingBottom: 28 },
  footer: { padding: 18, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  button: { minHeight: 54, backgroundColor: ORANGE, borderRadius: 13, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, marginTop: 8 },
  buttonText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  secondaryButton: { backgroundColor: '#FFF', borderWidth: 1, borderColor: ORANGE },
  secondaryText: { color: ORANGE },
  heroIcon: { width: 118, height: 118, borderRadius: 62, backgroundColor: '#FFF0E4', alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginTop: 20, marginBottom: 22 },
  approvedIcon: { backgroundColor: '#E7F7E9' },
  rejectedIcon: { backgroundColor: '#FCE9E9' },
  heroGlyph: { color: ORANGE, fontSize: 60, fontWeight: '800' },
  title: { color: INK, fontSize: 25, lineHeight: 32, fontWeight: '900', textAlign: 'center', marginBottom: 10 },
  centerBody: { color: MUTED, fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 20 },
  infoCard: { flexDirection: 'row', gap: 12, backgroundColor: '#FFF6EF', borderRadius: 13, padding: 15, marginBottom: 12, alignItems: 'flex-start' },
  infoIcon: { color: ORANGE, fontSize: 23, fontWeight: '800', width: 26, textAlign: 'center' },
  infoCopy: { flex: 1 },
  infoTitle: { color: INK, fontWeight: '800', fontSize: 14, marginBottom: 4 },
  infoBody: { color: MUTED, fontSize: 13, lineHeight: 19 },
  sectionTitle: { color: INK, fontWeight: '800', fontSize: 15, marginBottom: 10, marginTop: 12 },
  idOption: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E4E8', borderRadius: 13, padding: 13, marginBottom: 10 },
  idOptionActive: { borderColor: ORANGE, backgroundColor: '#FFF6EF' },
  idIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  idGlyph: { fontSize: 25, color: INK },
  idTitle: { color: INK, fontWeight: '700', fontSize: 15 },
  radio: { color: ORANGE, fontSize: 22, marginLeft: 8 },
  uploadBox: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#D7D9DE', borderRadius: 14, minHeight: 145, alignItems: 'center', justifyContent: 'center', marginBottom: 14, padding: 16, backgroundColor: '#FAFAFA' },
  uploadGlyph: { color: ORANGE, fontSize: 37, marginBottom: 8 },
  uploadTitle: { color: INK, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  selfieFrame: { height: 250, borderRadius: 125, backgroundColor: '#F4E9DF', borderWidth: 8, borderColor: '#FFF1E5', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  selfieGlyph: { fontSize: 72, color: ORANGE },
  guidelines: { padding: 15, borderRadius: 12, backgroundColor: '#F7F8F9', marginBottom: 12 },
  guideline: { color: '#16833A', fontSize: 13, marginTop: 8 },
  timeline: { marginVertical: 12 },
  timelineRow: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 12 },
  timelineDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  timelineDone: { backgroundColor: ORANGE },
  timelineMark: { color: '#FFF', fontWeight: '800' },
  rejection: { backgroundColor: '#FDECEC', padding: 15, borderRadius: 12, marginBottom: 12 },
  rejectionTitle: { color: '#C62828', fontWeight: '800', marginBottom: 7 },
  previewControls: { marginTop: 8 },
  progressCircle: { width: 125, height: 125, borderRadius: 65, borderWidth: 9, borderColor: ORANGE, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginVertical: 20 },
  progressNumber: { color: INK, fontSize: 27, fontWeight: '900' },
  progressCaption: { color: MUTED, fontSize: 11 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  checkCircle: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#F0F1F3', alignItems: 'center', justifyContent: 'center' },
  checkCircleDone: { backgroundColor: '#16833A' },
  checkGlyph: { color: '#FFF', fontWeight: '900' },
  checkStatus: { color: '#16833A', fontSize: 11, fontWeight: '700' },
  pendingText: { color: ORANGE },
});
