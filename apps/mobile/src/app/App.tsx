import React from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import AppNavigator from '../navigation/AppNavigator';

const App = (): React.JSX.Element => (
  <SafeAreaProvider>
    <AppNavigator />
  </SafeAreaProvider>
);

export default App;
