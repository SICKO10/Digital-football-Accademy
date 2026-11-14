import { estStatutPresent, seanceComptable } from './presence.js'

// Calculs purs de la fiche joueur par équipe (bloc 9 du chantier catégories).
// Une saison d'un joueur se lit équipe par équipe : l'équipe est celle de
// l'événement (match ou entraînement), jamais celle de la fiche.

const nombre = (v) => Number(v) || 0

// Une ligne de stats ou de présence par (fiche, événement) : un doublon
// (même fiche, même événement) n'est compté qu'une fois.
function unique(lignes, cle) {
  const vus = new Set()
  return (lignes || []).filter(l => {
    const k = cle(l)
    if (vus.has(k)) return false
    vus.add(k)
    return true
  })
}

export function equipeAffichee(e) {
  return `${e?.nom || ''} ${e?.equipe || ''}`.trim() || 'Équipe'
}

// Entraînements : présences par équipe + total. Seules les séances passées et
// pointées comptent ; « présent » et « convoqué » comptent comme présence.
export function presencesParEquipe(presences, entrainements, aujourdHui) {
  const parId = new Map((entrainements || []).map(e => [e.id, e]))
  const lignes = unique(presences, p => `${p.joueur_id}:${p.entrainement_id}`)
  const parEquipe = new Map()
  for (const p of lignes) {
    const e = parId.get(p.entrainement_id)
    if (!e || !seanceComptable(e.date, aujourdHui)) continue
    const statut = p.statut ?? (p.present === true ? 'present' : p.present === false ? 'absent' : null)
    if (!statut) continue
    const l = parEquipe.get(e.club_categorie_id) || { equipe_id: e.club_categorie_id, seances: 0, presents: 0 }
    l.seances += 1
    if (estStatutPresent(statut)) l.presents += 1
    parEquipe.set(e.club_categorie_id, l)
  }
  const lignesEquipes = [...parEquipe.values()]
  const total = lignesEquipes.reduce((t, l) => ({ seances: t.seances + l.seances, presents: t.presents + l.presents }), { seances: 0, presents: 0 })
  return { equipes: lignesEquipes, total }
}

// Matchs : matchs joués, minutes, buts, passes par équipe du match + total.
export function matchsParEquipe(stats, matchs) {
  const parId = new Map((matchs || []).map(m => [m.id, m]))
  const lignes = unique(stats, s => `${s.joueur_id}:${s.match_id}`)
  const parEquipe = new Map()
  for (const s of lignes) {
    const m = parId.get(s.match_id)
    if (!m || nombre(s.minutes) <= 0) continue
    const l = parEquipe.get(m.club_categorie_id) || { equipe_id: m.club_categorie_id, matchs: 0, minutes: 0, buts: 0, passes: 0 }
    l.matchs += 1
    l.minutes += nombre(s.minutes)
    l.buts += nombre(s.buts)
    l.passes += nombre(s.passes_dec)
    parEquipe.set(m.club_categorie_id, l)
  }
  const lignesEquipes = [...parEquipe.values()]
  const total = lignesEquipes.reduce((t, l) => ({
    matchs: t.matchs + l.matchs, minutes: t.minutes + l.minutes, buts: t.buts + l.buts, passes: t.passes + l.passes,
  }), { matchs: 0, minutes: 0, buts: 0, passes: 0 })
  return { equipes: lignesEquipes, total }
}

// Dernières activités : matchs joués et entraînements pointés, les plus
// récents d'abord, chacun avec son équipe.
export function dernieresActivites(stats, matchs, presences, entrainements, aujourdHui, limite = 8) {
  const matchParId = new Map((matchs || []).map(m => [m.id, m]))
  const entParId = new Map((entrainements || []).map(e => [e.id, e]))
  const liste = []
  for (const s of unique(stats, s => `${s.joueur_id}:${s.match_id}`)) {
    const m = matchParId.get(s.match_id)
    if (m && nombre(s.minutes) > 0) liste.push({ type: 'match', date: m.date, equipe_id: m.club_categorie_id, adversaire: m.adversaire || '', buts: nombre(s.buts), minutes: nombre(s.minutes) })
  }
  for (const p of unique(presences, p => `${p.joueur_id}:${p.entrainement_id}`)) {
    const e = entParId.get(p.entrainement_id)
    const statut = p.statut ?? (p.present === true ? 'present' : p.present === false ? 'absent' : null)
    if (e && statut && seanceComptable(e.date, aujourdHui)) liste.push({ type: 'entrainement', date: e.date, equipe_id: e.club_categorie_id, present: estStatutPresent(statut) })
  }
  return liste.sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, limite)
}

// Pastille : l'équipe principale de la fiche en par équipe, la catégorie en commun.
export function pastilleEquipe(categorie, equipePrincipale) {
  if (categorie?.mode === 'commun') return categorie.nom || 'Catégorie'
  return equipePrincipale ? equipeAffichee(equipePrincipale) : (categorie?.nom || 'Équipe')
}
