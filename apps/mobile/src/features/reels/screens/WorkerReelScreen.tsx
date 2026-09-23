import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Video from 'react-native-video';

import {
  useNavigation,
  useRoute,
} from '@react-navigation/native';

import type {
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';

import type {
  RouteProp,
} from '@react-navigation/native';

import {
  AppStackParamList,
} from '../../../navigation/AppNavigator';

import {
  useAuth,
} from '../../../context/AuthContext';

import {
  getWorkerReels,
  deleteReel,
  Reel,
} from '../reel.api';

import {ENV} from '../../../config/env';

type NavigationProp =
  NativeStackNavigationProp<
    AppStackParamList
  >;

type RouteProps =
  RouteProp<
    AppStackParamList,
    'WorkerReels'
  >;

export function WorkerReelsScreen() {
  const navigation =
    useNavigation<NavigationProp>();

  const route =
    useRoute<RouteProps>();

  const {user} = useAuth();

  const workerId =
    route.params.workerId;

  const [reels, setReels] =
    useState<Reel[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [workerName, setWorkerName] =
    useState('Worko Worker');

  const [workerBio, setWorkerBio] =
    useState<string | null>(null);

  const loadReels =
    useCallback(async () => {
      try {
        setLoading(true);

        const data =
          await getWorkerReels(workerId);

        setReels(data);

        if (data.length > 0) {
          const worker =
            data[0].worker;

          const firstName =
            worker.user.firstName ?? '';

          const lastName =
            worker.user.lastName ?? '';

          setWorkerName(
            `${firstName} ${lastName}`.trim() ||
              'Worko Worker',
          );

          setWorkerBio(
            worker.bio ?? null,
          );
        }
      } catch (error) {
        console.error(
          'Failed to load worker reels:',
          error,
        );

        Alert.alert(
          'Unable to load reels',
          'Please try again.',
        );
      } finally {
        setLoading(false);
      }
    }, [workerId]);

  useEffect(() => {
    void loadReels();
  }, [loadReels]);

  const handleDelete = (
    reelId: string,
  ) => {
    Alert.alert(
      'Delete Reel',
      'Are you sure you want to delete this reel?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',

          onPress: async () => {
            try {
              setDeletingId(reelId);

              await deleteReel(reelId);

              setReels(current =>
                current.filter(
                  reel =>
                    reel.id !== reelId,
                ),
              );
            } catch (error: any) {
              console.error(
                'Failed to delete reel:',
                error,
              );

              const message =
                error?.response?.data?.message;

              Alert.alert(
                'Delete failed',
                Array.isArray(message)
                  ? message.join('\n')
                  : message ||
                      'Unable to delete reel.',
              );
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  const handleBookWorker = () => {
    if (user?.role !== 'CLIENT') {
      return;
    }

    navigation.navigate(
      'ClientBookingCreate',
      {
        workerId,
        workerName,
      },
    );
  };

  const isOwnProfile =
    !!user?.id &&
    !!reels[0]?.worker?.user?.id &&
    reels[0].worker.user.id === user.id;

  const canBookWorker =
    user?.role === 'CLIENT';

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
        />

        <Text style={styles.stateText}>
          Loading reels...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() =>
            navigation.goBack()
          }
        >
          <Text style={styles.back}>
            ‹ Back
          </Text>
        </Pressable>

        <View style={styles.workerInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {workerName
                .charAt(0)
                .toUpperCase()}
            </Text>
          </View>

          <View style={styles.workerText}>
            <Text
              style={styles.workerName}
              numberOfLines={1}
            >
              {workerName}
            </Text>

            {workerBio ? (
              <Text
                style={styles.workerBio}
                numberOfLines={2}
              >
                {workerBio}
              </Text>
            ) : null}
          </View>
        </View>

        {canBookWorker && !isOwnProfile ? (
          <Pressable
            style={styles.bookButton}
            onPress={handleBookWorker}
          >
            <Text style={styles.bookButtonText}>
              Book Worker
            </Text>
          </Pressable>
        ) : null}
      </View>

      {reels.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>
            No reels yet
          </Text>

          <Text style={styles.stateText}>
            This worker hasn't published
            any reels yet.
          </Text>

          {canBookWorker ? (
            <Pressable
              style={styles.emptyBookButton}
              onPress={handleBookWorker}
            >
              <Text
                style={styles.emptyBookText}
              >
                Book Worker
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <FlatList
          data={reels}
          keyExtractor={item => item.id}
          contentContainerStyle={
            styles.list
          }
          renderItem={({item}) => (
            <View style={styles.reelCard}>
              <View
                style={
                  styles.videoContainer
                }
              >
                <Video
                  source={{
                    uri: `${ENV.API_BASE_URL}/reels/${item.id}/video`,
                  }}
                  style={styles.video}
                  resizeMode="cover"
                  controls
                  paused
                />
              </View>

              <View style={styles.reelInfo}>
                {item.title ? (
                  <Text
                    style={styles.title}
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                ) : null}

                {item.description ? (
                  <Text
                    style={styles.description}
                    numberOfLines={3}
                  >
                    {item.description}
                  </Text>
                ) : null}

                <Text
                  style={styles.likes}
                >
                  ♥ {item.likes} likes
                </Text>

                {isOwnProfile ? (
                  <Pressable
                    style={
                      styles.deleteButton
                    }
                    disabled={
                      deletingId ===
                      item.id
                    }
                    onPress={() =>
                      handleDelete(
                        item.id,
                      )
                    }
                  >
                    {deletingId ===
                    item.id ? (
                      <ActivityIndicator />
                    ) : (
                      <Text
                        style={
                          styles.deleteText
                        }
                      >
                        Delete Reel
                      </Text>
                    )}
                  </Pressable>
                ) : null}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  header: {
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 14,
    backgroundColor: '#111',
  },

  back: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },

  workerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333',
  },

  avatarText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
  },

  workerText: {
    flex: 1,
    marginLeft: 12,
  },

  workerName: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },

  workerBio: {
    color: '#AAA',
    fontSize: 13,
    marginTop: 3,
  },

  bookButton: {
    marginTop: 14,
    minHeight: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },

  bookButtonText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },

  list: {
    padding: 14,
    paddingBottom: 30,
  },

  reelCard: {
    backgroundColor: '#151515',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },

  videoContainer: {
    height: 430,
    backgroundColor: '#000',
  },

  video: {
    width: '100%',
    height: '100%',
  },

  reelInfo: {
    padding: 14,
  },

  title: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },

  description: {
    color: '#CCC',
    fontSize: 14,
    lineHeight: 20,
  },

  likes: {
    color: '#AAA',
    marginTop: 10,
    fontWeight: '600',
  },

  deleteButton: {
    marginTop: 14,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: '#2A1515',
  },

  deleteText: {
    color: '#FF6B6B',
    fontWeight: '700',
  },

  emptyBookButton: {
    marginTop: 20,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#FFF',
  },

  emptyBookText: {
    color: '#000',
    fontWeight: '700',
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#000',
  },

  stateText: {
    color: '#AAA',
    marginTop: 10,
    textAlign: 'center',
  },

  emptyTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '700',
  },
});