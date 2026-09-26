import React, {createContext, useContext, useMemo, useState} from 'react';
import {useColorScheme} from 'react-native';
import {createTheme, type AppTheme, type ThemeMode} from './theme';

type ThemeContextValue = {
  theme: AppTheme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider = ({children}: React.PropsWithChildren): React.JSX.Element => {
  const systemMode = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [mode, setMode] = useState<ThemeMode>(systemMode);
  const theme = useMemo(() => createTheme(mode), [mode]);

  return (
    <ThemeContext.Provider value={{theme, mode, setMode}}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return context;
};
