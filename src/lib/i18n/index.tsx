"use client";

import React, { createContext, useContext, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import type { Lang, Localized } from "@/lib/types";
import en from "@/lib/i18n/locales/en.json";
import am from "@/lib/i18n/locales/am.json";
import om from "@/lib/i18n/locales/om.json";

const dictionaries: Record<Lang, Record<string, string>> = {
  en: en as Record<string, string>,
  am: am as Record<string, string>,
  om: om as Record<string, string>,
};

export type TranslateFn = (
  key: string,
  vars?: Record<string, string | number>
) => string;

interface I18nContextValue {
  lang: Lang;
  t: TranslateFn;
  /** pick a Localized object with fallback: lang -> en -> am */
  pick: (value: Localized | undefined) => string;
  /** html lang attribute value */
  htmlLang: string;
  rtl: false;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const lang = useAppStore((s) => s.lang);

  const value = useMemo<I18nContextValue>(() => {
    const t: TranslateFn = (key, vars) => {
      const dict = dictionaries[lang] ?? dictionaries.en;
      let out = dict[key] ?? dictionaries.en[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          out = out.replaceAll(`{${k}}`, String(v));
        }
      }
      return out;
    };
    const pick = (v: Localized | undefined) => {
      if (!v) return "";
      return v[lang] || v.en || v.am || "";
    };
    return { lang, t, pick, htmlLang: lang === "om" ? "om" : lang, rtl: false };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
