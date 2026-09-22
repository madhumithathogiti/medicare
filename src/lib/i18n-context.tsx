import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Lang, TFunc } from '@/lib/i18n';
import { makeT, LANGS } from '@/lib/i18n';

type I18nContextType = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: TFunc;
};

const I18nContext = createContext<I18nContextType>({
  lang: 'en',
  setLang: () => {},
  t: makeT('en'),
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('med-lang') : null;
    return (saved as Lang) ?? 'en';
  });

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem('med-lang', l); } catch { /* ignore */ }
  }, []);

  const t = makeT(lang);

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export { LANGS };
