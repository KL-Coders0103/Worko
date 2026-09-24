import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { WorkerTabParamList } from './types';
import { PlaceholderScreen } from '../../components/common/PlaceholderScreen';
import { colors } from '../../theme';

const Tab = createBottomTabNavigator<WorkerTabParamList>();

export function WorkerNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text.secondaryLight,
      }}
    >
      <Tab.Screen name="WorkerHome" options={{ title: 'Home' }}>
        {() => <PlaceholderScreen routeName="Worker Home (Active Jobs)" />}
      </Tab.Screen>
      <Tab.Screen name="WorkerRequests" options={{ title: 'Requests' }}>
        {() => <PlaceholderScreen routeName="Incoming Requests" />}
      </Tab.Screen>
      <Tab.Screen name="WorkerReels" options={{ title: 'My Reels' }}>
        {() => <PlaceholderScreen routeName="Manage Reels" />}
      </Tab.Screen>
      <Tab.Screen name="WorkerProfile" options={{ title: 'Profile' }}>
        {() => <PlaceholderScreen routeName="Worker Profile & Earnings" />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}