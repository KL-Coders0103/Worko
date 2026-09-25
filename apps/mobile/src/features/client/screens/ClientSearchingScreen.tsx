import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../../theme';

export function ClientSearchingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<any>();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.5, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
      ])
    ).start();

    const DUMMY_WORKERS = [
      { name: 'Amit Verma', rating: '4.9', avatarId: '12' },
      { name: 'Priya Patel', rating: '4.7', avatarId: '23' },
      { name: 'Vikram Singh', rating: '4.8', avatarId: '33' },
      { name: 'Neha Sharma', rating: '4.9', avatarId: '44' },
      { name: 'Suresh Kumar', rating: '4.6', avatarId: '55' }
    ];

    const timer = setTimeout(() => {
      // Pick a random worker from the array
      const randomWorker = DUMMY_WORKERS[Math.floor(Math.random() * DUMMY_WORKERS.length)];
      // Generate a random ETA between 5 and 15 mins
      const randomEta = Math.floor(Math.random() * 11) + 5;

      const matchedData = { 
        name: randomWorker.name, 
        job: route.params?.requirementData?.category || 'Professional',
        rating: randomWorker.rating,
        eta: `${randomEta} mins`,
        avatar: `https://i.pravatar.cc/300?img=${randomWorker.avatarId}`
      };
      
      navigation.replace('WorkerMatched', { workerData: matchedData });
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigation, pulseAnim, route.params]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]} />
      <View style={styles.innerCircle}>
        <Text style={styles.iconText}>🔍</Text>
      </View>
      <Text style={styles.title}>Broadcasting your request...</Text>
      <Text style={styles.subtitle}>Notifying nearby professionals. This usually takes less than a minute.</Text>

      <TouchableOpacity 
        style={styles.cancelButton} 
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.cancelText}>Cancel Request</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 20
  },
  pulseCircle: {
    position: 'absolute', width: 150, height: 150, borderRadius: 75,
    backgroundColor: colors.primary, opacity: 0.2
  },
  innerCircle: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: 40
  },
  iconText: { fontSize: 40 },
  title: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  subtitle: { color: '#999', fontSize: 14, textAlign: 'center', marginBottom: 50, paddingHorizontal: 20 },
  cancelButton: {
    position: 'absolute', bottom: 50, paddingVertical: 12, paddingHorizontal: 30,
    borderRadius: 25, borderColor: '#fff', borderWidth: 1
  },
  cancelText: { color: '#fff', fontSize: 16 }
});