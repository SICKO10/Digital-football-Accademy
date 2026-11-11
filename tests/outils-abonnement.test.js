// Tests du bloc 8 : modifier, résilier, reprendre un abonnement des outils et
// ouvrir le portail Stripe (api/outils.js), plus le calcul pur du changement.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { creerHandler, normaliserAbonnement } from '../api/outils.js'
import { planModification, tarifParCle, lignesStripe } from '../src/lib/catalogueOutils.js'

const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`
const U = { edu: id(1), club: id(10), joueur: id(20) }
const FIN = '2026-12-11T12:00:00.000Z'
const TOUS = ['suivi_joueurs', 'stats_collectives', 'seances', 'tactique', 'bibliotheque', 'prep_physique', 'evaluations_video', 'projet_sportif', 'cff4']

// Stripe simulé : un client, au plus un abonnement des outils.
function monde({ cle = 'pack_educateur_3_mensuel', outils = 'seances,tactique', statut = 'active', resiliation = false, client = 'cus_1', abonnement = true, equipes = 3, refusCarte = false } = {}) {
  const m = { modifs: [], portails: [] }
  m.donnees = {
    profil: async (c) => ({
      [U.edu]: { plan: 'educateur', modele_outils: true },
      [U.club]: { plan: 'club', modele_outils: true, abonnement_actif: true },
      [U.joueur]: { plan: 'joueur_starter', modele_outils: true },
    })[c],
    nbEquipes: async () => equipes,
    trouverClient: async () => client,
    abonnementOutils: async () => (abonnement
      ? { id: 'sub_1', statut: statut, metadata: { offre: 'outils', ...(outils ? { outils } : {}) }, items: [{ id: 'si_1', cle }], finPeriode: FIN, resiliation }
      : null),
    prixStripe: async (cles) => lignesStripe().filter(l => cles.includes(l.cle)).map(l => ({ id: `price_${l.cle}`, cle: l.cle, montant: l.montant })),
    modifierAbonnement: async (sid, params) => {
      if (refusCarte) { const e = new Error('Your card was declined.'); e.type = 'StripeCardError'; e.statusCode = 402; throw e }
      m.modifs.push({ sid, params })
    },
    sessionPortail: async (params) => { m.portails.push(params); return { url: 'https://billing.stripe.com/p/session/test' } },
  }
  return m
}

async function appeler(m, utilisateur, corps) {
  const handler = creerHandler({ verifierJeton: async () => ({ id: utilisateur }), donnees: m.donnees })
  const res = { code: null, corps: null }
  res.status = (c) => { res.code = c; return res }
  res.json = (b) => { res.corps = b; return res }
  await handler({ method: 'POST', headers: { authorization: 'Bearer jeton' }, body: corps }, res)
  return res
}

test('planModification : monter, descendre, remplacer, rien à changer', () => {
  const actuel = { cleActuelle: 'pack_educateur_3_mensuel', outilsActuels: ['seances', 'tactique'] }
  assert.equal(planModification('educateur', actuel, { outils: ['seances', 'tactique', 'cff4'] }).sens, 'meme')
  const hausse = planModification('educateur', actuel, { outils: TOUS.slice(0, 4) })
  assert.deepEqual([hausse.sens, hausse.cle, hausse.total], ['hausse', 'pack_educateur_6_mensuel', 15])
  const baisse = planModification('educateur', { cleActuelle: 'pack_educateur_annuel', outilsActuels: TOUS }, { outils: ['seances'] })
  assert.deepEqual([baisse.sens, baisse.cle, baisse.total], ['baisse', 'pack_educateur_3_annuel', 80])
  // La périodicité ne change pas ici (bloc 9).
  assert.equal(planModification('educateur', { cleActuelle: 'pack_educateur_6_annuel', outilsActuels: [] }, { pack: true }).cle, 'pack_educateur_annuel')
  assert.ok(planModification('educateur', actuel, { outils: ['tactique', 'seances'] }).erreur)
  // Au palier 9, décocher 1 ou 2 outils ne change rien : le palier donne les 9.
  assert.ok(planModification('educateur', { cleActuelle: 'pack_educateur_mensuel', outilsActuels: TOUS }, { outils: TOUS.slice(0, 7) }).erreur)
  assert.ok(planModification('educateur', actuel, { outils: [] }).erreur)
})

test('planModification : club, forfait plus grand ou plus petit, jamais trop petit pour ses équipes', () => {
  const actuel = { cleActuelle: 'forfait_club_c100_mensuel' }
  assert.deepEqual(planModification('club', actuel, { palier: 'c200' }, 3).sens, 'hausse')
  assert.deepEqual(planModification('club', actuel, { palier: 'c0' }, 2).sens, 'baisse')
  assert.ok(planModification('club', actuel, { palier: 'c0' }, 3).erreur)
  assert.ok(planModification('club', actuel, { palier: 'c100' }, 3).erreur)
})

test('tarifParCle : palier et forfait retrouvés, clé inconnue', () => {
  assert.equal(tarifParCle('pack_educateur_6_annuel').prix, 120)
  assert.equal(tarifParCle('forfait_club_c0_mensuel').prix, 50)
  assert.equal(tarifParCle('outil_educateur_seances_mensuel'), null)
})

test('normaliserAbonnement : fin de période lue sur l\'abonnement ou sur sa ligne', () => {
  const ancien = normaliserAbonnement({ id: 's', status: 'active', current_period_end: 1796990400, items: { data: [{ id: 'si', price: { lookup_key: 'k' } }] } })
  const recent = normaliserAbonnement({ id: 's', status: 'active', cancel_at_period_end: true, items: { data: [{ id: 'si', current_period_end: 1796990400, price: { lookup_key: 'k' } }] } })
  assert.equal(ancien.finPeriode, FIN)
  assert.equal(recent.finPeriode, FIN)
  assert.equal(recent.resiliation, true)
  assert.deepEqual(recent.items, [{ id: 'si', cle: 'k' }])
})

test('abonnement : rend l\'état lu chez Stripe, ou rien sans abonnement', async () => {
  const res = await appeler(monde(), U.edu, { action: 'abonnement' })
  assert.equal(res.code, 200)
  assert.deepEqual(res.corps.abonnement, { statut: 'active', finPeriode: FIN, resiliation: false, cle: 'pack_educateur_3_mensuel', outils: ['seances', 'tactique'] })
  assert.deepEqual((await appeler(monde({ client: null }), U.edu, { action: 'abonnement' })).corps.abonnement, null)
  assert.equal((await appeler(monde(), U.club, { action: 'abonnement' })).corps.nbEquipes, 3)
  assert.equal((await appeler(monde(), U.joueur, { action: 'abonnement' })).code, 403)
})

test('modifier : palier supérieur, différence facturée tout de suite et refusée si non payée', async () => {
  const m = monde()
  const res = await appeler(m, U.edu, { action: 'modifier', outils: ['seances', 'tactique', 'cff4', 'bibliotheque'] })
  assert.equal(res.code, 200)
  assert.equal(res.corps.sens, 'hausse')
  assert.deepEqual(m.modifs, [{ sid: 'sub_1', params: {
    proration_behavior: 'always_invoice',
    items: [{ id: 'si_1', price: 'price_pack_educateur_6_mensuel' }],
    payment_behavior: 'error_if_incomplete',
    metadata: { outils: 'seances,tactique,cff4,bibliotheque' },
  } }])
  const refus = await appeler(monde({ refusCarte: true }), U.edu, { action: 'modifier', outils: TOUS.slice(0, 4) })
  assert.equal(refus.code, 402)
})

test('modifier : palier inférieur, nouveau prix à l\'échéance sans remboursement', async () => {
  const m = monde({ cle: 'pack_educateur_annuel', outils: TOUS.join(',') })
  const res = await appeler(m, U.edu, { action: 'modifier', outils: ['seances', 'tactique'] })
  assert.equal(res.code, 200)
  assert.equal(res.corps.sens, 'baisse')
  assert.deepEqual(m.modifs[0].params, {
    proration_behavior: 'none',
    items: [{ id: 'si_1', price: 'price_pack_educateur_3_annuel' }],
    metadata: { outils: 'seances,tactique' },
  })
})

test('modifier : remplacer un outil dans le même palier ne change que le choix', async () => {
  const m = monde()
  const res = await appeler(m, U.edu, { action: 'modifier', outils: ['seances', 'cff4'] })
  assert.equal(res.code, 200)
  assert.deepEqual(m.modifs[0].params, { proration_behavior: 'none', metadata: { outils: 'seances,cff4' } })
})

test('modifier : club, forfait supérieur ; jamais de métadonnées d\'outils', async () => {
  const m = monde({ cle: 'forfait_club_c100_mensuel', outils: null })
  const res = await appeler(m, U.club, { action: 'modifier', palier: 'c200' })
  assert.equal(res.code, 200)
  assert.deepEqual(m.modifs[0].params, {
    proration_behavior: 'always_invoice',
    items: [{ id: 'si_1', price: 'price_forfait_club_c200_mensuel' }],
    payment_behavior: 'error_if_incomplete',
  })
  const tropPetit = await appeler(monde({ cle: 'forfait_club_c100_mensuel', equipes: 4 }), U.club, { action: 'modifier', palier: 'c0' })
  assert.equal(tropPetit.code, 400)
})

test('modifier : refusé sans abonnement, résilié, paiement en retard, ou rien à changer', async () => {
  for (const [opts, corps, code] of [
    [{ abonnement: false }, { outils: ['seances'] }, 404],
    [{ client: null }, { outils: ['seances'] }, 404],
    [{ resiliation: true }, { outils: ['seances'] }, 409],
    [{ statut: 'past_due' }, { outils: ['seances'] }, 409],
    [{}, { outils: ['tactique', 'seances'] }, 400],
    [{}, { outils: [] }, 400],
    [{}, { outils: ['stages'] }, 400],
  ]) {
    const m = monde(opts)
    const res = await appeler(m, U.edu, { action: 'modifier', ...corps })
    assert.equal(res.code, code, JSON.stringify(opts))
    assert.equal(m.modifs.length, 0)
  }
})

test('modifier : tarif Stripe absent ou au mauvais montant : 503, rien ne change', async () => {
  const m = monde()
  m.donnees.prixStripe = async () => [{ id: 'price_x', cle: 'pack_educateur_6_mensuel', montant: 100 }]
  assert.equal((await appeler(m, U.edu, { action: 'modifier', outils: TOUS.slice(0, 5) })).code, 503)
  assert.equal(m.modifs.length, 0)
})

test('resilier puis reprendre : fin à l\'échéance, annulable', async () => {
  const m = monde()
  const res = await appeler(m, U.edu, { action: 'resilier' })
  assert.equal(res.code, 200)
  assert.equal(res.corps.fin_le, FIN)
  assert.deepEqual(m.modifs[0].params, { cancel_at_period_end: true })
  assert.equal((await appeler(monde(), U.edu, { action: 'reprendre' })).code, 409)
  const r = monde({ resiliation: true })
  assert.equal((await appeler(r, U.club, { action: 'reprendre' })).code, 200)
  assert.deepEqual(r.modifs[0].params, { cancel_at_period_end: false })
  assert.equal((await appeler(monde({ resiliation: true }), U.edu, { action: 'resilier' })).code, 409)
})

test('portail : adresse du portail Stripe avec retour vers Mes outils', async () => {
  const m = monde()
  const res = await appeler(m, U.club, { action: 'portail' })
  assert.equal(res.code, 200)
  assert.equal(res.corps.url, 'https://billing.stripe.com/p/session/test')
  assert.deepEqual(m.portails[0], { customer: 'cus_1', locale: 'fr', return_url: 'https://digitalfootball.academy/club?outils=portail' })
  assert.equal((await appeler(monde({ client: null }), U.edu, { action: 'portail' })).code, 404)
})
