import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ColorMode, themes, WorkoTheme } from './tokens';

const THEME_STORAGE_KEY = '@worko/theme-mode';

type ThemeContextValue = {
  mode: ColorMode;
  theme: WorkoTheme;
  setMode: (mode: ColorMode) => void;
  toggleMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  initialMode = 'light',
}: React.PropsWithChildren<{ initialMode?: ColorMode }>) {
  const [mode, setMode] = useState<ColorMode>(initialMode);
  const [hasLoadedPreference, setHasLoadedPreference] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadPreference = async () => {
      try {
        const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (isMounted && (savedMode === 'light' || savedMode === 'dark')) {
          setMode(savedMode);
        }
      } catch {
        // Keep the default theme if device storage is unavailable.
      } finally {
        if (isMounted) setHasLoadedPreference(true);
      }
    };

    void loadPreference();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedPreference) return;
    void AsyncStorage.setItem(THEME_STORAGE_KEY, mode).catch(() => {
      // Theme changes still apply for this session if persistence fails.
    });
  }, [hasLoadedPreference, mode]);

  const value = useMemo(
    () => ({
      mode,
      theme: themes[mode],
      setMode,
      toggleMode: () =>
        setMode(current => (current === 'light' ? 'dark' : 'light')),
    }),
    [mode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useWorkoTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useWorkoTheme must be used inside ThemeProvider');
  return value;
}
