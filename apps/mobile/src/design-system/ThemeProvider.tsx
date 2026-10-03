import React, { createContext, useContext, useMemo, useState } from 'react';
import { ColorMode, themes, WorkoTheme } from './tokens';
type ThemeContextValue = { mode: ColorMode; theme: WorkoTheme; setMode: (mode: ColorMode) => void; toggleMode: () => void };
const ThemeContext = createContext<ThemeContextValue | null>(null);
export function ThemeProvider({ children, initialMode = 'light' }: React.PropsWithChildren<{ initialMode?: ColorMode }>) {
  const [mode, setMode] = useState<ColorMode>(initialMode);
  const value = useMemo(() => ({ mode, theme: themes[mode], setMode, toggleMode: () => setMode(current => current === 'light' ? 'dark' : 'light') }), [mode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export function useWorkoTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useWorkoTheme must be used inside ThemeProvider');
  return value;
}
