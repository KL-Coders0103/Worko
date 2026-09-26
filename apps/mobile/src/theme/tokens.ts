export const colors = {
  light: {
    background: '#FFFFFF',
    surface: '#F7F7F7',
    surfaceElevated: '#FFFFFF',
    textPrimary: '#111111',
    textSecondary: '#666666',
    border: '#E8E8E8',
    accent: '#FF6B00',
    accentPressed: '#E85F00',
    inverse: '#FFFFFF',
    danger: '#D92D20',
    success: '#039855',
  },
  dark: {
    background: '#0B0B0B',
    surface: '#151515',
    surfaceElevated: '#1C1C1C',
    textPrimary: '#FFFFFF',
    textSecondary: '#A3A3A3',
    border: '#2A2A2A',
    accent: '#FF6B00',
    accentPressed: '#E85F00',
    inverse: '#111111',
    danger: '#F97066',
    success: '#32D583',
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  family: {
    regular: undefined,
    medium: undefined,
    semiBold: undefined,
    bold: undefined,
  },
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
    display: 34,
  },
  lineHeight: {
    sm: 20,
    md: 24,
    lg: 28,
    xl: 34,
    xxl: 40,
  },
} as const;
