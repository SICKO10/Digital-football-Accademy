export const PHASE_LABEL = { quart: 'Quarts de finale', demi: 'Demi-finales', troisieme: 'Petite finale', finale: 'Finale' }
export const PHASE_ORDRE = ['quart', 'demi', 'troisieme', 'finale']

// Classement d'une poule de tournoi — partagé entre la gestion club
// (TournoiOrganise.jsx) et la page publique en lecture seule (TournoiPublic.jsx),
// pour ne pas dupliquer la formule de points/tri à deux endroits.
export function calculerClassement(equipes, matchs, poule) {
  const stats = {}
  equipes.filter(e => e.poule === poule).forEach(e => {
    stats[e.id] = { equipe: e, pts: 0, j: 0, v: 0, n: 0, d: 0, bp: 0, bc: 0, diff: 0 }
  })
  matchs.filter(mt => mt.poule === poule && mt.statut === 'termine' && mt.score_a !== null).forEach(mt => {
    if (!stats[mt.equipe_a_id] || !stats[mt.equipe_b_id]) return
    const a = stats[mt.equipe_a_id], b = stats[mt.equipe_b_id]
    a.j++; b.j++; a.bp += mt.score_a; a.bc += mt.score_b; b.bp += mt.score_b; b.bc += mt.score_a
    if (mt.score_a > mt.score_b) { a.pts += 3; a.v++; b.d++ }
    else if (mt.score_a < mt.score_b) { b.pts += 3; b.v++; a.d++ }
    else { a.pts++; b.pts++; a.n++; b.n++ }
  })
  Object.values(stats).forEach(s => { s.diff = s.bp - s.bc })
  return Object.values(stats).sort((a, b) => b.pts - a.pts || b.diff - a.diff || b.bp - a.bp)
}
