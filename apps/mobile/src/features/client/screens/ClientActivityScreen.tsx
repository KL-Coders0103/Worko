import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';

type BookingStatus = 'SEARCHING' | 'ACCEPTED' | 'COMPLETED' | 'CANCELLED';

interface ActivityItem {
  id: string;
  category: string;
  date: string;
  status: BookingStatus;
  workerName?: string;
  price?: string;
}

const MOCK_ACTIVITY: ActivityItem[] = [
  {
    id: '1',
    category: 'Plumbing Repair',
    date: 'Today, 10:30 AM',
    status: 'SEARCHING',
  },
  {
    id: '2',
    category: 'Electrical Wiring',
    date: 'Yesterday, 2:15 PM',
    status: 'ACCEPTED',
    workerName: 'Vikram Singh',
    price: '₹850',
  },
  {
    id: '3',
    category: 'AC Servicing',
    date: 'Oct 12, 2024',
    status: 'COMPLETED',
    workerName: 'Amit Verma',
    price: '₹1200',
  },
];

export function ClientActivityScreen() {
  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case 'SEARCHING': return '#FFC107'; 
      case 'ACCEPTED': return '#2196F3';       
      case 'COMPLETED': return '#4CAF50'; 
      case 'CANCELLED': return '#F44336'; 
      default: return '#999';
    }
  };

  const renderItem = ({ item }: { item: ActivityItem }) => (
    <TouchableOpacity style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.category}>{item.category}</Text>
        <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>
            {item.status}
          </Text>
        </View>
      </View>
      
      <Text style={styles.date}>{item.date}</Text>
      
      {item.workerName && (
        <View style={styles.workerRow}>
          <Text style={styles.workerName}>👷 {item.workerName}</Text>
          {item.price && <Text style={styles.price}>{item.price}</Text>}
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Your Activity</Text>
      <FlatList
        data={MOCK_ACTIVITY}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 50,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  category: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  date: {
    color: '#888',
    fontSize: 14,
    marginBottom: 16,
  },
  workerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  workerName: {
    color: '#ddd',
    fontSize: 14,
  },
  price: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});