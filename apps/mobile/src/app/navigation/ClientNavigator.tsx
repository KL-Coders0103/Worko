import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import type { ClientStackParamList, ClientTabParamList } from './types';
import { ClientHomeScreen } from '../../features/client/screens/ClientHomeScreen';
import { ClientRequirementsScreen } from '../../features/client/screens/ClientRequirementScreen';
// import { ClientProfileScreen } from '../../features/client/screens/ClientProfileScreen';
import { ClientSearchingScreen } from '../../features/client/screens/ClientSearchingScreen';
import { WorkerMatchedScreen } from '../../features/client/screens/WorkerMatchedScreen';
import { ClientActivityScreen } from '../../features/client/screens/ClientActivityScreen';

const Stack = createNativeStackNavigator<ClientStackParamList>();
const Tab = createBottomTabNavigator<ClientTabParamList>();

function ClientTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#121212', borderTopColor: '#222' },
        tabBarActiveTintColor: '#FF6B00',
        tabBarInactiveTintColor: '#888',
      }}
    >
      <Tab.Screen 
        name="ClientHome" 
        component={ClientHomeScreen} 
        options={{ title: 'Explore' }} 
      />
      <Tab.Screen 
        name="ClientRequirements" 
        component={ClientRequirementsScreen} 
        options={{ title: 'Post Job' }} 
      />
      <Tab.Screen 
        name="ClientActivity" 
        component={ClientActivityScreen} 
        options={{ title: 'Activity' }} 
      />
      {/* <Tab.Screen 
        name="ClientProfile" 
        component={ClientProfileScreen} 
        options={{ title: 'Profile' }} 
      /> */}
    </Tab.Navigator>
  );
}

export function ClientNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ClientTabs" component={ClientTabs} />
      <Stack.Screen 
        name="ClientSearching" 
        component={ClientSearchingScreen} 
        options={{ gestureEnabled: false }} // Disallow swipe back while searching
      />
      <Stack.Screen 
        name="WorkerMatched" 
        component={WorkerMatchedScreen} 
        options={{ gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}