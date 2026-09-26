import React from 'react';
import {StyleSheet, Text, type TextProps} from 'react-native';
import {useTheme} from '../../theme/ThemeProvider';

type Variant = 'display' | 'title' | 'subtitle' | 'body' | 'label' | 'caption';

type AppTextProps = TextProps & {
  variant?: Variant;
  muted?: boolean;
};

export const AppText = ({
  variant = 'body',
  muted = false,
  style,
  ...props
}: AppTextProps): React.JSX.Element => {
  const {theme} = useTheme();

  return (
    <Text
      {...props}
      style={[
        styles.base,
        styles[variant],
        {color: muted ? theme.colors.textSecondary : theme.colors.textPrimary},
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  base: {includeFontPadding: false},
  display: {fontSize: 34, lineHeight: 40, fontWeight: '800'},
  title: {fontSize: 22, lineHeight: 28, fontWeight: '700'},
  subtitle: {fontSize: 18, lineHeight: 26, fontWeight: '600'},
  body: {fontSize: 16, lineHeight: 24, fontWeight: '400'},
  label: {fontSize: 14, lineHeight: 20, fontWeight: '700'},
  caption: {fontSize: 12, lineHeight: 18, fontWeight: '500'},
});
