import React from 'react';
import { Text, TextProps, useColorScheme } from 'react-native';
import { colors, typography } from '../../theme';

interface TypographyProps extends TextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption';
  color?: string;
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
  weight?: keyof typeof typography.weights;
}

export function Typography({
  variant = 'body',
  color,
  align = 'left',
  weight,
  style,
  children,
  ...props
}: TypographyProps) {
  const isDark = useColorScheme() === 'dark';
  
  const defaultColor = isDark ? colors.text.primaryDark : colors.text.primaryLight;
  const secondaryColor = isDark ? colors.text.secondaryDark : colors.text.secondaryLight;

  const getVariantStyles = () => {
    switch (variant) {
      case 'h1': return { fontSize: typography.sizes.xxl, fontWeight: typography.weights.bold, color: defaultColor };
      case 'h2': return { fontSize: typography.sizes.xl, fontWeight: typography.weights.semibold, color: defaultColor };
      case 'h3': return { fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold, color: defaultColor };
      case 'caption': return { fontSize: typography.sizes.sm, fontWeight: typography.weights.regular, color: secondaryColor };
      case 'body':
      default: return { fontSize: typography.sizes.md, fontWeight: typography.weights.regular, color: defaultColor };
    }
  };

  return (
    <Text
      style={[
        getVariantStyles(),
        { textAlign: align },
        weight && { fontWeight: typography.weights[weight] },
        color && { color },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
}