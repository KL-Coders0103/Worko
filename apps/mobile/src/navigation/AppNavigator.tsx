import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import type {RootStackParamList} from './types';
import {ThemeProvider} from '../theme/ThemeProvider';
import {StartupScreen} from '../screens/startup/StartupScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = (): React.JSX.Element => (
  <ThemeProvider>
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        <Stack.Screen name="Startup" component={StartupScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  </ThemeProvider>
);

export default AppNavigator;
