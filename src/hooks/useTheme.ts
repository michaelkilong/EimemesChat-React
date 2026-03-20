import { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { syncHljsTheme } from '../lib/markdown';

const THEME_KEY = 'ec_theme';

export function useTheme() {
  const { isDark, setIsDark } = useApp();

  // Init from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY);
    const dark = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setIsDark(dark);
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(dark ? 'dark' : 'light');
    syncHljsTheme(dark);
  }, []); // eslint-disable-line

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(next ? 'dark' : 'light');
    syncHljsTheme(next);
  };

  return { isDark, toggleTheme };
}
