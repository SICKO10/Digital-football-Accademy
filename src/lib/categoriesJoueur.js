// Calculs purs de l'espace joueur pour une catégorie en effectif commun
// (bloc 6 du chantier catégories).
import { labelCategorie } from './categories.js'

// « U15 B » : nom de l'équipe d'un match ou d'un entraînement. Sans lettre
// (équipe sans éducateur ou ancien match), on ne montre rien plutôt que « U15 ».
export function libelleEquipe(nom, lettre) {
  if (!nom || !lettre) return ''
  return `${labelCategorie(nom)} ${lettre}`.trim()
}

// Agenda de la base (une ligne par séance ou match) regroupé par date :
// [{ date, categorie_id, categorie_nom, evenements: [...] }], dates croissantes,
// événements par heure. Une date par catégorie.
export function grouperAgendaParDate(lignes) {
  const groupes = new Map()
  for (const l of lignes || []) {
    const cle = `${l.categorie_id}|${l.date}`
    if (!groupes.has(cle)) groupes.set(cle, { date: l.date, categorie_id: l.categorie_id, categorie_nom: l.categorie_nom, evenements: [] })
    groupes.get(cle).evenements.push({
      ...l,
      equipe: libelleEquipe(l.equipe_nom, l.equipe_lettre),
    })
  }
  const liste = [...groupes.values()]
  for (const g of liste) g.evenements.sort((a, b) => String(a.heure || '').localeCompare(String(b.heure || '')))
  return liste.sort((a, b) => a.date.localeCompare(b.date) || String(a.categorie_nom).localeCompare(String(b.categorie_nom)))
}

// Réponses du joueur : { 'categorie|date': 'present' | 'absent' }.
export const cleReponse = (categorieId, date) => `${categorieId}|${date}`

export function indexerReponses(lignes) {
  const index = {}
  for (const r of lignes || []) index[cleReponse(r.categorie_id, r.date)] = r.statut
  return index
}

// Une convocation affiche son équipe : « U15 B » (jamais vide, jamais « null »).
export function equipeConvocation(match) {
  return libelleEquipe(match?.equipe_nom, match?.equipe_lettre)
}
