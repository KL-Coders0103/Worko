import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ClientTabParamList } from './types';
import { PlaceholderScreen } from '../../components/common/PlaceholderScreen';
import { colors } from '../../theme';
import { ClientHomeScreen } from '../../features/client/screens/ClientHomeScreen';

const Tab = createBottomTabNavigator<ClientTabParamList>();

export function ClientNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text.secondaryLight,
      }}
    >
      <Tab.Screen name="ClientHome" options={{ title: 'Home' }}>
        {() => <ClientHomeScreen />}
      </Tab.Screen>
      <Tab.Screen name="ClientRequirements" options={{ title: 'Requirements' }}>
        {() => <PlaceholderScreen routeName="My Requirements" />}
      </Tab.Screen>
      <Tab.Screen name="ClientActivity" options={{ title: 'Activity' }}>
        {() => <PlaceholderScreen routeName="Bookings & Updates" />}
      </Tab.Screen>
      <Tab.Screen name="ClientProfile" options={{ title: 'Profile' }}>
        {() => <PlaceholderScreen routeName="Client Profile" />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}