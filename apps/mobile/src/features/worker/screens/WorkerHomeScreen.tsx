import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert } from 'react-native';
import { colors } from '../../../theme';
import { WorkerIncomingJobModal } from '../components/WorkerIncomingJobModal';

export function WorkerHomeScreen() {
  const [isOnline, setIsOnline] = useState(false);
  const [incomingJob, setIncomingJob] = useState<any>(null);

  const triggerSimulatedPing = () => {
    if (!isOnline) {
      Alert.alert("Offline", "You must be online to receive jobs.");
      return;
    }
    
    setIncomingJob({
      id: Math.random().toString(),
      category: 'Electrical Wiring',
      distance: '2.5 km',
      budget: '₹850',
      clientLocation: 'Sector 44, Pimpri-Chinchwad, Maharashtra'
    });
  };

  const handleAcceptJob = () => {
    setIncomingJob(null);
    Alert.alert("Job Accepted!", "Navigating you to the active job tracking screen...");
  };

  const handleRejectJob = () => {
    setIncomingJob(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, Worker!</Text>
        <View style={styles.statusRow}>
          <Text style={[styles.statusText, { color: isOnline ? '#4CAF50' : '#888' }]}>
            {isOnline ? 'Online • Finding Jobs' : 'Offline'}
          </Text>
          <Switch 
            value={isOnline} 
            onValueChange={setIsOnline} 
            trackColor={{ false: '#333', true: colors.primary + '80' }}
            thumbColor={isOnline ? colors.primary : '#f4f3f4'}
          />
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Today's Earnings</Text>
          <Text style={styles.statValue}>₹1,250</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Completed</Text>
          <Text style={styles.statValue}>3 Jobs</Text>
        </View>
      </View>

      <Text style={styles.radarMessage}>
        {isOnline 
          ? "You are visible to clients. Wait here or leave the app in the background." 
          : "Go online to start receiving work requests in your area."}
      </Text>

      <TouchableOpacity 
        style={[styles.simButton, { opacity: isOnline ? 1 : 0.5 }]} 
        onPress={triggerSimulatedPing}
      >
        <Text style={styles.simButtonText}>🧪 Simulate Incoming Client Ping</Text>
      </TouchableOpacity>

      <WorkerIncomingJobModal 
        visible={!!incomingJob}
        job={incomingJob}
        onAccept={handleAcceptJob}
        onReject={handleRejectJob}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    marginRight: 10,
    fontSize: 14,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    padding: 20,
    borderRadius: 12,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  statLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 10,
  },
  statValue: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  radarMessage: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 24,
    marginTop: 'auto',
    marginBottom: 40,
  },
  simButton: {
    backgroundColor: '#333',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#555',
  },
  simButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});