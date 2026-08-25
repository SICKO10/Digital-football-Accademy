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

const IcoSun = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
const IcoMoon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>

// Bouton de bascule partagé, discret (icône seule) — même apparence/
// comportement partout plutôt que des implémentations divergentes par page.
// Affiche l'icône du thème VERS LEQUEL le clic bascule (soleil en thème
// sombre = "passer en clair", lune en thème clair = "passer en sombre").
export function ThemeToggleButton({ style }) {
  const { theme, toggleTheme } = useTheme()
  const c = useColors()
  return (
    <button onClick={toggleTheme} title={theme === 'sombre' ? 'Passer en thème clair' : 'Passer en thème sombre'}
      style={{ background: 'none', border: `1px solid ${c.border.default}`, color: c.text.faint, borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, ...style }}>
      {theme === 'sombre' ? <IcoSun /> : <IcoMoon />}
    </button>
  )
}
