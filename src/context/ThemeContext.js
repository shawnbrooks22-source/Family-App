import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getColors, shadows } from '../theme/index';

const ThemeContext = createContext(null);
const THEME_KEY = '@kindo_dark_mode';

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then(val => {
      if (val === 'true') setIsDark(true);
    });
  }, []);

  async function toggleDark() {
    const next = !isDark;
    setIsDark(next);
    await AsyncStorage.setItem(THEME_KEY, String(next));
  }

  const colors = getColors(isDark);
  return (
    <ThemeContext.Provider value={{ isDark, toggleDark, colors, shadows }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
