import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import { useWorkoTheme } from '../../design-system/ThemeProvider';
import { apiRequest } from '../../services/api/client';

type PaymentIntent = {
  requirementId: string;
  paymentId: string;
  amount: number;
  currency: string;
  provider: 'razorpay' | 'dummy';
  dummyMode?: boolean;
  keyId: string;
  orderId: string;
  status: string;
  category: string;
  title: string;
};

type MatchingState = {
  matchingState: string;
  noWorkerFound: boolean;
  status: string;
  payment?: { status: string; amount: number | string; currency: string } | null;
  offers?: Array<{ id: string; status: string; worker: { id: string; verificationStatus: string } }>;
};

type FlowState = 'PAYMENT' | 'MATCHING' | 'NO_WORKER' | 'WORKER_FOUND';

const ORANGE = '#FF6B00';

export function RequirementPaymentFlowScreen({
  accessToken,
  requirementId,
  onDone,
}: {
  accessToken: string;
  requirementId: string;
  onDone: () => void;
}) {
  const { theme } = useWorkoTheme();
  const [flow, setFlow] = useState<FlowState>('PAYMENT');
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [matching, setMatching] = useState<MatchingState | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'UPI' | 'CARD' | 'WALLET' | 'NETBANKING'>('UPI');
  const [busy, setBusy] = useState(false);
  const [loadingIntent, setLoadingIntent] = useState(true);

  const loadIntent = useCallback(async () => {
    setLoadingIntent(true);
    try {
      const response = await apiRequest(`/payments/requirements/${requirementId}/intent`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || 'Unable to prepare secure payment.');
      setIntent(payload.data);
    } catch (error) {
      Alert.alert('Payment unavailable', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoadingIntent(false);
    }
  }, [accessToken, requirementId]);

  const loadMatching = useCallback(async () => {
    const response = await apiRequest(`/requirements/${requirementId}/matching`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.message || 'Unable to load matching status.');

    const data = payload.data as MatchingState;
    setMatching(data);

    if (data.matchingState === 'WORKER_FOUND' || (data.offers?.length ?? 0) > 0) {
      setFlow('WORKER_FOUND');
    } else if (data.noWorkerFound) {
      setFlow('NO_WORKER');
    }

    return data;
  }, [accessToken, requirementId]);

  const retryMatching = useCallback(async () => {
    const response = await apiRequest(`/requirements/${requirementId}/matching/retry`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.message || 'Unable to retry worker matching.');

    setFlow('MATCHING');

    const data = payload.data as MatchingState | undefined;
    if (data) {
      setMatching(data);
      if (data.matchingState === 'WORKER_FOUND' || (data.offers?.length ?? 0) > 0) {
        setFlow('WORKER_FOUND');
      } else if (data.noWorkerFound) {
        setFlow('NO_WORKER');
      }
    } else {
      await loadMatching();
    }
  }, [accessToken, loadMatching, requirementId]);

  useEffect(() => {
    void loadIntent();
  }, [loadIntent]);

  useEffect(() => {
    if (flow !== 'MATCHING') return;

    let cancelled = false;
    let requestInFlight = false;

    const poll = async () => {
      if (cancelled || requestInFlight) return;
      requestInFlight = true;

      try {
        const data = await loadMatching();
        if (cancelled) return;

        if (data.matchingState === 'WORKER_FOUND' || (data.offers?.length ?? 0) > 0 || data.noWorkerFound) {
          return;
        }
      } catch {
        // Keep polling through transient network errors; the server remains authoritative.
      } finally {
        requestInFlight = false;
      }
    };

    void poll();
    const timer = setInterval(() => { void poll(); }, 2000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [flow, loadMatching]);

  const verifyAndContinue = async (payment: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => {
    const response = await apiRequest(`/payments/requirements/${requirementId}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        razorpayPaymentId: payment.razorpay_payment_id,
        razorpayOrderId: payment.razorpay_order_id,
        razorpaySignature: payment.razorpay_signature,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.message || 'Server-side payment verification failed.');
    if (payload?.data?.status === 'CAPTURED') {
      setFlow('MATCHING');
      await loadMatching();
      return;
    }
    if (payload?.data?.status === 'AUTHORIZED') {
      setFlow('MATCHING');
      return;
    }
    throw new Error('Payment was not captured by the provider.');
  };

  const pay = async () => {
    if (!intent) return;
    setBusy(true);
    try {
      if (intent.dummyMode) {
        await new Promise<void>(resolve => setTimeout(resolve, 700));
        const response = await apiRequest(`/payments/requirements/${requirementId}/dummy-confirm`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.message || 'Dummy payment could not be confirmed.');
        if (payload?.data?.status !== 'CAPTURED') throw new Error('Dummy payment was not captured.');
        setFlow('MATCHING');
        await loadMatching();
        return;
      }

      const result = await RazorpayCheckout.open({
        description: `Secure Worko payment · ${selectedMethod}`,
        currency: intent.currency,
        key: intent.keyId,
        amount: String(Math.round(intent.amount * 100)),
        name: 'Worko',
        order_id: intent.orderId,
        prefill: {},
        theme: { color: ORANGE },
      });
      await verifyAndContinue(result);
    } catch (error) {
      Alert.alert(
        'Payment not confirmed',
        error instanceof Error ? error.message : 'Payment was cancelled or could not be confirmed.',
      );
    } finally {
      setBusy(false);
    }
  };

  const methods = useMemo(
    () => [
      ['UPI', 'Pay using any UPI app'],
      ['CARD', 'Credit / Debit Card'],
      ['WALLET', 'Wallet'],
      ['NETBANKING', 'Net Banking'],
    ] as const,
    [],
  );

  if (loadingIntent) {
    return <View style={[styles.center, { backgroundColor: theme.background }]}><ActivityIndicator color={ORANGE}/><Text style={{ color: theme.secondaryText, marginTop: 12 }}>Preparing secure payment…</Text></View>;
  }

  if (flow === 'PAYMENT' && !intent) {
    return <View style={[styles.center, { backgroundColor: theme.background }]}><Text style={[styles.title, { color: theme.text }]}>Payment unavailable</Text><Text style={{ color: theme.secondaryText, textAlign: 'center', marginTop: 8 }}>A verified service quote and payment provider configuration are required before payment can begin.</Text><Pressable onPress={loadIntent} style={styles.primary}><Text style={styles.primaryText}>Retry</Text></Pressable></View>;
  }

  if (flow === 'MATCHING') {
    return <ProgressScreen theme={theme} title="Requirement created!" subtitle="Payment is server-verified. We're now finding the right workers for your requirement." amount={intent?.amount ?? Number(matching?.payment?.amount ?? 0)} onHome={onDone} />;
  }

  if (flow === 'NO_WORKER') {
    return <NoWorkerScreen theme={theme} matching={matching} onRetry={() => { void retryMatching().catch(error => Alert.alert('Matching retry failed', error instanceof Error ? error.message : 'Please try again.')); }} onHome={onDone} />;
  }

  if (flow === 'WORKER_FOUND') {
    return <WorkerFoundScreen theme={theme} amount={intent?.amount ?? Number(matching?.payment?.amount ?? 0)} onHome={onDone} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.step, { color: theme.secondaryText }]}>Step 6 of 6</Text>
        <Text style={[styles.title, { color: theme.text }]}>Secure <Text style={{ color: ORANGE }}>payment</Text></Text>
        <Text style={[styles.subtitle, { color: theme.secondaryText }]}>Your payment will be held securely. We'll start finding the right worker after payment is verified.</Text>

        <View style={[styles.secureCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={styles.lock}>▣</Text>
          <View style={{ flex: 1 }}><Text style={[styles.cardTitle, { color: theme.text }]}>Safe & Secure</Text><Text style={{ color: theme.secondaryText }}>Your payment is processed by Razorpay. Worko starts matching only after server verification.</Text></View>
        </View>

        <Text style={[styles.section, { color: theme.text }]}>Select Payment Method</Text>
        {methods.map(([key, label]) => (
          <Pressable key={key} onPress={() => setSelectedMethod(key)} style={[styles.method, { backgroundColor: theme.surface, borderColor: selectedMethod === key ? ORANGE : theme.border }]}>
            <View style={[styles.methodIcon, { backgroundColor: selectedMethod === key ? '#FFF0E5' : theme.background }]}><Text style={{ color: ORANGE, fontWeight: '900' }}>{key === 'UPI' ? 'U' : key === 'CARD' ? '▤' : key === 'WALLET' ? '▣' : '⌂'}</Text></View>
            <View style={{ flex: 1 }}><Text style={[styles.cardTitle, { color: theme.text }]}>{label}</Text><Text style={{ color: theme.secondaryText }}>{key === 'UPI' ? 'Google Pay, PhonePe, Paytm and more' : key === 'CARD' ? 'Visa, Mastercard, RuPay and more' : key === 'WALLET' ? 'Available wallets in secure checkout' : 'All supported banks'}</Text></View>
            <Text style={{ color: selectedMethod === key ? ORANGE : theme.secondaryText, fontSize: 24 }}>{selectedMethod === key ? '◉' : '○'}</Text>
          </Pressable>
        ))}

        <Text style={[styles.section, { color: theme.text }]}>Payment Summary</Text>
        <View style={[styles.summary, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={{ color: theme.secondaryText }}>Requirement</Text>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{intent?.title ?? 'Work requirement'}</Text>
          <View style={styles.line}><Text style={{ color: theme.secondaryText }}>Verified service amount</Text><Text style={[styles.amount, { color: theme.text }]}>₹{Number(intent?.amount ?? 0).toFixed(0)}</Text></View>
          <View style={styles.divider}/>
          <View style={styles.line}><Text style={[styles.cardTitle, { color: theme.text }]}>Total Amount</Text><Text style={[styles.total, { color: theme.text }]}>₹{Number(intent?.amount ?? 0).toFixed(0)}</Text></View>
        </View>
      </ScrollView>
      <View style={[styles.footer, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        <Pressable disabled={busy} onPress={pay} style={[styles.primary, busy && { opacity: 0.65 }]}>{busy ? <ActivityIndicator color="#FFF"/> : <Text style={styles.primaryText}>Pay ₹{Number(intent?.amount ?? 0).toFixed(0)}  →</Text>}</Pressable>
      </View>
    </View>
  );
}

function ProgressScreen({ theme, amount, subtitle, onHome }: any) {
  return <View style={{ flex: 1, backgroundColor: theme.background }}><ScrollView contentContainerStyle={styles.content}>
    <Text style={[styles.step, { color: theme.secondaryText }]}>Step 7 of 7</Text>
    <Text style={[styles.title, { color: theme.text }]}>Requirement <Text style={{ color: ORANGE }}>created!</Text></Text>
    <Text style={[styles.subtitle, { color: theme.secondaryText }]}>{subtitle}</Text>
    <View style={styles.successIcon}><Text style={{ color: '#FFF', fontSize: 44 }}>✓</Text></View>
    <Text style={[styles.centerTitle, { color: theme.text }]}>Payment verified</Text>
    <Text style={[styles.centerText, { color: theme.secondaryText }]}>Your payment of ₹{Number(amount).toFixed(0)} has been server-verified. Matching can now proceed.</Text>
    <View style={[styles.timeline, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Timeline title="Finding nearby workers" body="Searching eligible workers based on category, location, and preferences." active/>
      <Timeline title="Sending offers" body="Eligible workers receive matching offers."/>
      <Timeline title="Waiting for acceptance" body="A worker can accept the offer from the worker app."/>
      <Timeline title="Booking confirmed" body="Booking is confirmed after worker acceptance."/>
    </View>
    <Pressable onPress={onHome} style={styles.secondary}><Text style={styles.secondaryText}>Go to Home</Text></Pressable>
  </ScrollView></View>;
}

function NoWorkerScreen({ theme, matching, onRetry, onHome }: any) {
  return <View style={{ flex: 1, backgroundColor: theme.background }}><ScrollView contentContainerStyle={styles.content}>
    <Text style={[styles.step, { color: theme.secondaryText }]}>Step 8 of 8</Text>
    <Text style={[styles.title, { color: theme.text }]}>No worker <Text style={{ color: ORANGE }}>found yet</Text></Text>
    <Text style={[styles.subtitle, { color: theme.secondaryText }]}>We couldn't find an available worker right now. We'll keep searching and notify you as soon as a match is found.</Text>
    <View style={styles.searchIcon}><Text style={{ fontSize: 52, color: ORANGE }}>⌕</Text></View>
    <View style={[styles.info, { backgroundColor: theme.surface, borderColor: theme.border }]}><Text style={{ color: ORANGE, fontSize: 28 }}>◷</Text><View style={{ flex: 1 }}><Text style={[styles.cardTitle, { color: theme.text }]}>Still searching</Text><Text style={{ color: theme.secondaryText }}>The server keeps the requirement in MATCHING and can retry as workers become available.</Text></View></View>
    <View style={[styles.summary, { backgroundColor: theme.surface, borderColor: theme.border }]}><Text style={[styles.section, { color: theme.text }]}>Matching status</Text><Text style={{ color: theme.secondaryText }}>{matching?.status ?? 'MATCHING'}</Text><Text style={{ color: theme.secondaryText, marginTop: 8 }}>Payment remains secured while matching is active.</Text></View>
    <Pressable onPress={onRetry} style={styles.primary}><Text style={styles.primaryText}>Keep Searching ↻</Text></Pressable>
    <Pressable onPress={onHome} style={styles.secondary}><Text style={styles.secondaryText}>Go to Home</Text></Pressable>
  </ScrollView></View>;
}

function WorkerFoundScreen({ theme, amount, onHome }: any) {
  return <View style={{ flex: 1, backgroundColor: theme.background }}><ScrollView contentContainerStyle={styles.content}>
    <Text style={[styles.step, { color: theme.secondaryText }]}>Step 9 of 9</Text>
    <Text style={[styles.title, { color: theme.text }]}>Worker <Text style={{ color: ORANGE }}>found!</Text></Text>
    <Text style={[styles.subtitle, { color: theme.secondaryText }]}>A worker has been assigned to your requirement. The worker will still need to accept the offer before a booking is confirmed.</Text>
    <View style={styles.successIcon}><Text style={{ color: '#FFF', fontSize: 44 }}>✓</Text></View>
    <View style={[styles.summary, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.section, { color: theme.text }]}>Assignment</Text>
      <Text style={[styles.cardTitle, { color: theme.text }]}>Verified worker offer created</Text>
      <Text style={{ color: theme.secondaryText, marginTop: 6 }}>Payment secured: ₹{Number(amount).toFixed(0)}</Text>
      <Text style={{ color: theme.secondaryText, marginTop: 6 }}>Booking is not confirmed until the worker accepts.</Text>
    </View>
    <View style={[styles.timeline, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Timeline title="Worker assigned" body="Offer created and waiting for worker response." active/>
      <Timeline title="Worker on the way" body="Available after booking confirmation."/>
      <Timeline title="Work in progress" body="Available after the worker starts the job."/>
      <Timeline title="Mark as completed" body="Available after work is completed."/>
    </View>
    <Pressable onPress={onHome} style={styles.primary}><Text style={styles.primaryText}>Go to Home  →</Text></Pressable>
  </ScrollView></View>;
}

function Timeline({ title, body, active = false }: { title: string; body: string; active?: boolean }) {
  return <View style={styles.timelineRow}><View style={[styles.timelineDot, active && styles.timelineDotActive]}><Text style={{ color: active ? '#FFF' : '#555' }}>{active ? '✓' : '•'}</Text></View><View style={{ flex: 1 }}><Text style={styles.timelineTitle}>{title}</Text><Text style={styles.timelineBody}>{body}</Text></View></View>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  content: { padding: 20, paddingBottom: 32 },
  step: { textAlign: 'right', fontSize: 13, marginBottom: 12 },
  title: { fontSize: 31, lineHeight: 38, fontWeight: '900' },
  subtitle: { fontSize: 16, lineHeight: 23, marginTop: 8, marginBottom: 18 },
  secureCard: { borderWidth: 1, borderRadius: 16, padding: 16, flexDirection: 'row', gap: 12, marginBottom: 18 },
  lock: { color: ORANGE, fontSize: 28 },
  section: { fontSize: 21, fontWeight: '900', marginTop: 18, marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  method: { borderWidth: 1.5, borderRadius: 15, minHeight: 76, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  methodIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  summary: { borderWidth: 1, borderRadius: 15, padding: 16, marginBottom: 14 },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#DDD', marginTop: 14 },
  amount: { fontSize: 17, fontWeight: '800' },
  total: { fontSize: 25, fontWeight: '900' },
  footer: { padding: 14, borderTopWidth: StyleSheet.hairlineWidth },
  primary: { backgroundColor: ORANGE, minHeight: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, marginTop: 10 },
  primaryText: { color: '#FFF', fontSize: 17, fontWeight: '900' },
  secondary: { minHeight: 52, borderRadius: 14, borderWidth: 1.5, borderColor: ORANGE, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, marginTop: 10 },
  secondaryText: { color: ORANGE, fontSize: 16, fontWeight: '800' },
  successIcon: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#16A34A', alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginVertical: 18 },
  centerTitle: { fontSize: 22, fontWeight: '900', textAlign: 'center' },
  centerText: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 7, marginBottom: 18 },
  timeline: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 14 },
  timelineRow: { flexDirection: 'row', gap: 12, paddingVertical: 10 },
  timelineDot: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#EEF0F2', alignItems: 'center', justifyContent: 'center' },
  timelineDotActive: { backgroundColor: ORANGE },
  timelineTitle: { fontSize: 15, fontWeight: '800', color: '#101010' },
  timelineBody: { fontSize: 13, lineHeight: 19, color: '#777', marginTop: 2 },
  searchIcon: { alignSelf: 'center', width: 110, height: 110, borderRadius: 55, backgroundColor: '#FFF1E7', alignItems: 'center', justifyContent: 'center', marginVertical: 12 },
  info: { borderWidth: 1, borderRadius: 15, padding: 15, flexDirection: 'row', gap: 12, marginBottom: 12 },
});
