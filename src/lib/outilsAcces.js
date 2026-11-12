// Règles d'accès aux outils côté interface, au-dessus du catalogue.
// Module pur (sans Supabase) : testé dans tests/outilsAcces.test.js.
// Un compte qui n'est pas au nouveau modèle (modeleOutils faux) ne voit
// jamais rien de filtré : chaque fonction répond « autorisé ».

import { SOCLE, OUTILS, outilsVisibles, outilsDuRole, trouverOutil, joursRestantsEssai, droitActif, outilsOuvrables } from './catalogueOutils.js'

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
// `masques` : ids des outils que l'éducateur a retirés de son menu (outils du
// club seulement : un outil qu'il paie lui-même reste affiché).
// `masquesClub` : ids des outils que le club a retirés de son propre menu (Mon
// club, étape Outils du club) ; vaut pour tous les clubs, ancien modèle compris.
// `affichageClub` (éducateur affilié) : ce que son club affiche ou masque dans
// son menu, voir affichageDepuisLignes ; null = aucun réglage.
export function compteDepuisLignes(role, modeleOutils, lignes = [], masques = [], masquesClub = [], affichageClub = null) {
  const droits = []
  const clubOutils = []
  for (const l of lignes) {
    if (l.source === 'club') { clubOutils.push(l.outil); continue }
    if (l.source === 'essai') { droits.push({ outil: l.outil, statut: 'essai', essaiFin: l.fin_le }); continue }
    droits.push(l.fin_le
      ? { outil: l.outil, statut: 'retire', periodeFin: l.fin_le }
      : { outil: l.outil, statut: 'actif' })
  }
  return { role, modeleOutils: !!modeleOutils, droits, clubOutils, masques, masquesClub, affichageClub }
}

// Réglage « Dashboard de mes éducateurs » du club, vu par un éducateur, à
// partir de mon_club_reglages (mode) et mon_club_affichage (lignes lisibles
// par lui : cible 'educateurs' et ses lignes 'educateur'). Les ids sont ceux
// des outils éducateur du catalogue. { outil: visible } par cible ; en mode
// 'commun', les lignes individuelles sont mises de côté (ignorées, pas effacées).
export function affichageDepuisLignes(mode, lignes = [], educateurId = null) {
  const commun = {}
  const individuel = {}
  for (const l of lignes) {
    if (l.cible === 'educateurs') commun[l.outil] = !!l.visible
    else if (l.cible === 'educateur' && l.educateur_id === educateurId) individuel[l.outil] = !!l.visible
  }
  const individualise = mode === 'individualise'
  if (!Object.keys(commun).length && !(individualise && Object.keys(individuel).length)) return null
  return { mode: individualise ? 'individualise' : 'commun', commun, individuel: individualise ? individuel : {} }
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

// Vrai quand l'éducateur a masqué cet outil du club et ne le paie pas lui-même.
function menuMasque(compte, cle, maintenant) {
  if (compte.role !== 'educateur' || !compte.masques?.length) return false
  const o = outilPourMenu('educateur', cle)
  if (!o || !o.viaClub || !compte.masques.includes(o.id)) return false
  if (!compte.clubOutils?.includes(o.viaClub)) return false
  return !compte.droits.some(d => d.outil === o.id && droitActif(d, maintenant))
}

// Vrai quand le club a retiré de son menu l'outil qui porte cette entrée. Ne
// touche que l'affichage : la page et les données restent là.
function menuMasqueParLeClub(compte, cle) {
  if (compte?.role !== 'club' || !compte.masquesClub?.length) return false
  const o = outilPourMenu('club', cle)
  return !!o && compte.masquesClub.includes(o.id)
}

// Entrées éducateur que le club ne masque jamais : « stats » porte aussi la
// présence, gratuite (socle).
const JAMAIS_MASQUE_PAR_LE_CLUB = ['stats']

// Vrai quand le club a masqué cet outil dans le menu de l'éducateur affilié.
// Priorité : réglage individuel (mode individualisé), sinon réglage commun,
// sinon affiché. Un outil que l'éducateur paie lui-même (abonnement, essai ou
// période en cours) reste toujours affiché. Ne touche que le menu : la page
// reste ouverte. Vaut aussi pour l'ancien modèle, où l'éducateur n'a pas de
// droits propres : il suit simplement le club.
function menuMasqueParSonClub(compte, cle, maintenant) {
  if (compte?.role !== 'educateur' || !compte.affichageClub) return false
  if (JAMAIS_MASQUE_PAR_LE_CLUB.includes(cle)) return false
  const o = outilPourMenu('educateur', cle)
  if (!o) return false
  if (compte.droits?.some(d => d.outil === o.id && droitActif(d, maintenant))) return false
  const { commun, individuel } = compte.affichageClub
  const visible = o.id in individuel ? individuel[o.id] : commun[o.id]
  return visible === false
}

// Entrée de menu à afficher ? Même règle que la page, avec en plus le retrait
// d'Explorer (éducateur) et de Recrutement (éducateur et club) pour les comptes
// du nouveau modèle, et les outils du club que l'éducateur a masqués (la page
// reste ouverte, seule l'entrée de menu disparaît). Un club peut aussi masquer
// lui-même ses outils, et ceux du menu de ses éducateurs, quel que soit son
// modèle ; l'éducateur peut masquer en plus, jamais réafficher.
export function menuVisible(compte, cle, maintenant = new Date()) {
  if (menuMasqueParLeClub(compte, cle)) return false
  if (menuMasqueParSonClub(compte, cle, maintenant)) return false
  if (!compte?.modeleOutils) return true
  if (cle === 'recrutement') return false
  if (compte.role === 'educateur' && cle === 'explorer') return false
  if (menuMasque(compte, cle, maintenant)) return false
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

// État de chaque outil pour l'écran « Mes outils ». `lignes` : réponse de
// `outils_actifs` ; `essaisUtilises` : ids des outils dont l'essai a déjà servi.
// États : 'actif' (payé, ou inclus dans le forfait du club), 'essai' (avec
// `joursRestants`), 'retire' et 'offre' (actifs jusqu'à `finLe` ; l'offre rend aussi `joursRestants`), 'club' (fourni
// par le club), 'essai_termine' (essai fini, à garder ou non), 'disponible'.
// Un outil non achetable et non fourni par le club n'apparaît pas.
// `masque` : l'éducateur a retiré cet outil du club de son menu (état 'club').
export function etatsOutils({ role, lignes = [], essaisUtilises = [], masques = [], maintenant = new Date() }) {
  const liste = []
  for (const o of outilsDuRole(role)) {
    const propre = lignes.find(l => l.outil === o.id && l.source !== 'club')
    const fourniParLeClub = role === 'educateur' && !!o.viaClub
      && lignes.some(l => l.source === 'club' && l.outil === o.viaClub)
    let etat
    let finLe = null
    if (propre) {
      finLe = propre.fin_le
      if (propre.source === 'essai') etat = 'essai'
      else if (propre.source === 'offre') etat = 'offre'
      else etat = propre.fin_le ? 'retire' : 'actif'
    } else if (fourniParLeClub) etat = 'club'
    else if (!o.achetable) continue
    else etat = essaisUtilises.includes(o.id) ? 'essai_termine' : 'disponible'
    liste.push({ outil: o, etat, finLe, fourniParLeClub, masque: etat === 'club' && masques.includes(o.id), joursRestants: etat === 'essai' || etat === 'offre' ? joursRestantsEssai(finLe, maintenant) : 0 })
  }
  return liste
}

// Outils que l'éducateur paie alors que son club les lui fournit aussi : il
// peut retirer le sien. Calculé à la lecture, il disparaît dès que c'est fait.
export const doublonsClub = (etats) => etats.filter(e => e.etat === 'actif' && e.fourniParLeClub)

// Côté club : les outils qu'il peut ouvrir à ses éducateurs. `possede` : l'outil
// est actif chez le club (condition pour l'ouvrir) ; `ouvert` : choix du club.
export function outilsPourEducateurs({ etats = [], ouverts = [] }) {
  return outilsOuvrables().map(o => ({
    outil: o,
    possede: etats.some(e => e.outil.id === o.id && e.etat === 'actif'),
    ouvert: ouverts.includes(o.id),
  }))
}

export { trouverOutil }
