import React from 'react';

import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

import {WorkerProfileScreen} from '../features/worker/screens/WorkerProfileScreen';
import {WorkerCategoryScreen} from '../features/worker/screens/WorkerCategoryScreen';
import {WorkerSkillsScreen} from '../features/worker/screens/WorkerSkillsScreen';
import {WorkerLocationScreen} from '../features/worker/screens/WorkerLocationScreen';
import {WorkerReviewScreen} from '../features/worker/screens/WorkerReviewScreen';
import {WorkerKycScreen} from '../features/worker/screens/WorkerKycScreen';
import {WorkerKycStatusScreen} from '../features/worker/screens/WorkerKycStatusScreen';

export type WorkerOnboardingParamList = {
  WorkerProfile: undefined;
  WorkerCategory: undefined;
  WorkerSkills: undefined;
  WorkerLocation: undefined;
  WorkerReview: undefined;
  WorkerKyc: undefined;
  WorkerKycStatus: undefined;
};

const Stack =
  createNativeStackNavigator<WorkerOnboardingParamList>();

type WorkerOnboardingNavigatorProps = {
  initialRouteName?: keyof WorkerOnboardingParamList;
};

export function WorkerOnboardingNavigator({
  initialRouteName = 'WorkerProfile',
}: WorkerOnboardingNavigatorProps) {
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen
        name="WorkerProfile"
        component={WorkerProfileScreen}
      />

      <Stack.Screen
        name="WorkerCategory"
        component={WorkerCategoryScreen}
      />

      <Stack.Screen
        name="WorkerSkills"
        component={WorkerSkillsScreen}
      />

      <Stack.Screen
        name="WorkerLocation"
        component={WorkerLocationScreen}
      />

      <Stack.Screen
        name="WorkerReview"
        component={WorkerReviewScreen}
      />

      <Stack.Screen
        name="WorkerKyc"
        component={WorkerKycScreen}
      />

      <Stack.Screen
        name="WorkerKycStatus"
        component={WorkerKycStatusScreen}
      />
    </Stack.Navigator>
  );
}