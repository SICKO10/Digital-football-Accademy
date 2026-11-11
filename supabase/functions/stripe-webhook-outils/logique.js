// Logique du webhook des outils à la carte, sans réseau ni secret : Stripe et
// la base sont passés en paramètres (testée par tests/stripe-webhook-outils.test.js).
//
// Bloc 7 : seul le premier paiement (`checkout.session.completed`) est traité.
// Les changements d'abonnement, factures et résiliations viennent au bloc 8.
// On relit toujours l'abonnement chez Stripe plutôt que de se fier au contenu
// de l'événement : un événement relivré tard applique l'état actuel.

const PALIERS = ['c0', 'c100', 'c200', 'c300', 'c400', 'c500']
// Outils compris dans l'offre « tous les outils éducateur » (copie de
// outilsDuPack() du catalogue, la fonction ne peut pas l'importer : un test
// vérifie que les deux listes restent identiques).
export const OUTILS_DU_PACK = ['suivi_joueurs', 'stats_collectives', 'seances', 'tactique', 'bibliotheque', 'prep_physique', 'evaluations_video', 'projet_sportif', 'cff4']
const PAIEMENT_OK = ['paid', 'no_payment_required']
const ABONNEMENT_ACTIF = ['active', 'trialing']

// Clés de recherche créées par scripts/stripe-creer-produits-outils.mjs.
export function lireCleStripe(cle) {
  if (typeof cle !== 'string') return null
  const o = /^outil_educateur_([a-z0-9_]{2,40})_(mensuel|annuel)$/.exec(cle)
  if (o) return { type: 'outil', outil: o[1], periodicite: o[2] }
  const pk = /^pack_educateur_(mensuel|annuel)$/.exec(cle)
  if (pk) return { type: 'pack', periodicite: pk[1] }
  const f = /^forfait_club_(c\d+)_(mensuel|annuel)$/.exec(cle)
  if (f && PALIERS.includes(f[1])) return { type: 'forfait', palier: f[1], periodicite: f[2] }
  return null
}

// Lignes d'un abonnement Stripe : outils éducateur (le pack en donne neuf, sur
// la même ligne Stripe), forfait club, inconnues.
export function lireAbonnement(abonnement) {
  const lignes = []
  const inconnues = []
  let forfait = null
  for (const item of abonnement?.items?.data || []) {
    const l = lireCleStripe(item.price?.lookup_key)
    if (l?.type === 'outil') lignes.push({ outil: l.outil, periodicite: l.periodicite, item: item.id })
    else if (l?.type === 'pack') for (const outil of OUTILS_DU_PACK) lignes.push({ outil, periodicite: l.periodicite, item: item.id })
    else if (l?.type === 'forfait' && !forfait) forfait = { palier: l.palier, periodicite: l.periodicite }
    else inconnues.push(item.price?.lookup_key || item.price?.id || item.id)
  }
  return { lignes, forfait, inconnues }
}

const ignore = (raison) => ({ statut: 'ignore', raison })

// Rend { statut: 'ignore' | 'applique' | 'deja_traite' }. Lève une erreur
// quand l'événement doit être relivré par Stripe (rien n'a été écrit).
// deps : recupererAbonnement(id), appliquer(params) -> 'ok' | 'ok_autre_abonnement' | 'deja_traite'
export async function traiterEvenement(evenement, { recupererAbonnement, appliquer, journal = console }) {
  if (evenement?.type !== 'checkout.session.completed') return ignore('type_non_gere')
  const session = evenement.data?.object || {}
  if (session.metadata?.offre !== 'outils') return ignore('autre_offre')
  if (session.mode !== 'subscription') return ignore('pas_un_abonnement')
  if (!PAIEMENT_OK.includes(session.payment_status)) return ignore('paiement_non_confirme')

  const compteId = session.metadata.compte_id
  if (!compteId || session.client_reference_id !== compteId) throw new Error('compte_incoherent')
  const abonnementId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
  if (!abonnementId) throw new Error('abonnement_absent')

  const abonnement = await recupererAbonnement(abonnementId)
  if (abonnement?.metadata?.offre !== 'outils' || abonnement.metadata.compte_id !== compteId) throw new Error('abonnement_autre_compte')
  if (!ABONNEMENT_ACTIF.includes(abonnement.status)) return ignore('abonnement_inactif')

  const { lignes, forfait, inconnues } = lireAbonnement(abonnement)
  if (inconnues.length) journal.error('[stripe-webhook-outils] lignes non reconnues', abonnementId, inconnues)
  if (!lignes.length && !forfait) throw new Error('aucune_ligne_reconnue')

  const resultat = await appliquer({
    evenementId: evenement.id,
    type: evenement.type,
    compteId,
    abonnementId,
    lignes,
    palier: forfait?.palier ?? null,
    periodicite: forfait?.periodicite ?? null,
  })
  if (resultat === 'deja_traite') return { statut: 'deja_traite' }
  if (resultat === 'ok_autre_abonnement') {
    journal.error('[stripe-webhook-outils] le compte avait déjà des outils payés sur un autre abonnement : vérifier dans Stripe', compteId, abonnementId)
  }
  return { statut: 'applique' }
}
