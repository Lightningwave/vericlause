"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Locale, TranslationDictionary } from "../../lib/i18n/types";
import en from "../../lib/i18n/translations/en";
import zh from "../../lib/i18n/translations/zh";
import ms from "../../lib/i18n/translations/ms";
import ta from "../../lib/i18n/translations/ta";

type LanguageContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
};

const translations: Record<Locale, TranslationDictionary> = {
  en,
  zh,
  ms,
  ta,
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const savedLocale = localStorage.getItem("locale") as Locale | null;
    if (savedLocale && savedLocale in translations) {
      setLocaleState(savedLocale);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("locale", newLocale);
  };

  const t = (key: string) => {
    return translations[locale][key] || translations.en[key] || key;
  };

  const value = useMemo(() => ({ locale, setLocale, t }), [locale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }

  return context;
}