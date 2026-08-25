import { createContext, useContext } from 'react'
import { colors, colorsClaire } from '../tokens'

// Thème clair/sombre des 5 dashboards principaux (éducateur, club, joueur,
// parent, dirigeant) et des modules qui y sont imbriqués. Les pages
// publiques/auth ne sont pas concernées — elles gardent leur look sombre
// historique.
// Provider dans ThemeProvider.jsx (fichier séparé : react-refresh/only-
// export-components n'autorise pas de mélanger hooks et composants dans un
// même fichier, cf. le même découpage déjà en place pour useCoachTheme.js).
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

// Pour les modules qui ont leur propre petite palette locale (const st = {...})
// plutôt que le système de tokens centralisé — évite de tout migrer vers
// colors.* (renommage risqué de dizaines d'usages) : chaque fichier garde son
// `st` existant, juste rendu réactif au thème via ce helper.
// Usage : const useSt = makeUseSt(stSombre, stClaire) ; puis const st = useSt()
// dans chaque composant du fichier qui utilise st.*.
export const makeUseSt = (stSombre, stClaire) => () => {
  const { theme } = useContext(ThemeContext)
  return theme === 'claire' ? stClaire : stSombre
}
