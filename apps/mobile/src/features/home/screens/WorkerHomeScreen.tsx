import React, {
  useCallback,
  useState,
} from 'react';

import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';

import type {
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';

import {useAuth} from '../../../context/AuthContext';

import {HomeHeader} from '../components/HomeHeader';
import {QuickActionCard} from '../components/QuickActionCard';

import {
  spacing,
  typography,
  useTheme,
} from '../../../theme';

import {Screen} from '../../../components/Screen';
import {Section} from '../../../components/Section';
import {Card} from '../../../components/Card';
import {EmptyState} from '../../../components/EmptyState';

import type {
  AppStackParamList,
} from '../../../navigation/AppNavigator';

import type {
  WorkerProfile,
} from '../../worker/worker.type';

import {
  getMyWorkerProfile,
} from '../../worker/worker.api';

export function WorkerHomeScreen() {
  const {colors} = useTheme();
  const {user} = useAuth();

  const navigation =
    useNavigation<
      NativeStackNavigationProp<AppStackParamList>
    >();

  const [worker, setWorker] =
    useState<WorkerProfile | null>(null);

  const [loadingWorker, setLoadingWorker] =
    useState(true);

  const loadWorkerProfile = useCallback(async () => {
    try {
      setLoadingWorker(true);

      const profile =
        await getMyWorkerProfile();

      setWorker(profile);
    } catch {
      setWorker(null);
    } finally {
      setLoadingWorker(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadWorkerProfile();
    }, [loadWorkerProfile]),
  );

  if (!user) {
    return null;
  }

  const getOnboardingRoute = () => {
    switch (worker?.status) {
      case 'PENDING_KYC':
        return 'WorkerKyc';

      case 'KYC_SUBMITTED':
      case 'UNDER_REVIEW':
        return 'WorkerKycStatus';

      case 'REJECTED':
        return 'WorkerProfile';

      case 'DRAFT':
      default:
        return 'WorkerProfile';
    }
  };

  const openWallet = () => {
    navigation.navigate('Wallet' as never);
  }

  const opneBooking = () => {
    navigation.navigate('Bookings' as never)
  }

  return (
    <Screen scroll>
      <HomeHeader user={user} />

      <Section title="Quick Actions">
        {!loadingWorker &&
          worker?.status !== 'VERIFIED' && (
            <>
              <QuickActionCard
                icon={
                  worker?.status === 'KYC_SUBMITTED' ||
                  worker?.status === 'UNDER_REVIEW'
                    ? 'shield-checkmark-outline'
                    : 'person-outline'
                }
                title={
                  worker?.status === 'KYC_SUBMITTED' ||
                  worker?.status === 'UNDER_REVIEW'
                    ? 'Check Verification Status'
                    : worker?.status === 'PENDING_KYC'
                      ? 'Complete KYC'
                      : 'Complete Your Profile'
                }
                description={
                  worker?.status === 'KYC_SUBMITTED' ||
                  worker?.status === 'UNDER_REVIEW'
                    ? 'Check the current status of your worker verification.'
                    : worker?.status === 'PENDING_KYC'
                      ? 'Submit your Aadhaar and required KYC documents.'
                      : worker?.status === 'REJECTED'
                        ? 'Update your profile and resubmit your verification.'
                        : 'Add your work details, skills and location.'
                }
                onPress={() => {
                  navigation.navigate(
                    'WorkerOnboarding',
                    {
                      initialRouteName:
                        getOnboardingRoute(),
                    },
                  );
                }}
              />

              <View style={styles.actionSpacing} />
            </>
          )}

        <QuickActionCard
          icon="search"
          title="Find Nearby Jobs"
          description="Explore available work near your location."
          onPress={() => {}}
        />

        <View style={styles.actionSpacing} />

        <QuickActionCard
          icon="calendar-outline"
          title="Manage Availability"
          description="Set when you are available for work."
          onPress={() => {}}
        />

        <QuickActionCard
          icon="wallet-outline"
          title="My Wallet"
          description='View your balane and transaction history'
          onPress={openWallet}
        />

        <View style={styles.actionSpacing} />

        <QuickActionCard
          icon="briefcase-outline"
          title="My Bookings"
          description="View your upcoming and active work."
          onPress={opneBooking}
        />
      </Section>

      <Section title="Today's Earnings">
        <Card>
          <Text
            style={[
              styles.amount,
              {color: colors.text},
            ]}>
            ₹0
          </Text>

          <Text
            style={[
              styles.secondaryText,
              {color: colors.textSecondary},
            ]}>
            Earnings from completed work today
          </Text>
        </Card>
      </Section>

      <Section
        title="Nearby Jobs"
        actionLabel="View all"
        onActionPress={() => {}}>
        <Card>
          <EmptyState
            icon="briefcase-outline"
            title="No nearby jobs yet"
            description="Available jobs will appear here when matching work is available."
          />
        </Card>
      </Section>

      <Section
        title="Recommended Jobs"
        actionLabel="View all"
        onActionPress={() => {}}>
        <Card>
          <EmptyState
            icon="sparkles-outline"
            title="No recommendations yet"
            description="Recommendations will appear after your profile and skills are set up."
          />
        </Card>
      </Section>

      <Section title="Worko Reels">
        <Card>
          <EmptyState
            icon="play-circle-outline"
            title="No reels yet"
            description="Work-related reels will appear here."
          />
        </Card>
      </Section>

      <Section title="Performance">
        <View style={styles.performanceRow}>
          <Card style={styles.performanceCard}>
            <Text
              style={[
                styles.performanceValue,
                {color: colors.text},
              ]}>
              0
            </Text>

            <Text
              style={[
                styles.secondaryText,
                {color: colors.textSecondary},
              ]}>
              Jobs
            </Text>
          </Card>

          <Card style={styles.performanceCard}>
            <Text
              style={[
                styles.performanceValue,
                {color: colors.text},
              ]}>
              0.0
            </Text>

            <Text
              style={[
                styles.secondaryText,
                {color: colors.textSecondary},
              ]}>
              Rating
            </Text>
          </Card>
        </View>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionSpacing: {
    height: spacing.md,
  },

  amount: {
    ...typography.display,
  },

  secondaryText: {
    ...typography.caption,
    marginTop: spacing.xs,
  },

  performanceRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },

  performanceCard: {
    flex: 1,
  },

  performanceValue: {
    ...typography.h2,
  },
});