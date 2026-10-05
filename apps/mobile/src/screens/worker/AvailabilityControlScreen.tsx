import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useWorkoTheme } from '../../design-system/ThemeProvider';
import { apiRequest } from '../../services/api/client';

type AvailabilityStatus = 'OFFLINE' | 'AVAILABLE' | 'BUSY';

const ORANGE = '#FF5A00';
const GREEN = '#12A33A';
const RED = '#EA3B22';

export function AvailabilityControlScreen() {
  const { theme } = useWorkoTheme();
  const navigation = useNavigation();
  const [status, setStatus] = useState<AvailabilityStatus>('OFFLINE');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<AvailabilityStatus | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = await AsyncStorage.getItem('worko.accessToken');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const response = await apiRequest('/worker/dashboard', {
        headers: { Authorization: 'Bearer ' + token },
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok && payload?.data?.worker?.availabilityStatus) {
        setStatus(payload.data.worker.availabilityStatus);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateAvailability = async (next: 'AVAILABLE' | 'OFFLINE') => {
    if (busy) return;
    const token = await AsyncStorage.getItem('worko.accessToken');
    if (!token) return;

    setBusy(true);
    setError(null);
    try {
      const response = await apiRequest('/worker/availability', {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ available: next === 'AVAILABLE' }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || 'Unable to update availability.');
      }
      setStatus(payload?.data?.availabilityStatus ?? next);
      setConfirming(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3200);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to update availability.');
      setConfirming(null);
    } finally {
      setBusy(false);
    }
  };

  const isAvailable = status === 'AVAILABLE';
  const isBusyStatus = status === 'BUSY';

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={ORANGE} />
        <Text style={[styles.loadingText, { color: theme.secondaryText }]}>Loading availability…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.brand}>Worko</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => navigation.goBack()}
            style={styles.closeButton}
          >
            <Text style={[styles.closeText, { color: theme.text }]}>‹</Text>
          </Pressable>
        </View>

        {success ? (
          <View style={styles.successBanner}>
            <View style={styles.successIcon}><Text style={styles.successCheck}>✓</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.successTitle}>Availability Updated</Text>
              <Text style={styles.successSubtitle}>
                You are now {isAvailable ? 'available' : 'unavailable'}.
              </Text>
            </View>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorTitle}>Could not update availability</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Text style={[styles.title, { color: theme.text }]}>Availability</Text>
        <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
          Control when you want to receive work offers from nearby clients.
        </Text>

        <View style={[
          styles.statusCard,
          {
            backgroundColor: isAvailable ? '#F0FAF3' : '#FFF0F0',
            borderColor: isAvailable ? '#D8F0DE' : '#F6D8D5',
          },
        ]}>
          <View style={[styles.statusIcon, { backgroundColor: isAvailable ? '#E0F6E7' : '#FFE2DF' }]}>
            <Text style={[styles.statusIconText, { color: isAvailable ? GREEN : RED }]}>
              {isAvailable ? '◉' : 'Ⅱ'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusTitle, { color: theme.text }]}>
              {isBusyStatus ? 'You are Busy' : isAvailable ? 'You are Available' : 'You are Unavailable'}
            </Text>
            <Text style={[styles.statusDescription, { color: theme.secondaryText }]}>
              {isBusyStatus
                ? 'Finish your active job before changing availability.'
                : isAvailable
                  ? 'You can receive work offers from nearby clients.'
                  : 'You will not receive new offers while you are unavailable.'}
            </Text>
          </View>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: isAvailable }}
            disabled={busy || isBusyStatus}
            onPress={() => setConfirming(isAvailable ? 'OFFLINE' : 'AVAILABLE')}
            style={[styles.switch, isAvailable && styles.switchOn, (busy || isBusyStatus) && { opacity: 0.55 }]}
          >
            <View style={[styles.switchKnob, isAvailable && styles.switchKnobOn]} />
          </Pressable>
        </View>

        <InfoSection
          available={isAvailable}
          title={isAvailable ? 'What happens when you are available?' : 'What happens when you are unavailable?'}
          theme={theme}
        />

        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>i</Text>
          <Text style={styles.infoText}>You can change this anytime based on your schedule.</Text>
        </View>
      </ScrollView>

      <Modal
        transparent
        visible={confirming !== null}
        animationType="fade"
        onRequestClose={() => { if (!busy) setConfirming(null); }}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <Pressable
              disabled={busy}
              onPress={() => setConfirming(null)}
              style={styles.modalClose}
            >
              <Text style={[styles.modalCloseText, { color: theme.text }]}>×</Text>
            </Pressable>

            <View style={[
              styles.modalIcon,
              { backgroundColor: confirming === 'AVAILABLE' ? '#E5F8EB' : '#FFE6E1' },
            ]}>
              <Text style={[
                styles.modalIconText,
                { color: confirming === 'AVAILABLE' ? GREEN : ORANGE },
              ]}>
                {confirming === 'AVAILABLE' ? '◉' : 'Ⅱ'}
              </Text>
            </View>

            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {confirming === 'AVAILABLE' ? 'Go Available?' : 'Go Unavailable?'}
            </Text>
            <Text style={[styles.modalDescription, { color: theme.secondaryText }]}>
              {confirming === 'AVAILABLE'
                ? 'You will start receiving work offers based on your skills, location, and preferences.'
                : 'You will not receive new work offers while you are unavailable. Your existing bookings will still be visible and can be managed.'}
            </Text>

            <Pressable
              disabled={busy}
              onPress={() => confirming && confirming !== 'BUSY' && void updateAvailability(confirming)}
              style={[styles.confirmButton, busy && { opacity: 0.65 }]}
            >
              {busy ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.confirmText}>
                  Yes, Go {confirming === 'AVAILABLE' ? 'Available' : 'Unavailable'}
                </Text>
              )}
            </Pressable>

            <Pressable
              disabled={busy}
              onPress={() => setConfirming(null)}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function InfoSection({
  available,
  title,
  theme,
}: {
  available: boolean;
  title: string;
  theme: ReturnType<typeof useWorkoTheme>['theme'];
}) {
  const rows = available
    ? [
        'You will receive work offers matching your skills and location.',
        'Clients can send you offers based on your preferences.',
        'Your profile will be visible in matching.',
      ]
    : [
        'You will not receive new work offers.',
        'Your profile will not be included in matching.',
        'Your existing bookings (if any) will still be visible and can be managed.',
      ];

  return (
    <View style={[styles.explainCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.explainIcon, { backgroundColor: available ? '#EEF5FF' : '#FFF0EF' }]}>
        <Text style={{ color: available ? '#183B73' : RED, fontSize: 18, fontWeight: '900' }}>◉</Text>
      </View>
      <Text style={[styles.explainTitle, { color: theme.text }]}>{title}</Text>
      {rows.map((row, index) => (
        <View key={row} style={styles.explainRow}>
          <View style={[styles.bullet, { backgroundColor: available ? GREEN : RED }]}>
            <Text style={styles.bulletText}>{available ? '✓' : '×'}</Text>
          </View>
          <Text style={[styles.rowText, { color: theme.secondaryText }]}>{row}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 10, fontSize: 14, fontWeight: '600' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  brand: { color: ORANGE, fontSize: 27, fontWeight: '900', letterSpacing: -1 },
  closeButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 35, lineHeight: 35, fontWeight: '300' },
  successBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F0FAF3', borderWidth: 1, borderColor: '#D6F0DC',
    borderRadius: 13, padding: 13, marginBottom: 16,
  },
  successIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center' },
  successCheck: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  successTitle: { color: '#102116', fontSize: 13, fontWeight: '900' },
  successSubtitle: { color: '#52665A', fontSize: 11, marginTop: 2 },
  errorBanner: { backgroundColor: '#FFF0EF', borderWidth: 1, borderColor: '#F5D1CD', borderRadius: 13, padding: 13, marginBottom: 16 },
  errorTitle: { color: '#9B2418', fontSize: 13, fontWeight: '900' },
  errorText: { color: '#7D4A45', fontSize: 12, marginTop: 3 },
  title: { fontSize: 25, fontWeight: '900', marginBottom: 5 },
  subtitle: { fontSize: 14, lineHeight: 22, marginBottom: 19 },
  statusCard: { borderWidth: 1, borderRadius: 15, padding: 13, flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  statusIcon: { width: 43, height: 43, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  statusIconText: { fontSize: 19, fontWeight: '900' },
  statusTitle: { fontSize: 15, fontWeight: '900', marginBottom: 3 },
  statusDescription: { fontSize: 12, lineHeight: 18, paddingRight: 5 },
  switch: { width: 51, height: 30, borderRadius: 16, backgroundColor: '#AEB7C5', padding: 3, justifyContent: 'center' },
  switchOn: { backgroundColor: '#0DB63D' },
  switchKnob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFF', alignSelf: 'flex-start' },
  switchKnobOn: { alignSelf: 'flex-end' },
  explainCard: { borderWidth: 1, borderRadius: 15, padding: 14, marginBottom: 13 },
  explainIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  explainTitle: { fontSize: 15, lineHeight: 21, fontWeight: '900', marginBottom: 10 },
  explainRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 11 },
  bullet: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 9, marginTop: 1 },
  bulletText: { color: '#FFF', fontSize: 12, fontWeight: '900' },
  rowText: { flex: 1, fontSize: 12, lineHeight: 19 },
  infoCard: { backgroundColor: '#FFF5E9', borderRadius: 13, padding: 13, flexDirection: 'row', alignItems: 'center' },
  infoIcon: { width: 23, height: 23, borderRadius: 12, backgroundColor: '#FF8A22', color: '#FFF', textAlign: 'center', lineHeight: 23, fontWeight: '900', marginRight: 9 },
  infoText: { flex: 1, color: '#6C5846', fontSize: 12, lineHeight: 18 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.58)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  modalCard: { width: '100%', maxWidth: 390, borderRadius: 22, padding: 20, paddingTop: 29, alignItems: 'center' },
  modalClose: { position: 'absolute', right: 13, top: 9, width: 35, height: 35, alignItems: 'center', justifyContent: 'center' },
  modalCloseText: { fontSize: 28, fontWeight: '300' },
  modalIcon: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  modalIconText: { fontSize: 26, fontWeight: '900' },
  modalTitle: { fontSize: 20, fontWeight: '900', marginBottom: 8, textAlign: 'center' },
  modalDescription: { fontSize: 13, lineHeight: 20, textAlign: 'center', marginBottom: 18, paddingHorizontal: 6 },
  confirmButton: { width: '100%', minHeight: 48, borderRadius: 10, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', marginBottom: 9 },
  confirmText: { color: '#FFF', fontSize: 13, fontWeight: '900' },
  cancelButton: { width: '100%', minHeight: 48, borderRadius: 10, borderWidth: 1.2, borderColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: ORANGE, fontSize: 13, fontWeight: '900' },
});
