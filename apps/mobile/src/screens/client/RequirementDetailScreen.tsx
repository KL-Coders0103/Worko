import React, {useCallback, useEffect, useState} from 'react';
import {RefreshControl, ScrollView, StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {AppButton} from '../../components/ui/AppButton';
import {AppCard} from '../../components/ui/AppCard';
import {AppText} from '../../components/ui/AppText';
import {ErrorState} from '../../components/ui/ErrorState';
import {LoadingState} from '../../components/ui/LoadingState';
import {Screen} from '../../components/ui/Screen';
import {SectionHeader} from '../../components/ui/SectionHeader';
import {getWorkoApiErrorMessage} from '../../api/apiClient';
import {clientApi} from '../../client/clientApi';
import type {ClientRequirement} from '../../client/types';
import type {AppStackParamList} from '../../navigation/types';
import {useClientStore} from '../../store/clientStore';
import {useTheme} from '../../theme/ThemeProvider';

type Props = NativeStackScreenProps<AppStackParamList, 'RequirementDetail'>;

const statusLabel = (status: ClientRequirement['status']): string => {
  switch (status) {
    case 'MATCHING': return 'Finding matching workers';
    case 'OPEN': return 'Waiting for a matching worker';
    case 'MATCHED': return 'Worker matched';
    case 'COMPLETED': return 'Work completed';
    case 'CANCELLED': return 'Requirement cancelled';
  }
};

const bookingLabel = (status: string): string => {
  switch (status) {
    case 'PENDING': return 'Booking pending';
    case 'ACCEPTED': return 'Worker accepted';
    case 'CONFIRMED': return 'Booking confirmed';
    case 'WORKER_EN_ROUTE': return 'Worker is on the way';
    case 'ARRIVED': return 'Worker has arrived';
    case 'CHECKED_IN': return 'Worker checked in';
    case 'IN_PROGRESS': return 'Work in progress';
    case 'COMPLETED': return 'Work completed';
    case 'CANCELLED': return 'Booking cancelled';
    default: return status.replaceAll('_', ' ');
  }
};

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unavailable';
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const RequirementDetailScreen = ({route}: Props): React.JSX.Element => {
  const navigation = useNavigation();
  const {theme} = useTheme();
  const loadRequirements = useClientStore(state => state.loadRequirements);
  const [requirement, setRequirement] = useState<ClientRequirement | null>(null);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const data = await clientApi.getRequirement(route.params.requirementId);
      setRequirement(data);
      setStatus('success');
    } catch (err) {
      setError(getWorkoApiErrorMessage(err));
      setStatus('error');
    }
  }, [route.params.requirementId]);

  useEffect(() => { void load(); }, [load]);

  const cancel = async () => {
    if (!requirement || cancelling) return;
    setCancelling(true);
    setError(null);
    try {
      const updated = await clientApi.cancelRequirement(requirement.id);
      setRequirement(updated);
      await loadRequirements();
    } catch (err) {
      setError(getWorkoApiErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  };

  if (status === 'loading' && !requirement) {
    return <Screen><LoadingState message="Loading requirement..." /></Screen>;
  }

  if (status === 'error' && !requirement) {
    return <Screen><ErrorState title="Could not load requirement" description={error ?? 'Please try again.'} onActionPress={() => void load()} /></Screen>;
  }

  if (!requirement) return <Screen><ErrorState title="Requirement unavailable" /></Screen>;

  const workerName = requirement.booking?.worker
    ? [requirement.booking.worker.firstName, requirement.booking.worker.lastName].filter(Boolean).join(' ')
    : '';

  const cancellable = requirement.status !== 'MATCHED' &&
    requirement.status !== 'COMPLETED' &&
    requirement.status !== 'CANCELLED';

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={status === 'loading'} onRefresh={() => void load()} tintColor={theme.colors.accent} />}>
        <AppText variant="display">{requirement.title}</AppText>
        <AppText variant="body" muted>{statusLabel(requirement.status)}</AppText>

        {error ? <ErrorState title="Action failed" description={error} /> : null}

        <AppCard elevated>
          <AppText variant="caption" style={{color: theme.colors.accent, fontWeight: '800'}}>WORK STATUS</AppText>
          <AppText variant="title" style={styles.cardTitle}>{statusLabel(requirement.status)}</AppText>
          <AppText muted>{requirement.booking ? bookingLabel(requirement.booking.status) : 'Worko is continuing the dispatch process.'}</AppText>
        </AppCard>

        {workerName ? (
          <AppCard>
            <SectionHeader title="Matched worker" />
            <AppText variant="title" style={styles.workerName}>{workerName}</AppText>
            <AppText variant="caption" muted>Worker matched through Worko dispatch.</AppText>
          </AppCard>
        ) : null}

        <AppCard>
          <SectionHeader title="Work details" />
          <AppText variant="label" style={styles.label}>Category</AppText>
          <AppText muted>{requirement.categoryName}</AppText>
          {requirement.skillName ? <><AppText variant="label" style={styles.label}>Skill</AppText><AppText muted>{requirement.skillName}</AppText></> : null}
          {requirement.description ? <><AppText variant="label" style={styles.label}>Description</AppText><AppText muted>{requirement.description}</AppText></> : null}
          <AppText variant="label" style={styles.label}>Address</AppText>
          <AppText muted>{requirement.address}</AppText>
          <AppText variant="label" style={styles.label}>Scheduled</AppText>
          <AppText muted>{formatDateTime(requirement.scheduledStart)}</AppText>
          <AppText muted>Until {formatDateTime(requirement.scheduledEnd)}</AppText>
          {requirement.budget !== null ? <><AppText variant="label" style={styles.label}>Budget</AppText><AppText muted>{String(requirement.budget)}</AppText></> : null}
        </AppCard>

        {cancellable ? <AppButton label="Cancel requirement" variant="secondary" loading={cancelling} disabled={cancelling} onPress={() => void cancel()} /> : null}
        <AppButton label="Back" variant="ghost" onPress={() => navigation.goBack()} />
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {padding: 20, paddingBottom: 40, gap: 16},
  cardTitle: {marginTop: 8, marginBottom: 6},
  workerName: {marginTop: 14, marginBottom: 4},
  label: {marginTop: 14, marginBottom: 4},
});
