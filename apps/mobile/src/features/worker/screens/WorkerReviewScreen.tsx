import React, {useCallback, useEffect, useState} from 'react';

import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {Button} from '../../../components/Button';
import {spacing, typography, useTheme} from '../../../theme';

import {
  getMyWorkerProfile,
  submitWorkerProfile,
} from '../worker.api';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import type {WorkerOnboardingParamList} from '../../../navigation/WorkerOnboardingNavigator';
import type {WorkerProfile} from '../worker.type';
import { Screen } from '../../../components/Screen';

export function WorkerReviewScreen() {
  const {colors} = useTheme();
  const navigation =
  useNavigation<
    NativeStackNavigationProp<WorkerOnboardingParamList>
  >();
  const [worker, setWorker] =
    useState<WorkerProfile | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);

      const profile =
        await getMyWorkerProfile();

      setWorker(profile);
    } catch {
      Alert.alert(
        'Unable to load profile',
        'Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleSubmit = async () => {
    if (!worker) {
      return;
    }

    try {
      setSubmitting(true);

      const updatedWorker =
        await submitWorkerProfile();

      setWorker(updatedWorker);

      navigation.navigate('WorkerKyc');

      Alert.alert(
        'Profile submitted',
        'Your profile has been submitted for KYC.',
      );
    } catch (error: any) {
      const message =
        error?.response?.data?.message;

      Alert.alert(
        'Unable to submit',
        Array.isArray(message)
          ? message.join('\n')
          : message ||
              'Please complete all required profile details.',
      );
    } finally {
      setSubmitting(false);
    }
  };

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
            styles.errorText,
            {color: colors.text},
          ]}>
          Worker profile could not be loaded.
        </Text>

        <Button
          title="Retry"
          onPress={loadProfile}
          style={styles.retry}
        />
      </View>
    </Screen>
  );
}

  const categories = (worker.categories ?? [])
    .map(item => item.category?.name)
    .filter(Boolean)
    .join(', ');

  const skills = (worker.skills ?? [])
    .map(item => item.skill?.name)
    .filter(Boolean)
    .join(', ');

  const hasRate =
    (worker.expectedHourlyRate !== null &&
    worker.expectedHourlyRate !== undefined) ||
    (worker.expectedDailyRate !== null &&
    worker.expectedDailyRate !== undefined);

  const canSubmit =
    worker.status === 'DRAFT' ||
    worker.status === 'REJECTED';

  return (
  <Screen scroll>
    <Text
      style={[
        styles.title,
        {color: colors.text},
      ]}>
      Review Your Profile
    </Text>

    <Text
      style={[
        styles.subtitle,
        {color: colors.textSecondary},
      ]}>
      Check your information before submitting
      your profile for verification.
    </Text>

    <View
      style={[
        styles.section,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}>
      <Text
        style={[
          styles.sectionTitle,
          {color: colors.text},
        ]}>
        Work Information
      </Text>

      <InfoRow
        label="About"
        value={worker.bio || 'Not provided'}
      />

      <InfoRow
        label="Experience"
        value={
          worker.experienceYears !== null &&
          worker.experienceYears !== undefined
            ? `${worker.experienceYears} years`
            : 'Not provided'
        }
      />

      <InfoRow
        label="Hourly Rate"
        value={
          worker.expectedHourlyRate !== null &&
          worker.expectedHourlyRate !== undefined
            ? `₹${worker.expectedHourlyRate}`
            : 'Not provided'
        }
      />

      <InfoRow
        label="Daily Rate"
        value={
          worker.expectedDailyRate !== null &&
          worker.expectedDailyRate !== undefined
            ? `₹${worker.expectedDailyRate}`
            : 'Not provided'
        }
      />

      <InfoRow
        label="Availability"
        value={
          worker.isAvailable
            ? 'Available'
            : 'Not currently available'
        }
      />
    </View>

    <View
      style={[
        styles.section,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}>
      <Text
        style={[
          styles.sectionTitle,
          {color: colors.text},
        ]}>
        Categories & Skills
      </Text>

      <InfoRow
        label="Categories"
        value={
          categories || 'Not selected'
        }
      />

      <InfoRow
        label="Skills"
        value={
          skills || 'Not selected'
        }
      />
    </View>

    <View
      style={[
        styles.section,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}>
      <Text
        style={[
          styles.sectionTitle,
          {color: colors.text},
        ]}>
        Profile Requirements
      </Text>

      <RequirementRow
        label="Profile photo"
        completed={Boolean(
          worker.profilePhotoKey,
        )}
      />

      <RequirementRow
        label="Experience"
        completed={
          worker.experienceYears !== null &&
          worker.experienceYears !== undefined
        }
      />

      <RequirementRow
        label="Rate"
        completed={hasRate}
      />

      <RequirementRow
        label="Categories"
        completed={
          (worker.categories ?? []).length > 0
        }
      />

      <RequirementRow
        label="Skills"
        completed={
          (worker.skills ?? []).length > 0
        }
      />
    </View>

    {worker.status === 'REJECTED' ? (
      <View
        style={[
          styles.warning,
          {
            backgroundColor:
              colors.surfaceSecondary,
            borderColor: colors.border,
          },
        ]}>
        <Text
          style={[
            styles.warningTitle,
            {color: colors.text},
          ]}>
          Profile needs resubmission
        </Text>

        <Text
          style={[
            styles.warningText,
            {color: colors.textSecondary},
          ]}>
          Update the required information and
          submit your profile again.
        </Text>
      </View>
    ) : null}

    {worker.status === 'PENDING_KYC' ||
    worker.status === 'KYC_SUBMITTED' ||
    worker.status === 'UNDER_REVIEW' ||
    worker.status === 'VERIFIED' ? (
      <View
        style={[
          styles.statusCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}>
        <Text
          style={[
            styles.statusTitle,
            {color: colors.text},
          ]}>
          Current Status
        </Text>

        <Text
          style={[
            styles.statusValue,
            {color: colors.primary},
          ]}>
          {worker.status.replaceAll('_', ' ')}
        </Text>
      </View>
    ) : null}

    {canSubmit ? (
      <Button
        title="Submit for KYC"
        onPress={handleSubmit}
        loading={submitting}
      />
    ) : null}
  </Screen>
);
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const {colors} = useTheme();

  return (
    <View style={styles.infoRow}>
      <Text
        style={[
          styles.label,
          {color: colors.textSecondary},
        ]}>
        {label}
      </Text>

      <Text
        style={[
          styles.value,
          {color: colors.text},
        ]}>
        {value}
      </Text>
    </View>
  );
}

function RequirementRow({
  label,
  completed,
}: {
  label: string;
  completed: boolean;
}) {
  const {colors} = useTheme();

  return (
    <View style={styles.requirementRow}>
      <Text
        style={[
          styles.requirementLabel,
          {color: colors.text},
        ]}>
        {label}
      </Text>

      <Text
        style={[
          styles.requirementStatus,
          {
            color: completed
              ? colors.primary
              : colors.error,
          },
        ]}>
        {completed ? '✓ Complete' : 'Incomplete'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },

  title: {
    ...typography.h2,
    marginBottom: spacing.sm,
  },

  subtitle: {
    ...typography.body,
    marginBottom: spacing.xl,
  },

  section: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },

  sectionTitle: {
    ...typography.h3,
    marginBottom: spacing.lg,
  },

  infoRow: {
    marginBottom: spacing.md,
  },

  label: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },

  value: {
    ...typography.body,
  },

  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },

  requirementLabel: {
    ...typography.body,
  },

  requirementStatus: {
    ...typography.small,
    fontWeight: '600',
  },

  warning: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },

  warningTitle: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },

  warningText: {
    ...typography.body,
  },

  statusCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },

  statusTitle: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },

  statusValue: {
    ...typography.h3,
  },

  errorText: {
    ...typography.body,
    textAlign: 'center',
  },

  retry: {
    marginTop: spacing.lg,
  },
});