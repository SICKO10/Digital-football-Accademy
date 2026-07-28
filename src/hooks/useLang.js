import { useState } from 'react'

const STORAGE_KEY = 'df_lang'
const DEFAULT_LANG = 'fr'

export function useLang() {
  const [lang, setLangState] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG
  })

  const setLang = (code) => {
    localStorage.setItem(STORAGE_KEY, code)
    setLangState(code)
  }

  return { lang, setLang }
}
