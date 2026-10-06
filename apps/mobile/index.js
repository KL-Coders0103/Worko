/**
 * @format
 */

import messaging from '@react-native-firebase/messaging';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

messaging().setBackgroundMessageHandler(async remoteMessage => {
  // Android/iOS display notification payloads while the app is backgrounded.
  // Keep the handler registered so data-only messages can be processed later.
  void remoteMessage;
});

AppRegistry.registerComponent(appName, () => App);
