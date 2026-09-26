import {colors, radius, spacing, typography} from './tokens';

export type ThemeMode = 'light' | 'dark';

export const createTheme = (mode: ThemeMode) => ({
  mode,
  colors: colors[mode],
  spacing,
  radius,
  typography,
});

export type AppTheme = ReturnType<typeof createTheme>;
