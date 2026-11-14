// Calculs purs de la grille de convocation d'une catégorie en effectif commun
// (bloc 4 du chantier catégories).
import { labelCategorie } from './categories.js'

export const TAILLE_PAGE_GRILLE = 10

const sansAccent = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Colonnes de la grille : un match par colonne, « U15 A », avec le droit
// d'envoyer. Le club envoie pour toutes les équipes, un éducateur pour les
// matchs dont il est l'éducateur (la base refuse tout autre envoi).
export function colonnesGrille(matchs, { userId, estClub }) {
  return (matchs || []).map(m => ({
    ...m,
    libelle: `${labelCategorie(m.equipe_nom)} ${m.equipe_lettre || ''}`.trim(),
    peutEnvoyer: !!estClub || (!!userId && m.educateur_id === userId),
  }))
}

// Cases cochées au départ : les joueurs déjà convoqués de chaque match.
// Résultat : { [matchId]: Set(compte) }, une entrée pour chaque colonne.
export function cochesInitiales(colonnes, convoques) {
  const coches = {}
  for (const c of colonnes || []) coches[c.match_id] = new Set()
  for (const r of convoques || []) coches[r.match_id]?.add(r.joueur_id)
  return coches
}

// La colonne a-t-elle été modifiée depuis son dernier état publié ?
export function colonneModifiee(actuel, initial) {
  const a = actuel || new Set()
  const i = initial || new Set()
  if (a.size !== i.size) return true
  for (const id of a) if (!i.has(id)) return true
  return false
}

// Recherche par prénom ou nom, sans tenir compte des accents ni des majuscules.
export function filtrerJoueurs(joueurs, recherche) {
  const q = sansAccent(recherche).trim()
  if (!q) return joueurs || []
  return (joueurs || []).filter(j => sansAccent(`${j.prenom || ''} ${j.nom || ''}`).includes(q) || sansAccent(`${j.nom || ''} ${j.prenom || ''}`).includes(q))
}

// Page demandée (1, 2, …), ramenée dans les bornes. « 1–10 sur 23 » = debut 1, fin 10, total 23.
export function paginer(liste, page, taille = TAILLE_PAGE_GRILLE) {
  const total = (liste || []).length
  const pages = Math.max(1, Math.ceil(total / taille))
  const p = Math.min(Math.max(1, page || 1), pages)
  const debut = total === 0 ? 0 : (p - 1) * taille + 1
  const fin = Math.min(total, p * taille)
  return { items: (liste || []).slice(debut === 0 ? 0 : debut - 1, fin), page: p, pages, debut, fin, total }
}

// Joueurs que l'on peut convoquer : ceux qui ont un compte. Une fiche sans
// compte reste affichée mais grisée (aucune notification possible).
export const peutEtreConvoque = (joueur) => !!joueur?.joueur_id

// « 14:00 » / « 14h » / null → affichage court de l'heure.
export const heureCourte = (heure) => (heure ? String(heure).slice(0, 5) : '')

// ── Bloc 5 : conflits et réponses au sondage ───────────────────────────────

// Autres colonnes où ce joueur (compte) est déjà coché, pour l'étiquette
// « Déjà convoqué en U15 A à 14:00 ». Rien si le joueur n'a pas de compte.
export function conflitsJoueur(compte, matchIdCourant, colonnes, coches) {
  if (!compte) return []
  return (colonnes || []).filter(c => c.match_id !== matchIdCourant && coches?.[c.match_id]?.has(compte))
}

export function texteConflit(colonnesEnConflit) {
  if (!colonnesEnConflit || colonnesEnConflit.length === 0) return ''
  const noms = colonnesEnConflit.map(c => [c.libelle, heureCourte(c.heure) && `à ${heureCourte(c.heure)}`].filter(Boolean).join(' '))
  return `Déjà convoqué en ${noms.join(' et ')}`
}

// Sondage par match : { [matchId]: { [compte]: statut } } à partir des lignes
// de `disponibilites` (match_id, joueur_id, statut).
export function indexerSondage(lignes) {
  const index = {}
  for (const l of lignes || []) {
    if (!l.match_id || !l.joueur_id) continue
    if (!index[l.match_id]) index[l.match_id] = {}
    index[l.match_id][l.joueur_id] = l.statut
  }
  return index
}

// Réponse « à la date » (bloc 6, catégorie en commun) : elle vaut pour tous les
// matchs du jour, sauf pour un match où le joueur a répondu lui-même (la réponse
// la plus précise l'emporte). reponsesDate : lignes de `disponibilites_categorie`.
export function fusionnerSondageDate(sondage, colonnes, reponsesDate) {
  const fusion = {}
  for (const c of colonnes || []) fusion[c.match_id] = { ...(sondage?.[c.match_id] || {}) }
  for (const r of reponsesDate || []) {
    if (!r.joueur_id || !r.statut) continue
    for (const c of colonnes || []) {
      if (!fusion[c.match_id][r.joueur_id]) fusion[c.match_id][r.joueur_id] = r.statut
    }
  }
  return fusion
}

const STATUTS_ABSENCE = { absent: 'Absent', blesse: 'Blessé', malade: 'Malade' }

// Pastille à côté du nom : « Absent », « Blessé », « Malade », « Pas répondu »
// ou rien quand le joueur est présent. `ton` : 'alerte' | 'neutre' | null.
// Le sondage se lit sur les matchs de la date : absent d'un match = absent.
export function statutSondage(compte, colonnes, sondage) {
  if (!compte || !colonnes || colonnes.length === 0) return { texte: '', ton: null }
  const reponses = colonnes.map(c => sondage?.[c.match_id]?.[compte]).filter(Boolean)
  if (reponses.length === 0) return { texte: 'Pas répondu', ton: 'neutre' }
  const absence = reponses.find(s => STATUTS_ABSENCE[s])
  if (absence && reponses.every(s => STATUTS_ABSENCE[s])) return { texte: STATUTS_ABSENCE[absence], ton: 'alerte' }
  return { texte: '', ton: null }
}

// Dans une colonne précise : le joueur a-t-il dit absent à ce match ?
export const absentDuMatch = (compte, matchId, sondage) => !!STATUTS_ABSENCE[sondage?.[matchId]?.[compte]]
