"use client";

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/lib/useTheme';

/** Segmented Dark / Light switch for the dashboard header. */
export default function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const btn = (active: boolean) =>
        `p-1.5 rounded-md transition-colors ${active ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`;
    return (
        <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-gray-950/60 border border-gray-800" role="group" aria-label="Thème">
            <button onClick={() => setTheme('light')} className={btn(theme === 'light')} title="Mode clair" aria-pressed={theme === 'light'}>
                <Sun size={14} />
            </button>
            <button onClick={() => setTheme('dark')} className={btn(theme === 'dark')} title="Mode sombre" aria-pressed={theme === 'dark'}>
                <Moon size={14} />
            </button>
        </div>
    );
}
