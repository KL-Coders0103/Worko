import React from 'react';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import type { AuthStackParamList } from '../features/auth/auth.types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

type AuthNavigatorProps = {
  LoginScreen: React.ComponentType<
    NativeStackScreenProps<AuthStackParamList, 'Login'>
  >;
  RegisterScreen: React.ComponentType<
    NativeStackScreenProps<AuthStackParamList, 'Register'>
  >;
  OtpVerificationScreen: React.ComponentType<
    NativeStackScreenProps<AuthStackParamList, 'VerifyOtp'>
  >;
};

export function AuthNavigator({
  LoginScreen,
  RegisterScreen,
  OtpVerificationScreen,
}: AuthNavigatorProps) {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen
        name="VerifyOtp"
        component={OtpVerificationScreen}
      />
    </Stack.Navigator>
  );
}