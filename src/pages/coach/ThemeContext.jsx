import { useEffect, useState } from 'react'
import { THEMES, SIDEBAR, FONTS, rgba } from './theme'
import { CoachThemeContext } from './useCoachTheme'

const STORAGE_KEY = 'coach-theme'

export function CoachThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark' } catch { return 'dark' }
  })

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, mode) } catch { /* stockage indisponible (navigation privée...) */ }
  }, [mode])

  const toggle = () => setMode(m => m === 'dark' ? 'light' : 'dark')

  const value = { mode, toggle, c: THEMES[mode], sidebar: SIDEBAR, fonts: FONTS, rgba }

  return <CoachThemeContext.Provider value={value}>{children}</CoachThemeContext.Provider>
}
