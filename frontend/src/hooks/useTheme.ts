import { useState, useEffect, useCallback } from 'react';
import { getTheme, setTheme as saveTheme } from '@/services/storage';

export function useTheme() {
  const [theme, setThemeState] = useState<'dark' | 'light'>(() => getTheme());

  useEffect(() => {
    saveTheme(theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, setTheme: setThemeState, toggleTheme };
}
