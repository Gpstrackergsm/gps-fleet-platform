"use client";

import { useEffect, useState, useCallback } from 'react';

export type Theme = 'dark' | 'light';
const KEY = 'theme';

const read = (): Theme =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('light') ? 'light' : 'dark';

/** Apply a theme to <html>, persist it, and notify every useTheme() consumer. */
export function applyTheme(t: Theme) {
    const root = document.documentElement;
    root.classList.toggle('light', t === 'light');
    root.classList.toggle('dark', t === 'dark');
    try { localStorage.setItem(KEY, t); } catch { /* ignore */ }
    window.dispatchEvent(new Event('themechange'));
}

export function useTheme() {
    const [theme, setThemeState] = useState<Theme>('dark');

    useEffect(() => {
        setThemeState(read());
        const sync = () => setThemeState(read());
        window.addEventListener('themechange', sync);
        return () => window.removeEventListener('themechange', sync);
    }, []);

    const toggle = useCallback(() => applyTheme(read() === 'light' ? 'dark' : 'light'), []);
    return { theme, toggle, setTheme: applyTheme };
}
