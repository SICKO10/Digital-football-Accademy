import { useState } from 'react'
import { ThemeContext, STOCKAGE_CLE_THEME, useTheme, useColors } from './theme'

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem(STOCKAGE_CLE_THEME) || 'sombre')
  const toggleTheme = () => {
    setTheme(prev => {
      const suivant = prev === 'sombre' ? 'claire' : 'sombre'
      localStorage.setItem(STOCKAGE_CLE_THEME, suivant)
      return suivant
    })
  }
  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
}

// Bouton de bascule partagé — même apparence/comportement sur les 5
// dashboards plutôt que 5 implémentations divergentes.
export function ThemeToggleButton({ style }) {
  const { theme, toggleTheme } = useTheme()
  const c = useColors()
  return (
    <button onClick={toggleTheme} title="Changer le thème"
      style={{ background: 'none', border: `1px solid ${c.border.strong}`, color: c.text.secondary, borderRadius: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', ...style }}>
      {theme === 'sombre' ? 'Claire' : 'Sombre'}
    </button>
  )
}
