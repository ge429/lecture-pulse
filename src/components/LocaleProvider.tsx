"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

interface LocaleContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextType>({
  locale: "ko",
  setLocale: () => {},
  t: (key) => key,
});

export function useLocale() {
  return useContext(LocaleContext);
}

export default function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ko");

  useEffect(() => {
    const saved = localStorage.getItem("locale") as Locale | null;
    if (saved && ["ko", "en", "zh"].includes(saved)) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("locale", l);
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: (key) => t(key, locale) }}>
      {children}
    </LocaleContext.Provider>
  );
}
