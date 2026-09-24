import React from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Image } from 'react-native';
import { Typography } from '../common/Typography';
import { Button } from '../buttons/Button';
import { getMediaUrl } from '../../utils/media';
import { colors, spacing, radius } from '../../theme';
import { Reel } from '../../features/reels/reel.api';

const { height: WINDOW_HEIGHT, width: WINDOW_WIDTH } = Dimensions.get('window');

interface ReelPlayerProps {
  reel: Reel;
  isActive: boolean;
  onLikePress: () => void;
  onPostRequirementPress: () => void;
}

export function ReelPlayer({ reel, onLikePress, onPostRequirementPress }: ReelPlayerProps) {
  const thumbnailUrl = getMediaUrl(reel.thumbnailKey);

  return (
    <View style={styles.container}>
      {/* 
        TODO: Replace this Image/View with react-native-video 
        <Video source={{ uri: getMediaUrl(reel.videoKey) }} paused={!isActive} ... /> 
      */}
      {thumbnailUrl ? (
        <Image source={{ uri: thumbnailUrl }} style={styles.videoPlaceholder} resizeMode="cover" />
      ) : (
        <View style={[styles.videoPlaceholder, { backgroundColor: colors.background.dark }]} />
      )}

      {/* Dark gradient overlay for text readability */}
      <View style={styles.overlay} />

      {/* Right Side Actions */}
      <View style={styles.rightActions}>
        <TouchableOpacity style={styles.actionButton} onPress={onLikePress}>
          <View style={[styles.iconPlaceholder, reel.liked && styles.iconLiked]} />
          <Typography variant="caption" color="white" weight="medium">
            {reel.likes}
          </Typography>
        </TouchableOpacity>
      </View>

      {/* Bottom Metadata */}
      <View style={styles.bottomMetadata}>
        <View style={styles.workerInfo}>
          {/* We only expose First Name to protect privacy */}
          <Typography variant="h3" color="white" weight="bold">
            {reel.worker.user.firstName || 'Worko Professional'}
          </Typography>
          {reel.worker.expectedHourlyRate && (
            <Typography variant="caption" color={colors.primaryLight} weight="semibold" style={styles.rate}>
              ₹{reel.worker.expectedHourlyRate}/hr
            </Typography>
          )}
        </View>

        {reel.title && (
          <Typography variant="body" color="white" weight="semibold" style={styles.title}>
            {reel.title}
          </Typography>
        )}
        
        {reel.description && (
          <Typography variant="caption" color="white" style={styles.description} numberOfLines={2}>
            {reel.description}
          </Typography>
        )}

        <Button 
          title="Post a Requirement" 
          onPress={onPostRequirementPress} 
          variant="primary" 
          style={styles.ctaButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT, // Assumes full screen without headers
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  videoPlaceholder: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  rightActions: {
    position: 'absolute',
    right: spacing.md,
    bottom: 250,
    alignItems: 'center',
  },
  actionButton: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: spacing.xs,
  },
  iconLiked: {
    backgroundColor: colors.status.error,
  },
  bottomMetadata: {
    position: 'absolute',
    bottom: 100, // Leave room for bottom tab bar
    left: spacing.md,
    right: spacing.md,
  },
  workerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  rate: {
    marginLeft: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: radius.sm,
  },
  title: {
    marginBottom: spacing.xs,
  },
  description: {
    marginBottom: spacing.md,
  },
  ctaButton: {
    marginTop: spacing.sm,
  }
});