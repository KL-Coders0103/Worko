import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { colors } from '../../../theme';

interface IncomingJob {
  id: string;
  category: string;
  distance: string;
  budget: string;
  clientLocation: string;
}

interface WorkerIncomingJobModalProps {
  visible: boolean;
  job: IncomingJob | null;
  onAccept: () => void;
  onReject: () => void;
}

const { width } = Dimensions.get('window');

export function WorkerIncomingJobModal({ visible, job, onAccept, onReject }: WorkerIncomingJobModalProps) {
  const timerAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      timerAnim.setValue(1);
      Animated.timing(timerAnim, {
        toValue: 0,
        duration: 15000, 
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) {
          onReject();
        }
      });
    } else {
      timerAnim.stopAnimation();
    }
  }, [visible, timerAnim, onReject]);

  if (!job) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.newRequestText}>NEW REQUEST</Text>
          
          <Text style={styles.category}>{job.category}</Text>
          <Text style={styles.budget}>{job.budget}</Text>
          
          <View style={styles.detailsRow}>
            <Text style={styles.icon}>📍</Text>
            <View>
              <Text style={styles.distance}>{job.distance} away</Text>
              <Text style={styles.location}>{job.clientLocation}</Text>
            </View>
          </View>

          <View style={styles.timerContainer}>
            <Animated.View 
              style={[
                styles.timerBar, 
                { 
                  width: timerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%']
                  }),
                  backgroundColor: timerAnim.interpolate({
                    inputRange: [0, 0.3, 1],
                    outputRange: ['#F44336', '#FFC107', colors.primary]
                  })
                }
              ]} 
            />
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.button, styles.rejectBtn]} onPress={onReject}>
              <Text style={styles.rejectBtnText}>Decline</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.button, styles.acceptBtn]} onPress={onAccept}>
              <Text style={styles.acceptBtnText}>Accept Job</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 25,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  newRequestText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 15,
    textAlign: 'center',
  },
  category: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  budget: {
    color: '#4CAF50',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: '#222',
    padding: 15,
    borderRadius: 12,
  },
  icon: {
    fontSize: 30,
    marginRight: 15,
  },
  distance: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  location: {
    color: '#999',
    fontSize: 14,
    marginTop: 4,
  },
  timerContainer: {
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 25,
  },
  timerBar: {
    height: '100%',
    borderRadius: 3,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  rejectBtn: {
    backgroundColor: '#333',
    marginRight: 10,
  },
  rejectBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  acceptBtn: {
    backgroundColor: colors.primary,
    marginLeft: 10,
  },
  acceptBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});