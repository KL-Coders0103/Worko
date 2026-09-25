import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { ReelPlayer } from '../../../components/reels/ReelPlayer';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { getReelsFeed, Reel, likeReel, unlikeReel } from '../../reels/reel.api';
import { colors } from '../../../theme';

export function ClientHomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const [reels, setReels] = useState<Reel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  
  // Pagination states
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchReels = async (isLoadMore = false) => {
    // Prevent fetching if already loading or no more items
    if (isLoadMore && (!hasMore || isFetchingMore)) return;

    try {
      if (isLoadMore) {
        setIsFetchingMore(true);
      } else {
        setIsLoading(true);
        setError(null);
      }

      const data = await getReelsFeed(10, isLoadMore && nextCursor ? nextCursor : undefined);
      const newReels = data.items.filter(r => r.status === 'PUBLISHED');

      if (isLoadMore) {
        setReels(prev => [...prev, ...newReels]);
      } else {
        setReels(newReels);
      }

      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch {
      if (!isLoadMore) {
        setError('Failed to load reels. Please try again.');
      }
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  };

  useEffect(() => {
    fetchReels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePostRequirement = () => {
    navigation.navigate('ClientRequirements'); 
  };

  const handleLikeToggle = async (index: number) => {
    const reel = reels[index];
    const newLikedState = !reel.liked;
    
    const updatedReels = [...reels];
    updatedReels[index] = { 
      ...reel, 
      liked: newLikedState, 
      likes: newLikedState ? reel.likes + 1 : Math.max(0, reel.likes - 1) 
    };
    setReels(updatedReels);

    try {
      if (newLikedState) {
        await likeReel(reel.id);
      } else {
        await unlikeReel(reel.id);
      }
    } catch {
      const revertedReels = [...reels];
      revertedReels[index] = reel;
      setReels(revertedReels);
    }
  };

  const onViewableItemsChanged = useCallback((info: any) => {
    if (info.viewableItems && info.viewableItems.length > 0) {
      const firstVisible = info.viewableItems[0];
      if (firstVisible.index !== null) {
        setActiveIndex(firstVisible.index);
      }
    }
  }, []);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 70 }).current;

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => fetchReels()} />;
  }

  if (reels.length === 0) {
    return (
      <EmptyState 
        title="No work to show yet" 
        description="Workers haven't posted any reels."
        actionLabel="Post a Requirement Anyway"
        onAction={handlePostRequirement}
      />
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={reels}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <ReelPlayer
            reel={item}
            isActive={activeIndex === index}
            onLikePress={() => handleLikeToggle(index)}
            onPostRequirementPress={handlePostRequirement}
          />
        )}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        // Pagination Props
        onEndReached={() => fetchReels(true)}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLoader: {
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  }
});