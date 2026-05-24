import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  useCallback,
} from "react";
import { en } from "./i18n/en";
import { am } from "./i18n/am";

export type Lang = "en" | "am";

const translations = {
  en,
  am,
} as const;

export type TranslationKey = keyof typeof translations.en;

interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
}

const I18nContext = createContext<I18nContextValue>({
  lang: "en",
  setLang: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(
    () => (localStorage.getItem("kasa_lang") as Lang) ?? "en",
  );
  const setLang = useCallback((l: Lang) => {
    localStorage.setItem("kasa_lang", l);
    setLangState(l);
  }, []);
  return (
    <I18nContext.Provider value={{ lang, setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

const LOCALE_MAP: Record<Lang, string> = { en: 'en-US', am: 'am-ET' };

export function useI18n() {
  const { lang, setLang } = useContext(I18nContext);
  const t = useCallback(
    (key: TranslationKey) =>
      (translations[lang] as Record<string, string>)[key] ??
      (translations.en as Record<string, string>)[key] ??
      key,
    [lang],
  );
  return { lang, setLang, t, locale: LOCALE_MAP[lang] };
}
