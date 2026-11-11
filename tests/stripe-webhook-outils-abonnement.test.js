// Tests du webhook des outils, bloc 8 : changements et fin d'abonnement,
// factures payées ou refusées (Stripe et base simulés).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { traiterEvenement, lireAbonnement, finDePeriode } from '../supabase/functions/stripe-webhook-outils/logique.js'

const COMPTE = '00000000-0000-0000-0000-000000000001'
const FIN = 1796990400
const FIN_ISO = '2026-12-11T12:00:00.000Z'
const journalMuet = { error: () => {} }

const abo = (cle, extra = {}) => ({
  id: 'sub_1', status: 'active', customer: 'cus_1', current_period_end: FIN,
  metadata: { offre: 'outils', compte_id: COMPTE, role: 'educateur', outils: 'seances,tactique', ...extra.metadata },
  items: { data: [{ id: 'si_1', price: { lookup_key: cle } }] },
  ...extra, ...(extra.metadata ? { metadata: { offre: 'outils', compte_id: COMPTE, role: 'educateur', ...extra.metadata } } : {}),
})
const evt = (type, objet, idEvt = 'evt_1') => ({ id: idEvt, type, data: { object: objet } })

function deps(abonnement, { autre = false } = {}) {
  const appels = { synchro: [], paiements: [], lus: 0, erreurs: [] }
  return {
    appels,
    deps: {
      journal: { error: (...a) => appels.erreurs.push(a) },
      recupererAbonnement: async () => { appels.lus += 1; return abonnement },
      appliquer: async () => { throw new Error('ne doit pas servir ici') },
      synchroniser: async (p) => { appels.synchro.push(p); return 'ok' },
      autreAbonnementEnCours: async () => autre,
      journaliserPaiement: async (p) => { appels.paiements.push(p) },
    },
  }
}

test('changement d\'outils : la base reçoit les outils, le palier et la date d\'échéance', async () => {
  const a = abo('pack_educateur_3_mensuel', { metadata: { outils: 'seances,cff4' } })
  const { deps: d, appels } = deps(a)
  const r = await traiterEvenement(evt('customer.subscription.updated', a), d)
  assert.equal(r.statut, 'applique')
  assert.deepEqual(appels.synchro[0], {
    evenementId: 'evt_1', type: 'customer.subscription.updated', compteId: COMPTE, abonnementId: 'sub_1',
    lignes: [{ outil: 'seances', periodicite: 'mensuel', item: 'si_1' }, { outil: 'cff4', periodicite: 'mensuel', item: 'si_1' }],
    taille: 3, palier: null, periodicite: null, fin: FIN_ISO, resiliation: false, termine: false,
  })
})

test('palier 9 : taille 9 et les 9 outils', async () => {
  const a = abo('pack_educateur_annuel')
  const { deps: d, appels } = deps(a)
  await traiterEvenement(evt('customer.subscription.updated', a), d)
  assert.equal(appels.synchro[0].taille, 9)
  assert.equal(appels.synchro[0].lignes.length, 9)
})

test('résiliation prévue : fin à la date d\'arrêt, puis reprise', async () => {
  const resilie = abo('pack_educateur_6_mensuel', { cancel_at_period_end: true, cancel_at: FIN })
  const { deps: d, appels } = deps(resilie)
  await traiterEvenement(evt('customer.subscription.updated', resilie), d)
  assert.equal(appels.synchro[0].resiliation, true)
  assert.equal(appels.synchro[0].fin, FIN_ISO)
  assert.equal(appels.synchro[0].taille, 6)
  const repris = abo('pack_educateur_6_mensuel')
  const second = deps(repris)
  await traiterEvenement(evt('customer.subscription.updated', repris, 'evt_2'), second.deps)
  assert.equal(second.appels.synchro[0].resiliation, false)
})

test('fin d\'abonnement : tout s\'arrête à la date de fin réelle', async () => {
  const fini = abo('pack_educateur_3_mensuel', { status: 'canceled', ended_at: FIN - 86400 })
  const { deps: d, appels } = deps(fini)
  await traiterEvenement(evt('customer.subscription.deleted', fini), d)
  assert.equal(appels.synchro[0].termine, true)
  assert.equal(appels.synchro[0].fin, '2026-12-10T12:00:00.000Z')
})

test('club : forfait changé ; fin ignorée si le club a déjà un autre abonnement en cours', async () => {
  const club = abo('forfait_club_c200_annuel', { metadata: { role: 'club', outils: undefined } })
  const { deps: d, appels } = deps(club)
  await traiterEvenement(evt('customer.subscription.updated', club), d)
  assert.equal(appels.synchro[0].palier, 'c200')
  assert.equal(appels.synchro[0].periodicite, 'annuel')
  assert.deepEqual(appels.synchro[0].lignes, [])
  const fini = { ...club, status: 'canceled', ended_at: FIN }
  const avecAutre = deps(fini, { autre: true })
  assert.equal((await traiterEvenement(evt('customer.subscription.deleted', fini), avecAutre.deps)).raison, 'autre_abonnement_en_cours')
  assert.equal(avecAutre.appels.synchro.length, 0)
  const sansAutre = deps(fini)
  await traiterEvenement(evt('customer.subscription.deleted', fini), sansAutre.deps)
  assert.equal(sansAutre.appels.synchro[0].termine, true)
})

test('abonnement d\'une autre offre, incomplet ou d\'un autre compte : rien n\'est écrit', async () => {
  const autre = { ...abo('pack_educateur_3_mensuel'), metadata: { offre: 'joueur' } }
  const a = deps(autre)
  assert.equal((await traiterEvenement(evt('customer.subscription.updated', autre), a.deps)).raison, 'autre_offre')
  assert.equal(a.appels.lus, 0)
  const incomplet = abo('pack_educateur_3_mensuel', { status: 'incomplete' })
  const b = deps(incomplet)
  assert.equal((await traiterEvenement(evt('customer.subscription.updated', incomplet), b.deps)).raison, 'abonnement_incomplet')
  const relu = { ...abo('pack_educateur_3_mensuel'), metadata: { offre: 'outils', compte_id: 'quelqu-un-d-autre' } }
  const c = deps(relu)
  await assert.rejects(traiterEvenement(evt('customer.subscription.updated', abo('pack_educateur_3_mensuel')), c.deps), /abonnement_autre_compte/)
  assert.equal(b.appels.synchro.length + c.appels.synchro.length, 0)
})

test('fin de période lue sur la ligne avec les versions récentes de l\'API', () => {
  assert.equal(finDePeriode({ items: { data: [{ current_period_end: FIN }] } }), FIN_ISO)
  assert.equal(lireAbonnement(abo('pack_educateur_6_mensuel')).taille, 6)
})

const facture = (extra = {}) => ({ id: 'in_1', livemode: true, amount_paid: 1500, parent: { subscription_details: { subscription: 'sub_1', metadata: { offre: 'outils' } } }, ...extra })

test('facture payée en réel : journalisée pour la page Revenus (centimes, rôle, cycle)', async () => {
  const { deps: d, appels } = deps(abo('pack_educateur_6_annuel'))
  const r = await traiterEvenement(evt('invoice.paid', facture()), d)
  assert.equal(r.statut, 'applique')
  assert.deepEqual(appels.paiements, [{ evenementId: 'evt_1', compteId: COMPTE, montant: 1500, role: 'educateur', cycle: 'annuel' }])
})

test('facture de test, à 0 €, ou d\'une autre offre : pas dans les revenus', async () => {
  for (const [f, raison] of [
    [facture({ livemode: false }), 'paiement_test'],
    [facture({ amount_paid: 0 }), 'montant_nul'],
    [facture({ parent: { subscription_details: { subscription: 'sub_9', metadata: { offre: 'joueur' } } } }), 'autre_offre'],
    [{ id: 'in_2', livemode: true, amount_paid: 500 }, 'pas_un_abonnement'],
  ]) {
    const { deps: d, appels } = deps(abo('pack_educateur_3_mensuel'))
    assert.equal((await traiterEvenement(evt('invoice.paid', f), d)).raison, raison)
    assert.equal(appels.paiements.length, 0)
  }
  // Facture d'une autre offre : écartée sans relire l'abonnement chez Stripe.
  const { deps: d, appels } = deps(abo('pack_educateur_3_mensuel'))
  await traiterEvenement(evt('invoice.paid', facture({ parent: { subscription_details: { subscription: 'sub_9', metadata: { offre: 'joueur' } } } })), d)
  assert.equal(appels.lus, 0)
})

test('ancienne forme de facture (abonnement à la racine) reconnue', async () => {
  const { deps: d, appels } = deps(abo('forfait_club_c0_mensuel', { metadata: { role: 'club', outils: undefined } }))
  await traiterEvenement(evt('invoice.paid', { id: 'in_3', livemode: true, amount_paid: 5000, subscription: 'sub_1' }), d)
  assert.deepEqual(appels.paiements[0], { evenementId: 'evt_1', compteId: COMPTE, montant: 5000, role: 'club', cycle: 'mensuel' })
})

test('paiement refusé : noté dans les journaux, accès inchangé', async () => {
  const { deps: d, appels } = deps(abo('pack_educateur_3_mensuel'))
  assert.equal((await traiterEvenement(evt('invoice.payment_failed', facture()), d)).raison, 'echec_paiement_note')
  assert.equal(appels.synchro.length + appels.paiements.length, 0)
  assert.equal(appels.erreurs.length, 1)
})

test('autres événements toujours ignorés', async () => {
  const { deps: d } = deps(null)
  assert.equal((await traiterEvenement(evt('customer.updated', {}), { ...d, journal: journalMuet })).raison, 'type_non_gere')
})
