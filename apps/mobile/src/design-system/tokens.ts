export const palette = {
  orange: '#FF6B00', orangePressed: '#E85F00', white: '#FFFFFF',
  ink: '#101010', darkSurface: '#1C1C1C', muted: '#777777',
  lightBackground: '#F7F7F7', border: '#E1E2E5',
  success: '#176B45', error: '#A52828', warning: '#9A5B00',
} as const;
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, huge: 40 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;
export const typography = {
  xs: 12, sm: 14, md: 16, lg: 18, xl: 22, title: 28, display: 34,
} as const;
export const touchTarget = 48;
export type ColorMode = 'light' | 'dark';
export const themes = {
  light: { background: palette.white, surface: palette.white, elevated: palette.lightBackground, text: palette.ink, secondaryText: palette.muted, border: palette.border, primary: palette.orange, onPrimary: palette.white, success: palette.success, error: palette.error, warning: palette.warning },
  dark: { background: palette.ink, surface: palette.darkSurface, elevated: '#292929', text: palette.white, secondaryText: '#B7B7B7', border: '#3A3A3A', primary: palette.orange, onPrimary: palette.white, success: '#55C58B', error: '#FF7777', warning: '#F3BD61' },
} as const;
export type WorkoTheme = typeof themes.light;
