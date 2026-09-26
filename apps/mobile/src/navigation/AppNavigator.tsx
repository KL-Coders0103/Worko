import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {AppStackParamList, AuthStackParamList, RootStackParamList} from './types';
import {ThemeProvider} from '../theme/ThemeProvider';
import {StartupScreen} from '../screens/startup/StartupScreen';
import {AuthLandingScreen} from '../screens/auth/AuthLandingScreen';
import {LoginScreen} from '../screens/auth/LoginScreen';
import {RegisterScreen} from '../screens/auth/RegisterScreen';
import {VerifyOtpScreen} from '../screens/auth/VerifyOtpScreen';
import {HomePlaceholderScreen} from '../screens/app/HomePlaceholderScreen';
import {useAuthStore} from '../store/authStore';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

const AuthNavigator = (): React.JSX.Element => (
  <AuthStack.Navigator screenOptions={{headerShown: false}}>
    <AuthStack.Screen name="AuthLanding" component={AuthLandingScreen} />
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={RegisterScreen} />
    <AuthStack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
  </AuthStack.Navigator>
);

const AuthenticatedNavigator = (): React.JSX.Element => (
  <AppStack.Navigator screenOptions={{headerShown: false}}>
    <AppStack.Screen name="Home" component={HomePlaceholderScreen} />
  </AppStack.Navigator>
);

const AppNavigatorContent = (): React.JSX.Element => {
  const status = useAuthStore(state => state.status);

  if (status === 'hydrating') {
    return (
      <RootStack.Navigator screenOptions={{headerShown: false}}>
        <RootStack.Screen name="Startup" component={StartupScreen} />
      </RootStack.Navigator>
    );
  }

  return status === 'authenticated' ? <AuthenticatedNavigator /> : <AuthNavigator />;
};

const AppNavigator = (): React.JSX.Element => (
  <ThemeProvider>
    <NavigationContainer>
      <AppNavigatorContent />
    </NavigationContainer>
  </ThemeProvider>
);

export default AppNavigator;
