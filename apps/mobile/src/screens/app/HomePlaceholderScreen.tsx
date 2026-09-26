import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Screen} from '../../components/ui/Screen';
import {AppText} from '../../components/ui/AppText';
import {AppButton} from '../../components/ui/AppButton';
import {useAuthStore} from '../../store/authStore';

export const HomePlaceholderScreen = (): React.JSX.Element => {
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);

  return (
    <Screen centered>
      <View style={styles.container}>
        <AppText variant="display">Worko</AppText>
        <AppText variant="title">You’re signed in.</AppText>
        <AppText variant="body" muted>
          Welcome {user?.firstName ?? 'to Worko'}. The authenticated app shell will be built next.
        </AppText>
        <AppButton label="Sign out" variant="secondary" onPress={() => void logout()} />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {width: '100%', gap: 12, alignItems: 'center'},
});
