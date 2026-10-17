import { useColors } from '../lib/theme'

// Logo d'un club, ou à défaut un écusson aux initiales — cartes de résultats
// (Compétition > Résultats). Initiales : premières lettres des deux premiers
// mots, articles ignorés sauf en tête (« La Bocca » → LB, « Cagnes Le cros »
// → CC, « GAP FOOT 05 » → GF), deux premières lettres pour un mot seul
// (« SMUC » → SM).
const ARTICLES = new Set(['le', 'la', 'les', 'de', 'du', 'des', 'd', 'l', 'et'])

function initialesClub(nom) {
  const mots = (nom || '').split(/[\s\-'’.]+/).filter(m => /[a-zA-ZÀ-ÿ]/.test(m))
  const utiles = mots.filter((m, i) => i === 0 || !ARTICLES.has(m.toLowerCase()))
  if (!utiles.length) return '?'
  if (utiles.length === 1) return utiles[0].replace(/[^a-zA-ZÀ-ÿ]/g, '').slice(0, 2).toUpperCase()
  return (utiles[0][0] + utiles[1][0]).toUpperCase()
}

export default function EcussonClub({ nom, logo, taille = 44 }) {
  const colors = useColors()
  if (logo) {
    return <img src={logo} alt={nom || ''} style={{ width: taille, height: taille, objectFit: 'contain', flexShrink: 0 }} />
  }
  return (
    <svg width={taille} height={taille * 1.1} viewBox="0 0 40 44" style={{ flexShrink: 0 }} role="img" aria-label={nom || ''}>
      <path d="M20 2 L36 7 V20 C36 31 29 38.5 20 42 C11 38.5 4 31 4 20 V7 Z" fill={colors.background.raised} stroke={colors.border.strong} strokeWidth="1.5" />
      <text x="20" y="25.5" textAnchor="middle" fontSize="12" fontWeight="800" fontFamily="Inter, sans-serif" fill={colors.text.secondary}>{initialesClub(nom)}</text>
    </svg>
  )
}
