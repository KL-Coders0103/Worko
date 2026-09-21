import React from 'react';

import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

import {AppTabNavigator} from './AppTabNavigator';
import {WorkerOnboardingNavigator} from './WorkerOnboardingNavigator';

export type AppStackParamList = {
  Main: undefined;
  WorkerOnboarding: undefined;
};

const Stack =
  createNativeStackNavigator<AppStackParamList>();

export function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen
        name="Main"
        component={AppTabNavigator}
      />

      <Stack.Screen
        name="WorkerOnboarding"
        component={WorkerOnboardingNavigator}
      />
    </Stack.Navigator>
  );
}