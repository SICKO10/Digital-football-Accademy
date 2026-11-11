import { trouverOutil, outilsAchetables, outilsDuRole, ROLES } from './catalogueOutils.js'

// Offres d'essai de l'administrateur (bloc 12) : un outil offert pour une durée
// choisie, à un compte ou à tous les comptes d'un rôle. Logique pure, partagée
// par la fonction serveur api/outils.js (action `offrir`) et l'écran du coach.

const JOUR_MS = 86400000
export const DUREE_MAX_JOURS = 365
export const DUREES_RAPIDES = [7, 14, 30, 60, 90]

// Outils qu'on peut offrir : ceux qu'un éducateur peut acheter, et tous ceux d'un club.
export const outilsOffrables = (role) => (role === 'club' ? outilsDuRole('club') : outilsAchetables('educateur'))

export const dureeValide = (jours) => Number.isInteger(jours) && jours >= 1 && jours <= DUREE_MAX_JOURS

// Un droit qui couvre déjà l'offre : l'abonnement ou le forfait en cours, ou un
// essai ou une offre qui dure au moins aussi longtemps. Un droit expiré ne couvre rien.
// Un outil acheté puis retiré (fin_le renseignée) peut être prolongé par l'offre.
export function offreDejaCouverte(ligne, finMs, maintenantMs) {
  if (!ligne) return false
  if (!ligne.fin_le) return ligne.source === 'achat' || ligne.source === 'forfait'
  const fin = new Date(ligne.fin_le).getTime()
  return fin > maintenantMs && fin >= finMs
}

// Répartit les comptes visés. `comptes` : [{ id, abonnement_actif }], `lignes` :
// lignes outils_comptes de cet outil pour ces comptes. Un club sans abonnement
// actif est écarté (ses outils ne s'ouvrent qu'avec le forfait).
export function planOffre({ role, comptes, lignes = [], jours, maintenantMs }) {
  const finMs = maintenantMs + jours * JOUR_MS
  const parCompte = new Map(lignes.map(l => [l.compte_id, l]))
  const aOffrir = []
  let deja = 0
  let sansForfait = 0
  for (const compte of comptes) {
    if (role === 'club' && !compte.abonnement_actif) { sansForfait++; continue }
    if (offreDejaCouverte(parCompte.get(compte.id), finMs, maintenantMs)) { deja++; continue }
    aOffrir.push(compte.id)
  }
  return { finLe: new Date(finMs).toISOString(), aOffrir, deja, sansForfait, total: comptes.length }
}

// Contrôle commun des paramètres d'une offre. Rend { role, outil, jours } ou { erreur }.
export function lireOffre(corps) {
  const role = corps?.role
  if (!ROLES.includes(role)) return { erreur: 'Choisis éducateur ou club' }
  const outil = trouverOutil(role, corps.outil)
  if (!outil || !outilsOffrables(role).some(o => o.id === outil.id)) return { erreur: 'Outil inconnu ou impossible à offrir' }
  if (!dureeValide(corps.jours)) return { erreur: `Durée de 1 à ${DUREE_MAX_JOURS} jours` }
  return { role, outil, jours: corps.jours }
}

const dateFr = (iso) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

// Message de la cloche reçu par le compte (pas d'email).
export function notificationOffre({ role, outil, jours, finLe }) {
  return {
    type: 'outil_offert',
    titre: 'Un outil t\'est offert',
    contenu: `Digital Football t'offre l'outil ${outil.nom} pendant ${jours} ${jours > 1 ? 'jours' : 'jour'}, jusqu'au ${dateFr(finLe)}. Tu le retrouves dans Mes outils.`,
    lien: role === 'club' ? '/club' : '/educateur',
  }
}
