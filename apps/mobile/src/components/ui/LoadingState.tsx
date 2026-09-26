import React from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {useTheme} from '../../theme/ThemeProvider';
import {AppText} from './AppText';

type LoadingStateProps = {
  message?: string;
};

export const LoadingState = ({message = 'Loading...'}: LoadingStateProps): React.JSX.Element => {
  const {theme} = useTheme();
  return (
    <View style={styles.container}>
      <ActivityIndicator size="small" color={theme.colors.accent} />
      <AppText variant="caption" muted>{message}</AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24},
});
