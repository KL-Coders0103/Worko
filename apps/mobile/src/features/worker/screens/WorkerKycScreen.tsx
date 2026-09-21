import React, {useEffect, useState} from 'react';

import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  pick,
  types,
} from '@react-native-documents/picker';

import {Button} from '../../../components/Button';

import {
  spacing,
  typography,
  useTheme,
} from '../../../theme';

import {
  getMyWorkerProfile,
  submitWorkerKyc,
  uploadWorkerAadhaar,
  uploadWorkerPoliceVerification,
} from '../worker.api';

import type {WorkerProfile} from '../worker.type';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import type {WorkerOnboardingParamList} from '../../../navigation/WorkerOnboardingNavigator';
type SelectedDocument = {
  uri: string;
  name: string;
  type: string;
};

export function WorkerKycScreen() {
  const {colors} = useTheme();
  const navigation =
  useNavigation<
    NativeStackNavigationProp<WorkerOnboardingParamList>
  >();
  const [worker, setWorker] =
    useState<WorkerProfile | null>(null);

  const [aadhaar, setAadhaar] =
    useState<SelectedDocument | null>(null);

  const [policeVerification, setPoliceVerification] =
    useState<SelectedDocument | null>(null);

  const [aadhaarKey, setAadhaarKey] =
    useState<string | null>(null);

  const [policeKey, setPoliceKey] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [uploadingAadhaar, setUploadingAadhaar] =
    useState(false);
  const [uploadingPolice, setUploadingPolice] =
    useState(false);
  const [submitting, setSubmitting] =
    useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const profile =
          await getMyWorkerProfile();

        setWorker(profile);

        if (profile.aadhaarDocumentKey) {
          setAadhaarKey(
            profile.aadhaarDocumentKey,
          );
        }

        if (
          profile.policeVerificationDocumentKey
        ) {
          setPoliceKey(
            profile.policeVerificationDocumentKey,
          );
        }
      } catch {
        Alert.alert(
          'Unable to load KYC',
          'Please try again.',
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const selectDocument = async (
    type: 'aadhaar' | 'police',
  ) => {
    try {
      const result = await pick({
        type: [
          types.pdf,
          types.images,
        ],
        allowMultiSelection: false,
      });

      const document = result[0];

      if (!document) {
        return;
      }

      if (
        document.size &&
        document.size > 5 * 1024 * 1024
      ) {
        Alert.alert(
          'File too large',
          'Maximum file size is 5 MB.',
        );
        return;
      }

      const selected: SelectedDocument = {
        uri: document.uri,
        name:
          document.name ||
          `${type}-document`,
        type:
          document.type ||
          'application/octet-stream',
      };

      if (type === 'aadhaar') {
        setAadhaar(selected);
      } else {
        setPoliceVerification(selected);
      }
    } catch (error: any) {
      if (
        error?.code ===
        'OPERATION_CANCELED'
      ) {
        return;
      }

      Alert.alert(
        'Unable to select document',
        'Please try again.',
      );
    }
  };

  const handleAadhaarUpload = async () => {
    if (!aadhaar) {
      Alert.alert(
        'Select Aadhaar',
        'Please select your Aadhaar document first.',
      );
      return;
    }

    try {
      setUploadingAadhaar(true);

      const documentKey =
        await uploadWorkerAadhaar(aadhaar);

      setAadhaarKey(documentKey);

      Alert.alert(
        'Aadhaar uploaded',
        'Your Aadhaar document has been uploaded securely.',
      );
    } catch (error: any) {
      const message =
        error?.response?.data?.message;

      Alert.alert(
        'Upload failed',
        Array.isArray(message)
          ? message.join('\n')
          : message ||
              'Unable to upload Aadhaar.',
      );
    } finally {
      setUploadingAadhaar(false);
    }
  };

  const handlePoliceUpload = async () => {
    if (!policeVerification) {
      Alert.alert(
        'Select document',
        'Please select your police verification certificate.',
      );
      return;
    }

    try {
      setUploadingPolice(true);

      const documentKey =
        await uploadWorkerPoliceVerification(
          policeVerification,
        );

      setPoliceKey(documentKey);

      Alert.alert(
        'Document uploaded',
        'Your police verification document has been uploaded.',
      );
    } catch (error: any) {
      const message =
        error?.response?.data?.message;

      Alert.alert(
        'Upload failed',
        Array.isArray(message)
          ? message.join('\n')
          : message ||
              'Unable to upload document.',
      );
    } finally {
      setUploadingPolice(false);
    }
  };

  const handleSubmit = async () => {
    if (!aadhaarKey) {
      Alert.alert(
        'Aadhaar required',
        'Please upload your Aadhaar document before submitting KYC.',
      );
      return;
    }

    try {
      setSubmitting(true);

      const updatedWorker =
        await submitWorkerKyc(
          aadhaarKey,
          policeKey || undefined,
        );

      setWorker(updatedWorker);

      navigation.navigate('WorkerKycStatus');

      Alert.alert(
        'KYC submitted',
        'Your KYC documents have been submitted for review.',
      );
    } catch (error: any) {
      const message =
        error?.response?.data?.message;

      Alert.alert(
        'Unable to submit KYC',
        Array.isArray(message)
          ? message.join('\n')
          : message ||
              'Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View
        style={[
          styles.loading,
          {backgroundColor: colors.background},
        ]}>
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {backgroundColor: colors.background},
      ]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <Text
          style={[
            styles.title,
            {color: colors.text},
          ]}>
          Identity Verification
        </Text>

        <Text
          style={[
            styles.subtitle,
            {color: colors.textSecondary},
          ]}>
          Upload your documents securely for Worko
          verification.
        </Text>

        <DocumentCard
          title="Aadhaar Card"
          required
          document={aadhaar}
          uploaded={Boolean(aadhaarKey)}
          onSelect={() =>
            void selectDocument('aadhaar')
          }
          onUpload={handleAadhaarUpload}
          uploading={uploadingAadhaar}
        />

        <DocumentCard
          title="Police Verification Certificate"
          description="Optional. Recommended where applicable, especially for security and domestic work."
          document={policeVerification}
          uploaded={Boolean(policeKey)}
          onSelect={() =>
            void selectDocument('police')
          }
          onUpload={handlePoliceUpload}
          uploading={uploadingPolice}
        />

        <View
          style={[
            styles.info,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}>
          <Text
            style={[
              styles.infoText,
              {color: colors.textSecondary},
            ]}>
            Accepted formats: PDF, JPG, PNG
            {'\n'}
            Maximum file size: 5 MB
            {'\n'}
            Your documents are stored privately and
            are only accessible to authorized Worko
            reviewers.
          </Text>
        </View>

        <Button
          title="Submit KYC"
          onPress={handleSubmit}
          loading={submitting}
          disabled={!aadhaarKey}
        />
      </ScrollView>
    </View>
  );
}

function DocumentCard({
  title,
  description,
  required = false,
  document,
  uploaded,
  onSelect,
  onUpload,
  uploading,
}: {
  title: string;
  description?: string;
  required?: boolean;
  document: SelectedDocument | null;
  uploaded: boolean;
  onSelect: () => void;
  onUpload: () => void;
  uploading: boolean;
}) {
  const {colors} = useTheme();

  return (
    <View
      style={[
        styles.documentCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}>
      <Text
        style={[
          styles.documentTitle,
          {color: colors.text},
        ]}>
        {title}{' '}
        {required ? (
          <Text style={{color: colors.error}}>
            *
          </Text>
        ) : null}
      </Text>

      {description ? (
        <Text
          style={[
            styles.description,
            {color: colors.textSecondary},
          ]}>
          {description}
        </Text>
      ) : null}

      <Text
        style={[
          styles.fileName,
          {color: colors.textSecondary},
        ]}>
        {document?.name ||
          (uploaded
            ? 'Document uploaded'
            : 'No document selected')}
      </Text>

      <Button
        title={
          document
            ? 'Change Document'
            : 'Choose Document'
        }
        onPress={onSelect}
        variant="outline"
      />

      {document ? (
        <Button
          title={
            uploaded
              ? 'Upload Again'
              : 'Upload Document'
          }
          onPress={onUpload}
          loading={uploading}
          style={styles.uploadButton}
        />
      ) : null}

      {uploaded ? (
        <Text
          style={[
            styles.uploaded,
            {color: colors.primary},
          ]}>
          ✓ Uploaded successfully
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },

  title: {
    ...typography.h2,
    marginBottom: spacing.sm,
  },

  subtitle: {
    ...typography.body,
    marginBottom: spacing.xl,
  },

  documentCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },

  documentTitle: {
    ...typography.h3,
    marginBottom: spacing.sm,
  },

  description: {
    ...typography.small,
    marginBottom: spacing.md,
  },

  fileName: {
    ...typography.caption,
    marginBottom: spacing.md,
  },

  uploadButton: {
    marginTop: spacing.md,
  },

  uploaded: {
    ...typography.small,
    marginTop: spacing.md,
    fontWeight: '600',
  },

  info: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },

  infoText: {
    ...typography.caption,
    lineHeight: 20,
  },
});