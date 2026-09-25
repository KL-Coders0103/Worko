import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../../theme';

export function WorkerMatchedScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<any>();
  const { workerData } = route.params;

  return (
    <View style={styles.container}>
      <View style={styles.successBadge}>
        <Text style={styles.successText}>✓ MATCH FOUND</Text>
      </View>
      
      <Image 
        source={{ uri: workerData.avatar }} 
        style={styles.avatar} 
      />
      
      <Text style={styles.name}>{workerData.name}</Text>
      <Text style={styles.job}>{workerData.job} • ⭐ {workerData.rating}</Text>
      
      <View style={styles.etaContainer}>
        <Text style={styles.etaLabel}>Arriving in</Text>
        <Text style={styles.etaTime}>{workerData.eta}</Text>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>📞 Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>💬 Message</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.homeButton} 
        onPress={() => navigation.navigate('ClientTabs', {screen: 'ClientHome'})}
      >
        <Text style={styles.homeButtonText}>Back to Home</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', padding: 20, paddingTop: 60 },
  successBadge: {
    backgroundColor: '#4CAF50', paddingHorizontal: 15, paddingVertical: 5,
    borderRadius: 20, marginBottom: 40
  },
  successText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 20, borderWidth: 3, borderColor: colors.primary },
  name: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 5 },
  job: { color: '#999', fontSize: 16, marginBottom: 40 },
  etaContainer: {
    backgroundColor: '#1A1A1A', width: '100%', padding: 20, borderRadius: 12,
    alignItems: 'center', marginBottom: 30
  },
  etaLabel: { color: '#999', fontSize: 14, marginBottom: 5 },
  etaTime: { color: colors.primary, fontSize: 24, fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', marginBottom: 40 },
  actionButton: {
    flex: 1, backgroundColor: '#333', padding: 15, borderRadius: 8,
    alignItems: 'center', marginHorizontal: 5
  },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  homeButton: { marginTop: 'auto', padding: 15 },
  homeButtonText: { color: colors.primary, fontSize: 16, fontWeight: 'bold' }
});