"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/lib/LanguageContext';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { Language } from '@/lib/translations';

interface LanguageSelectorProps {
    compact?: boolean;
    className?: string;
}

export default function LanguageSelector({ compact = false, className = '' }: LanguageSelectorProps) {
    const { language, setLanguage, languages } = useLanguage();
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const current = languages.find(l => l.code === language) || languages[0];

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (code: Language) => {
        setLanguage(code);
        setOpen(false);
    };

    return (
        <div ref={dropdownRef} className={`relative inline-block text-left ${className}`}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-200 text-xs font-medium transition-all shadow-sm ${
                    open ? 'ring-2 ring-blue-500/50 border-blue-500' : ''
                }`}
                title="Select Language / Choisir la langue / اختر اللغة"
            >
                <Globe size={13} className="text-blue-400 shrink-0" />
                <span className="text-sm shrink-0">{current.flag}</span>
                {!compact && (
                    <span className="font-semibold">{current.name}</span>
                )}
                <ChevronDown size={12} className={`text-zinc-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute right-0 mt-1.5 w-40 rounded-xl bg-zinc-900 border border-zinc-700/80 shadow-2xl py-1.5 z-[999] backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-1 text-[10px] uppercase font-semibold text-zinc-500 border-b border-zinc-800">
                        Language / Langue / اللغة
                    </div>
                    {languages.map((l) => (
                        <button
                            key={l.code}
                            type="button"
                            onClick={() => handleSelect(l.code)}
                            className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors text-left ${
                                l.code === language
                                    ? 'bg-blue-600/20 text-blue-400 font-semibold'
                                    : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                            }`}
                        >
                            <span className="flex items-center gap-2">
                                <span className="text-sm">{l.flag}</span>
                                <span>{l.name}</span>
                            </span>
                            {l.code === language && <Check size={14} className="text-blue-400" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
