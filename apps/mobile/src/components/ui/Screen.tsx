import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../theme/ThemeProvider';

type ScreenProps = React.PropsWithChildren<{
  padded?: boolean;
}>;

export const Screen = ({children, padded = true}: ScreenProps): React.JSX.Element => {
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
      ]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
});
