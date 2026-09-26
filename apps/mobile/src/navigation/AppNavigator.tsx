import React from 'react';
import {StyleSheet, View} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import type {AppStackParamList, AuthStackParamList, RootStackParamList} from './types';
import {ThemeProvider, useTheme} from '../theme/ThemeProvider';
import {StartupScreen} from '../screens/startup/StartupScreen';
import {AuthLandingScreen} from '../screens/auth/AuthLandingScreen';
import {LoginScreen} from '../screens/auth/LoginScreen';
import {RegisterScreen} from '../screens/auth/RegisterScreen';
import {VerifyOtpScreen} from '../screens/auth/VerifyOtpScreen';
import {AppOverviewScreen} from '../screens/app/AppOverviewScreen';
import {AppPlaceholderScreen} from '../screens/app/AppPlaceholderScreen';
import {ProfileScreen} from '../screens/app/ProfileScreen';
import {useAuthStore} from '../store/authStore';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const ClientTabs = createBottomTabNavigator();
const WorkerTabs = createBottomTabNavigator();

const AuthNavigator = (): React.JSX.Element => (
  <AuthStack.Navigator screenOptions={{headerShown: false}}>
    <AuthStack.Screen name="AuthLanding" component={AuthLandingScreen} />
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={RegisterScreen} />
    <AuthStack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
  </AuthStack.Navigator>
);

const TabIcon = ({label, focused}: {label: string; focused: boolean}): React.JSX.Element => {
  const {theme} = useTheme();
  return (
    <View style={[styles.icon, {backgroundColor: focused ? theme.colors.accent : 'transparent'}]}>
      <View style={[styles.dot, {backgroundColor: focused ? theme.colors.inverse : theme.colors.textSecondary}]} />
    </View>
  );
};

const ClientNavigator = (): React.JSX.Element => {
  const {theme} = useTheme();
  return (
    <ClientTabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: [styles.tabBar, {backgroundColor: theme.colors.surfaceElevated, borderTopColor: theme.colors.border}],
        tabBarLabelStyle: styles.tabLabel,
      }}>
      <ClientTabs.Screen
        name="Home"
        children={() => <AppOverviewScreen mode="CLIENT" />}
        options={{tabBarIcon: ({focused}) => <TabIcon label="Home" focused={focused} />}}
      />
      <ClientTabs.Screen
        name="Jobs"
        children={() => <AppPlaceholderScreen title="Your work" description="Client requirements, dispatch status, and active jobs will be built here." />}
        options={{tabBarIcon: ({focused}) => <TabIcon label="Jobs" focused={focused} />}}
      />
      <ClientTabs.Screen
        name="Reels"
        children={() => <AppPlaceholderScreen title="Reels" description="Discover worker skills and work showcases here." />}
        options={{tabBarIcon: ({focused}) => <TabIcon label="Reels" focused={focused} />}}
      />
      <ClientTabs.Screen
        name="Profile"
        component={ProfileScreen}
        options={{tabBarIcon: ({focused}) => <TabIcon label="Profile" focused={focused} />}}
      />
    </ClientTabs.Navigator>
  );
};

const WorkerNavigator = (): React.JSX.Element => {
  const {theme} = useTheme();
  return (
    <WorkerTabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: [styles.tabBar, {backgroundColor: theme.colors.surfaceElevated, borderTopColor: theme.colors.border}],
        tabBarLabelStyle: styles.tabLabel,
      }}>
      <WorkerTabs.Screen
        name="Home"
        children={() => <AppOverviewScreen mode="WORKER" />}
        options={{tabBarIcon: ({focused}) => <TabIcon label="Home" focused={focused} />}}
      />
      <WorkerTabs.Screen
        name="Jobs"
        children={() => <AppPlaceholderScreen title="Jobs" description="Relevant work requests and active jobs will be built here." />}
        options={{tabBarIcon: ({focused}) => <TabIcon label="Jobs" focused={focused} />}}
      />
      <WorkerTabs.Screen
        name="Reels"
        children={() => <AppPlaceholderScreen title="Reels" description="Post and discover worker work showcases here." />}
        options={{tabBarIcon: ({focused}) => <TabIcon label="Reels" focused={focused} />}}
      />
      <WorkerTabs.Screen
        name="Profile"
        component={ProfileScreen}
        options={{tabBarIcon: ({focused}) => <TabIcon label="Profile" focused={focused} />}}
      />
    </WorkerTabs.Navigator>
  );
};

const AuthenticatedNavigator = (): React.JSX.Element => {
  const role = useAuthStore(state => state.user?.role);
  return (
    <AppStack.Navigator screenOptions={{headerShown: false}}>
      <AppStack.Screen name="Home">
        {() => role === 'WORKER' ? <WorkerNavigator /> : <ClientNavigator />}
      </AppStack.Screen>
    </AppStack.Navigator>
  );
};

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

const styles = StyleSheet.create({
  tabBar: {
    height: 72,
    paddingTop: 8,
    paddingBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    elevation: 0,
  },
  tabLabel: {fontSize: 11, fontWeight: '700'},
  icon: {width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center'},
  dot: {width: 8, height: 8, borderRadius: 4},
});

export default AppNavigator;
