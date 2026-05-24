import React, { createContext, useContext, useState, useEffect } from 'react';
import { getLanguage, setLanguage, initLanguage, subscribeLanguage, type Language } from '../lib/i18n';

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  setLanguage: async () => {},
});

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLang] = useState<Language>(getLanguage());

  useEffect(() => {
    initLanguage().then(setLang);
    return subscribeLanguage(setLang);
  }, []);

  const handleSetLanguage = async (lang: Language) => {
    await setLanguage(lang);
    setLang(lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}
