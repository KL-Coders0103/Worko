export const colors = {
  primary: '#FF6B00', // Worko Orange
  primaryLight: '#FF8533',
  primaryDark: '#CC5600',
  
  background: {
    light: '#FFFFFF',
    dark: '#121212',
    cardLight: '#F8F9FA',
    cardDark: '#1E1E1E',
  },
  
  text: {
    primaryLight: '#111827',
    secondaryLight: '#6B7280',
    primaryDark: '#F9FAFB',
    secondaryDark: '#9CA3AF',
  },
  
  border: {
    light: '#E5E7EB',
    dark: '#374151',
  },
  
  status: {
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
  }
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
};

export const typography = {
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  }
};