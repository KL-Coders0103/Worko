import React from 'react';
import {Pressable, StyleSheet, type PressableProps} from 'react-native';
import {useTheme} from '../../theme/ThemeProvider';

type AppCardProps = PressableProps & {children: React.ReactNode; elevated?: boolean};

export const AppCard = ({children, elevated = false, style, ...props}: AppCardProps): React.JSX.Element => {
  const {theme} = useTheme();
  return (
    <Pressable {...props} style={({pressed}) => [
      styles.card,
      {backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border, shadowColor: '#000000', opacity: pressed ? 0.94 : 1},
      elevated && styles.elevated,
      style,
    ]}>
      {children}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {borderWidth: 1, borderRadius: 20, padding: 16},
  elevated: {shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: {width: 0, height: 6}, elevation: 3},
});
