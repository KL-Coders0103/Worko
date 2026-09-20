import React from 'react';

import Ionicons from '@react-native-vector-icons/ionicons';

import {
  useTheme,
} from '../theme';

type TabIconProps = {
  name: React.ComponentProps<
    typeof Ionicons
  >['name'];
  focused: boolean;
};

export function TabIcon({
  name,
  focused,
}: TabIconProps) {
  const { colors } = useTheme();

  return (
    <Ionicons
      name={name}
      size={24}
      color={
        focused
          ? colors.primary
          : colors.textSecondary
      }
    />
  );
}