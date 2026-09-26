import React, {useCallback, useEffect} from 'react';
import {RefreshControl, ScrollView, StyleSheet, View} from 'react-native';
import {Screen} from '../../components/ui/Screen';
import {AppText} from '../../components/ui/AppText';
import {AppCard} from '../../components/ui/AppCard';
import {AppButton} from '../../components/ui/AppButton';
import {LoadingState} from '../../components/ui/LoadingState';
import {EmptyState} from '../../components/ui/EmptyState';
import {ErrorState} from '../../components/ui/ErrorState';
import {SectionHeader} from '../../components/ui/SectionHeader';
import {useAuthStore} from '../../store/authStore';
import {useClientStore} from '../../store/clientStore';
import {useTheme} from '../../theme/ThemeProvider';
import type {ClientRequirement} from '../../client/types';

const formatDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Schedule unavailable';
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const statusLabel = (status: ClientRequirement['status']): string => {
  switch (status) {
    case 'MATCHING':
      return 'Finding workers';
    case 'OPEN':
      return 'Open';
    case 'MATCHED':
      return 'Worker matched';
    case 'COMPLETED':
      return 'Completed';
    case 'CANCELLED':
      return 'Cancelled';
  }
};

const RequirementCard = ({item}: {item: ClientRequirement}): React.JSX.Element => {
  const {theme} = useTheme();
  const workerName = item.booking?.worker
    ? [item.booking.worker.firstName, item.booking.worker.lastName].filter(Boolean).join(' ')
    : '';

  return (
    <AppCard>
      <View style={styles.cardTop}>
        <View style={styles.cardCopy}>
          <AppText variant="title">{item.title}</AppText>
          <AppText variant="caption" muted>{item.categoryName}</AppText>
        </View>
        <View style={[styles.status, {backgroundColor: theme.colors.surface, borderColor: theme.colors.border}]}>
          <AppText variant="caption" style={{color: theme.colors.accent, fontWeight: '700'}}>
            {statusLabel(item.status)}
          </AppText>
        </View>
      </View>
      <AppText variant="body" muted style={styles.address}>{item.address}</AppText>
      <AppText variant="caption" muted>{formatDate(item.scheduledStart)}</AppText>
      {workerName ? <AppText variant="caption" style={styles.worker}>Matched with {workerName}</AppText> : null}
    </AppCard>
  );
};

export const ClientHomeScreen = (): React.JSX.Element => {
  const user = useAuthStore(state => state.user);
  const requirements = useClientStore(state => state.requirements);
  const status = useClientStore(state => state.status);
  const loadRequirements = useClientStore(state => state.loadRequirements);
  const {theme} = useTheme();

  useEffect(() => {
    void loadRequirements();
  }, [loadRequirements]);

  const refresh = useCallback(() => {
    void loadRequirements();
  }, [loadRequirements]);

  const activeCount = requirements.filter(
    item => item.status !== 'COMPLETED' && item.status !== 'CANCELLED',
  ).length;

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={status === 'loading' && requirements.length > 0}
            onRefresh={refresh}
            tintColor={theme.colors.accent}
          />
        }>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <AppText variant="caption" muted>CLIENT</AppText>
            <AppText variant="display">Hi, {user?.firstName ?? 'there'} 👋</AppText>
            <AppText variant="body" muted>What do you need done?</AppText>
          </View>
        </View>

        <AppCard elevated style={styles.hero}>
          <AppText variant="caption" style={{color: theme.colors.accent, fontWeight: '800'}}>
            WORKO DISPATCH
          </AppText>
          <AppText variant="title" style={styles.heroTitle}>Post a requirement and let Worko find the right worker.</AppText>
          <AppText variant="body" muted>Workers are matched using the requirement, skills, availability and location.</AppText>
          <View style={styles.heroAction}>
            <AppButton label="Post work" onPress={() => {}} />
          </View>
        </AppCard>

        <View style={styles.summaryRow}>
          <View style={[styles.summary, {backgroundColor: theme.colors.surface, borderColor: theme.colors.border}]}>
            <AppText variant="display">{activeCount}</AppText>
            <AppText variant="caption" muted>Active</AppText>
          </View>
          <View style={[styles.summary, {backgroundColor: theme.colors.surface, borderColor: theme.colors.border}]}>
            <AppText variant="display">{requirements.length}</AppText>
            <AppText variant="caption" muted>Total requests</AppText>
          </View>
        </View>

        <SectionHeader title="Your requirements" />

        {status === 'loading' && requirements.length === 0 ? (
          <LoadingState message="Loading your requirements..." />
        ) : status === 'error' && requirements.length === 0 ? (
          <ErrorState
            title="Could not load your work"
            description="Check your connection and try again."
            onActionPress={refresh}
          />
        ) : requirements.length === 0 ? (
          <EmptyState
            title="No requirements yet"
            description="Your posted work will appear here."
            actionLabel="Post your first requirement"
            onActionPress={() => {}}
          />
        ) : (
          <View style={styles.list}>
            {requirements.slice(0, 5).map(item => (
              <RequirementCard key={item.id} item={item} />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {padding: 20, paddingBottom: 32, gap: 20},
  header: {flexDirection: 'row', alignItems: 'flex-start'},
  headerCopy: {flex: 1, gap: 4},
  hero: {padding: 20},
  heroTitle: {marginTop: 10, marginBottom: 8},
  heroAction: {marginTop: 18, maxWidth: 180},
  summaryRow: {flexDirection: 'row', gap: 12},
  summary: {flex: 1, minHeight: 96, borderWidth: 1, borderRadius: 18, padding: 16, justifyContent: 'space-between'},
  list: {gap: 12},
  cardTop: {flexDirection: 'row', alignItems: 'flex-start', gap: 12},
  cardCopy: {flex: 1, gap: 4},
  status: {borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6},
  address: {marginTop: 14, marginBottom: 6},
  worker: {marginTop: 8, fontWeight: '600'},
});
