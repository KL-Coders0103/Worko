import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Video, {
  OnLoadData,
  OnProgressData,
  VideoRef,
} from 'react-native-video';
import {getTokens} from '../../../services/authStorage';
import {ENV} from '../../../config/env';
import {
  getReelsFeed,
  likeReel,
  unlikeReel,
  Reel,
} from '../reel.api';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../../navigation/AppNavigator';

const {height: SCREEN_HEIGHT, width: SCREEN_WIDTH} =
  Dimensions.get('window');

const PAGE_SIZE = 5;

type ReelItemProps = {
  reel: Reel;
  active: boolean;
  screenFocused : boolean;
  accessToken: string;
  onLike: (reelId: string) => void;
  onWorkerPress: (workerId: string) => void;
};

const ReelItem = memo(function ReelItem({
  reel,
  active,
  screenFocused,
  accessToken,
  onLike,
  onWorkerPress,
}: ReelItemProps) {
  const [paused, setPaused] = useState(
    !active || !screenFocused,
  );

  const [muted, setMuted] = useState(false);

  const [videoReady, setVideoReady] =
    useState(false);

  const videoRef = useRef<VideoRef>(null);
  /**
   * Only the currently active + focused reel
   * should have an active native video player.
   */
  const shouldRenderVideo =
    active && screenFocused;

  useEffect(() => {
    const shouldPlay =
      active && screenFocused;

    setPaused(!shouldPlay);

    /**
     * When this reel becomes inactive,
     * reset the native player state.
     */
    if (!shouldPlay) {
      setVideoReady(false);
    }
  }, [active, screenFocused]);

  const firstName =
    reel.worker.user.firstName ?? '';

  const lastName =
    reel.worker.user.lastName ?? '';

  const workerName =
    `${firstName} ${lastName}`.trim() ||
    'Worko Worker';

  const videoSource = useMemo(
    () => ({
      uri: `${ENV.API_BASE_URL}/reels/${reel.id}/video`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }),
    [reel.id, accessToken],
  );

  const handleLoad = useCallback(
    (_data: OnLoadData) => {
      setVideoReady(true);
    },
    [],
  );

  const handleProgress = useCallback(
    (_data: OnProgressData) => {
      // Reserved for progress UI
    },
    [],
  );

  const handleVideoEnd = useCallback(() => {
    if (!shouldRenderVideo) {
      return;
    }

    videoRef.current?.seek(0);
  }, [shouldRenderVideo]);

  const handleVideoPress = useCallback(() => {
    if (!shouldRenderVideo) {
      return;
    }

    setPaused(value => !value);
  }, [shouldRenderVideo]);

  return (
    <View style={styles.reelContainer}>
      <Pressable
        style={styles.videoTouchArea}
        onPress={handleVideoPress}
      >
        {shouldRenderVideo ? (
          <Video
            ref={videoRef}
            source={videoSource}
            style={styles.video}
            resizeMode="cover"
            repeat={false}
            paused={paused}
            muted={muted}
            playInBackground={false}
            playWhenInactive={false}
            onLoad={handleLoad}
            onProgress={handleProgress}
            onEnd={handleVideoEnd}
          />
        ) : null}

        {!videoReady && shouldRenderVideo && (
          <View style={styles.videoLoading}>
            <ActivityIndicator
              size="large"
              color="#FFFFFF"
            />
          </View>
        )}

        {paused &&
          videoReady &&
          shouldRenderVideo && (
            <View style={styles.pauseIndicator}>
              <Text style={styles.pauseIcon}>
                ▶
              </Text>
            </View>
          )}
      </Pressable>

      <View
        pointerEvents="box-none"
        style={styles.overlay}
      >
        <View style={styles.bottomContent}>
          <Pressable
            onPress={() =>
              onWorkerPress(reel.worker.id)
            }
          >
            <Text
              style={styles.workerName}
              numberOfLines={1}
            >
              {workerName}
            </Text>
          </Pressable>

          {reel.title ? (
            <Text
              style={styles.title}
              numberOfLines={2}
            >
              {reel.title}
            </Text>
          ) : null}

          {reel.description ? (
            <Text
              style={styles.description}
              numberOfLines={3}
            >
              {reel.description}
            </Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Pressable
            style={styles.actionButton}
            onPress={() =>
              onLike(reel.id)
            }
          >
            <Text
              style={[
                styles.actionIcon,
                reel.liked &&
                  styles.likedIcon,
              ]}
            >
              {reel.liked ? '♥' : '♡'}
            </Text>

            <Text style={styles.actionText}>
              {reel.likes}
            </Text>
          </Pressable>

          <Pressable
            style={styles.actionButton}
            onPress={() =>
              setMuted(value => !value)
            }
          >
            <Text style={styles.actionIcon}>
              {muted ? '🔇' : '🔊'}
            </Text>

            <Text style={styles.actionText}>
              {muted ? 'Muted' : 'Sound'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
});

export function ReelsScreen() {
  const isFocused = useIsFocused();
  const [reels, setReels] = useState<Reel[]>(
    [],
  );

  const [activeIndex, setActiveIndex] =
    useState(0);

  const navigation =
  useNavigation<
    NativeStackNavigationProp<AppStackParamList>
  >();

  const [accessToken, setAccessToken] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [loadingMore, setLoadingMore] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [nextCursor, setNextCursor] =
    useState<string | null>(null);

  const [hasMore, setHasMore] =
    useState(false);

  const loadingMoreRef =
    useRef(false);

  const loadInitialFeed =
    useCallback(async () => {
      try {
        setLoading(true);
        setError(null);

        const tokens = await getTokens();

        if (!tokens?.accessToken) {
          throw new Error(
            'Authentication required.',
          );
        }

        setAccessToken(tokens.accessToken);

        const response =
          await getReelsFeed(PAGE_SIZE);

        setReels(response.items);
        setNextCursor(
          response.nextCursor,
        );
        setHasMore(response.hasMore);
        setActiveIndex(0);
      } catch (err) {
        console.error(
          'Failed to load reels:',
          err,
        );

        setError(
          'Unable to load reels. Please try again.',
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    loadInitialFeed();
  }, [loadInitialFeed]);

  const handleRefresh =
    useCallback(async () => {
      try {
        setRefreshing(true);
        setError(null);

        const response =
          await getReelsFeed(PAGE_SIZE);

        setReels(response.items);
        setNextCursor(
          response.nextCursor,
        );
        setHasMore(response.hasMore);
        setActiveIndex(0);
      } catch (err) {
        console.error(
          'Failed to refresh reels:',
          err,
        );

        setError(
          'Unable to refresh reels.',
        );
      } finally {
        setRefreshing(false);
      }
    }, []);

  const loadMore = useCallback(async () => {
    if (
      !hasMore ||
      !nextCursor ||
      loadingMoreRef.current
    ) {
      return;
    }

    loadingMoreRef.current = true;
    setLoadingMore(true);

    try {
      const response =
        await getReelsFeed(
          PAGE_SIZE,
          nextCursor,
        );

      setReels(current => {
        const existingIds =
          new Set(
            current.map(item => item.id),
          );

        const newItems =
          response.items.filter(
            item =>
              !existingIds.has(item.id),
          );

        return [
          ...current,
          ...newItems,
        ];
      });

      setNextCursor(
        response.nextCursor,
      );

      setHasMore(response.hasMore);
    } catch (err) {
      console.error(
        'Failed to load more reels:',
        err,
      );
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [hasMore, nextCursor]);

  const handleWorkerPress =
  useCallback(
    (workerId: string) => {
      navigation.navigate(
        'WorkerReels',
        {
          workerId,
        },
      );
    },
    [navigation],
  );
  
  const handleLike = useCallback(
    async (reelId: string) => {
      const target =
        reels.find(
          reel => reel.id === reelId,
        );

      if (!target) {
        return;
      }

      const previousLiked =
        target.liked;

      const previousLikes =
        target.likes;

      setReels(current =>
        current.map(reel =>
          reel.id === reelId
            ? {
                ...reel,
                liked: !previousLiked,
                likes:
                  previousLiked
                    ? Math.max(
                        0,
                        previousLikes - 1,
                      )
                    : previousLikes + 1,
              }
            : reel,
        ),
      );

      try {
        if (previousLiked) {
          await unlikeReel(reelId);
        } else {
          await likeReel(reelId);
        }
      } catch (err) {
        console.error(
          'Failed to update reel like:',
          err,
        );

        setReels(current =>
          current.map(reel =>
            reel.id === reelId
              ? {
                  ...reel,
                  liked: previousLiked,
                  likes: previousLikes,
                }
              : reel,
          ),
        );
      }
    },
    [reels],
  );

  const viewabilityConfig =
    useRef({
      itemVisiblePercentThreshold: 80,
    }).current;

  const onViewableItemsChanged = useCallback(
  ({viewableItems}: any) => {
    if (!isFocused) {
      return;
    }

    const firstVisible =
      viewableItems.find(
        (item: any) => item.isViewable,
      );

    if (
      firstVisible?.index !== undefined &&
      firstVisible.index !== null
    ) {
      setActiveIndex(firstVisible.index);
    }
  },
  [isFocused],
);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color="#FFFFFF"
        />

        <Text style={styles.stateText}>
          Loading reels...
        </Text>
      </View>
    );
  }

  if (error && reels.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          {error}
        </Text>

        <Pressable
          style={styles.retryButton}
          onPress={loadInitialFeed}
        >
          <Text style={styles.retryText}>
            Try Again
          </Text>
        </Pressable>
      </View>
    );
  }

  if (reels.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>
          No reels yet
        </Text>

        <Text style={styles.stateText}>
          Worker reels will appear here.
        </Text>
      </View>
    );
  }

  if (!accessToken) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          Authentication required.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={reels}
        keyExtractor={item => item.id}
        renderItem={({item, index}) => (
          <ReelItem
            reel={item}
            active={
              index === activeIndex
            }
            screenFocused={isFocused}
            accessToken={accessToken}
            onLike={handleLike}
            onWorkerPress={handleWorkerPress}
          />
        )}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
        snapToAlignment="start"
        removeClippedSubviews
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        windowSize={3}
        onEndReached={loadMore}
        onEndReachedThreshold={0.7}
        onViewableItemsChanged={
          onViewableItemsChanged
        }
        viewabilityConfig={
          viewabilityConfig
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#FFFFFF"
          />
        }
        ListFooterComponent={
          loadingMore ? (
            <View
              style={
                styles.loadingMore
              }
            >
              <ActivityIndicator
                color="#FFFFFF"
              />
            </View>
          ) : undefined
        }
        getItemLayout={(_, index) => ({
          length: SCREEN_HEIGHT,
          offset:
            SCREEN_HEIGHT * index,
          index,
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },

  reelContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000000',
  },

  videoTouchArea: {
    ...StyleSheet.absoluteFill,
  },

  video: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000000',
  },

  videoLoading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
  },

  pauseIndicator: {
    position: 'absolute',
    top: '45%',
    left: '45%',
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      'rgba(0,0,0,0.45)',
  },

  pauseIcon: {
    color: '#FFFFFF',
    fontSize: 28,
    marginLeft: 4,
  },

  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    paddingHorizontal: 18,
    paddingBottom: 90,
  },

  bottomContent: {
    paddingRight: 80,
  },

  workerName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },

  description: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },

  actions: {
    position: 'absolute',
    right: 14,
    bottom: 100,
    alignItems: 'center',
  },

  actionButton: {
    alignItems: 'center',
    marginBottom: 22,
  },

  actionIcon: {
    color: '#FFFFFF',
    fontSize: 34,
  },

  likedIcon: {
    color: '#FF3B5C',
  },

  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 3,
    fontWeight: '600',
  },

  center: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  stateText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },

  errorText: {
    color: '#FFFFFF',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
  },

  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },

  retryButton: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },

  retryText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
  },

  loadingMore: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
});