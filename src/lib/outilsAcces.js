// Règles d'accès aux outils côté interface, au-dessus du catalogue.
// Module pur (sans Supabase) : testé dans tests/outilsAcces.test.js.
// Un compte qui n'est pas au nouveau modèle (modeleOutils faux) ne voit
// jamais rien de filtré : chaque fonction répond « autorisé ».

import { SOCLE, OUTILS, outilsVisibles, trouverOutil } from './catalogueOutils.js'

// Onglets de « Mon équipe > Statistiques » dans l'ordre de la page. La
// présence (et le taux de présence qu'elle contient) reste dans le socle ;
// Graphiques appartient à l'outil Stats collectives ; les autres onglets
// appartiennent à l'outil Suivi des joueurs.
export const ONGLETS_STATS = ['tableau', 'classement', 'graphiques', 'presence', 'mois', 'notes']
const ONGLETS_STATS_SOCLE = { presence: 'presences_joueurs' }
const ONGLETS_STATS_COLLECTIFS = ['graphiques']

// Lignes de la fonction base `outils_actifs(compte)` : { outil, source, fin_le }.
// Les lignes « club » sont les outils du club reçus par l'éducateur affilié ;
// les autres sont ses propres droits (fin_le vide = abonnement en cours).
export function compteDepuisLignes(role, modeleOutils, lignes = []) {
  const droits = []
  const clubOutils = []
  for (const l of lignes) {
    if (l.source === 'club') { clubOutils.push(l.outil); continue }
    droits.push(l.fin_le
      ? { outil: l.outil, statut: 'retire', periodeFin: l.fin_le }
      : { outil: l.outil, statut: 'actif' })
  }
  return { role, modeleOutils: !!modeleOutils, droits, clubOutils }
}

// L'outil qui débloque cette entrée de menu (null si elle est dans le socle
// ou inconnue du catalogue).
export function outilPourMenu(role, cle) {
  if (SOCLE[role]?.menus.includes(cle)) return null
  return OUTILS.find(o => o.role === role && o.menus.includes(cle)) || null
}

export function outilActif(compte, outilId, maintenant = new Date()) {
  const visibles = outilsVisibles(compte, maintenant)
  return visibles === null ? true : visibles.includes(outilId)
}

// Une page est verrouillée quand elle appartient à un outil que le compte n'a
// pas. Les clés inconnues du catalogue (annonces, messagerie...) ne sont
// jamais verrouillées. « stats » reste ouverte : la présence y est gratuite.
export function sectionVerrouillee(compte, cle, maintenant = new Date()) {
  if (!compte?.modeleOutils) return false
  const o = outilPourMenu(compte.role, cle)
  if (!o) return false
  if (outilActif(compte, o.id, maintenant)) return false
  if (compte.role === 'educateur' && cle === 'stats') return ongletsStatsPermis(compte, maintenant).length === 0
  return true
}

// Onglets de Statistiques que le compte peut ouvrir.
export function ongletsStatsPermis(compte, maintenant = new Date()) {
  if (!compte?.modeleOutils) return ONGLETS_STATS
  const suivi = outilActif(compte, 'suivi_joueurs', maintenant)
  const collectif = outilActif(compte, 'stats_collectives', maintenant)
  const gratuites = SOCLE.educateur.fonctions
  return ONGLETS_STATS.filter(o => {
    if (ONGLETS_STATS_SOCLE[o]) return gratuites.includes(ONGLETS_STATS_SOCLE[o])
    return ONGLETS_STATS_COLLECTIFS.includes(o) ? collectif : suivi
  })
}

// Entrée de menu à afficher ? Même règle que la page, avec en plus le retrait
// d'Explorer et de Recrutement pour les comptes du nouveau modèle.
export function menuVisible(compte, cle, maintenant = new Date()) {
  if (!compte?.modeleOutils) return true
  if (compte.role === 'educateur' && (cle === 'explorer' || cle === 'recrutement')) return false
  return !sectionVerrouillee(compte, cle, maintenant)
}

// Nom de l'outil et de sa promesse pour la carte « outil non activé ».
export function infosOutilPourMenu(role, cle) {
  const o = outilPourMenu(role, cle)
  return o ? { id: o.id, nom: o.nom, promesse: o.promesse, viaClub: o.viaClub, achetable: o.achetable } : null
}

// Même chose à partir de l'id de l'outil (pour un bouton d'une page ouverte,
// qui annonce « cet outil est payant » sans changer de page).
export function infosOutil(role, id) {
  const o = trouverOutil(role, id)
  return o ? { id: o.id, nom: o.nom, promesse: o.promesse, viaClub: o.viaClub, achetable: o.achetable } : null
}

export { trouverOutil }
