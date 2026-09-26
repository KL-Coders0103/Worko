import React from 'react';
import {KeyboardAvoidingView, Platform, StyleSheet} from 'react-native';
import {Screen} from './Screen';

type KeyboardScreenProps = React.PropsWithChildren<{
  padded?: boolean;
  behavior?: 'height' | 'position' | 'padding';
}>;

export const KeyboardScreen = ({
  children,
  padded = true,
  behavior = Platform.OS === 'ios' ? 'padding' : 'height',
}: KeyboardScreenProps): React.JSX.Element => (
  <Screen padded={padded}>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={behavior}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
      {children}
    </KeyboardAvoidingView>
  </Screen>
);

const styles = StyleSheet.create({
  container: {flex: 1},
});
