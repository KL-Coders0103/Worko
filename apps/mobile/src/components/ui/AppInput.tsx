import React, {forwardRef} from 'react';
import {StyleSheet, Text, TextInput, type TextInputProps} from 'react-native';
import {useTheme} from '../../theme/ThemeProvider';

type AppInputProps = TextInputProps & {
  label: string;
  error?: string | null;
};

export const AppInput = forwardRef<TextInputInstance, AppInputProps>(function AppInputComponent(
  {label, error, style, ...props},
  ref,
): React.JSX.Element {
  const {theme} = useTheme();

  return (
    <>
      <TextInput
        ref={ref}
        placeholderTextColor={theme.colors.textSecondary}
        selectionColor={theme.colors.accent}
        accessibilityLabel={label}
        style={[
          styles.input,
          {
            color: theme.colors.textPrimary,
            backgroundColor: theme.colors.surface,
            borderColor: error ? theme.colors.danger : theme.colors.border,
          },
          style,
        ]}
        {...props}
      />
      {error ? <Text style={[styles.error, {color: theme.colors.danger}]}>{error}</Text> : null}
    </>
  );
});

const styles = StyleSheet.create({
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  error: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
  },
});
