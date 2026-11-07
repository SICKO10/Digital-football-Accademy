// Moteur de palette « couleurs du club » : à partir d'une couleur hex (ou rien),
// calcule toutes les couleurs d'un dashboard en clair ou en sombre, avec un
// garde-fou de contraste (WCAG : 4,5:1 pour du texte, 3:1 pour de grands éléments).
// Fichier pur (aucun React) : testé par tests/paletteClub.test.js.

export const COULEUR_DEFAUT = '#4ADE80'

// Couleurs de statut : constantes, jamais dérivées de la couleur du club.
export const STATUTS_CLAIR = { success: '#16A34A', warning: '#F97316', danger: '#EF4444' }
export const STATUTS_SOMBRE = { success: '#4ADE80', warning: '#F97316', danger: '#EF4444' }

const NEUTRES_CLAIR = {
  screenBg: '#F5F5F7', cardBg: '#FFFFFF', cardBorder: '#E7E7EB', text: '#16161A', textMuted: '#7A7A85',
}
const NEUTRES_SOMBRE = {
  screenBg: '#121417', cardBg: '#1A1D21', cardBorder: '#2A2E34', text: '#F5F5F7', textMuted: '#9A9AA5',
}

const BLANC = '#FFFFFF'
const MENU_TEXTE_ATTENUE = 0.85 // part de blanc du texte « légèrement atténué » du menu
const ENCRE = '#16161A'

// ─── Couleurs : conversions et contraste ────────────────────────────────────

export function lireHex(valeur) {
  if (typeof valeur !== 'string') return null
  const m = valeur.trim().replace(/^#/, '')
  const complet = /^[0-9a-f]{3}$/i.test(m) ? m.split('').map(c => c + c).join('') : m
  if (!/^[0-9a-f]{6}$/i.test(complet)) return null
  return [0, 2, 4].map(i => parseInt(complet.slice(i, i + 2), 16))
}

const enHex = rgb => '#' + rgb.map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('').toUpperCase()

function rgbVersHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return [0, 0, l]
  const s = d / (1 - Math.abs(2 * l - 1))
  let h
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return [(h * 60 + 360) % 360, s, l]
}

function hslVersRgb([h, s, l]) {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255]
}

function luminance(rgb) {
  const [r, g, b] = rgb.map(v => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contraste(a, b) {
  const la = luminance(typeof a === 'string' ? lireHex(a) : a)
  const lb = luminance(typeof b === 'string' ? lireHex(b) : b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

// Mélange : part de `a` dans le résultat (0 = tout b, 1 = tout a).
const melanger = (a, b, part) => a.map((v, i) => v * part + b[i] * (1 - part))

// Fait varier la luminosité (HSL), teinte et saturation conservées, par pas de
// 1 %, jusqu'à ce que `ok(rgb)` soit vrai. Renvoie null si on atteint le bout.
function ajusterJusqua(rgb, sens, ok) {
  if (ok(rgb)) return rgb
  const [h, s, l0] = rgbVersHsl(rgb)
  for (let l = l0 + sens * 0.01; l >= 0 && l <= 1; l += sens * 0.01) {
    const essai = hslVersRgb([h, s, l]).map(Math.round)
    if (ok(essai)) return essai
  }
  return null
}

// Couleur de la marque trop pâle et trop grise pour porter une identité (blanc,
// gris très clair) : mieux vaut le vert par défaut qu'un menu gris.
function estTropPale(rgb) {
  const [, s, l] = rgbVersHsl(rgb)
  return l > 0.88 && s < 0.25
}

// ─── Palette ────────────────────────────────────────────────────────────────

/**
 * @param {string|null|undefined} hex couleur principale du club
 * @param {'claire'|'sombre'} mode
 * @returns palette complète (voir `variablesCss` pour les noms CSS)
 */
export function calculerPalette(hex, mode = 'claire') {
  const sombre = mode === 'sombre'
  const neutres = sombre ? NEUTRES_SOMBRE : NEUTRES_CLAIR
  const statuts = sombre ? STATUTS_SOMBRE : STATUTS_CLAIR
  const fond = lireHex(neutres.screenBg)
  const carte = lireHex(neutres.cardBg)
  const blanc = lireHex(BLANC)

  const demande = lireHex(hex)
  const parDefaut = lireHex(COULEUR_DEFAUT)
  let base = demande && !estTropPale(demande) ? demande : parDefaut
  let source = base === demande ? 'club' : 'defaut'
  let ajustee = false
  let raison = demande && source === 'defaut' ? 'trop-pale' : (!demande && hex ? 'invalide' : null)

  // Accent : le texte posé dessus doit rester lisible (blanc ou encre), et en
  // sombre l'accent doit se détacher de la carte (3:1).
  const accentOk = rgb => (contraste(rgb, blanc) >= 4.5 || contraste(rgb, ENCRE) >= 4.5)
    && (!sombre || contraste(rgb, carte) >= 3)
  const exempt = source === 'defaut' // le vert de marque est une valeur de référence
  let primary = base
  if (!exempt) {
    // En sombre une couleur trop foncée s'éclaircit ; en clair, une couleur dans la
    // zone grise où ni blanc ni encre ne passent s'assombrit.
    const plus = sombre ? 1 : -1
    const essai = ajusterJusqua(base, plus, accentOk) || ajusterJusqua(base, -plus, accentOk)
    if (!essai) {
      primary = parDefaut; source = 'defaut'; raison = 'illisible'
    } else {
      primary = essai
    }
    ajustee = source === 'club' && enHex(primary) !== enHex(base)
  }

  // Texte posé sur l'accent : blanc de préférence, encre sinon.
  const onPrimary = contraste(primary, blanc) >= 4.5 ? BLANC : ENCRE

  // Texte coloré à la couleur du club, lisible sur écran et cartes.
  const lisible = rgb => contraste(rgb, fond) >= 4.5 && contraste(rgb, carte) >= 4.5
  const primaryText = ajusterJusqua(primary, sombre ? 1 : -1, lisible) || parDefaut

  // Variante pour le survol : un cran plus sombre que l'accent. En clair, elle
  // sert aussi de texte coloré, donc elle doit passer 4,5:1 sur l'écran.
  const [h, s, l] = rgbVersHsl(primary)
  const cran = hslVersRgb([h, s, Math.max(0, l - 0.07)]).map(Math.round)
  const primaryDark = sombre ? cran : (ajusterJusqua(cran, -1, lisible) || cran)

  // Fond léger teinté (badges, survols doux).
  const primarySoft = melanger(primary, sombre ? carte : blanc, sombre ? 0.18 : 0.1)

  // Menu : plein couleur du club en clair (assombri juste ce qu'il faut pour que le
  // texte blanc, même atténué, passe 4,5:1) ; en sombre, la couleur du club presque noire.
  const texteMenuOk = rgb => contraste(melanger(blanc, rgb, MENU_TEXTE_ATTENUE), rgb) >= 4.5
  const menuClair = ajusterJusqua(primary, -1, texteMenuOk) || primaryDark
  const menuBg = sombre ? melanger(primary, [0, 0, 0], 0.1) : menuClair
  const menuTextMuted = melanger(blanc, menuBg, MENU_TEXTE_ATTENUE)

  return {
    mode,
    source,        // 'club' ou 'defaut'
    ajustee,       // true si la couleur du club a dû être éclaircie ou assombrie
    raison,        // null, 'trop-pale', 'invalide' ou 'illisible' quand on est revenu au vert
    couleurDemandee: demande ? enHex(demande) : null,
    primary: enHex(primary),
    onPrimary,
    primaryText: enHex(primaryText),
    primaryDark: enHex(primaryDark),
    primarySoft: enHex(primarySoft),
    menuBg: enHex(menuBg),
    menuText: BLANC,
    menuTextMuted: enHex(menuTextMuted),
    menuHover: 'rgba(255,255,255,0.12)',
    menuActiveBg: BLANC,
    menuActiveText: enHex(menuClair), // posé sur le bloc blanc de l'entrée active, donc toujours foncé
    ...neutres,
    ...statuts,
  }
}

// Variables CSS à poser dans le `style` de la racine d'un dashboard.
export function variablesCss(p) {
  return {
    '--club-primary': p.primary,
    '--club-primary-dark': p.primaryDark,
    '--club-primary-soft': p.primarySoft,
    '--club-on-primary': p.onPrimary,
    '--club-primary-text': p.primaryText,
    '--menu-bg': p.menuBg,
    '--menu-text': p.menuText,
    '--menu-text-muted': p.menuTextMuted,
    '--menu-hover': p.menuHover,
    '--menu-active-bg': p.menuActiveBg,
    '--menu-active-text': p.menuActiveText,
    '--screen-bg': p.screenBg,
    '--card-bg': p.cardBg,
    '--card-border': p.cardBorder,
    '--text': p.text,
    '--text-muted': p.textMuted,
    '--success': p.success,
    '--warning': p.warning,
    '--danger': p.danger,
  }
}

// Valeur du réglage `?couleurClub=` (mode développement uniquement) : accepte
// `%23FFF59D` comme `FFF59D`. Renvoie un hex avec # ou null.
export function lireSurchargeCouleur(recherche) {
  const brut = new URLSearchParams(recherche || '').get('couleurClub')
  const rgb = lireHex(brut)
  return rgb ? enHex(rgb) : null
}
