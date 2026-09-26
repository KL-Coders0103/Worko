import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme/ThemeProvider';

type ScreenProps = React.PropsWithChildren<{
  padded?: boolean;
  centered?: boolean;
}>;

export const Screen = ({
  children,
  padded = true,
  centered = false,
}: ScreenProps): React.JSX.Element => {
  const {theme} = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingHorizontal: padded ? theme.spacing.lg : 0,
        },
        centered && styles.centered,
      ]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
