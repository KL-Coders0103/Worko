import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme/ThemeProvider';

export const StartupScreen = (): React.JSX.Element => {
  const {theme} = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + theme.spacing.xxxl,
          paddingBottom: insets.bottom + theme.spacing.xxxl,
          backgroundColor: theme.colors.background,
        },
      ]}>
      <View style={styles.content}>
        <Text style={[styles.brand, {color: theme.colors.accent}]}>Worko</Text>
        <Text style={[styles.title, {color: theme.colors.textPrimary}]}>
          Mobile foundation ready
        </Text>
        <Text style={[styles.subtitle, {color: theme.colors.textSecondary}]}>
          Production screens will be added phase by phase.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, justifyContent: 'center'},
  content: {paddingHorizontal: 24},
  brand: {fontSize: 34, fontWeight: '800', marginBottom: 12},
  title: {fontSize: 22, fontWeight: '700', marginBottom: 8},
  subtitle: {fontSize: 16, lineHeight: 24},
});
