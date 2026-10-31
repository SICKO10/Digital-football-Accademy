// Calculs de stats sur une saison déjà filtrée (fonctions pures, testées dans
// tests/statsSaison.test.js). Les données viennent des requêtes de
// HistoriqueCollectif : matchs_equipe + stats_match, entrainements +
// presences_entrainement, blessures.
import { statutPresenceEffectif, seanceComptable } from './presence.js'

const matchJoue = (m) => m.score_nous !== null && m.score_nous !== undefined && m.score_nous !== ''
  && m.score_eux !== null && m.score_eux !== undefined && m.score_eux !== ''

// Totaux d'un joueur sur une liste de matchs (même règle que
// statsGlobalesJoueur du dashboard éducateur : "joué" = minutes > 0).
export const statsJoueur = (joueurId, matchs) => {
  const lignes = (matchs || []).flatMap(m =>
    (m.stats_match || []).filter(s => s.joueur_id === joueurId).map(s => ({ ...s, _match: m })))
  const joues = lignes.filter(s => s.minutes > 0)
  return {
    matchs: joues.length,
    minutes: lignes.reduce((t, r) => t + (r.minutes || 0), 0),
    buts: lignes.reduce((t, r) => t + (r.buts || 0), 0),
    passes_dec: lignes.reduce((t, r) => t + (r.passes_dec || 0), 0),
    clean_sheets: lignes.filter(s => s.clean_sheet).length,
    cartons_j: lignes.filter(s => s.carton_jaune).length,
    cartons_r: lignes.filter(s => s.carton_rouge).length,
    victoires: joues.filter(s => matchJoue(s._match) && parseInt(s._match.score_nous) > parseInt(s._match.score_eux)).length,
  }
}

// Taux de présence d'un joueur : saisie du coach, sinon réponse au sondage
// (dispos[séanceId][profilJoueurId]), séances à venir exclues.
export const tauxPresenceJoueur = (joueur, entrainements, dispos = {}, aujourdHui) => {
  const statut = (e) => statutPresenceEffectif(
    (e.presences_entrainement || []).find(p => p.joueur_id === joueur.id),
    joueur.joueur_id ? dispos[e.id]?.[joueur.joueur_id] : null,
  )
  const saisies = (entrainements || []).filter(e => seanceComptable(e.date, aujourdHui) && statut(e) !== null)
  if (!saisies.length) return null
  const presents = saisies.filter(e => ['present', 'convoque'].includes(statut(e))).length
  return { taux: Math.round(presents / saisies.length * 100), total: saisies.length }
}

// Moyenne des notes de match d'un joueur (hors note d'équipe).
export const noteMoyenneJoueur = (joueurId, notations) => {
  const notes = (notations || []).filter(n => n.joueur_id === joueurId && !n.est_note_equipe)
  if (!notes.length) return null
  return { moyenne: Number((notes.reduce((t, n) => t + Number(n.note), 0) / notes.length).toFixed(1)), nb: notes.length }
}

export const noteEquipe = (notations) => {
  const notes = (notations || []).filter(n => n.est_note_equipe)
  if (!notes.length) return null
  return { moyenne: (notes.reduce((t, n) => t + Number(n.note), 0) / notes.length).toFixed(1), nb: notes.length }
}

// Une ligne par joueur de l'effectif, avec tous les chiffres de classement.
export const lignesJoueurs = ({ joueurs, matchs, entrainements, dispos, notations, aujourdHui }) =>
  (joueurs || []).map(j => ({
    ...j,
    s: statsJoueur(j.id, matchs),
    tx: tauxPresenceJoueur(j, entrainements, dispos, aujourdHui),
    note: noteMoyenneJoueur(j.id, notations),
  }))

// Filtre par type de compétition (valeurs du formulaire de match, comparées en minuscule).
export const FILTRES_COMPETITION = [
  { id: 'toutes', label: 'Toutes compétitions' },
  { id: 'championnat', label: 'Championnat' },
  { id: 'coupe', label: 'Coupe' },
  { id: 'amical', label: 'Amical' },
]

export const filtrerParCompetition = (matchs, filtre) =>
  !filtre || filtre === 'toutes'
    ? (matchs || [])
    : (matchs || []).filter(m => (m.competition || '').trim().toLowerCase() === filtre)

// Critères de classement : clé, valeur lue sur une ligne, unité.
export const CRITERES_CLASSEMENT = [
  { key: 'buts', label: 'Buteurs', get: l => l.s.buts, unite: 'buts' },
  { key: 'passes_dec', label: 'Passeurs', get: l => l.s.passes_dec, unite: 'passes' },
  { key: 'presence', label: 'Présence', get: l => l.tx?.taux ?? 0, unite: '%' },
  { key: 'victoires', label: 'Victoires', get: l => l.s.victoires, unite: 'victoires' },
  { key: 'minutes', label: 'Temps de jeu', get: l => l.s.minutes, unite: 'min' },
  { key: 'note', label: 'Note', get: l => l.note?.moyenne ?? 0, unite: '/10' },
]

// Joueurs triés sur un critère, ceux à zéro écartés (un classement de zéros n'apprend rien).
export const classement = (lignes, cle) => {
  const critere = CRITERES_CLASSEMENT.find(c => c.key === cle) || CRITERES_CLASSEMENT[0]
  return [...lignes]
    .map(l => ({ ligne: l, valeur: critere.get(l) }))
    .filter(x => x.valeur > 0)
    .sort((a, b) => b.valeur - a.valeur)
}

// Les minutes valent 0 quand elles n'ont pas été saisies : "non disponible"
// tant qu'aucun joueur n'a de minutes sur la saison.
export const minutesSaisies = (lignes) => (lignes || []).some(l => l.s.minutes > 0)

// Présence moyenne de l'équipe sur la saison (moyenne des taux individuels).
export const presenceMoyenneEquipe = (lignes) => {
  const taux = (lignes || []).map(l => l.tx?.taux).filter(t => typeof t === 'number')
  if (!taux.length) return null
  return Math.round(taux.reduce((t, x) => t + x, 0) / taux.length)
}

// Résumé santé : nombre de blessures, guéries, encore en cours, joueurs touchés.
export const resumeSante = (blessures) => {
  const liste = blessures || []
  return {
    total: liste.length,
    gueries: liste.filter(b => b.statut === 'gueri').length,
    enCours: liste.filter(b => b.statut !== 'gueri').length,
    joueursTouches: new Set(liste.map(b => b.equipe_joueur_id)).size,
  }
}

// Part de matchs gagnés par un joueur parmi ceux qu'il a joués (null si aucun).
export const pourcentageVictoires = (s) =>
  s && s.matchs > 0 ? Math.round(s.victoires / s.matchs * 100) : null

// La ligne clean sheets ne concerne que les gardiens : affichée dès qu'un clean
// sheet existe, ou si le poste (texte libre) contient « gardien ».
export const afficherCleanSheets = (ligne) =>
  (ligne?.s?.clean_sheets || 0) > 0 || /gardien/i.test(ligne?.poste || '')

// ---- Mes saisons (profil du coach) : une ligne de bilan par saison et par équipe ----

const NATURES_BUT = [
  ['cpa', 'CPA'], ['attaque_placee', 'Attaque placée'], ['attaque_rapide', 'Attaque rapide'],
  ['erreur_individuelle', 'Erreur individuelle'], ['exploit_personnel', 'Exploit personnel'],
]

const pct = (n, total) => (total > 0 ? Math.round(n / total * 100) : null)
const moy2 = (n, total) => (total > 0 ? Number((n / total).toFixed(2)) : null)

// Bilan d'une équipe sur une saison déjà filtrée. Entrées : matchs, séances (avec
// presences_entrainement), blessures, valeurs RPE (nombres). Les rangs de
// classement n'existent pas en base : seul le bilan par compétition est donné.
export const bilanSaisonEquipe = ({ matchs, entrainements, blessures, rpes, aujourdHui }) => {
  const joues = (matchs || []).filter(matchJoue).map(m => {
    const bp = parseInt(m.score_nous) || 0, bc = parseInt(m.score_eux) || 0
    return { ...m, bp, bc, res: bp > bc ? 'v' : bp < bc ? 'd' : 'n' }
  })
  const total = joues.length
  const v = joues.filter(m => m.res === 'v').length
  const n = joues.filter(m => m.res === 'n').length
  const d = joues.filter(m => m.res === 'd').length
  const butsMarques = joues.reduce((t, m) => t + m.bp, 0)
  const butsEncaisses = joues.reduce((t, m) => t + m.bc, 0)

  // Nature des buts marqués : part de chaque nature parmi les buts qui en ont une.
  const butsNous = joues.flatMap(m => (m.buts_detail || []).filter(b => b.nature && b.equipe === 'nous'))
  const natures = NATURES_BUT.map(([cle, label]) => ({ cle, label, pct: pct(butsNous.filter(b => b.nature === cle).length, butsNous.length) }))
    .filter(x => x.pct)

  const parCompetition = [...new Set(joues.map(m => m.competition).filter(Boolean))].map(nom => {
    const l = joues.filter(m => m.competition === nom)
    return { nom, matchs: l.length, v: l.filter(m => m.res === 'v').length, n: l.filter(m => m.res === 'n').length, d: l.filter(m => m.res === 'd').length }
  })

  // Présence : toutes les présences saisies par le coach sur les séances comptables.
  const presences = (entrainements || []).filter(e => seanceComptable(e.date, aujourdHui))
    .flatMap(e => e.presences_entrainement || [])
    .map(p => statutPresenceEffectif(p, null)).filter(Boolean)
  const presents = presences.filter(s => s === 'present' || s === 'convoque').length

  const rpeListe = (rpes || []).filter(x => typeof x === 'number' && !Number.isNaN(x))
  return {
    matchs: total,
    nbV: v, nbN: n, nbD: d, butsMarques, butsEncaisses, presents, nbPresences: presences.length,
    victoires: pct(v, total), nuls: pct(n, total), defaites: pct(d, total),
    butsMarquesParMatch: moy2(butsMarques, total),
    butsEncaissesParMatch: moy2(butsEncaisses, total),
    natures, parCompetition,
    sante: resumeSante(blessures),
    presence: pct(presents, presences.length),
    rpeMoyen: rpeListe.length ? Number((rpeListe.reduce((t, x) => t + x, 0) / rpeListe.length).toFixed(1)) : null,
  }
}

// Additionne des bilans (une équipe, une saison chacun) pour la vue d'ensemble
// d'une carrière : on cumule les effectifs bruts, jamais les pourcentages.
export const cumulerBilans = (bilans) => {
  const t = (bilans || []).reduce((a, b) => ({
    matchs: a.matchs + (b.matchs || 0), v: a.v + (b.nbV || 0), n: a.n + (b.nbN || 0), d: a.d + (b.nbD || 0),
    bm: a.bm + (b.butsMarques || 0), be: a.be + (b.butsEncaisses || 0),
    pr: a.pr + (b.presents || 0), np: a.np + (b.nbPresences || 0),
  }), { matchs: 0, v: 0, n: 0, d: 0, bm: 0, be: 0, pr: 0, np: 0 })
  return {
    matchs: t.matchs,
    victoires: pct(t.v, t.matchs), nuls: pct(t.n, t.matchs), defaites: pct(t.d, t.matchs),
    butsMarquesParMatch: moy2(t.bm, t.matchs), butsEncaissesParMatch: moy2(t.be, t.matchs),
    presence: pct(t.pr, t.np),
  }
}

// Même cumul à partir des lignes de coach_bilans_publics (colonnes en base).
export const bilanDepuisLigne = (l) => ({
  matchs: l.matchs, nbV: l.nb_v, nbN: l.nb_n, nbD: l.nb_d,
  butsMarques: l.buts_marques, butsEncaisses: l.buts_encaisses, presents: l.presents, nbPresences: l.nb_presences,
})

// Niveau de pratique d'une équipe (choisi par le coach, même liste que la contrainte en base).
export const NIVEAUX_PRATIQUE = ['District', 'Régional 3', 'Régional 2', 'Régional 1', 'National 3', 'National 2', 'National 1']
