// Palette du dashboard coach — seule zone de l'app avec un thème clair/sombre
// bleu (le reste de Digital Football reste vert et 100% sombre, cf.
// src/tokens.js). Valeurs reprises telles quelles de la maquette validée.
export const THEMES = {
  dark: {
    bg: '#0A0D14',
    surface: '#131722',
    surface2: '#1A2035',
    surface3: '#212840',
    accent: '#3D7FFF',
    accentGlow: 'rgba(61,127,255,0.13)',
    success: '#00C896',
    danger: '#FF4757',
    warn: '#FFB800',
    text: '#E8EAF0',
    textMuted: '#6B7491',
    border: '#252B42',
  },
  light: {
    bg: '#F0F2F8',
    surface: '#FFFFFF',
    surface2: '#E8EBF5',
    surface3: '#DDE0EE',
    accent: '#2563EB',
    accentGlow: 'rgba(37,99,235,0.12)',
    success: '#059669',
    danger: '#DC2626',
    warn: '#D97706',
    text: '#0F1117',
    textMuted: '#5A6080',
    border: '#D1D5E8',
  },
}

// La sidebar est TOUJOURS sombre, quel que soit le thème actif (cf. maquette).
export const SIDEBAR = {
  bg: '#080B12',
  text: '#6B7491',
  hover: 'rgba(255,255,255,0.05)',
  active: 'rgba(61,127,255,0.14)',
  accent: '#3D7FFF',
}

export const FONTS = {
  display: "'Rajdhani', sans-serif",
  body: "'Inter', system-ui, sans-serif",
  mono: "'JetBrains Mono', monospace",
}

// Convertit un hex ('#3D7FFF') en rgba() avec l'opacité donnée (0-1) — les
// teintes de la maquette (fonds de pill, glow) sont exprimées en rgba, pas
// en suffixe hex comme dans src/tokens.js.
export function rgba(hex, alpha) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
