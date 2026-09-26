import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useTheme} from '../../theme/ThemeProvider';

export const AppDivider = (): React.JSX.Element => {
  const {theme} = useTheme();
  return <View style={[styles.divider, {backgroundColor: theme.colors.border}]} />;
};

const styles = StyleSheet.create({divider: {height: StyleSheet.hairlineWidth, width: '100%'}});
