import React from 'react';
import {ActivityIndicator, Pressable, StyleSheet} from 'react-native';
import {AppText} from './AppText';
import {useTheme} from '../../theme/ThemeProvider';

type AppButtonProps = {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
};

export const AppButton = ({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
}: AppButtonProps): React.JSX.Element => {
  const {theme} = useTheme();
  const isDisabled = disabled || loading;

  const backgroundColor =
    variant === 'primary'
      ? theme.colors.accent
      : variant === 'secondary'
        ? theme.colors.surface
        : 'transparent';

  const borderColor =
    variant === 'secondary' ? theme.colors.border : 'transparent';

  const textColor =
    variant === 'primary' ? theme.colors.inverse : theme.colors.textPrimary;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={({pressed}) => [
        styles.button,
        {
          backgroundColor,
          borderColor,
          opacity: isDisabled ? 0.5 : pressed ? 0.8 : 1,
        },
      ]}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <AppText style={[styles.label, {color: textColor}]}>{label}</AppText>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  label: {fontSize: 16, fontWeight: '700'},
});
