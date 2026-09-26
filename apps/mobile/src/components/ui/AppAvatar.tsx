import React from 'react';
import {StyleSheet, View} from 'react-native';
import {AppText} from './AppText';
import {useTheme} from '../../theme/ThemeProvider';

type AppAvatarProps = {name?: string | null; size?: number};

export const AppAvatar = ({name, size = 44}: AppAvatarProps): React.JSX.Element => {
  const {theme} = useTheme();
  const initials = (name ?? 'W').trim().split(/\s+/).slice(0, 2).map(part => part.charAt(0).toUpperCase()).join('');
  return (
    <View style={[styles.avatar, {width: size, height: size, borderRadius: size / 2, backgroundColor: theme.colors.accent}]}>
      <AppText style={{color: theme.colors.inverse, fontSize: size * 0.36, fontWeight: '800'}}>{initials || 'W'}</AppText>
    </View>
  );
};

const styles = StyleSheet.create({avatar: {alignItems: 'center', justifyContent: 'center'}});
