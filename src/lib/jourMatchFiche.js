// Case « JOUR » de la Fiche club : J+1 à J+3 (jours après le match) et J-3 à J-1 (jours avant).
// Calculée d'après le match de l'équipe le plus proche de la date de séance. Rien si aucun
// match à moins de 3 jours (le jour du match lui-même n'a pas de case sur le modèle papier).

export const JOURS_MATCH = ['J+1', 'J+2', 'J+3', 'J-3', 'J-2', 'J-1']

const MS_JOUR = 86400000

function enJours(dateIso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateIso || '')
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) / MS_JOUR : null
}

export function jourMatchAuto(dateSeance, matchs) {
  const s = enJours(dateSeance)
  if (s === null) return ''
  let meilleur = null
  for (const m of matchs || []) {
    const d = enJours(m?.date)
    if (d === null) continue
    const ecart = d - s // > 0 : le match est devant nous, < 0 : il est passé
    const abs = Math.abs(ecart)
    // À égalité, le match à venir l'emporte (la séance prépare le prochain match).
    if (!meilleur || abs < Math.abs(meilleur) || (abs === Math.abs(meilleur) && ecart > 0)) meilleur = ecart
  }
  if (meilleur === null || meilleur === 0 || Math.abs(meilleur) > 3) return ''
  return meilleur > 0 ? `J-${meilleur}` : `J+${-meilleur}`
}
