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
        const saved = localStorage.getItem('trackpro_lang') as Language;
        if (saved && (saved === 'en' || saved === 'fr' || saved === 'ar')) {
            setLanguageState(saved);
            applyLanguageSettings(saved);
        } else {
            // Check browser preferred language
            const browserLang = navigator.language.slice(0, 2);
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
        localStorage.setItem('trackpro_lang', lang);
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
