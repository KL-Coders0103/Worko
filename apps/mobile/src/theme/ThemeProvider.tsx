import React, {
  createContext,
  useContext,
  useMemo,
  useState,
} from 'react';

import {
  darkColors,
  lightColors,
} from './colors';

type ThemeMode = 'light' | 'dark';

type ThemeColors =
  | typeof lightColors
  | typeof darkColors;

type ThemeContextValue = {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<
  ThemeContextValue | undefined
>(undefined);

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mode, setMode] = useState<ThemeMode>('dark');

  const value = useMemo<ThemeContextValue>(() => {
    const isDark = mode === 'dark';

    return {
      mode,
      isDark,
      colors: isDark ? darkColors : lightColors,
      setMode,
      toggleTheme: () => {
        setMode(current =>
          current === 'dark' ? 'light' : 'dark',
        );
      },
    };
  }, [mode]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      'useTheme must be used inside ThemeProvider',
    );
  }

  return context;
}