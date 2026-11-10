// Tests de la logique du webhook des outils (Stripe et base simulés).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lireCleStripe, lireAbonnement, traiterEvenement } from '../supabase/functions/stripe-webhook-outils/logique.js'
import { lignesStripe } from '../src/lib/catalogueOutils.js'

const COMPTE = '00000000-0000-0000-0000-000000000001'
const journalMuet = { error: () => {} }

const item = (cle, id) => ({ id, price: { id: `price_${cle}`, lookup_key: cle } })
const abonnement = (items, extra = {}) => ({
  id: 'sub_1', status: 'active', metadata: { offre: 'outils', compte_id: COMPTE }, items: { data: items }, ...extra,
})
const evenement = (session = {}) => ({
  id: 'evt_1',
  type: 'checkout.session.completed',
  data: {
    object: {
      mode: 'subscription', payment_status: 'paid', subscription: 'sub_1',
      client_reference_id: COMPTE, metadata: { offre: 'outils', compte_id: COMPTE, role: 'educateur' }, ...session,
    },
  },
})

// Base simulée : registre des événements et appels reçus.
function base(abo) {
  const vus = new Set()
  const appels = []
  return {
    appels,
    deps: {
      journal: journalMuet,
      recupererAbonnement: async (id) => { assert.equal(id, 'sub_1'); return abo },
      appliquer: async (p) => {
        if (vus.has(p.evenementId)) return 'deja_traite'
        vus.add(p.evenementId)
        appels.push(p)
        return 'ok'
      },
    },
  }
}

test('chaque clé de recherche du catalogue est reconnue', () => {
  for (const l of lignesStripe()) {
    const lu = lireCleStripe(l.cle)
    assert.ok(lu, l.cle)
    assert.equal(lu.type, l.type)
    assert.equal(lu.periodicite, l.intervalle === 'year' ? 'annuel' : 'mensuel')
    if (lu.type === 'outil') assert.equal(lu.outil, l.ref)
    else assert.equal(lu.palier, l.ref)
  }
  assert.equal(lireCleStripe('outil_club_finances_mensuel'), null)
  assert.equal(lireCleStripe('forfait_club_c999_mensuel'), null)
  assert.equal(lireCleStripe(null), null)
})

test('lireAbonnement : outils, forfait et lignes inconnues', () => {
  const r = lireAbonnement(abonnement([
    item('outil_educateur_suivi_joueurs_annuel', 'si_1'),
    item('forfait_club_c200_annuel', 'si_2'),
    item('autre_chose', 'si_3'),
  ]))
  assert.deepEqual(r.lignes, [{ outil: 'suivi_joueurs', periodicite: 'annuel', item: 'si_1' }])
  assert.deepEqual(r.forfait, { palier: 'c200', periodicite: 'annuel' })
  assert.deepEqual(r.inconnues, ['autre_chose'])
})

test('éducateur : les deux outils payés sont appliqués avec leur abonnement', async () => {
  const b = base(abonnement([item('outil_educateur_seances_mensuel', 'si_1'), item('outil_educateur_tactique_mensuel', 'si_2')]))
  const r = await traiterEvenement(evenement(), b.deps)
  assert.equal(r.statut, 'applique')
  assert.deepEqual(b.appels, [{
    evenementId: 'evt_1', type: 'checkout.session.completed', compteId: COMPTE, abonnementId: 'sub_1',
    lignes: [
      { outil: 'seances', periodicite: 'mensuel', item: 'si_1' },
      { outil: 'tactique', periodicite: 'mensuel', item: 'si_2' },
    ],
    palier: null, periodicite: null,
  }])
})

test('club : le forfait payé est appliqué avec sa périodicité', async () => {
  const b = base(abonnement([item('forfait_club_c100_annuel', 'si_1')]))
  await traiterEvenement(evenement({ metadata: { offre: 'outils', compte_id: COMPTE, role: 'club' } }), b.deps)
  assert.equal(b.appels[0].palier, 'c100')
  assert.equal(b.appels[0].periodicite, 'annuel')
  assert.deepEqual(b.appels[0].lignes, [])
})

test('un événement livré deux fois n\'est appliqué qu\'une fois', async () => {
  const b = base(abonnement([item('outil_educateur_seances_mensuel', 'si_1')]))
  assert.equal((await traiterEvenement(evenement(), b.deps)).statut, 'applique')
  assert.equal((await traiterEvenement(evenement(), b.deps)).statut, 'deja_traite')
  assert.equal(b.appels.length, 1)
})

test('ignorés sans rien écrire : autre type, autre offre, paiement non confirmé, abonnement inactif', async () => {
  const actif = abonnement([item('outil_educateur_seances_mensuel', 'si_1')])
  const cas = [
    [{ ...evenement(), type: 'invoice.paid' }, actif],
    [evenement({ metadata: {} }), actif],
    [evenement({ metadata: { offre: 'joueur' } }), actif],
    [evenement({ mode: 'payment' }), actif],
    [evenement({ payment_status: 'unpaid' }), actif],
    [evenement(), { ...actif, status: 'incomplete' }],
  ]
  for (const [evt, abo] of cas) {
    const b = base(abo)
    assert.equal((await traiterEvenement(evt, b.deps)).statut, 'ignore')
    assert.equal(b.appels.length, 0)
  }
})

test('incohérences : erreur (Stripe relivrera), rien n\'est écrit', async () => {
  const bon = [item('outil_educateur_seances_mensuel', 'si_1')]
  const cas = [
    [evenement({ client_reference_id: 'autre' }), abonnement(bon)],
    [evenement({ subscription: null }), abonnement(bon)],
    [evenement(), abonnement(bon, { metadata: { offre: 'outils', compte_id: 'autre' } })],
    [evenement(), abonnement(bon, { metadata: {} })],
    [evenement(), abonnement([item('inconnue', 'si_9')])],
  ]
  for (const [evt, abo] of cas) {
    const b = base(abo)
    await assert.rejects(traiterEvenement(evt, b.deps))
    assert.equal(b.appels.length, 0)
  }
})

test('une panne de la base remonte en erreur (Stripe relivrera)', async () => {
  const deps = {
    journal: journalMuet,
    recupererAbonnement: async () => abonnement([item('outil_educateur_seances_mensuel', 'si_1')]),
    appliquer: async () => { throw new Error('base indisponible') },
  }
  await assert.rejects(traiterEvenement(evenement(), deps), /base indisponible/)
})
