
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

  // Initial Load
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeName;
    if (stored && THEMES[stored]) {
      setCurrentThemeName(stored);
    }
  }, []);

  // Theme Application Logic
  useEffect(() => {
    const root = document.documentElement;
    const themeConfig = THEMES[currentThemeName];

    // 1. Clean up old classes
    // We remove ALL possible theme classes to avoid conflicts
    const allThemeClasses = Object.keys(THEMES).map(t => `theme-${t}`);
    root.classList.remove(...allThemeClasses);
    root.classList.remove('dark', 'light'); // Remove generic markers too

    // 2. Add new class
    root.classList.add(`theme-${currentThemeName}`);
    
    // 3. Handle Tailwind 'dark' mode utility
    // Most themes are dark, so we default to adding 'dark' unless it's explicitly a light theme
    const lightThemes = ['light', 'glass', 'pastel'];
    if (!lightThemes.includes(currentThemeName)) {
      root.classList.add('dark');
    }

    // 4. Persist
    localStorage.setItem(STORAGE_KEY, currentThemeName);

    // 5. Dynamic CSS Properties (Gradient Overlays)
    if (themeConfig.gradientOverlay) {
        document.body.style.setProperty('--gradient-overlay', themeConfig.gradientOverlay);
    } else {
        document.body.style.setProperty('--gradient-overlay', 'none');
    }
    
    // 6. Force body background update immediately (prevents flashes)
    document.body.style.backgroundColor = themeConfig.colors.background;
    document.body.style.color = themeConfig.colors.textMain;

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
