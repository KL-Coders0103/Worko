import React from 'react';

import {
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs';

import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  spacing,
  typography,
  useTheme,
} from '../theme';

import {
  useAuth,
} from '../context/AuthContext';

import {
  WorkerHomeScreen,
} from '../features/home/screens/WorkerHomeScreen';

import {
  ClientHomeScreen,
} from '../features/home/screens/ClientHomeScreen';

import {
  WorkerProfileScreen,
} from '../features/worker/screens/WorkerProfileScreen';

import {
  TabIcon,
} from '../components/TabIcon';
import { ClientProfileScreen } from '../features/client/screens/ClientProfileScreen';
import { ClientDiscoveryScreen } from '../features/client/screens/ClientDiscoveryScreen';
import {BookingsScreen as RealBookingsScreen} from '../features/booking/screens/BookingsScreen';
import { ReelsScreen } from '../features/reels/screens/ReelsScreen';

type AppTabParamList = {
  Home: undefined;
  Discover: undefined;
  Reels: undefined;
  Bookings: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

function HomeTabIcon({focused}: {focused: boolean}) {
  return (
    <TabIcon
      name={focused ? 'home' : 'home-outline'}
      focused={focused}
    />
  );
}

function DiscoverTabIcon({focused}: {focused: boolean}) {
  return (
    <TabIcon
      name={focused ? 'search' : 'search-outline'}
      focused={focused}
    />
  );
}

function ReelsTabIcon({focused}: {focused: boolean}) {
  return (
    <TabIcon
      name={focused ? 'play-circle' : 'play-circle-outline'}
      focused={focused}
    />
  );
}

function BookingsTabIcon({focused}: {focused: boolean}) {
  return (
    <TabIcon
      name={focused ? 'briefcase' : 'briefcase-outline'}
      focused={focused}
    />
  );
}

function ProfileTabIcon({focused}: {focused: boolean}) {
  return (
    <TabIcon
      name={focused ? 'person' : 'person-outline'}
      focused={focused}
    />
  );
}

function PlaceholderScreen({title}: {title: string}) {
  const {colors} = useTheme();

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: colors.background,
        },
      ]}>
      <Text
        style={[
          styles.title,
          {
            color: colors.text,
          },
        ]}>
        {title}
      </Text>
    </View>
  );
}

function BookingsScreen() {
  return <RealBookingsScreen />;
}

function HomeScreen() {
  const {user} = useAuth();

  if (user?.role === 'WORKER') {
    return <WorkerHomeScreen />;
  }

  if (user?.role === 'CLIENT') {
    return <ClientHomeScreen />;
  }

  return <PlaceholderScreen title="Worko" />;
}

function ProfileScreen() {
  const {user} = useAuth();

  if (user?.role === 'WORKER') {
    return <WorkerProfileScreen />;
  }

  if (user?.role === 'CLIENT') {
    return <ClientProfileScreen />;
  }

  return <PlaceholderScreen title="Profile" />;
}

export function AppTabNavigator() {
  const {colors} = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 64,
          paddingTop: spacing.sm,
          paddingBottom: spacing.sm,
        },
        tabBarLabelStyle: {
          ...typography.small,
          marginBottom: spacing.xs,
        },
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: HomeTabIcon,
        }}
      />

      <Tab.Screen
        name="Discover"
        component={ClientDiscoveryScreen}
        options={{
          tabBarIcon: DiscoverTabIcon,
        }}
      />

      <Tab.Screen
        name="Reels"
        component={ReelsScreen}
        options={{
          tabBarIcon: ReelsTabIcon,
        }}
      />

      <Tab.Screen
        name="Bookings"
        component={BookingsScreen}
        options={{
          tabBarIcon: BookingsTabIcon,
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ProfileTabIcon,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    ...typography.h2,
  },
});