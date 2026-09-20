import React from 'react';

import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

import type { RootStackParamList } from '../features/auth/auth.types';
import { AuthNavigator } from './AuthNavigator';

import { LoginScreen } from '../features/auth/screens/LoginScreen';
import { RegisterScreen } from '../features/auth/screens/RegisterScreen';
import {
  OtpVerificationScreen,
} from '../features/auth/screens/OtpVerificationScreen';

import { useAuth } from '../context/AuthContext';
import { AppNavigator } from './AppNavigator';

const Stack =
  createNativeStackNavigator<RootStackParamList>();


export function RootNavigator() {
  const {
    isAuthenticated,
    isLoading,
  } = useAuth();

  if (isLoading) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {isAuthenticated ? (
          <Stack.Screen name="App">
            {() => <AppNavigator />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Auth">
            {() => (
              <AuthNavigator
                LoginScreen={LoginScreen}
                RegisterScreen={RegisterScreen}
                OtpVerificationScreen={OtpVerificationScreen}
              />
            )}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}