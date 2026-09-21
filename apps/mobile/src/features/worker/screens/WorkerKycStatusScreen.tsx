import React, {useCallback, useEffect, useState} from 'react';

import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {useNavigation} from '@react-navigation/native';

import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {Button} from '../../../components/Button';
import {Screen} from '../../../components/Screen';

import {
  spacing,
  typography,
  useTheme,
} from '../../../theme';

import {getMyWorkerProfile} from '../worker.api';

import type {
  WorkerProfile,
  WorkerStatus,
} from '../worker.type';

import type {
  WorkerOnboardingParamList,
} from '../../../navigation/WorkerOnboardingNavigator';

type NavigationProp =
  NativeStackNavigationProp<
    WorkerOnboardingParamList
  >;

export function WorkerKycStatusScreen() {
  const {colors} = useTheme();

  const navigation =
    useNavigation<NavigationProp>();

  const [worker, setWorker] =
    useState<WorkerProfile | null>(null);

  const [loading, setLoading] = useState(true);

  const loadStatus = useCallback(async () => {
    try {
      setLoading(true);

      const profile =
        await getMyWorkerProfile();

      setWorker(profile);
    } catch {
      Alert.alert(
        'Unable to load status',
        'Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  if (loading) {
    return (
      <Screen>
        <View style={styles.loading}>
          <ActivityIndicator
            size="large"
            color={colors.primary}
          />
        </View>
      </Screen>
    );
  }

  if (!worker) {
    return (
      <Screen>
        <View style={styles.loading}>
          <Text
            style={[
              styles.description,
              {color: colors.textSecondary},
            ]}>
            Unable to load verification status.
          </Text>
        </View>
      </Screen>
    );
  }

  const status = getStatusContent(
    worker.status,
  );

  return (
    <Screen scroll>
      <View
        style={[
          styles.statusIcon,
          {
            backgroundColor:
              colors.surfaceSecondary,
          },
        ]}>
        <Text
          style={[
            styles.statusIconText,
            {color: colors.primary},
          ]}>
          {status.icon}
        </Text>
      </View>

      <Text
        style={[
          styles.title,
          {color: colors.text},
        ]}>
        {status.title}
      </Text>

      <Text
        style={[
          styles.description,
          {color: colors.textSecondary},
        ]}>
        {status.description}
      </Text>

      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}>
        <Text
          style={[
            styles.label,
            {color: colors.textSecondary},
          ]}>
          Current status
        </Text>

        <Text
          style={[
            styles.status,
            {color: colors.primary},
          ]}>
          {worker.status.replaceAll('_', ' ')}
        </Text>

        <StatusRow
          label="Aadhaar"
          completed={Boolean(
            worker.aadhaarDocumentKey,
          )}
        />

        <StatusRow
          label="Police Verification"
          completed={Boolean(
            worker.policeVerificationDocumentKey,
          )}
          optional
        />
      </View>

      {worker.status === 'REJECTED' ? (
        <Button
          title="Update KYC & Resubmit"
          onPress={() =>
            navigation.navigate('WorkerKyc')
          }
        />
      ) : null}

      {worker.status === 'PENDING_KYC' ? (
        <Button
          title="Continue KYC"
          onPress={() =>
            navigation.navigate('WorkerKyc')
          }
        />
      ) : null}

      {worker.status === 'KYC_SUBMITTED' ||
      worker.status === 'UNDER_REVIEW' ? (
        <Button
          title="Refresh Status"
          onPress={() => void loadStatus()}
          variant="outline"
        />
      ) : null}

      {worker.status === 'VERIFIED' ? (
        <View
          style={[
            styles.verifiedCard,
            {
              backgroundColor:
                colors.surfaceSecondary,
            },
          ]}>
          <Text
            style={[
              styles.verifiedTitle,
              {color: colors.primary},
            ]}>
            ✓ Verified Worker
          </Text>

          <Text
            style={[
              styles.verifiedText,
              {color: colors.textSecondary},
            ]}>
            Your Worko worker profile has been
            verified. You can now access verified
            worker features.
          </Text>
        </View>
      ) : null}
    </Screen>
  );
}

function StatusRow({
  label,
  completed,
  optional = false,
}: {
  label: string;
  completed: boolean;
  optional?: boolean;
}) {
  const {colors} = useTheme();

  return (
    <View style={styles.statusRow}>
      <Text
        style={[
          styles.statusRowLabel,
          {color: colors.text},
        ]}>
        {label}
        {optional ? ' (Optional)' : ''}
      </Text>

      <Text
        style={[
          styles.statusRowValue,
          {
            color: completed
              ? colors.primary
              : colors.textSecondary,
          },
        ]}>
        {completed
          ? '✓ Uploaded'
          : optional
            ? 'Not uploaded'
            : 'Required'}
      </Text>
    </View>
  );
}

function getStatusContent(status: WorkerStatus) {
  switch (status) {
    case 'PENDING_KYC':
      return {
        icon: '!',
        title: 'KYC Required',
        description:
          'Your profile has been submitted. Please upload your Aadhaar document to continue.',
      };

    case 'KYC_SUBMITTED':
      return {
        icon: '✓',
        title: 'KYC Submitted',
        description:
          'Your documents have been submitted successfully and are waiting for review.',
      };

    case 'UNDER_REVIEW':
      return {
        icon: '◷',
        title: 'Under Review',
        description:
          'Your KYC documents are currently being reviewed by the Worko team.',
      };

    case 'VERIFIED':
      return {
        icon: '✓',
        title: 'You are Verified',
        description:
          'Your KYC has been approved and your worker account is verified.',
      };

    case 'REJECTED':
      return {
        icon: '!',
        title: 'KYC Needs Attention',
        description:
          'Your KYC submission was rejected. Update the required information and submit it again.',
      };

    default:
      return {
        icon: 'i',
        title: 'KYC Status',
        description:
          'Your worker verification status will appear here.',
      };
  }
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statusIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },

  statusIconText: {
    fontSize: 32,
    fontWeight: '700',
  },

  title: {
    ...typography.h2,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },

  description: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },

  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },

  label: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },

  status: {
    ...typography.h3,
    marginBottom: spacing.lg,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },

  statusRowLabel: {
    ...typography.body,
    flex: 1,
  },

  statusRowValue: {
    ...typography.small,
    fontWeight: '600',
  },

  verifiedCard: {
    borderRadius: 16,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },

  verifiedTitle: {
    ...typography.h3,
    marginBottom: spacing.sm,
  },

  verifiedText: {
    ...typography.body,
  },
});