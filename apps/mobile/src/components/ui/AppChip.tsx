import React from 'react';
import {Pressable, StyleSheet} from 'react-native';
import {AppText} from './AppText';
import {useTheme} from '../../theme/ThemeProvider';

type AppChipProps = {label: string; selected?: boolean; onPress?: () => void};

export const AppChip = ({label, selected = false, onPress}: AppChipProps): React.JSX.Element => {
  const {theme} = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({pressed}) => [
      styles.chip,
      {backgroundColor: selected ? theme.colors.accent : theme.colors.surface, borderColor: selected ? theme.colors.accent : theme.colors.border, opacity: pressed ? 0.8 : 1},
    ]}>
      <AppText style={{color: selected ? theme.colors.inverse : theme.colors.textPrimary, fontSize: 13, fontWeight: '700'}}>{label}</AppText>
    </Pressable>
  );
};

const styles = StyleSheet.create({chip: {borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8}});
