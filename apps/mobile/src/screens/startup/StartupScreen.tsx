import React, {useEffect} from 'react';
import {StyleSheet, View} from 'react-native';
import {Screen} from '../../components/ui/Screen';
import {AppText} from '../../components/ui/AppText';
import {useAuthStore} from '../../store/authStore';

export const StartupScreen = (): React.JSX.Element => {
  const status = useAuthStore(state => state.status);

  useEffect(() => {
    void useAuthStore.getState().initialize();
  }, []);

  return (
    <Screen centered>
      <View style={styles.content}>
        <AppText variant="title">Worko</AppText>
        <AppText variant="body">
          {status === 'hydrating'
            ? 'Checking your secure session...'
            : status === 'authenticated'
              ? 'Session restored.'
              : 'Ready for sign in.'}
        </AppText>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    gap: 8,
  },
});
