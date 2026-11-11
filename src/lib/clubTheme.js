import { createContext, useContext, useEffect } from 'react'
import { memoriserCouleurClub } from './couleurChargement'
import { calculerPalette, contraste } from './paletteClub'
import { colors, colorsClaire } from '../tokens'

// Couleur du club appliquée aux dashboards. Le Provider est dans ThemeProvider.jsx
// (même découpage que theme.js : hooks ici, composants là-bas).
// `setCouleurClub(hex)` : à appeler quand un dashboard connaît la couleur du club
// (hex, ou null pour le vert par défaut). `palette` suit aussi le thème clair/sombre.
// `portee` : null hors des dashboards concernés ; sinon { accentVert } où
// `accentVert` vaut 'club' (dashboard joueur), 'statut' (dashboard club) ou
// 'educateur' : dans les trois, `accent.green` (le vert de décor) devient la couleur
// du club, et les statuts (présent, victoire, ok, validé) passent par `accent.success`,
// qui reste vert. Dans 'educateur', l'ancien bleu de marque devient aussi la couleur
// du club (le bleu d'information reste dans `info`). Posé par PorteeThemeClub.
export const ClubThemeContext = createContext({
  couleurClub: null,
  setCouleurClub: () => {},
  setCouleurClub2: () => {},
  palette: calculerPalette(null, 'claire'),
  portee: null,
})

export const useClubTheme = () => useContext(ClubThemeContext)

export const useClubPalette = () => useContext(ClubThemeContext).palette

// Donne au thème la couleur du club (hex, ou null = vert par défaut). À appeler
// dans un dashboard placé sous PorteeThemeClub ; remet le vert en quittant la page.
// `hex2` : couleur secondaire du club (accents de rappel), facultative.
export function useDonnerCouleurClub(hex, hex2) {
  const { portee, setCouleurClub, setCouleurClub2 } = useContext(ClubThemeContext)
  const actif = !!portee
  useEffect(() => {
    if (!actif) return undefined
    // undefined = profil pas encore chargé : on garde la couleur mémorisée.
    if (hex !== undefined) memoriserCouleurClub(hex)
    setCouleurClub(hex || null)
    return () => setCouleurClub(null)
  }, [actif, hex, setCouleurClub])
  useEffect(() => {
    if (!actif) return undefined
    setCouleurClub2(hex2 || null)
    return () => setCouleurClub2(null)
  }, [actif, hex2, setCouleurClub2])
}

// Couleurs du dashboard pour une palette de club. Les statuts (succès, attention,
// erreur) viennent toujours de la palette : constantes, jamais le club.
const cache = new WeakMap()
export function colorsAvecClub(theme, palette, accentVert) {
  const cle = `${theme}|${accentVert}`
  const memo = cache.get(palette) || {}
  if (memo[cle]) return memo[cle]
  // En clair, la couleur sert aussi de texte sur fond blanc : on prend sa version
  // lisible (primaryText), et le texte posé dessus est recalculé en conséquence.
  const marque = theme === 'claire' ? palette.primaryText : palette.primary
  // `brand` ne sert qu'aux fonds (boutons pleins) : sans couleur de club, en clair,
  // il garde le vert vif de la marque, avec du texte encre dessus.
  const fondMarque = theme === 'claire' && palette.source === 'defaut' ? palette.primary : marque
  const surMarque = contraste(fondMarque, '#FFFFFF') >= 4.5 ? '#FFFFFF' : '#16161A'
  const accent = {
    ...colors.accent,
    green: marque,
    // Dashboard éducateur : son ancien bleu de marque devient la couleur du club
    // (le bleu d'information reste dans `info`).
    blue: accentVert === 'educateur' ? marque : colors.accent.blue,
    brand: fondMarque,
    onBrand: surMarque,
    success: palette.success,
  }
  const neutres = theme === 'claire' ? {
    ...colorsClaire,
    background: { ...colorsClaire.background, base: palette.screenBg, sunken: '#EDEDF0', surface: palette.cardBg, surfaceAlt: '#FAFAFB', raised: '#F0F0F3' },
    border: { subtle: palette.cardBorder, default: '#D9D9DF', strong: '#B5B5BE', faint: '#EFEFF2' },
    text: { ...colorsClaire.text, primary: palette.text, secondary: '#3F3F48', muted: palette.textMuted, dim: '#55555F', faint: palette.textMuted },
  } : colors
  const resultat = { ...neutres, accent }
  memo[cle] = resultat
  cache.set(palette, memo)
  return resultat
}
