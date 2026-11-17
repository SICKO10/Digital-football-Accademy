// `st` des écrans Finance (sponsors, déplacements) : mêmes clés que leurs anciens objets
// `stSombre` / `stClaire` en couleurs codées en dur, mais calculées à partir du thème
// (clair, sombre, couleur du club) et du kit d'identité (src/lib/identite.js).
// Les écrans gardent donc leurs `st.card`, `st.input`, `st.btnSolid(...)`, et prennent
// la nouvelle identité sans être réécrits ligne par ligne.
import { useColors } from './theme'
import { styleCarte, styleEtiquette, styleChamp, styleTableau, styleBoutonPrincipal, styleBoutonSecondaire, texteSur, couleurCraie } from './identite'
import { police, forme } from '../tokens'

// Texte lisible sur un fond donné ; retombe sur la couleur de texte du bouton principal
// si le fond n'est pas une couleur hexadécimale.
const texteSurSur = (fond, defaut) => {
  try { return /^#[0-9a-f]{6}$/i.test(fond) ? texteSur(fond) : defaut } catch { return defaut }
}

export function useSt() {
  return construireSt(useColors())
}

// Version sans hook : pour un écran qui a des retours anticipés avant son rendu
// (DashboardEducateur) et ne peut donc pas appeler useSt() à cet endroit.
export function construireSt(colors) {
  const tb = styleTableau(colors)
  const principal = styleBoutonPrincipal(colors)
  const secondaire = styleBoutonSecondaire(colors)
  const champ = styleChamp(colors)
  return {
    card: { ...styleCarte(colors), padding: '20px' },
    tabs: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
    tab: (active, color) => {
      const fond = color || colors.accent.brand
      return active
        ? { ...principal, minHeight: '38px', padding: '0 14px', background: fond, color: texteSurSur(fond, colors.accent.onBrand), fontWeight: 700 }
        : { ...secondaire, minHeight: '38px', padding: '0 14px' }
    },
    th: { ...tb.entete, fontSize: '11px' },
    td: { padding: '10px', fontSize: '14px', color: colors.text.primary, borderBottom: `1px solid ${couleurCraie(colors)}`, fontVariantNumeric: 'tabular-nums' },
    btnSolid: (color) => {
      const fond = color || colors.accent.brand
      return { ...principal, minHeight: '38px', padding: '0 16px', background: fond, color: texteSurSur(fond, colors.accent.onBrand) }
    },
    btnSecondary: { ...secondaire, minHeight: '38px', padding: '0 14px', color: colors.text.primary },
    btn: (color) => ({ ...secondaire, minHeight: '34px', padding: '0 12px', fontSize: '13px', ...(color ? { borderColor: color } : {}) }),
    input: { ...champ, minHeight: '38px', padding: '7px 10px' },
    label: { ...styleEtiquette(colors), display: 'block', marginBottom: '6px' },
    modalBg: colors.background.surface,
    modalBorder: colors.border.default,
    bg: colors.background.base,
    bgRaised: colors.background.raised,
    border: colors.border.default,
    borderStrong: colors.border.strong,
    text: colors.text.primary,
    textDim: colors.text.secondary,
    textFaint: colors.text.secondary,
    textGhost: colors.text.dim,
    surAccent: (fond) => texteSurSur(fond, colors.accent.onBrand),
    police,
    rayon: forme.rayonCarte,
  }
}

// Palette « à plat » (bg, card, card2, border, text, muted, green, red, yellow, blue)
// pour les anciens écrans qui écrivaient `style={{ background: st.card, color: st.muted }}`
// avec deux objets en dur (stSombre / stClaire). Mêmes noms de clés, mais calculés
// à partir du thème. Règles du kit : `green`, `red`, `yellow` sont les couleurs de statut
// (fonds, liserés, marqueurs), jamais la couleur du club ; `brand` est la couleur du club
// (fonds de bouton, jauges), avec `surBrand` pour le texte posé dessus.
export function construirePalette(colors) {
  const brand = colors.accent.brand
  return {
    bg: colors.background.base,
    card: colors.background.surface,
    card2: colors.background.raised,
    border: colors.border.default,
    craie: couleurCraie(colors),
    text: colors.text.primary,
    muted: colors.text.secondary,
    green: colors.accent.success,
    red: colors.accent.red,
    yellow: colors.accent.amber,
    blue: colors.accent.info,
    brand,
    surBrand: texteSurSur(brand, colors.accent.onBrand),
    police,
  }
}

export function useStPalette() {
  return construirePalette(useColors())
}
