import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ActivityIndicator } from 'react-native';
import Video, { ResizeMode } from 'react-native-video';
import { Reel } from '../../features/reels/reel.api';
import { colors } from '../../theme';

const { width, height } = Dimensions.get('window');

interface ReelPlayerProps {
  reel: Reel;
  isActive: boolean;
  onLikePress: () => void;
  onPostRequirementPress: () => void;
}

export function ReelPlayer({ reel, isActive, onLikePress, onPostRequirementPress }: ReelPlayerProps) {
  const [isBuffering, setIsBuffering] = useState(true);

  return (
    <View style={styles.container}>
      <Video
        source={{ uri: reel.videoKey }}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        repeat={true}
        paused={!isActive}
        onBuffer={(bufferState) => setIsBuffering(bufferState.isBuffering)}
        onReadyForDisplay={() => setIsBuffering(false)}
        ignoreSilentSwitch="ignore"
      />

      {isBuffering && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      <View style={styles.overlay}>
        <View style={styles.bottomContent}>
          <Text style={styles.title}>{reel.title}</Text>
          <Text style={styles.description} numberOfLines={2}>
            {reel.description}
          </Text>

          <TouchableOpacity style={styles.ctaButton} onPress={onPostRequirementPress}>
            <Text style={styles.ctaText}>Post a Requirement</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.rightActions}>
          <TouchableOpacity style={styles.actionIcon} onPress={onLikePress}>
            <Text style={styles.iconText}>{reel.liked ? '❤️' : '🤍'}</Text>
            <Text style={styles.actionText}>{reel.likes}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width,
    height: height - 80, 
    backgroundColor: '#000',
  },
  video: {
    ...StyleSheet.absoluteFill,
  },
  loaderContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    flexDirection: 'row',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.3)', // Slight tint for contrast
  },
  bottomContent: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    color: '#ddd',
    fontSize: 14,
    marginBottom: 20,
  },
  ctaButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  ctaText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  rightActions: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 20,
    marginLeft: 15,
  },
  actionIcon: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconText: {
    fontSize: 30,
    marginBottom: 5,
  },
  actionText: {
    color: '#fff',
    fontWeight: '600',
  },
});