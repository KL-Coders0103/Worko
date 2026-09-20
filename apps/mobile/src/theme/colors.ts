export const colors = {
  orange: '#FF6B00',
  orangeDark: '#E85F00',
  orangeLight: '#FFF1E6',

  black: '#0B0B0B',
  charcoal: '#151515',
  darkGray: '#222222',

  gray: '#666666',
  muted: '#999999',

  white: '#FFFFFF',
  offWhite: '#F7F7F7',
  lightGray: '#EAEAEA',

  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  transparent: 'transparent',
} as const;

export const darkColors = {
  background: colors.black,
  surface: colors.charcoal,
  surfaceSecondary: colors.darkGray,

  text: colors.white,
  textSecondary: '#A3A3A3',

  border: '#333333',

  primary: colors.orange,

  success: colors.success,
  warning: colors.warning,
  error: colors.error,
  info: colors.info,

  onPrimary: colors.white,
  onSurface: colors.white,
} as const;

export const lightColors = {
  background: colors.white,
  surface: colors.offWhite,
  surfaceSecondary: colors.lightGray,

  text: colors.black,
  textSecondary: colors.gray,

  border: '#DDDDDD',

  primary: colors.orange,

  success: colors.success,
  warning: colors.warning,
  error: colors.error,
  info: colors.info,

  onPrimary: colors.white,
  onSurface: colors.black,
} as const;