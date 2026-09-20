export const PHASE_LABEL = { huitieme: 'Huitièmes de finale', quart: 'Quarts de finale', demi: 'Demi-finales', troisieme: 'Petite finale', finale: 'Finale', finale_poule: 'Poule finale' }
export const PHASE_ORDRE = ['huitieme', 'quart', 'demi', 'troisieme', 'finale_poule', 'finale']

// Départage d'un classement — points, puis différence de buts, buts marqués,
// fair-play (cartons, pénalité la plus faible d'abord) et enfin buts
// encaissés (le moins en ayant encaissé d'abord). Exporté pour être aussi
// utilisé par meilleursDuRang ci-dessous, qui compare des équipes de
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

// Les K meilleurs d'un rang donné (toutes poules confondues) qui rejoignent
// la phase finale en plus des `rang` premiers qualifiés d'office de chaque
// poule — cf. réglages qualifies_par_poule (le rang, 1 ou 2) et
// qualifies_meilleurs_troisiemes (le K, toujours pris au rang juste après :
// meilleurs 2e si qualifies_par_poule = 1, meilleurs 3e si = 2). Comparés
// entre eux avec le même départage que le classement intra-poule, alors
// qu'ils n'ont pas joué les mêmes adversaires (approximation usuelle de ce
// type de règlement).
export function meilleursDuRang(equipes, matchs, poules, rang, k) {
  if (!k) return []
  const candidats = poules
    .map(p => calculerClassement(equipes, matchs, p)[rang])
    .filter(Boolean)
  return candidats.sort(compareClassement).slice(0, k)
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

// Dépouillement des votes distinctions (tournois_votes) — partagé entre le
// palmarès club (TournoiOrganise.jsx, toujours visible) et le "dévoiler les
// résultats" de la page publique (TournoiPublic.jsx, masqué par défaut),
// pour ne pas dupliquer la logique de comptage à deux endroits.
export function calculerPalmares(votes, equipes) {
  const compterEquipe = (champ) => {
    const compte = {}
    votes.forEach(v => { if (v[champ]) compte[v[champ]] = (compte[v[champ]] || 0) + 1 })
    const top = Object.entries(compte).sort(([, a], [, b]) => b - a)[0]
    return top ? { equipe: equipes.find(e => e.id === top[0]), votes: top[1] } : null
  }
  const compterLibre = (champNom, champEquipe) => {
    const compte = {}
    votes.forEach(v => {
      if (!v[champNom]) return
      const cle = v[champNom]
      compte[cle] = { nom: cle, equipe: v[champEquipe], votes: (compte[cle]?.votes || 0) + 1 }
    })
    return Object.values(compte).sort((a, b) => b.votes - a.votes)[0] || null
  }

  const beauJeu = compterEquipe('vote_beau_jeu_equipe_id')
  const fairplayEquipe = compterEquipe('vote_fairplay_equipe_id')
  const supporters = compterEquipe('vote_supporters_fairplay_equipe_id')
  const topJoueur = compterLibre('vote_meilleur_joueur_nom', 'vote_meilleur_joueur_equipe')
  const topGardien = compterLibre('vote_meilleur_gardien_nom', 'vote_meilleur_gardien_equipe')

  return [
    { key: 'beau_jeu', label: 'Plus beau jeu', valeur: beauJeu?.equipe?.nom, detail: beauJeu ? `${beauJeu.votes} vote${beauJeu.votes > 1 ? 's' : ''}` : null },
    { key: 'fairplay_equipe', label: 'Équipe la plus fair-play', valeur: fairplayEquipe?.equipe?.nom, detail: fairplayEquipe ? `${fairplayEquipe.votes} vote${fairplayEquipe.votes > 1 ? 's' : ''}` : null },
    { key: 'supporters', label: 'Supporters les plus fair-play', valeur: supporters?.equipe?.nom, detail: supporters ? `${supporters.votes} vote${supporters.votes > 1 ? 's' : ''}` : null },
    { key: 'meilleur_joueur', label: 'Meilleur joueur', valeur: topJoueur?.nom, detail: topJoueur ? `${topJoueur.equipe} · ${topJoueur.votes} vote${topJoueur.votes > 1 ? 's' : ''}` : null },
    { key: 'meilleur_gardien', label: 'Meilleur gardien', valeur: topGardien?.nom, detail: topGardien ? `${topGardien.equipe} · ${topGardien.votes} vote${topGardien.votes > 1 ? 's' : ''}` : null },
  ]
}
