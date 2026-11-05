"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, TranslationDictionary, translations, LANGUAGES } from './translations';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: keyof TranslationDictionary) => string;
    dir: 'ltr' | 'rtl';
    isRTL: boolean;
    languages: typeof LANGUAGES;
}

const LanguageContext = createContext<LanguageContextType>({
    language: 'en',
    setLanguage: () => {},
    t: (key) => translations.en[key] || String(key),
    dir: 'ltr',
    isRTL: false,
    languages: LANGUAGES,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguageState] = useState<Language>('en');

    useEffect(() => {
        // 1. Check URL query param first (critical for Googlebot & multi-language SEO links)
        if (typeof window !== 'undefined') {
            try {
                const params = new URLSearchParams(window.location.search);
                const queryLang = params.get('lang') as Language;
                if (queryLang && (queryLang === 'en' || queryLang === 'fr' || queryLang === 'ar')) {
                    setLanguageState(queryLang);
                    localStorage.setItem('trackpro_lang', queryLang);
                    applyLanguageSettings(queryLang);
                    return;
                }
            } catch (e) {
                // Ignore URL parsing errors
            }
        }

        // 2. Check localStorage
        const saved = localStorage.getItem('trackpro_lang') as Language;
        if (saved && (saved === 'en' || saved === 'fr' || saved === 'ar')) {
            setLanguageState(saved);
            applyLanguageSettings(saved);
        } else {
            // 3. Fallback to browser language
            const browserLang = typeof navigator !== 'undefined' ? navigator.language.slice(0, 2) : 'en';
            if (browserLang === 'fr' || browserLang === 'ar') {
                setLanguageState(browserLang as Language);
                applyLanguageSettings(browserLang as Language);
            } else {
                applyLanguageSettings('en');
            }
        }
    }, []);

    const applyLanguageSettings = (lang: Language) => {
        if (typeof document !== 'undefined') {
            const dir = lang === 'ar' ? 'rtl' : 'ltr';
            document.documentElement.dir = dir;
            document.documentElement.lang = lang;
        }
    };

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        if (typeof window !== 'undefined') {
            localStorage.setItem('trackpro_lang', lang);
            try {
                const url = new URL(window.location.href);
                url.searchParams.set('lang', lang);
                window.history.replaceState({}, '', url.toString());
            } catch (e) {}
        }
        applyLanguageSettings(lang);
    };

    const t = (key: keyof TranslationDictionary): string => {
        const dict = translations[language] || translations.en;
        return dict[key] || translations.en[key] || String(key);
    };

    const dir: 'ltr' | 'rtl' = language === 'ar' ? 'rtl' : 'ltr';
    const isRTL = dir === 'rtl';

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, dir, isRTL, languages: LANGUAGES }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    return useContext(LanguageContext);
}
