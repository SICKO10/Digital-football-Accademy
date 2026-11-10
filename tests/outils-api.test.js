// Tests de api/outils.js : jeton et accès aux données injectés, sans réseau.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { creerHandler } from '../api/outils.js'
import { lignesStripe } from '../src/lib/catalogueOutils.js'

const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`
const U = { edu: id(1), eduAncien: id(2), club: id(10), clubImpaye: id(11), joueur: id(20) }
const NOW = Date.parse('2026-11-09T12:00:00Z')

function monde({ panneLigne = false } = {}) {
  const profils = {
    [U.edu]: { plan: 'educateur', modele_outils: true, abonnement_actif: true },
    [U.eduAncien]: { plan: 'educateur', modele_outils: false, abonnement_actif: true },
    [U.club]: { plan: 'club', modele_outils: true, abonnement_actif: true },
    [U.clubImpaye]: { plan: 'club', modele_outils: true, abonnement_actif: false },
    [U.joueur]: { plan: 'joueur_starter', modele_outils: true, abonnement_actif: false },
  }
  const lignes = new Map()
  const essais = new Set()
  const cle = (c, o) => `${c}|${o}`
  return {
    lignes, essais,
    donnees: {
      profil: async (cid) => profils[cid] || null,
      ligne: async (c, o) => lignes.get(cle(c, o)) || null,
      marquerEssai: async (c, o) => { if (essais.has(cle(c, o))) return false; essais.add(cle(c, o)); return true },
      oublierEssai: async (c, o) => { essais.delete(cle(c, o)) },
      poserLigne: async (l) => { if (panneLigne) throw new Error('panne'); lignes.set(cle(l.compte_id, l.outil), { source: l.source, fin_le: l.fin_le }) },
      supprimerLigne: async (c, o) => { lignes.delete(cle(c, o)) },
    },
  }
}

const reponse = () => {
  const r = { code: null, corps: null }
  r.status = (c) => { r.code = c; return r }
  r.json = (b) => { r.corps = b; return r }
  return r
}

async function appeler(m, utilisateur, corps) {
  const handler = creerHandler({
    verifierJeton: async (j) => (j === 'jeton' ? { id: utilisateur } : null),
    donnees: m.donnees,
    maintenant: () => NOW,
    essaisGratuits: true,
  })
  const res = reponse()
  await handler({ method: 'POST', headers: { authorization: 'Bearer jeton' }, body: corps }, res)
  return res
}

test('sans jeton : 401, rien n\'est écrit', async () => {
  const m = monde()
  const handler = creerHandler({ verifierJeton: async () => null, donnees: m.donnees })
  const res = reponse()
  await handler({ method: 'POST', headers: {}, body: { action: 'essai', outil: 'seances' } }, res)
  assert.equal(res.code, 401)
  assert.equal(m.lignes.size, 0)
})

test('action inconnue : 400', async () => {
  assert.equal((await appeler(monde(), U.edu, { action: 'rembourser' })).code, 400)
})

test('essai : démarre 14 jours, une seule fois par outil', async () => {
  const m = monde()
  const res = await appeler(m, U.edu, { action: 'essai', outil: 'tactique' })
  assert.equal(res.code, 200)
  assert.equal(res.corps.fin_le, '2026-11-23T12:00:00.000Z')
  assert.deepEqual(m.lignes.get(`${U.edu}|tactique`), { source: 'essai', fin_le: '2026-11-23T12:00:00.000Z' })
  const second = await appeler(m, U.edu, { action: 'essai', outil: 'tactique' })
  assert.equal(second.code, 409)
})

test('essai : un essai terminé ne se relance pas', async () => {
  const m = monde()
  await appeler(m, U.edu, { action: 'essai', outil: 'seances' })
  m.lignes.set(`${U.edu}|seances`, { source: 'essai', fin_le: '2026-11-01T00:00:00Z' })
  const res = await appeler(m, U.edu, { action: 'essai', outil: 'seances' })
  assert.equal(res.code, 409)
})

test('essai : refus pour outil inconnu, non achetable, compte sans le nouveau modèle, club, joueur', async () => {
  const m = monde()
  assert.equal((await appeler(m, U.edu, { action: 'essai', outil: 'nimporte' })).code, 400)
  assert.equal((await appeler(m, U.edu, { action: 'essai', outil: 'stages' })).code, 400)
  assert.equal((await appeler(m, U.eduAncien, { action: 'essai', outil: 'seances' })).code, 403)
  assert.equal((await appeler(m, U.club, { action: 'essai', outil: 'seances' })).code, 403)
  assert.equal((await appeler(m, U.joueur, { action: 'essai', outil: 'seances' })).code, 403)
  assert.equal(m.lignes.size, 0)
  assert.equal(m.essais.size, 0)
})

test('essai : un outil déjà actif est refusé sans consommer l\'essai', async () => {
  const m = monde()
  m.lignes.set(`${U.edu}|seances`, { source: 'achat', fin_le: null })
  assert.equal((await appeler(m, U.edu, { action: 'essai', outil: 'seances' })).code, 409)
  assert.equal(m.essais.size, 0)
})

test('essai : si l\'écriture échoue, l\'essai est rendu', async () => {
  const m = monde({ panneLigne: true })
  const res = await appeler(m, U.edu, { action: 'essai', outil: 'seances' })
  assert.equal(res.code, 500)
  assert.equal(m.essais.size, 0)
})

test('club : ajoute et retire un outil inclus dans le forfait', async () => {
  const m = monde()
  assert.equal((await appeler(m, U.club, { action: 'choisir_club', outil: 'finances', actif: true })).code, 200)
  assert.deepEqual(m.lignes.get(`${U.club}|finances`), { source: 'forfait', fin_le: null })
  assert.equal((await appeler(m, U.club, { action: 'choisir_club', outil: 'finances', actif: false })).code, 200)
  assert.equal(m.lignes.size, 0)
})

test('club : refus pour un éducateur, un club impayé, un outil inconnu ou un choix manquant', async () => {
  const m = monde()
  assert.equal((await appeler(m, U.edu, { action: 'choisir_club', outil: 'finances', actif: true })).code, 403)
  assert.equal((await appeler(m, U.clubImpaye, { action: 'choisir_club', outil: 'finances', actif: true })).code, 403)
  assert.equal((await appeler(m, U.club, { action: 'choisir_club', outil: 'seances', actif: true })).code, 400)
  assert.equal((await appeler(m, U.club, { action: 'choisir_club', outil: 'finances' })).code, 400)
  assert.equal(m.lignes.size, 0)
})

test('club : retirer ne touche pas un outil qui ne vient pas du forfait', async () => {
  const m = monde()
  m.lignes.set(`${U.club}|vie_club`, { source: 'offre', fin_le: '2027-01-01T00:00:00Z' })
  await appeler(m, U.club, { action: 'choisir_club', outil: 'vie_club', actif: false })
  assert.equal(m.lignes.size, 1)
})

// verifier-prix : réservé aux administrateurs, compare catalogue et Stripe.
async function appelerPrix(utilisateur, { admin = true, stripe = [], panneConfig = false } = {}) {
  const m = monde()
  m.donnees.estAdmin = async () => admin
  m.donnees.prixStripe = async () => {
    if (panneConfig) throw new Error('config_stripe_absente')
    return stripe
  }
  return appeler(m, utilisateur, { action: 'verifier-prix' })
}

const tousLesPrix = (live = false) => lignesStripe().map(l => ({ cle: l.cle, montant: l.montant, devise: 'eur', intervalle: l.intervalle, live }))

test('verifier-prix : refusé à un non administrateur', async () => {
  assert.equal((await appelerPrix(U.edu, { admin: false })).code, 403)
})

test('verifier-prix : tout est conforme en mode test', async () => {
  const res = await appelerPrix(U.edu, { stripe: tousLesPrix() })
  assert.equal(res.code, 200)
  assert.equal(res.corps.ok, true)
  assert.equal(res.corps.total, 30)
  assert.equal(res.corps.mode, 'test')
})

test('verifier-prix : signale un prix manquant et un montant différent', async () => {
  const prix = tousLesPrix().slice(2)
  prix[0] = { ...prix[0], montant: prix[0].montant + 100 }
  const res = await appelerPrix(U.edu, { stripe: prix })
  assert.equal(res.corps.ok, false)
  assert.equal(res.corps.manquants.length, 2)
  assert.deepEqual(res.corps.differents, [prix[0].cle])
})

test('verifier-prix : clé Stripe absente côté serveur : 503 explicite', async () => {
  assert.equal((await appelerPrix(U.edu, { panneConfig: true })).code, 503)
})

// payer : premier paiement, Stripe simulé.
function mondePaiement({ equipes = 3, abonnementEnCours = false, prix = tousLesPrix(), panneConfig = false } = {}) {
  const m = monde()
  m.sessions = []
  m.clients = []
  m.donnees.nbEquipes = async () => equipes
  m.donnees.prixStripe = async (cles) => {
    if (panneConfig) throw new Error('config_stripe_absente')
    return prix.filter(p => cles.includes(p.cle)).map(p => ({ ...p, id: `price_${p.cle}` }))
  }
  m.donnees.clientStripe = async (c) => { m.clients.push(c); return 'cus_test' }
  m.donnees.abonnementEnCours = async () => abonnementEnCours
  m.donnees.creerSessionPaiement = async (params) => { m.sessions.push(params); return { url: 'https://checkout.stripe.com/c/pay/test' } }
  return m
}

const payer = (m, utilisateur, params, origin) => {
  const handler = creerHandler({
    verifierJeton: async () => ({ id: utilisateur }), donnees: m.donnees, maintenant: () => NOW,
  })
  const res = reponse()
  return handler({ method: 'POST', headers: { authorization: 'Bearer jeton', origin }, body: { action: 'payer', ...params } }, res).then(() => res)
}

test('payer : éducateur, deux outils en mensuel, une session à deux lignes', async () => {
  const m = mondePaiement()
  const res = await payer(m, U.edu, { outils: ['seances', 'tactique'], periodicite: 'mensuel' }, 'https://digitalfootball.academy')
  assert.equal(res.code, 200)
  assert.equal(res.corps.url, 'https://checkout.stripe.com/c/pay/test')
  const s = m.sessions[0]
  assert.equal(s.mode, 'subscription')
  assert.equal(s.customer, 'cus_test')
  assert.equal(s.client_reference_id, U.edu)
  assert.deepEqual(s.line_items, [
    { price: 'price_outil_educateur_seances_mensuel', quantity: 1 },
    { price: 'price_outil_educateur_tactique_mensuel', quantity: 1 },
  ])
  assert.deepEqual(s.metadata, { offre: 'outils', compte_id: U.edu, role: 'educateur' })
  assert.deepEqual(s.subscription_data.metadata, s.metadata)
  assert.equal(s.success_url, 'https://digitalfootball.academy/educateur?outils=paye')
  assert.equal(s.cancel_url, 'https://digitalfootball.academy/educateur?outils=annule')
  // Rien n'est activé avant le webhook.
  assert.equal(m.lignes.size, 0)
})

test('payer : club, forfait annuel selon ses équipes', async () => {
  const m = mondePaiement({ equipes: 5 })
  const res = await payer(m, U.clubImpaye, { palier: 'c200', periodicite: 'annuel' })
  assert.equal(res.code, 200)
  assert.deepEqual(m.sessions[0].line_items, [{ price: 'price_forfait_club_c200_annuel', quantity: 1 }])
  assert.equal(m.sessions[0].metadata.role, 'club')
  assert.equal(m.sessions[0].success_url, 'https://digitalfootball.academy/club?outils=paye')
})

test('payer : club, un forfait trop petit pour ses équipes est refusé', async () => {
  const m = mondePaiement({ equipes: 5 })
  const res = await payer(m, U.club, { palier: 'c100', periodicite: 'mensuel' })
  assert.equal(res.code, 400)
  assert.equal(m.sessions.length, 0)
})

test('payer : refus des demandes non valables, sans appel à Stripe', async () => {
  const cas = [
    [U.edu, { outils: [], periodicite: 'mensuel' }, 400],
    [U.edu, { outils: ['seances'], periodicite: 'trimestriel' }, 400],
    [U.edu, { outils: ['seances', 'seances'], periodicite: 'mensuel' }, 400],
    [U.edu, { outils: ['stages'], periodicite: 'mensuel' }, 400],
    [U.edu, { outils: ['finances'], periodicite: 'mensuel' }, 400],
    [U.edu, { outils: 'seances', periodicite: 'mensuel' }, 400],
    [U.eduAncien, { outils: ['seances'], periodicite: 'mensuel' }, 403],
    [U.joueur, { outils: ['seances'], periodicite: 'mensuel' }, 403],
  ]
  for (const [qui, params, code] of cas) {
    const m = mondePaiement()
    const res = await payer(m, qui, params)
    assert.equal(res.code, code, JSON.stringify(params))
    assert.equal(m.sessions.length, 0)
    assert.equal(m.clients.length, 0)
  }
})

test('payer : un outil déjà payé est refusé, un outil en essai peut être payé', async () => {
  const m = mondePaiement()
  m.lignes.set(`${U.edu}|seances`, { source: 'achat', fin_le: null })
  m.lignes.set(`${U.edu}|tactique`, { source: 'essai', fin_le: '2026-11-20T00:00:00Z' })
  assert.equal((await payer(m, U.edu, { outils: ['seances'], periodicite: 'mensuel' })).code, 409)
  assert.equal((await payer(m, U.edu, { outils: ['tactique'], periodicite: 'mensuel' })).code, 200)
})

test('payer : un abonnement déjà en cours bloque un second premier paiement', async () => {
  const m = mondePaiement({ abonnementEnCours: true })
  assert.equal((await payer(m, U.edu, { outils: ['seances'], periodicite: 'annuel' })).code, 409)
  assert.equal(m.sessions.length, 0)
})

test('payer : prix absent ou différent dans Stripe, clé absente : 503, aucune session', async () => {
  const sansSeances = tousLesPrix().filter(p => p.cle !== 'outil_educateur_seances_mensuel')
  const fausse = tousLesPrix().map(p => (p.cle === 'outil_educateur_seances_mensuel' ? { ...p, montant: 100 } : p))
  for (const opts of [{ prix: sansSeances }, { prix: fausse }, { panneConfig: true }]) {
    const m = mondePaiement(opts)
    const res = await payer(m, U.edu, { outils: ['seances'], periodicite: 'mensuel' })
    assert.equal(res.code, 503)
    assert.equal(m.sessions.length, 0)
  }
})

test('payer : retour vers une origine connue, sinon le site de production', async () => {
  for (const [origin, attendu] of [
    ['http://localhost:5173', 'http://localhost:5173'],
    ['https://digital-football-accademy.vercel.app', 'https://digital-football-accademy.vercel.app'],
    ['https://site-pirate.example', 'https://digitalfootball.academy'],
    [undefined, 'https://digitalfootball.academy'],
  ]) {
    const m = mondePaiement()
    await payer(m, U.edu, { outils: ['seances'], periodicite: 'mensuel' }, origin)
    assert.equal(m.sessions[0].success_url, `${attendu}/educateur?outils=paye`)
  }
})

test('essais gratuits suspendus (réglage par défaut) : refus, rien n\'est écrit', async () => {
  const m = monde()
  const handler = creerHandler({ verifierJeton: async () => ({ id: U.edu }), donnees: m.donnees, maintenant: () => NOW })
  const res = reponse()
  await handler({ method: 'POST', headers: { authorization: 'Bearer jeton' }, body: { action: 'essai', outil: 'tactique' } }, res)
  assert.equal(res.code, 403)
  assert.equal(m.lignes.size, 0)
  assert.equal(m.essais.size, 0)
})
