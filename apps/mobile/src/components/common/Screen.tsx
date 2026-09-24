import React from 'react';
import { SafeAreaView, ViewStyle, StyleSheet, useColorScheme, StatusBar, View, Platform } from 'react-native';
import { colors, spacing } from '../../theme';

interface ScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
  noPadding?: boolean;
}

export function Screen({ children, style, noPadding = false }: ScreenProps) {
  const isDark = useColorScheme() === 'dark';
  const backgroundColor = isDark ? colors.background.dark : colors.background.light;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <StatusBar 
        barStyle={isDark ? 'light-content' : 'dark-content'} 
        {...(Platform.OS === 'android' ? { backgroundColor } : {})} 
      />
      <View style={[
        styles.inner,
        !noPadding && styles.padding,
        style
      ]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
  padding: {
    paddingHorizontal: spacing.md,
  }
});