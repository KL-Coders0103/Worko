import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, Alert } from 'react-native';
import { colors } from '../../../theme';
import { WorkerIncomingJobModal } from '../components/WorkerIncomingJobModal';
import { socketService } from '../../../services/socketService';
import { useAuth } from '../../../context/AuthContext';

export function WorkerHomeScreen() {
  const [isOnline, setIsOnline] = useState(false);
  const [incomingJob, setIncomingJob] = useState<any>(null);

  const {user} = useAuth();

  const WORKER_ID = user?.id || ''; 
  const WORKER_NAME = user ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Worker';

  useEffect(() => {
    if (isOnline) {
      // Connect to Socket when going online
      socketService.connect(WORKER_ID, 'WORKER');

      // Listen for incoming jobs
      socketService.socket?.on('worker:receive_ping', (jobData) => {
        console.log('Received Ping:', jobData);
        setIncomingJob({
          id: jobData.jobId,
          clientId: jobData.clientId,
          category: jobData.category,
          budget: jobData.budget,
          distance: jobData.distance,
          clientLocation: jobData.location,
        });
      });
    } else {
      socketService.disconnect();
    }

    return () => {
      socketService.socket?.off('worker:receive_ping');
    };
  }, [isOnline, WORKER_ID]);

  const handleAcceptJob = () => {
    if (incomingJob) {
      // Send the accept event back to the server
      socketService.socket?.emit('worker:accept_job', {
        jobId: incomingJob.id,
        workerId: WORKER_ID,
        workerName: WORKER_NAME,
        rating: '4.8',
      });
      
      setIncomingJob(null);
      Alert.alert("Job Accepted!", "Navigating you to the active job tracking screen...");
    }
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
  container: { flex: 1, backgroundColor: '#000', padding: 20, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusText: { marginRight: 10, fontSize: 14, fontWeight: 'bold' },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 },
  statBox: { flex: 1, backgroundColor: '#1A1A1A', padding: 20, borderRadius: 12, marginHorizontal: 5, borderWidth: 1, borderColor: '#333', alignItems: 'center' },
  statLabel: { color: '#888', fontSize: 14, marginBottom: 10 },
  statValue: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  radarMessage: { color: '#666', fontSize: 16, textAlign: 'center', paddingHorizontal: 20, lineHeight: 24, marginTop: 'auto', marginBottom: 40 },
});