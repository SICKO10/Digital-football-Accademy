import { createContext, useContext } from 'react'

export const CoachThemeContext = createContext(null)

export function useCoachTheme() {
  const ctx = useContext(CoachThemeContext)
  if (!ctx) throw new Error('useCoachTheme doit être utilisé dans <CoachThemeProvider>')
  return ctx
}
