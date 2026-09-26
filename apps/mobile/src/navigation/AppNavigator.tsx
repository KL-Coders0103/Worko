import React from 'react';
import {StyleSheet, View} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import type {AppStackParamList, AppTabParamList, AuthStackParamList, RootStackParamList} from './types';
import {ThemeProvider, useTheme} from '../theme/ThemeProvider';
import {ToastProvider} from '../components/ui/ToastProvider';
import {StartupScreen} from '../screens/startup/StartupScreen';
import {OnboardingScreen} from '../screens/onboarding/OnboardingScreen';
import {AuthLandingScreen} from '../screens/auth/AuthLandingScreen';
import {LoginScreen} from '../screens/auth/LoginScreen';
import {RegisterScreen} from '../screens/auth/RegisterScreen';
import {VerifyOtpScreen} from '../screens/auth/VerifyOtpScreen';
import {AppOverviewScreen} from '../screens/app/AppOverviewScreen';
import {AppPlaceholderScreen} from '../screens/app/AppPlaceholderScreen';
import {ProfileScreen} from '../screens/app/ProfileScreen';
import {useAuthStore} from '../store/authStore';
import {useOnboardingStore} from '../store/onboardingStore';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const ClientTabs = createBottomTabNavigator<AppTabParamList>();
const WorkerTabs = createBottomTabNavigator<AppTabParamList>();

// Authentication is isolated from the authenticated application shell.\nconst AuthNavigator = (): React.JSX.Element => (
  <AuthStack.Navigator screenOptions={{headerShown: false, animation: 'fade'}}>
    <AuthStack.Screen name="AuthLanding" component={AuthLandingScreen} />
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={RegisterScreen} />
    <AuthStack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
  </AuthStack.Navigator>
);

const TabIcon = ({focused}: {focused: boolean}): React.JSX.Element => {
  const {theme} = useTheme();
  return <View style={[styles.icon, {backgroundColor: focused ? theme.colors.accent : 'transparent'}]}><View style={[styles.dot, {backgroundColor: focused ? theme.colors.inverse : theme.colors.textSecondary}]} /></View>;
};

// Client and worker shells intentionally share the same tab contract.\nconst ClientNavigator = (): React.JSX.Element => {
  const {theme} = useTheme();
  return <ClientTabs.Navigator screenOptions={{headerShown: false, tabBarActiveTintColor: theme.colors.accent, tabBarInactiveTintColor: theme.colors.textSecondary, tabBarStyle: [styles.tabBar, {backgroundColor: theme.colors.surfaceElevated, borderTopColor: theme.colors.border}], tabBarLabelStyle: styles.tabLabel}}>
    <ClientTabs.Screen name="Home" children={() => <AppOverviewScreen mode="CLIENT" />} options={{tabBarIcon: ({focused}) => <TabIcon focused={focused} />}} />
    <ClientTabs.Screen name="Jobs" children={() => <AppPlaceholderScreen title="Your work" description="Client requirements, dispatch status, and active jobs will be built here." />} options={{tabBarIcon: ({focused}) => <TabIcon focused={focused} />}} />
    <ClientTabs.Screen name="Reels" children={() => <AppPlaceholderScreen title="Reels" description="Discover worker skills and work showcases here." />} options={{tabBarIcon: ({focused}) => <TabIcon focused={focused} />}} />
    <ClientTabs.Screen name="Profile" component={ProfileScreen} options={{tabBarIcon: ({focused}) => <TabIcon focused={focused} />}} />
  </ClientTabs.Navigator>;
};

const WorkerNavigator = (): React.JSX.Element => {
  const {theme} = useTheme();
  return <WorkerTabs.Navigator screenOptions={{headerShown: false, tabBarActiveTintColor: theme.colors.accent, tabBarInactiveTintColor: theme.colors.textSecondary, tabBarStyle: [styles.tabBar, {backgroundColor: theme.colors.surfaceElevated, borderTopColor: theme.colors.border}], tabBarLabelStyle: styles.tabLabel}}>
    <WorkerTabs.Screen name="Home" children={() => <AppOverviewScreen mode="WORKER" />} options={{tabBarIcon: ({focused}) => <TabIcon focused={focused} />}} />
    <WorkerTabs.Screen name="Jobs" children={() => <AppPlaceholderScreen title="Jobs" description="Relevant work requests and active jobs will be built here." />} options={{tabBarIcon: ({focused}) => <TabIcon focused={focused} />}} />
    <WorkerTabs.Screen name="Reels" children={() => <AppPlaceholderScreen title="Reels" description="Post and discover worker work showcases here." />} options={{tabBarIcon: ({focused}) => <TabIcon focused={focused} />}} />
    <WorkerTabs.Screen name="Profile" component={ProfileScreen} options={{tabBarIcon: ({focused}) => <TabIcon focused={focused} />}} />
  </WorkerTabs.Navigator>;
};

// Role selection happens once at the application boundary; feature screens stay role-focused.\nconst AuthenticatedNavigator = (): React.JSX.Element => {
  const role = useAuthStore(state => state.user?.role);
  return <AppStack.Navigator screenOptions={{headerShown: false, animation: 'fade'}}><AppStack.Screen name="Home">{() => role === 'WORKER' ? <WorkerNavigator /> : <ClientNavigator />}</AppStack.Screen></AppStack.Navigator>;
};

const AppNavigatorContent = (): React.JSX.Element => {
  const authStatus = useAuthStore(state => state.status);
  const onboardingStatus = useOnboardingStore(state => state.status);

  if (authStatus === 'hydrating' || onboardingStatus === 'checking') {
    return <RootStack.Navigator screenOptions={{headerShown: false}}><RootStack.Screen name="Startup" component={StartupScreen} /></RootStack.Navigator>;
  }

  if (authStatus === 'authenticated') return <AuthenticatedNavigator />;
  if (onboardingStatus === 'required') return <RootStack.Navigator screenOptions={{headerShown: false}}><RootStack.Screen name="Onboarding" component={OnboardingScreen} /></RootStack.Navigator>;
  return <AuthNavigator />;
};

const AppNavigator = (): React.JSX.Element => (
  <ThemeProvider>
    <ToastProvider>
      <NavigationContainer>
        <AppNavigatorContent />
      </NavigationContainer>
    </ToastProvider>
  </ThemeProvider>
);

const styles = StyleSheet.create({
  tabBar: {height: 72, paddingTop: 8, paddingBottom: 10, borderTopWidth: StyleSheet.hairlineWidth, elevation: 0},
  tabLabel: {fontSize: 11, fontWeight: '700'},
  icon: {width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center'},
  dot: {width: 8, height: 8, borderRadius: 4},
});

export default AppNavigator;
