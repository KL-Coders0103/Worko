import React from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {Screen} from '../../components/ui/Screen';
import {AppText} from '../../components/ui/AppText';
import {AppCard} from '../../components/ui/AppCard';
import {AppBadge} from '../../components/ui/AppBadge';
import {AppAvatar} from '../../components/ui/AppAvatar';
import {useAuthStore} from '../../store/authStore';
import {useTheme} from '../../theme/ThemeProvider';

type AppOverviewScreenProps = {mode: 'CLIENT' | 'WORKER'};

export const AppOverviewScreen = ({mode}: AppOverviewScreenProps): React.JSX.Element => {
  const user = useAuthStore(state => state.user);
  const {theme} = useTheme();
  const isClient = mode === 'CLIENT';
  const displayName = user?.firstName ?? 'there';
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');

  const cards = [
    [isClient ? 'Post work' : 'Available jobs', isClient ? 'Create a requirement' : 'View incoming requests'],
    ['Active', isClient ? 'Track active work' : 'Manage active work'],
    ['Reels', 'Discover work and skills'],
    ['Profile', 'Manage your Worko account'],
  ];

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <AppText variant="caption" muted>{isClient ? 'CLIENT' : 'WORKER'}</AppText>
            <AppText variant="title">Hi, {displayName} 👋</AppText>
          </View>
          <AppAvatar name={fullName} />
        </View>

        <AppCard elevated>
          <AppBadge label={isClient ? 'Ready to post work' : 'Ready for work'} />
          <AppText variant="title" style={styles.cardTitle}>
            {isClient ? 'Need a job done?' : 'Looking for your next job?'}
          </AppText>
          <AppText muted>
            {isClient
              ? 'Create a requirement and Worko will handle the dispatch flow.'
              : 'Stay available and respond to relevant work requests sent to you.'}
          </AppText>
        </AppCard>

        <AppText variant="title">Your workspace</AppText>

        <View style={styles.grid}>
          {cards.map(([title, subtitle]) => (
            <View key={title} style={[styles.gridCard, {backgroundColor: theme.colors.surface, borderColor: theme.colors.border}]}>
              <AppText style={styles.gridTitle}>{title}</AppText>
              <AppText variant="caption" muted>{subtitle}</AppText>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {padding: 20, paddingBottom: 32, gap: 20},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  headerCopy: {gap: 4, flex: 1},
  cardTitle: {marginTop: 14, marginBottom: 6},
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: 12},
  gridCard: {width: '47%', minHeight: 108, borderWidth: 1, borderRadius: 18, padding: 14, justifyContent: 'space-between'},
  gridTitle: {fontSize: 16, fontWeight: '700'},
});
