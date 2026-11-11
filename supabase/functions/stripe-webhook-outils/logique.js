// Logique du webhook des outils à la carte, sans réseau ni secret : Stripe et
// la base sont passés en paramètres (testée par tests/stripe-webhook-outils.test.js).
//
// - `checkout.session.completed` : premier paiement (bloc 7).
// - `customer.subscription.updated` / `deleted` (bloc 8) : outils changés,
//   palier ou forfait changé, résiliation prévue ou annulée, fin d'abonnement.
// - `invoice.paid` : paiement réel journalisé pour la page Revenus (table
//   `paiements`) ; `invoice.payment_failed` : noté dans les journaux, l'accès
//   reste ouvert pendant que Stripe réessaie (l'abonnement s'arrête s'il abandonne).
// On relit toujours l'abonnement chez Stripe plutôt que de se fier au contenu
// de l'événement : un événement relivré tard applique l'état actuel.

const PALIERS = ['c0', 'c100', 'c200', 'c300', 'c400', 'c500']
// Outils compris dans l'offre « tous les outils éducateur » (copie de
// outilsDuPack() du catalogue, la fonction ne peut pas l'importer : un test
// vérifie que les deux listes restent identiques).
export const OUTILS_DU_PACK = ['suivi_joueurs', 'stats_collectives', 'seances', 'tactique', 'bibliotheque', 'prep_physique', 'evaluations_video', 'projet_sportif', 'cff4']
const PAIEMENT_OK = ['paid', 'no_payment_required']
const ABONNEMENT_ACTIF = ['active', 'trialing']
// Abonnement qui donne encore accès (paiement en retard : Stripe réessaie).
const ABONNEMENT_EN_COURS = ['active', 'trialing', 'past_due', 'unpaid']
const ABONNEMENT_TERMINE = ['canceled', 'incomplete_expired']

const iso = (secondes) => (secondes ? new Date(secondes * 1000).toISOString() : null)
// Fin de la période payée : sur l'abonnement (anciennes versions d'API) ou sur ses lignes.
export const finDePeriode = (abonnement) => iso(abonnement?.current_period_end ?? abonnement?.items?.data?.[0]?.current_period_end)

// Clés de recherche créées par scripts/stripe-creer-produits-outils.mjs.
export function lireCleStripe(cle) {
  if (typeof cle !== 'string') return null
  const o = /^outil_educateur_([a-z0-9_]{2,40})_(mensuel|annuel)$/.exec(cle)
  if (o) return { type: 'outil', outil: o[1], periodicite: o[2] }
  const pk = /^pack_educateur_(?:(3|6)_)?(mensuel|annuel)$/.exec(cle)
  if (pk) return { type: 'pack', taille: Number(pk[1] || 9), periodicite: pk[2] }
  const f = /^forfait_club_(c\d+)_(mensuel|annuel)$/.exec(cle)
  if (f && PALIERS.includes(f[1])) return { type: 'forfait', palier: f[1], periodicite: f[2] }
  return null
}

// Outils d'un palier : le palier 9 donne tous les outils ; les paliers 3 et 6 donnent
// ceux choisis au paiement (métadonnées `outils`), validés un par un.
function outilsDuPalier(taille, brut) {
  if (taille === 9) return OUTILS_DU_PACK
  const choisis = [...new Set(String(brut || '').split(',').map(o => o.trim()).filter(Boolean))]
  if (!choisis.length || choisis.length > taille || choisis.some(o => !OUTILS_DU_PACK.includes(o))) throw new Error('outils_palier_invalides')
  return choisis
}

// Lignes d'un abonnement Stripe : outils éducateur (le pack en donne neuf, sur
// la même ligne Stripe), forfait club, inconnues. `taille` : nombre d'outils
// payés par l'éducateur (3, 6 ou 9 pour un palier, sinon le nombre d'outils à l'unité).
export function lireAbonnement(abonnement) {
  const lignes = []
  const inconnues = []
  let forfait = null
  let taille = 0
  for (const item of abonnement?.items?.data || []) {
    const l = lireCleStripe(item.price?.lookup_key)
    if (l?.type === 'outil') { lignes.push({ outil: l.outil, periodicite: l.periodicite, item: item.id }); taille += 1 }
    else if (l?.type === 'pack') {
      for (const outil of outilsDuPalier(l.taille, abonnement?.metadata?.outils)) lignes.push({ outil, periodicite: l.periodicite, item: item.id })
      taille += l.taille
    } else if (l?.type === 'forfait' && !forfait) forfait = { palier: l.palier, periodicite: l.periodicite }
    else inconnues.push(item.price?.lookup_key || item.price?.id || item.id)
  }
  return { lignes, forfait, taille, inconnues }
}

const ignore = (raison) => ({ statut: 'ignore', raison })

// Rend { statut: 'ignore' | 'applique' | 'deja_traite' }. Lève une erreur
// quand l'événement doit être relivré par Stripe (rien n'a été écrit).
// deps : recupererAbonnement(id), appliquer(params) -> 'ok' | 'ok_autre_abonnement' | 'deja_traite',
// synchroniser(params) -> 'ok' | 'deja_traite', autreAbonnementEnCours(abonnement) -> booléen,
// journaliserPaiement(params).
export async function traiterEvenement(evenement, deps) {
  const type = evenement?.type
  if (type === 'customer.subscription.updated' || type === 'customer.subscription.deleted') return traiterAbonnement(evenement, deps)
  if (type === 'invoice.paid' || type === 'invoice.payment_failed') return traiterFacture(evenement, deps)
  if (type !== 'checkout.session.completed') return ignore('type_non_gere')
  return traiterPremierPaiement(evenement, deps)
}

// Changement ou fin d'un abonnement des outils : la base est remise à l'état
// relu chez Stripe (outils, palier du club, date de fin).
async function traiterAbonnement(evenement, { recupererAbonnement, synchroniser, autreAbonnementEnCours, journal = console }) {
  const brut = evenement.data?.object || {}
  if (brut.metadata?.offre !== 'outils') return ignore('autre_offre')
  const compteId = brut.metadata.compte_id
  if (!compteId || !brut.id) throw new Error('compte_absent')
  const abonnement = await recupererAbonnement(brut.id)
  if (abonnement?.metadata?.offre !== 'outils' || abonnement.metadata.compte_id !== compteId) throw new Error('abonnement_autre_compte')

  const termine = ABONNEMENT_TERMINE.includes(abonnement.status)
  // Abonnement pas encore payé (premier paiement en attente) : rien à ouvrir.
  if (!termine && !ABONNEMENT_EN_COURS.includes(abonnement.status)) return ignore('abonnement_incomplet')
  // Un club qui a déjà repris un nouvel abonnement ne perd pas son accès à cause de l'ancien.
  if (termine && abonnement.metadata.role === 'club' && await autreAbonnementEnCours(abonnement)) return ignore('autre_abonnement_en_cours')

  const { lignes, forfait, taille, inconnues } = lireAbonnement(abonnement)
  if (inconnues.length) journal.error('[stripe-webhook-outils] lignes non reconnues', abonnement.id, inconnues)
  if (!lignes.length && !forfait) throw new Error('aucune_ligne_reconnue')

  const resiliation = !termine && (!!abonnement.cancel_at_period_end || !!abonnement.cancel_at)
  const fin = termine
    ? iso(abonnement.ended_at) || new Date().toISOString()
    : (resiliation && iso(abonnement.cancel_at)) || finDePeriode(abonnement)
  if (!fin) throw new Error('fin_periode_absente')

  const resultat = await synchroniser({
    evenementId: evenement.id,
    type: evenement.type,
    compteId,
    abonnementId: abonnement.id,
    lignes,
    taille,
    palier: forfait?.palier ?? null,
    periodicite: forfait?.periodicite ?? null,
    fin,
    resiliation,
    termine,
  })
  return resultat === 'deja_traite' ? { statut: 'deja_traite' } : { statut: 'applique' }
}

// Facture d'un abonnement des outils. Les factures des autres offres (joueur,
// recruteur, anciens liens club) sont écartées sans appel à Stripe quand la
// marque est sur la facture.
async function traiterFacture(evenement, { recupererAbonnement, journaliserPaiement, journal = console }) {
  const facture = evenement.data?.object || {}
  const ref = facture.subscription ?? facture.parent?.subscription_details?.subscription
  const abonnementId = typeof ref === 'string' ? ref : ref?.id
  if (!abonnementId) return ignore('pas_un_abonnement')
  const marque = facture.parent?.subscription_details?.metadata ?? facture.subscription_details?.metadata
  if (marque && marque.offre !== 'outils') return ignore('autre_offre')
  const abonnement = await recupererAbonnement(abonnementId)
  if (abonnement?.metadata?.offre !== 'outils') return ignore('autre_offre')
  const compteId = abonnement.metadata.compte_id

  if (evenement.type === 'invoice.payment_failed') {
    journal.error('[stripe-webhook-outils] paiement refusé, Stripe va réessayer', compteId, abonnementId, facture.id)
    return ignore('echec_paiement_note')
  }
  // Un paiement de test ou à 0 € (code promo) ne compte pas dans les revenus.
  if (!facture.livemode) return ignore('paiement_test')
  if (!(facture.amount_paid > 0)) return ignore('montant_nul')
  const { lignes, forfait } = lireAbonnement(abonnement)
  await journaliserPaiement({
    evenementId: evenement.id,
    compteId,
    montant: facture.amount_paid,
    role: abonnement.metadata.role === 'club' ? 'club' : 'educateur',
    cycle: forfait?.periodicite ?? lignes[0]?.periodicite ?? null,
  })
  return { statut: 'applique' }
}

async function traiterPremierPaiement(evenement, { recupererAbonnement, appliquer, journal = console }) {
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
