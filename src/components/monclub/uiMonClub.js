// Briques visuelles partagées par les étapes de « Mon club » : tracés d'icônes,
// choix du texte lisible sur une couleur de club, styles communs. Aucun réglage ici.

export const ICONES = {
  identite: 'M12 3a9 9 0 100 18 2 2 0 002-2c0-.6-.3-1-.6-1.4a2 2 0 011.5-3.3H17a4 4 0 004-4c0-4-4-7.3-9-7.3zM7.5 11h.01M9.5 7.5h.01M14.5 7.5h.01',
  outils: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  educateurs: 'M16 20v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM21 20v-1a4 4 0 00-3-3.9M16 4.1a3.5 3.5 0 010 6.8',
  bureau: 'M6 11h12v9H6zM8 11V8a4 4 0 018 0v3',
  journal: 'M12 7v5l3 2M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8M3 3v5h5',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 100-8 4 4 0 000 8z',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M9 9.5h.01',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  oeil: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
  oeilBarre: 'M3 3l18 18M10.6 6.1A9.8 9.8 0 0112 6c6 0 10 6 10 6a17 17 0 01-3.2 3.9M6.6 6.6A17 17 0 002 12s4 6 10 6a9.7 9.7 0 004.3-1M9.9 9.9a3 3 0 004.2 4.2',
  retablir: 'M4 12a8 8 0 108-8 8 8 0 00-5.7 2.4L4 8M4 4v4h4',
  eclair: 'M13 2L4 14h7l-1 8 9-12h-7z',
  menu: 'M4 6h16M4 12h16M4 18h16',
  info: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v5M12 8h.01',
  corbeille: 'M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3',
  actualiser: 'M20 12a8 8 0 11-2.3-5.7M20 4v5h-5',
}

// Texte lisible (noir ou blanc) sur une couleur choisie par le club : une couleur
// claire comme un jaune ne doit pas porter du texte blanc.
export function texteSur(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '')
  if (!m) return '#ffffff'
  const n = parseInt(m[1], 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? '#111111' : '#ffffff'
}

// Styles communs, calculés avec les couleurs du thème courant.
export function stylesMonClub(colors) {
  const marque = colors.accent.brand
  return {
    marque,
    surMarque: colors.accent.onBrand || '#000',
    carte: { background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 18, boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 10px 28px rgba(0,0,0,0.04)' },
    titreCarte: { margin: 0, fontSize: 17, fontWeight: 800, letterSpacing: '-0.2px', color: colors.text.primary },
    sousTitre: { margin: '4px 0 0', fontSize: 13, color: colors.text.faint, lineHeight: 1.5 },
    etiquette: { margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: colors.text.faint },
    champ: { background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: 10, padding: '10px 12px', color: colors.text.primary, fontSize: 14, fontFamily: 'Inter, sans-serif', boxSizing: 'border-box', width: '100%', minWidth: 0, outline: 'none' },
    bouton: (principal, desactive = false) => ({
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '9px 18px', minHeight: 40, borderRadius: 10, fontSize: 13, fontWeight: 700,
      cursor: desactive ? 'default' : 'pointer', fontFamily: 'Inter, sans-serif', opacity: desactive ? 0.5 : 1,
      border: principal ? 'none' : `1px solid ${colors.border.strong}`,
      background: principal ? marque : colors.background.surface, color: principal ? (colors.accent.onBrand || '#000') : colors.text.secondary,
    }),
    pastille: (actif) => ({
      display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0, whiteSpace: 'nowrap', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700,
      padding: '8px 16px', minHeight: 38, borderRadius: 999,
      border: `1px solid ${actif ? marque : colors.border.default}`, background: actif ? marque : 'transparent', color: actif ? (colors.accent.onBrand || '#000') : colors.text.secondary,
    }),
  }
}

export const CSS_MON_CLUB = `
  .mc-btn:focus-visible, .mc-in:focus-visible, .mc-carte:focus-visible { outline: 2px solid var(--mc-marque); outline-offset: 2px; }
  .mc-carte { transition: transform .15s, border-color .15s, opacity .15s; }
  .mc-carte:hover { transform: translateY(-2px); }
  .mc-ligne { transition: background .12s; }
  .mc-ligne:hover { background: var(--mc-survol); }
`
