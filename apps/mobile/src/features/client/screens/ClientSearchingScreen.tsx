import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { colors } from '../../../theme';
import { socketService } from '../../../services/socketService';
import { useAuth } from '../../../context/AuthContext';

const { width } = Dimensions.get('window');

export function ClientSearchingScreen({ route, navigation }: any) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Replace with actual client details from your global auth state later
  const {user} = useAuth();
  const CLIENT_ID = user?.id || '';

  useEffect(() => {
    // 1. Start the Radar Animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.5, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
      ])
    ).start();

    // 2. Connect to Socket
    if(CLIENT_ID){
      socketService.connect(CLIENT_ID, 'CLIENT');
    }

    // 3. Broadcast the job to nearby workers
    const requirementData = route.params?.requirementData || {};
    // Temporary ID until we link the Prisma database record creation
    const jobId = `job-${Math.floor(Math.random() * 100000)}`; 

    socketService.socket?.emit('client:broadcast_job', {
      clientId: CLIENT_ID,
      jobId: jobId,
      category: requirementData.category || 'Professional',
      budget: requirementData.budget || '₹500',
      location: requirementData.location || 'Current Location',
    });

    // 4. Listen for a worker to accept it
    socketService.socket?.on('client:job_matched', (matchedData) => {
      console.log('Job Matched!', matchedData);
      
      // Ensure we only process matches for THIS specific job
      if (matchedData.jobId === jobId) {
        navigation.replace('WorkerMatched', {
          workerData: {
            name: matchedData.workerName,
            job: requirementData.category || 'Professional',
            rating: matchedData.rating,
            eta: matchedData.eta,
            avatar: matchedData.avatar,
          }
        });
      }
    });

    // Cleanup on unmount
    return () => {
      socketService.socket?.off('client:job_matched');
    };
  }, [navigation, pulseAnim, route.params, CLIENT_ID]);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Finding a Worker...</Text>
      <Text style={styles.subtext}>Broadcasting your request to nearby professionals</Text>

      <View style={styles.radarContainer}>
        <Animated.View 
          style={[
            styles.pulse,
            { transform: [{ scale: pulseAnim }] }
          ]} 
        />
        <View style={styles.radarCenter}>
          <Text style={styles.radarIcon}>📍</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    paddingTop: 100,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  subtext: {
    color: '#888',
    fontSize: 16,
    marginBottom: 80,
  },
  radarContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulse: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: colors.primary + '40', // 40% opacity
  },
  radarCenter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  radarIcon: {
    fontSize: 24,
  },
});