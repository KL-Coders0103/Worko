import React from 'react';

import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

import {AppTabNavigator} from './AppTabNavigator';

import {
  WorkerOnboardingNavigator,
  WorkerOnboardingParamList,
} from './WorkerOnboardingNavigator';

export type AppStackParamList = {
  Main: undefined;

  WorkerOnboarding: {
    initialRouteName?: keyof WorkerOnboardingParamList;
  };
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

      <Stack.Screen name="WorkerOnboarding">
        {({route}) => (
          <WorkerOnboardingNavigator
            initialRouteName={
              route.params?.initialRouteName ??
              'WorkerProfile'
            }
          />
        )}
      </Stack.Screen>

    </Stack.Navigator>
  );
}