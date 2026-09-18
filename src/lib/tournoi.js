export const PHASE_LABEL = { huitieme: 'Huitièmes de finale', quart: 'Quarts de finale', demi: 'Demi-finales', troisieme: 'Petite finale', finale: 'Finale', finale_poule: 'Poule finale' }
export const PHASE_ORDRE = ['huitieme', 'quart', 'demi', 'troisieme', 'finale_poule', 'finale']

// Départage d'un classement — points, puis différence de buts, buts marqués,
// fair-play (cartons, pénalité la plus faible d'abord) et enfin buts
// encaissés (le moins en ayant encaissé d'abord). Exporté pour être aussi
// utilisé par meilleursTroisiemes ci-dessous, qui compare des équipes de
// poules différentes sur les mêmes critères.
export function compareClassement(a, b) {
  return b.pts - a.pts || b.diff - a.diff || b.bp - a.bp || a.fairplay - b.fairplay || a.bc - b.bc
}

// Classement d'une poule de tournoi — partagé entre la gestion club
// (TournoiOrganise.jsx) et la page publique en lecture seule (TournoiPublic.jsx),
// pour ne pas dupliquer la formule de points/tri à deux endroits.
export function calculerClassement(equipes, matchs, poule) {
  const stats = {}
  equipes.filter(e => e.poule === poule).forEach(e => {
    stats[e.id] = { equipe: e, pts: 0, j: 0, v: 0, n: 0, d: 0, bp: 0, bc: 0, diff: 0, cj: 0, cr: 0, fairplay: 0 }
  })
  matchs.filter(mt => mt.poule === poule && mt.statut === 'termine' && mt.score_a !== null).forEach(mt => {
    if (!stats[mt.equipe_a_id] || !stats[mt.equipe_b_id]) return
    const a = stats[mt.equipe_a_id], b = stats[mt.equipe_b_id]
    a.j++; b.j++; a.bp += mt.score_a; a.bc += mt.score_b; b.bp += mt.score_b; b.bc += mt.score_a
    a.cj += mt.cartons_jaunes_a || 0; a.cr += mt.cartons_rouges_a || 0
    b.cj += mt.cartons_jaunes_b || 0; b.cr += mt.cartons_rouges_b || 0
    if (mt.score_a > mt.score_b) { a.pts += 3; a.v++; b.d++ }
    else if (mt.score_a < mt.score_b) { b.pts += 3; b.v++; a.d++ }
    else { a.pts++; b.pts++; a.n++; b.n++ }
  })
  Object.values(stats).forEach(s => { s.diff = s.bp - s.bc; s.fairplay = s.cj * 1 + s.cr * 3 })
  return Object.values(stats).sort(compareClassement)
}

// Les K meilleurs 3e de poule (toutes poules confondues) qui rejoignent la
// phase finale en plus des 2 premiers de chaque poule — cf. réglage
// qualifies_meilleurs_troisiemes. Comparés entre eux avec le même départage
// que le classement intra-poule, alors qu'ils n'ont pas joué les mêmes
// adversaires (approximation usuelle de ce type de règlement).
export function meilleursTroisiemes(equipes, matchs, poules, k) {
  if (!k) return []
  const troisiemes = poules
    .map(p => calculerClassement(equipes, matchs, p)[2])
    .filter(Boolean)
  return troisiemes.sort(compareClassement).slice(0, k)
}

// Une inscription (formulaire public, tournois_inscriptions) n'est reliée
// par aucune clé réelle à une ligne tournois_equipes (le roster du tableau
// à élimination, géré séparément côté club) — approximation par nom
// utilisée partout où il faut retrouver l'équipe "réelle" d'une inscription
// (exclusion de son propre vote, attribution des badges de victoire/fair-play).
export function retrouverInscriptionParEquipe(inscriptions, equipe) {
  if (!equipe) return null
  const normalise = (s) => (s || '').trim().toLowerCase()
  return inscriptions.find(i =>
    normalise(i.nom_club) === normalise(equipe.nom) || normalise(i.nom_club) === normalise(equipe.club)
  ) || null
}
