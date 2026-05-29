/**
 * Theme Context — Multi-theme support (dark blue, dark emerald, dark amber, light)
 * User can select theme from Settings, persisted in SQLite
 */
import React, { createContext, useContext, useState, useCallback } from 'react';

export type ThemeMode = 'dark_blue' | 'dark_emerald' | 'dark_amber' | 'light';

export interface ThemeColors {
  background: string;
  card: string;
  cardElevated: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryLight: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  inputBg: string;
  tabBar: string;
  statusBar: 'light' | 'dark';
}

const THEMES: Record<ThemeMode, ThemeColors> = {
  dark_blue: {
    background: '#0D1117',
    card: '#161B22',
    cardElevated: '#1C2333',
    border: '#30363D',
    text: '#E6EDF3',
    textSecondary: '#8B949E',
    textMuted: '#484F58',
    primary: '#3B82F6',
    primaryLight: '#3B82F622',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#06B6D4',
    inputBg: '#0D1117',
    tabBar: '#161B22',
    statusBar: 'light',
  },
  dark_emerald: {
    background: '#0D1117',
    card: '#161B22',
    cardElevated: '#1C2333',
    border: '#30363D',
    text: '#E6EDF3',
    textSecondary: '#8B949E',
    textMuted: '#484F58',
    primary: '#10B981',
    primaryLight: '#10B98122',
    success: '#34D399',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#06B6D4',
    inputBg: '#0D1117',
    tabBar: '#161B22',
    statusBar: 'light',
  },
  dark_amber: {
    background: '#0D1117',
    card: '#161B22',
    cardElevated: '#1C2333',
    border: '#30363D',
    text: '#E6EDF3',
    textSecondary: '#8B949E',
    textMuted: '#484F58',
    primary: '#F59E0B',
    primaryLight: '#F59E0B22',
    success: '#10B981',
    warning: '#FBBF24',
    error: '#EF4444',
    info: '#06B6D4',
    inputBg: '#0D1117',
    tabBar: '#161B22',
    statusBar: 'light',
  },
  light: {
    background: '#F8FAFC',
    card: '#FFFFFF',
    cardElevated: '#F1F5F9',
    border: '#E2E8F0',
    text: '#1E293B',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
    primary: '#3B82F6',
    primaryLight: '#3B82F615',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#06B6D4',
    inputBg: '#F1F5F9',
    tabBar: '#FFFFFF',
    statusBar: 'dark',
  },
};

interface ThemeContextType {
  theme: ThemeMode;
  colors: ThemeColors;
  setTheme: (theme: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark_blue',
  colors: THEMES.dark_blue,
  setTheme: () => {},
  isDark: true,
});

export function ThemeProvider({ children, initialTheme }: { children: React.ReactNode; initialTheme?: ThemeMode }) {
  const [theme, setThemeState] = useState<ThemeMode>(initialTheme ?? 'dark_blue');

  const setTheme = useCallback((t: ThemeMode) => {
    setThemeState(t);
  }, []);

  const colors = THEMES[theme];
  const isDark = theme !== 'light';

  return (
    <ThemeContext.Provider value={{ theme, colors, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function useColors(): ThemeColors {
  return useContext(ThemeContext).colors;
}

export { THEMES };
