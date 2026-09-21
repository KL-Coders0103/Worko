import React from 'react';

import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

import {AppTabNavigator} from './AppTabNavigator';

import {
  WorkerOnboardingNavigator,
  WorkerOnboardingParamList,
} from './WorkerOnboardingNavigator';
import { ClientBookingCreateScreen } from '../features/client/screens/ClientBookingCreationScreen';
import { BookingDetailsScreen } from '../features/booking/screens/BookingDetailsScreen';
import { DemoPaymentScreen } from '../features/payment/screens/DemoPaymentScreen';


export type AppStackParamList = {
  Main: undefined;

  WorkerOnboarding: {
    initialRouteName?: keyof WorkerOnboardingParamList;
  };

  ClientBookingCreate: {
    workerId: string;
    workerName: string;
    categoryId?: string;
    categoryName?: string;
    skillId?: string;
    skillName?: string;
  };

  BookingDetails: {
    bookingId: string;
  };

  DemoPayment: {
    paymentId: string;
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

      <Stack.Screen
        name="ClientBookingCreate"
        component={ClientBookingCreateScreen}
      />

      <Stack.Screen
        name="BookingDetails"
        component={BookingDetailsScreen}
      />

      <Stack.Screen
        name="DemoPayment"
        component={DemoPaymentScreen}
      />

    </Stack.Navigator>
  );
}