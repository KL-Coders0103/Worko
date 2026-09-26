import React from 'react';
import {StyleSheet, View} from 'react-native';
import {AppText} from './AppText';
import {useTheme} from '../../theme/ThemeProvider';

type AppBadgeProps = {label: string; tone?: 'accent' | 'success' | 'neutral'};

export const AppBadge = ({label, tone = 'accent'}: AppBadgeProps): React.JSX.Element => {
  const {theme} = useTheme();
  const backgroundColor = tone === 'success' ? theme.colors.success : tone === 'neutral' ? theme.colors.surface : theme.colors.accent;
  return (
    <View style={[styles.badge, {backgroundColor}]}>
      <AppText style={{color: tone === 'neutral' ? theme.colors.textPrimary : theme.colors.inverse, fontSize: 12, fontWeight: '700'}}>{label}</AppText>
    </View>
  );
};

const styles = StyleSheet.create({badge: {alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5}});
