'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type Language = 'sk' | 'en'

const LanguageContext = createContext<{
  language: Language
  setLanguage: (language: Language) => void
}>({ language: 'sk', setLanguage: () => undefined })

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, updateLanguage] = useState<Language>('sk')

  useEffect(() => {
    const saved = window.localStorage.getItem('truststep-language')
    if (saved === 'sk' || saved === 'en') updateLanguage(saved)
  }, [])

  function setLanguage(value: Language) {
    updateLanguage(value)
    window.localStorage.setItem('truststep-language', value)
    document.documentElement.lang = value
    document.cookie = `truststep-language=${value};path=/;max-age=31536000;samesite=lax`
  }

  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  return useContext(LanguageContext)
}
