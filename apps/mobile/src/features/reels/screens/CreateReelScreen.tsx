import React, {useState} from 'react';

import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  launchImageLibrary,
} from 'react-native-image-picker';

import Video from 'react-native-video';

import {
  useNavigation,
} from '@react-navigation/native';

import type {
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';

import {
  AppStackParamList,
} from '../../../navigation/AppNavigator';

import {
  spacing,
  typography,
  useTheme,
} from '../../../theme';

import {Screen} from '../../../components/Screen';
import {Input} from '../../../components/Input';
import {Button} from '../../../components/Button';

import {
  publishReel,
  updateReel,
  uploadReelVideo,
} from '../reel.api';

type NavigationProp =
  NativeStackNavigationProp<
    AppStackParamList,
    'CreateReel'
  >;

type SelectedVideo = {
  uri: string;
  fileName: string;
  type: string;
  duration: number | null;
  fileSize: number | null;
};

export function CreateReelScreen() {
  const {colors} = useTheme();

  const navigation =
    useNavigation<NavigationProp>();

  const [video, setVideo] =
    useState<SelectedVideo | null>(null);

  const [title, setTitle] =
    useState('');

  const [description, setDescription] =
    useState('');

  const [uploading, setUploading] =
    useState(false);

  const [publishing, setPublishing] =
    useState(false);

  const [uploadProgress, setUploadProgress] =
    useState(0);

  const [draftId, setDraftId] =
    useState<string | null>(null);

  const [videoPaused, setVideoPaused] =
    useState(false);

  const pickVideo = async () => {
    try {
      const result =
        await launchImageLibrary({
          mediaType: 'video',
          selectionLimit: 1,
          videoQuality: 'high',
        });

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        Alert.alert(
          'Unable to select video',
          result.errorMessage ||
            'Please try again.',
        );
        return;
      }

      const asset =
        result.assets?.[0];

      if (!asset?.uri) {
        Alert.alert(
          'Video required',
          'Please select a valid video.',
        );
        return;
      }

      const fileSize =
        asset.fileSize ?? null;

      if (
        fileSize !== null &&
        fileSize > 100 * 1024 * 1024
      ) {
        Alert.alert(
          'Video too large',
          'Reel video must not exceed 100 MB.',
        );
        return;
      }

      const duration =
        asset.duration ?? null;

      if (
        duration !== null &&
        duration > 300
      ) {
        Alert.alert(
          'Video too long',
          'Reel duration cannot exceed 5 minutes.',
        );
        return;
      }

      const mimeType =
        asset.type || 'video/mp4';

      const supportedTypes = [
        'video/mp4',
        'video/quicktime',
        'video/webm',
      ];

      if (
        !supportedTypes.includes(
          mimeType.toLowerCase(),
        )
      ) {
        Alert.alert(
          'Unsupported video',
          'Allowed formats are MP4, MOV and WebM.',
        );
        return;
      }

      setVideo({
        uri: asset.uri,
        fileName:
          asset.fileName ||
          `reel-${Date.now()}.mp4`,
        type: mimeType,
        duration,
        fileSize,
      });

      setDraftId(null);
      setUploadProgress(0);
    } catch (error) {
      console.error(
        'Video picker error:',
        error,
      );

      Alert.alert(
        'Unable to select video',
        'Please try again.',
      );
    }
  };

  const handleUpload = async () => {
    if (!video) {
      Alert.alert(
        'Video required',
        'Please select a video first.',
      );
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      const result =
        await uploadReelVideo(
          video.uri,
          video.fileName,
          video.type,
          progress =>
            setUploadProgress(progress),
        );

      setDraftId(result.id);

      setUploadProgress(1);

      Alert.alert(
        'Video uploaded',
        'Your reel draft has been created.',
      );
    } catch (error: any) {
      console.error(
        'Reel upload error:',
        error,
      );

      const message =
        error?.response?.data?.message;

      Alert.alert(
        'Upload failed',
        Array.isArray(message)
          ? message.join('\n')
          : message ||
              'Unable to upload reel.',
      );
    } finally {
      setUploading(false);
    }
  };

  const handlePublish = async () => {
    if (!draftId) {
      Alert.alert(
        'Upload required',
        'Upload your video before publishing.',
      );
      return;
    }

    if (!title.trim()) {
      Alert.alert(
        'Title required',
        'Please enter a reel title.',
      );
      return;
    }

    try {
      setPublishing(true);

      await updateReel(
        draftId,
        {
          title: title.trim(),
          description:
            description.trim() ||
            undefined,
          durationSeconds:
            video?.duration
              ? Math.round(
                  video.duration,
                )
              : undefined,
        },
      );

      await publishReel(draftId);

      Alert.alert(
        'Reel published',
        'Your reel is now live.',
        [
          {
            text: 'Done',
            onPress: () =>
              navigation.goBack(),
          },
        ],
      );
    } catch (error: any) {
      console.error(
        'Publish reel error:',
        error,
      );

      const message =
        error?.response?.data?.message;

      Alert.alert(
        'Publish failed',
        Array.isArray(message)
          ? message.join('\n')
          : message ||
              'Unable to publish reel.',
      );
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Screen scroll>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            onPress={() =>
              navigation.goBack()
            }
          >
            <Text
              style={[
                styles.back,
                {color: colors.primary},
              ]}
            >
              ‹ Back
            </Text>
          </Pressable>

          <Text
            style={[
              styles.title,
              {color: colors.text},
            ]}
          >
            Create Reel
          </Text>

          <Text
            style={[
              styles.subtitle,
              {color: colors.textSecondary},
            ]}
          >
            Show clients what you do best.
          </Text>
        </View>

        {!video ? (
          <Pressable
            style={[
              styles.picker,
              {
                backgroundColor:
                  colors.surface,
                borderColor:
                  colors.border,
              },
            ]}
            onPress={pickVideo}
          >
            <Text
              style={[
                styles.pickerIcon,
                {color: colors.primary},
              ]}
            >
              +
            </Text>

            <Text
              style={[
                styles.pickerTitle,
                {color: colors.text},
              ]}
            >
              Select Video
            </Text>

            <Text
              style={[
                styles.pickerSubtitle,
                {color: colors.textSecondary},
              ]}
            >
              MP4, MOV or WebM · Maximum 100 MB
            </Text>
          </Pressable>
        ) : (
          <View>
            <Pressable
              style={styles.videoContainer}
              onPress={() =>
                setVideoPaused(
                  value => !value,
                )
              }
            >
              <Video
                source={{
                  uri: video.uri,
                }}
                style={styles.video}
                resizeMode="cover"
                paused={videoPaused}
                repeat
              />

              {videoPaused && (
                <View
                  style={
                    styles.videoOverlay
                  }
                >
                  <Text
                    style={
                      styles.playIcon
                    }
                  >
                    ▶
                  </Text>
                </View>
              )}
            </Pressable>

            <Button
              title="Choose Different Video"
              onPress={pickVideo}
            />
          </View>
        )}

        {video && !draftId && (
          <View style={styles.uploadSection}>
            <Button
              title={
                uploading
                  ? `Uploading ${Math.round(
                      uploadProgress * 100,
                    )}%`
                  : 'Upload Video'
              }
              onPress={handleUpload}
              loading={uploading}
            />

            {uploading && (
              <View
                style={[
                  styles.progressTrack,
                  {
                    backgroundColor:
                      colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${
                        uploadProgress * 100
                      }%`,
                      backgroundColor:
                        colors.primary,
                    },
                  ]}
                />
              </View>
            )}
          </View>
        )}

        {draftId && (
          <>
            <View style={styles.successBox}>
              <Text
                style={[
                  styles.successText,
                  {color: colors.primary},
                ]}
              >
                ✓ Video uploaded
              </Text>
            </View>

            <Input
              label="Title"
              placeholder="e.g. Professional Security Service"
              value={title}
              onChangeText={setTitle}
              maxLength={150}
            />

            <Input
              label="Description"
              placeholder="Tell clients about this reel"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={1000}
            />

            <Button
              title="Publish Reel"
              onPress={handlePublish}
              loading={publishing}
            />
          </>
        )}

        <Text
          style={[
            styles.hint,
            {color: colors.textSecondary},
          ]}
        >
          Keep your reel professional and focused
          on your skills and services.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xl,
  },

  header: {
    marginBottom: spacing.xl,
  },

  back: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.lg,
  },

  title: {
    ...typography.h2,
    marginBottom: spacing.sm,
  },

  subtitle: {
    ...typography.body,
  },

  picker: {
    minHeight: 220,
    borderWidth: 1,
    borderRadius: 20,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },

  pickerIcon: {
    fontSize: 48,
    fontWeight: '300',
    marginBottom: spacing.md,
  },

  pickerTitle: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },

  pickerSubtitle: {
    ...typography.small,
    textAlign: 'center',
  },

  videoContainer: {
    height: 420,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: spacing.md,
  },

  video: {
    width: '100%',
    height: '100%',
  },

  videoOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      'rgba(0,0,0,0.25)',
  },

  playIcon: {
    color: '#FFFFFF',
    fontSize: 42,
  },

  uploadSection: {
    marginBottom: spacing.lg,
  },

  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: spacing.md,
  },

  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  successBox: {
    padding: spacing.md,
    marginBottom: spacing.lg,
  },

  successText: {
    fontSize: 15,
    fontWeight: '700',
  },

  hint: {
    ...typography.small,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});