
import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeConfig, ThemeName } from './types';
import { THEMES } from './themes';

interface ThemeContextType {
  currentThemeName: ThemeName;
  currentThemeConfig: ThemeConfig;
  setTheme: (theme: ThemeName) => void;
  availableThemes: ThemeConfig[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'zara_theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentThemeName, setCurrentThemeName] = useState<ThemeName>('dark');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeName;
    if (stored && THEMES[stored]) {
      setCurrentThemeName(stored);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const themeConfig = THEMES[currentThemeName];

    root.classList.remove(...Object.keys(THEMES).map(t => `theme-${t}`));
    root.classList.remove('dark');

    root.classList.add(`theme-${currentThemeName}`);
    
    const isDark = !['light', 'glass', 'pastel'].includes(currentThemeName);
    if (isDark) root.classList.add('dark');

    localStorage.setItem(STORAGE_KEY, currentThemeName);

    if (themeConfig.gradientOverlay) {
        document.body.style.setProperty('--gradient-overlay', themeConfig.gradientOverlay);
    } else {
        document.body.style.setProperty('--gradient-overlay', 'none');
    }

  }, [currentThemeName]);

  const setTheme = (theme: ThemeName) => {
    setCurrentThemeName(theme);
  };

  const availableThemes = Object.values(THEMES);
  const currentThemeConfig = THEMES[currentThemeName];

  return (
    <ThemeContext.Provider value={{ currentThemeName, currentThemeConfig, setTheme, availableThemes }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
