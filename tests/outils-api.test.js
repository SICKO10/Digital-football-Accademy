// Tests de api/outils.js : jeton et accès aux données injectés, sans réseau.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { creerHandler } from '../api/outils.js'
import { lignesStripe } from '../src/lib/catalogueOutils.js'

const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`
const U = { edu: id(1), eduAncien: id(2), eduAffilie: id(3), eduAffilie2: id(4), club: id(10), clubImpaye: id(11), joueur: id(20), eduNeuf: id(30), clubNeuf: id(31), eduDejaPaye: id(32) }
const NOW = Date.parse('2026-11-09T12:00:00Z')

function monde({ panneLigne = false } = {}) {
  const profils = {
    [U.edu]: { plan: 'educateur', modele_outils: true, abonnement_actif: true },
    [U.eduAncien]: { plan: 'educateur', modele_outils: false, abonnement_actif: true },
    [U.club]: { plan: 'club', modele_outils: true, abonnement_actif: true },
    [U.clubImpaye]: { plan: 'club', modele_outils: true, abonnement_actif: false },
    [U.joueur]: { plan: 'joueur_starter', modele_outils: true, abonnement_actif: false },
    [U.eduNeuf]: { plan: 'educateur', modele_outils: false, abonnement_actif: false, abonnement_debut: null },
    [U.clubNeuf]: { plan: 'club', modele_outils: false, abonnement_actif: false, abonnement_debut: null },
    [U.eduDejaPaye]: { plan: 'educateur', modele_outils: false, abonnement_actif: false, abonnement_debut: '2026-01-01T00:00:00Z' },
  }
  const lignes = new Map()
  const essais = new Set()
  const ouverts = new Set()
  const notifs = []
  let panneNotif = false
  const cle = (c, o) => `${c}|${o}`
  return {
    lignes, essais, ouverts, notifs, profils,
    pannerNotifications: () => { panneNotif = true },
    donnees: {
      ouvert: async (c, o) => ouverts.has(cle(c, o)),
      ouvrirOutil: async (c, o) => { ouverts.add(cle(c, o)) },
      fermerOutil: async (c, o) => { ouverts.delete(cle(c, o)) },
      educateursDuClub: async (c) => (c === U.club ? [U.eduAffilie, U.eduAffilie2] : []),
      notifier: async (l) => { if (panneNotif) throw new Error('panne'); notifs.push(...l) },
      profil: async (cid) => profils[cid] || null,
      activerModele: async (cid, { ouvrirAcces }) => { profils[cid] = { ...profils[cid], modele_outils: true, ...(ouvrirAcces ? { abonnement_actif: true } : {}) } },
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

// Bloc 10 : le club ouvre ses outils à ses éducateurs affiliés.
const clubAvec = (m, outil) => m.lignes.set(`${U.club}|${outil}`, { source: 'forfait', fin_le: null })

test('ouvrir_club : le club ouvre un outil qu\'il a, sans prévenir personne', async () => {
  const m = monde()
  clubAvec(m, 'projet_sportif')
  assert.equal((await appeler(m, U.club, { action: 'ouvrir_club', outil: 'projet_sportif', ouvert: true })).code, 200)
  assert.ok(m.ouverts.has(`${U.club}|projet_sportif`))
  assert.equal(m.notifs.length, 0)
})

test('ouvrir_club : refus pour un outil que le club n\'a pas, sans équivalent éducateur, inconnu ou sans choix', async () => {
  const m = monde()
  assert.equal((await appeler(m, U.club, { action: 'ouvrir_club', outil: 'cff4', ouvert: true })).code, 409)
  clubAvec(m, 'finances')
  assert.equal((await appeler(m, U.club, { action: 'ouvrir_club', outil: 'finances', ouvert: true })).code, 400)
  assert.equal((await appeler(m, U.club, { action: 'ouvrir_club', outil: 'seances', ouvert: true })).code, 400)
  clubAvec(m, 'cff4')
  assert.equal((await appeler(m, U.club, { action: 'ouvrir_club', outil: 'cff4' })).code, 400)
  assert.equal(m.ouverts.size, 0)
})

test('ouvrir_club : réservé au club du nouveau modèle, abonnement actif', async () => {
  const m = monde()
  assert.equal((await appeler(m, U.edu, { action: 'ouvrir_club', outil: 'cff4', ouvert: true })).code, 403)
  assert.equal((await appeler(m, U.clubImpaye, { action: 'ouvrir_club', outil: 'cff4', ouvert: true })).code, 403)
  assert.equal((await appeler(m, U.eduAncien, { action: 'ouvrir_club', outil: 'cff4', ouvert: true })).code, 403)
  assert.equal(m.ouverts.size, 0)
})

test('ouvrir_club : fermer un outil ouvert prévient les éducateurs, et note celui qui le paie déjà', async () => {
  const m = monde()
  clubAvec(m, 'cff4')
  m.ouverts.add(`${U.club}|cff4`)
  m.lignes.set(`${U.eduAffilie2}|cff4`, { source: 'achat', fin_le: null })
  assert.equal((await appeler(m, U.club, { action: 'ouvrir_club', outil: 'cff4', ouvert: false })).code, 200)
  assert.equal(m.ouverts.size, 0)
  assert.equal(m.notifs.length, 2)
  const sans = m.notifs.find(n => n.user_id === U.eduAffilie)
  const avec = m.notifs.find(n => n.user_id === U.eduAffilie2)
  assert.equal(sans.type, 'outil_club_retire')
  assert.equal(sans.contenu, 'Ton club ne te fournit plus l\'outil Projet Club CFF4 depuis aujourd\'hui.')
  assert.match(avec.contenu, /Tu le gardes grâce à ton propre abonnement/)
})

test('ouvrir_club : fermer un outil qui n\'était pas ouvert ne prévient personne', async () => {
  const m = monde()
  clubAvec(m, 'cff4')
  assert.equal((await appeler(m, U.club, { action: 'ouvrir_club', outil: 'cff4', ouvert: false })).code, 200)
  assert.equal(m.notifs.length, 0)
})

test('ouvrir_club : une panne de notification ne bloque pas le club', async () => {
  const m = monde()
  clubAvec(m, 'cff4')
  m.ouverts.add(`${U.club}|cff4`)
  m.pannerNotifications()
  assert.equal((await appeler(m, U.club, { action: 'ouvrir_club', outil: 'cff4', ouvert: false })).code, 200)
  assert.equal(m.ouverts.size, 0)
})

test('club : retirer un outil ouvert aux éducateurs le ferme et prévient', async () => {
  const m = monde()
  clubAvec(m, 'stages')
  m.ouverts.add(`${U.club}|stages`)
  assert.equal((await appeler(m, U.club, { action: 'choisir_club', outil: 'stages', actif: false })).code, 200)
  assert.equal(m.lignes.size, 0)
  assert.equal(m.ouverts.size, 0)
  assert.equal(m.notifs.length, 2)
  assert.match(m.notifs[0].contenu, /Stages/)
})

test('club : retirer un outil non ouvert ne prévient personne', async () => {
  const m = monde()
  clubAvec(m, 'stages')
  await appeler(m, U.club, { action: 'choisir_club', outil: 'stages', actif: false })
  assert.equal(m.notifs.length, 0)
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
  assert.equal(res.corps.total, 18)
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

test('payer : éducateur, deux outils en mensuel, une seule ligne : le palier jusqu\'à 3 outils', async () => {
  const m = mondePaiement()
  const res = await payer(m, U.edu, { outils: ['seances', 'tactique'], periodicite: 'mensuel' }, 'https://digitalfootball.academy')
  assert.equal(res.code, 200)
  assert.equal(res.corps.url, 'https://checkout.stripe.com/c/pay/test')
  const s = m.sessions[0]
  assert.equal(s.mode, 'subscription')
  assert.equal(s.customer, 'cus_test')
  assert.equal(s.client_reference_id, U.edu)
  assert.deepEqual(s.line_items, [{ price: 'price_pack_educateur_3_mensuel', quantity: 1 }])
  // Les outils choisis partent avec le paiement : le webhook les active.
  assert.deepEqual(s.metadata, { offre: 'outils', compte_id: U.edu, role: 'educateur', outils: 'seances,tactique' })
  assert.deepEqual(s.subscription_data.metadata, s.metadata)
  assert.equal(s.allow_promotion_codes, true)
  assert.equal(s.success_url, 'https://digitalfootball.academy/educateur?outils=paye')
  assert.equal(s.cancel_url, 'https://digitalfootball.academy/educateur?outils=annule')
  // Rien n'est activé avant le webhook.
  assert.equal(m.lignes.size, 0)
})

test('payer : le palier suit le nombre d\'outils (3, 6, puis tous les outils dès 7)', async () => {
  const tous = ['suivi_joueurs', 'stats_collectives', 'seances', 'tactique', 'bibliotheque', 'prep_physique', 'evaluations_video', 'projet_sportif', 'cff4']
  for (const [n, prix, annuel] of [[1, 'pack_educateur_3_mensuel'], [3, 'pack_educateur_3_mensuel'], [4, 'pack_educateur_6_mensuel'], [6, 'pack_educateur_6_mensuel'], [7, 'pack_educateur_mensuel'], [9, 'pack_educateur_mensuel'], [5, 'pack_educateur_6_annuel', true], [8, 'pack_educateur_annuel', true]]) {
    const m = mondePaiement()
    const res = await payer(m, U.edu, { outils: tous.slice(0, n), periodicite: annuel ? 'annuel' : 'mensuel' })
    assert.equal(res.code, 200, `${n} outils`)
    assert.deepEqual(m.sessions[0].line_items, [{ price: `price_${prix}`, quantity: 1 }], `${n} outils`)
    // À partir de 7 outils, le palier donne les 9.
    assert.equal(m.sessions[0].metadata.outils, (n >= 7 ? tous : tous.slice(0, n)).join(','), `${n} outils`)
  }
})

test('payer : offre tous les outils demandée directement (pack), et plus de 9 outils refusé', async () => {
  const m = mondePaiement()
  const res = await payer(m, U.edu, { pack: true, periodicite: 'annuel' })
  assert.equal(res.code, 200)
  assert.deepEqual(m.sessions[0].line_items, [{ price: 'price_pack_educateur_annuel', quantity: 1 }])
  const trop = await payer(mondePaiement(), U.edu, { outils: ['seances', 'seances'], periodicite: 'mensuel' })
  assert.equal(trop.code, 400)
})

test('payer : offre tous les outils refusée si un outil est déjà payé, et pour un club', async () => {
  const m = mondePaiement()
  m.lignes.set(`${U.edu}|seances`, { source: 'achat', fin_le: null })
  assert.equal((await payer(m, U.edu, { pack: true, periodicite: 'mensuel' })).code, 409)
  assert.equal((await payer(mondePaiement(), U.club, { pack: true, periodicite: 'mensuel' })).code, 400)
  assert.equal(m.sessions.length, 0)
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
  const sansSeances = tousLesPrix().filter(p => p.cle !== 'pack_educateur_3_mensuel')
  const fausse = tousLesPrix().map(p => (p.cle === 'pack_educateur_3_mensuel' ? { ...p, montant: 100 } : p))
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

test('composer : un éducateur neuf passe au nouveau modèle et son socle gratuit s\'ouvre', async () => {
  const m = monde()
  const res = await appeler(m, U.eduNeuf, { action: 'composer', outils: [] })
  assert.equal(res.code, 200)
  assert.equal(m.profils[U.eduNeuf].modele_outils, true)
  assert.equal(m.profils[U.eduNeuf].abonnement_actif, true)
  assert.equal(m.lignes.size, 0)
  // Rejoué : rien ne change.
  assert.equal((await appeler(m, U.eduNeuf, { action: 'composer', outils: [] })).code, 200)
})

test('composer : un club neuf reçoit ses outils choisis mais son accès attend le paiement', async () => {
  const m = monde()
  const res = await appeler(m, U.clubNeuf, { action: 'composer', outils: ['competition', 'vie_club'] })
  assert.equal(res.code, 200)
  assert.equal(m.profils[U.clubNeuf].modele_outils, true)
  assert.equal(m.profils[U.clubNeuf].abonnement_actif, false)
  assert.deepEqual(m.lignes.get(`${U.clubNeuf}|competition`), { source: 'forfait', fin_le: null })
  assert.deepEqual(m.lignes.get(`${U.clubNeuf}|vie_club`), { source: 'forfait', fin_le: null })
})

test('composer : refus pour un outil inconnu ou en double, un compte qui a déjà payé, un joueur', async () => {
  const m = monde()
  assert.equal((await appeler(m, U.clubNeuf, { action: 'composer', outils: ['nimporte'] })).code, 400)
  assert.equal((await appeler(m, U.clubNeuf, { action: 'composer', outils: ['vie_club', 'vie_club'] })).code, 400)
  assert.equal((await appeler(m, U.eduDejaPaye, { action: 'composer', outils: [] })).code, 409)
  assert.equal((await appeler(m, U.eduAncien, { action: 'composer', outils: [] })).code, 409)
  assert.equal((await appeler(m, U.joueur, { action: 'composer', outils: [] })).code, 403)
  assert.equal(m.profils[U.clubNeuf].modele_outils, false)
  assert.equal(m.profils[U.eduDejaPaye].modele_outils, false)
  assert.equal(m.lignes.size, 0)
})
