import React, {useCallback, useState} from 'react';

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Switch,
  Text,
  View,
  Image,
} from 'react-native';

import {
  launchImageLibrary,
} from 'react-native-image-picker';

import {useAuth} from '../../../context/AuthContext';
import {
  useNavigation,
  useFocusEffect,
} from '@react-navigation/native';

import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import type {WorkerOnboardingParamList} from '../../../navigation/WorkerOnboardingNavigator';

import {Button} from '../../../components/Button';
import {Input} from '../../../components/Input';
import {Screen} from '../../../components/Screen';

import {
  spacing,
  typography,
  useTheme,
} from '../../../theme';

import {
  createWorkerProfile,
  getMyWorkerProfile,
  updateWorkerProfile,
  uploadWorkerProfilePhoto,
} from '../worker.api';

import type {WorkerProfile} from '../worker.type';
import { AppStackParamList } from '../../../navigation/AppNavigator';

export function WorkerProfileScreen() {
  const {colors} = useTheme();
  const {user, logout} = useAuth();

  const [worker, setWorker] =
    useState<WorkerProfile | null>(null);

  const navigation =
    useNavigation<
      NativeStackNavigationProp<WorkerOnboardingParamList>
    >();

  const appNavigation =
  useNavigation<
    NativeStackNavigationProp<AppStackParamList>
  >();

  const [bio, setBio] = useState('');
  const [experienceYears, setExperienceYears] =
    useState('');
  const [hourlyRate, setHourlyRate] =
    useState('');
  const [dailyRate, setDailyRate] =
    useState('');
  const [isAvailable, setIsAvailable] =
    useState(true);

  const [profilePhotoUri, setProfilePhotoUri] =
    useState<string | null>(null);

  const [profilePhotoKey, setProfilePhotoKey] =
    useState<string | null>(null);

  const [uploadingPhoto, setUploadingPhoto] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);

      const profile =
        await getMyWorkerProfile();

      setWorker(profile);
      setBio(profile.bio ?? '');

      setExperienceYears(
        profile.experienceYears?.toString() ?? '',
      );

      setHourlyRate(
        profile.expectedHourlyRate?.toString() ?? '',
      );

      setDailyRate(
        profile.expectedDailyRate?.toString() ?? '',
      );

      setIsAvailable(profile.isAvailable);

      setProfilePhotoKey(
        profile.profilePhotoKey ?? null,
      );
    } catch (error: any) {
      const status = error?.response?.status;

      if (status !== 404) {
        Alert.alert(
          'Unable to load profile',
          'Please try again.',
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile]),
  );

  const handlePickProfilePhoto = async () => {
    try {
      const result =
        await launchImageLibrary({
          mediaType: 'photo',
          selectionLimit: 1,
          quality: 0.8,
        });

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        Alert.alert(
          'Unable to select photo',
          result.errorMessage ||
            'Please try again.',
        );
        return;
      }

      const asset = result.assets?.[0];

      if (!asset?.uri) {
        Alert.alert(
          'Photo required',
          'Please select a valid profile photo.',
        );
        return;
      }

      if (
        asset.fileSize !== undefined &&
        asset.fileSize > 5 * 1024 * 1024
      ) {
        Alert.alert(
          'Photo too large',
          'Please select an image smaller than 5 MB.',
        );
        return;
      }

      const fileName =
        asset.fileName ||
        `profile-${Date.now()}.jpg`;

      const fileType =
        asset.type || 'image/jpeg';

      setProfilePhotoUri(asset.uri);
      setUploadingPhoto(true);

      const uploadedKey =
        await uploadWorkerProfilePhoto({
          uri: asset.uri,
          name: fileName,
          type: fileType,
        });

      setProfilePhotoKey(uploadedKey);

      Alert.alert(
        'Photo uploaded',
        'Your profile photo has been uploaded successfully.',
      );
    } catch (error: any) {
      setProfilePhotoUri(null);

      const message =
        error?.response?.data?.message;

      Alert.alert(
        'Upload failed',
        Array.isArray(message)
          ? message.join('\n')
          : message ||
              'Unable to upload profile photo. Please try again.',
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!user || user.role !== 'WORKER') {
      return;
    }

    const parsedExperience =
      experienceYears.trim() === ''
        ? undefined
        : Number(experienceYears);

    const parsedHourly =
      hourlyRate.trim() === ''
        ? undefined
        : Number(hourlyRate);

    const parsedDaily =
      dailyRate.trim() === ''
        ? undefined
        : Number(dailyRate);

    if (
      parsedExperience !== undefined &&
      (!Number.isInteger(parsedExperience) ||
        parsedExperience < 0 ||
        parsedExperience > 60)
    ) {
      Alert.alert(
        'Invalid experience',
        'Enter experience between 0 and 60 years.',
      );
      return;
    }

    if (
      parsedHourly !== undefined &&
      (!Number.isFinite(parsedHourly) ||
        parsedHourly < 0)
    ) {
      Alert.alert(
        'Invalid hourly rate',
        'Enter a valid hourly rate.',
      );
      return;
    }

    if (
      parsedDaily !== undefined &&
      (!Number.isFinite(parsedDaily) ||
        parsedDaily < 0)
    ) {
      Alert.alert(
        'Invalid daily rate',
        'Enter a valid daily rate.',
      );
      return;
    }

    if (
      parsedHourly === undefined &&
      parsedDaily === undefined
    ) {
      Alert.alert(
        'Rate required',
        'Enter at least an hourly or daily rate.',
      );
      return;
    }

    try {
      setSaving(true);

      const payload = {
        bio:
          bio.trim() === ''
            ? undefined
            : bio.trim(),

        experienceYears: parsedExperience,
        expectedHourlyRate: parsedHourly,
        expectedDailyRate: parsedDaily,
        isAvailable,
      };

      const updated =
        worker === null
          ? await createWorkerProfile(payload)
          : await updateWorkerProfile(payload);

      setWorker(updated);

      if (worker?.status === 'VERIFIED') {
        Alert.alert(
          'Profile updated',
          'Your profile has been updated successfully.',
        );
        return;
      }

      navigation.navigate('WorkerCategory');
    } catch (error: any) {
      const message =
        error?.response?.data?.message;

      Alert.alert(
        'Unable to save profile',
        Array.isArray(message)
          ? message.join('\n')
          : message ||
              'Something went wrong. Please try again.',
      );
    } finally {
      setSaving(false);
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

  const firstName = user?.firstName ?? '';
  const lastName = user?.lastName ?? '';

  return (
    <Screen scroll>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }>
        <View style={styles.header}>
          <Text
            style={[
              styles.title,
              {color: colors.text},
            ]}>
            {worker?.status === 'VERIFIED'
              ? 'My Profile'
              : 'Complete Your Profile'}
          </Text>

          <Text
            style={[
              styles.subtitle,
              {color: colors.textSecondary},
            ]}>
            {worker?.status === 'VERIFIED'
              ? 'Update your work details and availability'
              : 'Tell clients a little about your work and experience.'}
          </Text>
        </View>

        <View style={styles.photoSection}>
          <View
            style={[
              styles.photoContainer,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}>
            {profilePhotoUri ? (
              <Image
                source={{uri: profilePhotoUri}}
                style={styles.profilePhoto}
              />
            ) : (
              <View
                style={[
                  styles.photoPlaceholder,
                  {
                    backgroundColor:
                      colors.background,
                  },
                ]}>
                <Text
                  style={[
                    styles.photoPlaceholderText,
                    {
                      color:
                        colors.textSecondary,
                    },
                  ]}>
                  Photo
                </Text>
              </View>
            )}
          </View>

          <Button
            title={
              uploadingPhoto
                ? 'Uploading...'
                : profilePhotoKey
                  ? 'Change Profile Photo'
                  : 'Add Profile Photo'
            }
            onPress={handlePickProfilePhoto}
            loading={uploadingPhoto}
          />

          <Text
            style={[
              styles.photoHint,
              {color: colors.textSecondary},
            ]}>
            Use a clear photo of yourself. JPG,
            PNG or WEBP, maximum 5 MB.
          </Text>
        </View>

        <View
          style={[
            styles.nameCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}>
          <Text
            style={[
              styles.name,
              {color: colors.text},
            ]}>
            {`${firstName} ${lastName}`.trim() ||
              'Worker'}
          </Text>

          <Text
            style={[
              styles.phone,
              {color: colors.textSecondary},
            ]}>
            {user?.phoneNumber ||
              user?.email ||
              ''}
          </Text>
        </View>

        <Input
          label="About your work"
          placeholder="Tell clients about your experience and work"
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          maxLength={1000}
        />

        <Input
          label="Experience (years)"
          placeholder="e.g. 5"
          value={experienceYears}
          onChangeText={setExperienceYears}
          keyboardType="number-pad"
          maxLength={2}
        />

        <Input
          label="Expected hourly rate"
          placeholder="e.g. 500"
          value={hourlyRate}
          onChangeText={setHourlyRate}
          keyboardType="decimal-pad"
        />

        <Input
          label="Expected daily rate"
          placeholder="e.g. 1500"
          value={dailyRate}
          onChangeText={setDailyRate}
          keyboardType="decimal-pad"
        />

        <View
          style={[
            styles.availabilityRow,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}>
          <View style={styles.availabilityText}>
            <Text
              style={[
                styles.availabilityTitle,
                {color: colors.text},
              ]}>
              Available for work
            </Text>

            <Text
              style={[
                styles.availabilitySubtitle,
                {color: colors.textSecondary},
              ]}>
              Allow clients to find you for new work
            </Text>
          </View>

          <Switch
            value={isAvailable}
            onValueChange={setIsAvailable}
            trackColor={{
              false: colors.border,
              true: colors.primary,
            }}
          />
        </View>

        {worker?.status === 'VERIFIED' ? (
          <>
            <Button
              title="Create a Reel"
              onPress={() =>
                appNavigation.navigate(
                  'CreateReel',
                )
              }
            />

            {worker.id ? (
              <Button
                title="My Reels"
                onPress={() =>
                  appNavigation.navigate(
                    'WorkerReels',
                    {
                      workerId: worker.id,
                    },
                  )
                }
              />
            ) : null}
          </>
        ) : null}

        <Button
          title={
            worker?.status === 'VERIFIED'
              ? 'Save Changes'
              : 'Save & Continue'
          }
          onPress={handleSave}
          loading={saving}
        />

        <Button
  title="Logout"
  onPress={() => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch {
              Alert.alert(
                'Logout Failed',
                'Unable to logout. Please try again.',
              );
            }
          },
        },
      ],
    );
  }}
  variant="outline"
  style={styles.logoutButton}
/>

        {worker?.status ? (
          <Text
            style={[
              styles.status,
              {color: colors.textSecondary},
            ]}>
            Profile status: {worker.status}
          </Text>
        ) : null}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },

  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  header: {
    marginBottom: spacing.xl,
  },

  title: {
    ...typography.h2,
    marginBottom: spacing.sm,
  },

  subtitle: {
    ...typography.body,
  },

  nameCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },

  name: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },

  phone: {
    ...typography.small,
  },

  logoutButton: {
  marginTop: spacing.md,
  marginBottom: spacing.xl,
},

  availabilityRow: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  availabilityText: {
    flex: 1,
    paddingRight: spacing.md,
  },

  availabilityTitle: {
    ...typography.body,
    marginBottom: spacing.xs,
  },

  availabilitySubtitle: {
    ...typography.small,
  },

  status: {
    ...typography.small,
    textAlign: 'center',
    marginTop: spacing.md,
  },

  photoSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },

  photoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },

  profilePhoto: {
    width: '100%',
    height: '100%',
  },

  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  photoPlaceholderText: {
    ...typography.small,
  },

  photoHint: {
    ...typography.small,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});