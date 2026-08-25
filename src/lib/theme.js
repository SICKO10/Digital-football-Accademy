import { createContext, useContext } from 'react'
import { colors, colorsClaire } from '../tokens'

// Thème clair/sombre des 5 dashboards principaux (éducateur, club, joueur,
// parent, dirigeant) + des composants qui y sont directement imbriqués
// (AlertesPanel, NotationMatch, SondageSemaine, StatsEquipe, EmptyState).
// Les pages publiques/auth et les modules annexes à couleurs codées en dur
// (Tactipad, Déplacements, Préparation physique...) ne sont pas concernés —
// ils gardent leur look sombre historique, cf. discussion de périmètre.
// Provider dans theme.jsx (fichier séparé : react-refresh/only-export-
// components n'autorise pas de mélanger hooks et composants dans un même
// fichier, cf. le même découpage déjà en place pour useCoachTheme.js).
export const ThemeContext = createContext({ theme: 'sombre', toggleTheme: () => {} })

export const STOCKAGE_CLE_THEME = 'df_dashboard_theme'

export const useTheme = () => useContext(ThemeContext)

// À appeler dans CHAQUE fonction composant qui utilise colors.* (le
// composant principal du dashboard, mais aussi ses sous-composants définis
// dans le même fichier ou importés séparément) — un hook ne se lit pas
// depuis une simple closure JS, chaque fonction composant doit le rappeler.
export const useColors = () => {
  const { theme } = useContext(ThemeContext)
  return theme === 'claire' ? colorsClaire : colors
}
