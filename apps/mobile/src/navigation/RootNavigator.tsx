import React, {useCallback, useState} from 'react';

import {
  NavigationContainer,
} from '@react-navigation/native';

import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

import type {
  RootStackParamList,
} from '../features/auth/auth.types';

import {AuthNavigator} from './AuthNavigator';

import {LoginScreen} from '../features/auth/screens/LoginScreen';

import {RegisterScreen} from '../features/auth/screens/RegisterScreen';

import {
  OtpVerificationScreen,
} from '../features/auth/screens/OtpVerificationScreen';

import {useAuth} from '../context/AuthContext';

import {AppNavigator} from './AppNavigator';

import {SplashScreen} from '../features/home/screens/SplashScreen';

const Stack =
  createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const {
    isAuthenticated,
    isLoading,
  } = useAuth();

  const [splashFinished, setSplashFinished] =
    useState(false);

  const handleSplashFinished =
    useCallback(() => {
      setSplashFinished(true);
    }, []);

  /*
   * Splash is displayed only during the
   * initial application launch.
   *
   * AuthContext is still loading while the
   * splash is visible, so navigation waits
   * until authentication state is known.
   */
  if (!splashFinished || isLoading) {
    return (
      <SplashScreen
        onFinished={handleSplashFinished}
      />
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}>
        {isAuthenticated ? (
          <Stack.Screen
            name="App"
            component={AppNavigator}
          />
        ) : (
          <Stack.Screen name="Auth">
            {() => (
              <AuthNavigator
                LoginScreen={LoginScreen}
                RegisterScreen={RegisterScreen}
                OtpVerificationScreen={
                  OtpVerificationScreen
                }
              />
            )}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}