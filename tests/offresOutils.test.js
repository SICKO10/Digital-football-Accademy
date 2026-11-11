// Offres d'essai de l'administrateur (bloc 12) : logique pure et action `offrir` de api/outils.js.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { planOffre, lireOffre, offreDejaCouverte, notificationOffre, outilsOffrables, dureeValide } from '../src/lib/offresOutils.js'
import { creerHandler } from '../api/outils.js'
import { etatsOutils } from '../src/lib/outilsAcces.js'

const NOW = Date.parse('2026-11-11T12:00:00Z')
const JOUR = 86400000
const dans = (j) => new Date(NOW + j * JOUR).toISOString()
const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`
const ADMIN = id(900)
const E = { a: id(1), b: id(2), c: id(3), d: id(4) }
const C = { actif: id(10), impaye: id(11) }

test('durée : entier de 1 à 365', () => {
  assert.ok(dureeValide(1) && dureeValide(30) && dureeValide(365))
  assert.ok(!dureeValide(0) && !dureeValide(366) && !dureeValide(1.5) && !dureeValide('30') && !dureeValide(NaN))
})

test('outils offrables : les achetables côté éducateur (pas Stages), tous côté club', () => {
  const edu = outilsOffrables('educateur').map(o => o.id)
  assert.ok(edu.includes('seances') && !edu.includes('stages'))
  assert.ok(outilsOffrables('club').some(o => o.id === 'finances'))
})

test('lireOffre : rôle, outil et durée contrôlés', () => {
  assert.equal(lireOffre({ role: 'educateur', outil: 'seances', jours: 30 }).outil.id, 'seances')
  assert.ok(lireOffre({ role: 'joueur', outil: 'seances', jours: 30 }).erreur)
  assert.ok(lireOffre({ role: 'educateur', outil: 'stages', jours: 30 }).erreur)
  assert.ok(lireOffre({ role: 'educateur', outil: 'finances', jours: 30 }).erreur)
  assert.ok(lireOffre({ role: 'educateur', outil: 'seances', jours: 0 }).erreur)
})

test('offreDejaCouverte : abonnement, forfait, essai ou offre assez longs seulement', () => {
  const fin = NOW + 30 * JOUR
  assert.equal(offreDejaCouverte(null, fin, NOW), false)
  assert.equal(offreDejaCouverte({ source: 'achat', fin_le: null }, fin, NOW), true)
  assert.equal(offreDejaCouverte({ source: 'forfait', fin_le: null }, fin, NOW), true)
  assert.equal(offreDejaCouverte({ source: 'essai', fin_le: dans(40) }, fin, NOW), true)
  assert.equal(offreDejaCouverte({ source: 'offre', fin_le: dans(10) }, fin, NOW), false)
  assert.equal(offreDejaCouverte({ source: 'achat', fin_le: dans(5) }, fin, NOW), false)
  assert.equal(offreDejaCouverte({ source: 'essai', fin_le: dans(-1) }, fin, NOW), false)
})

test('planOffre : répartit offerts, déjà couverts et clubs sans forfait', () => {
  const lignes = [
    { compte_id: E.a, source: 'achat', fin_le: null },
    { compte_id: E.b, source: 'essai', fin_le: dans(5) },
  ]
  const p = planOffre({ role: 'educateur', comptes: [{ id: E.a }, { id: E.b }, { id: E.c }], lignes, jours: 30, maintenantMs: NOW })
  assert.deepEqual(p.aOffrir, [E.b, E.c])
  assert.equal(p.deja, 1)
  assert.equal(p.finLe, dans(30))
  const club = planOffre({ role: 'club', comptes: [{ id: C.actif, abonnement_actif: true }, { id: C.impaye, abonnement_actif: false }], jours: 7, maintenantMs: NOW })
  assert.deepEqual(club.aOffrir, [C.actif])
  assert.equal(club.sansForfait, 1)
})

test('notification : texte clair, sans tiret long', () => {
  const n = notificationOffre({ role: 'educateur', outil: { nom: 'Séances' }, jours: 30, finLe: dans(30) })
  assert.equal(n.type, 'outil_offert')
  assert.match(n.contenu, /Séances pendant 30 jours/)
  assert.doesNotMatch(n.titre + n.contenu, /[–—]/)
  assert.equal(n.lien, '/educateur')
})

test('Mes outils : une offre affiche ses jours restants', () => {
  const etats = etatsOutils({ role: 'educateur', lignes: [{ outil: 'seances', source: 'offre', fin_le: dans(30) }], maintenant: new Date(NOW) })
  const s = etats.find(e => e.outil.id === 'seances')
  assert.equal(s.etat, 'offre')
  assert.equal(s.joursRestants, 30)
})

// ── Action serveur ──────────────────────────────────────────────────────────

function monde({ admin = true, panneNotif = false } = {}) {
  const profils = {
    [E.a]: { email: 'a@test.fr', plan: 'educateur', modele_outils: true, abonnement_actif: true },
    [E.b]: { email: 'b@test.fr', plan: 'educateur', modele_outils: true, abonnement_actif: true },
    [E.c]: { email: 'c@test.fr', plan: 'educateur', modele_outils: true, abonnement_actif: true },
    [E.d]: { email: 'ancien@test.fr', plan: 'educateur', modele_outils: false, abonnement_actif: true },
    [C.actif]: { email: 'club@test.fr', plan: 'club', modele_outils: true, abonnement_actif: true },
    [C.impaye]: { email: 'impaye@test.fr', plan: 'club', modele_outils: true, abonnement_actif: false },
  }
  const lignes = new Map([[`${E.a}|seances`, { compte_id: E.a, outil: 'seances', source: 'achat', fin_le: null }]])
  const essais = new Set()
  const notifs = []
  const m = {
    lignes, essais, notifs,
    donnees: {
      estAdmin: async (u) => admin && u === ADMIN,
      profil: async (cid) => profils[cid] || null,
      compteParEmail: async (email) => {
        const e = Object.entries(profils).find(([, p]) => p.email === email)
        return e ? { id: e[0], ...e[1] } : null
      },
      comptesDuRole: async (role) => Object.entries(profils).filter(([, p]) => p.plan === role && p.modele_outils).map(([i, p]) => ({ id: i, abonnement_actif: p.abonnement_actif })),
      lignesOutil: async (ids, outil) => [...lignes.values()].filter(l => l.outil === outil && ids.includes(l.compte_id)),
      poserOffres: async (l) => { for (const x of l) lignes.set(`${x.compte_id}|${x.outil}`, x) },
      notifier: async (l) => { if (panneNotif) throw new Error('panne'); notifs.push(...l) },
      marquerEssai: async (c, o) => { essais.add(`${c}|${o}`); return true },
    },
  }
  return m
}

const reponse = () => {
  const r = { code: null, corps: null }
  r.status = (c) => { r.code = c; return r }
  r.json = (b) => { r.corps = b; return r }
  return r
}
async function appeler(m, utilisateur, corps) {
  const handler = creerHandler({ verifierJeton: async (j) => (j === 'jeton' ? { id: utilisateur } : null), donnees: m.donnees, maintenant: () => NOW })
  const res = reponse()
  await handler({ method: 'POST', headers: { authorization: 'Bearer jeton' }, body: corps }, res)
  return res
}
const offre = (extra = {}) => ({ action: 'offrir', role: 'educateur', outil: 'seances', jours: 30, cible: 'compte', email: 'b@test.fr', ...extra })

test('offrir : refusé à un non administrateur, rien n\'est écrit', async () => {
  const m = monde({ admin: false })
  const r = await appeler(m, E.a, offre())
  assert.equal(r.code, 403)
  assert.equal(m.lignes.size, 1)
  assert.equal(m.notifs.length, 0)
})

test('offrir à un compte : ligne « offre » datée, notification, essai non consommé', async () => {
  const m = monde()
  const r = await appeler(m, ADMIN, offre())
  assert.equal(r.code, 200)
  assert.equal(r.corps.offerts, 1)
  assert.equal(r.corps.notifies, 1)
  const l = m.lignes.get(`${E.b}|seances`)
  assert.equal(l.source, 'offre')
  assert.equal(l.fin_le, dans(30))
  assert.equal(l.stripe_subscription_id, null)
  assert.equal(m.notifs[0].user_id, E.b)
  assert.equal(m.notifs[0].type, 'outil_offert')
  assert.equal(m.essais.size, 0)
})

test('offrir : un compte qui a déjà l\'outil payé n\'est pas touché', async () => {
  const m = monde()
  const r = await appeler(m, ADMIN, offre({ email: 'a@test.fr' }))
  assert.equal(r.code, 200)
  assert.equal(r.corps.offerts, 0)
  assert.equal(r.corps.deja, 1)
  assert.equal(m.lignes.get(`${E.a}|seances`).source, 'achat')
  assert.equal(m.notifs.length, 0)
})

test('offrir : adresse inconnue, mauvais rôle, ancien modèle, adresse invalide', async () => {
  const m = monde()
  assert.equal((await appeler(m, ADMIN, offre({ email: 'inconnu@test.fr' }))).code, 404)
  assert.equal((await appeler(m, ADMIN, offre({ email: 'club@test.fr' }))).code, 400)
  assert.equal((await appeler(m, ADMIN, offre({ email: 'ancien@test.fr' }))).code, 400)
  assert.equal((await appeler(m, ADMIN, offre({ email: '%@%.fr' }))).code, 400)
  assert.equal(m.lignes.size, 1)
})

test('offrir : durée, outil et rôle invalides refusés', async () => {
  const m = monde()
  assert.equal((await appeler(m, ADMIN, offre({ jours: 0 }))).code, 400)
  assert.equal((await appeler(m, ADMIN, offre({ jours: 400 }))).code, 400)
  assert.equal((await appeler(m, ADMIN, offre({ outil: 'inconnu' }))).code, 400)
  assert.equal((await appeler(m, ADMIN, offre({ role: 'joueur' }))).code, 400)
})

test('offrir à un groupe : l\'aperçu compte sans rien écrire', async () => {
  const m = monde()
  const r = await appeler(m, ADMIN, offre({ cible: 'groupe', apercu: true }))
  assert.equal(r.code, 200)
  assert.deepEqual([r.corps.total, r.corps.a_offrir, r.corps.deja], [3, 2, 1])
  assert.equal(m.lignes.size, 1)
  assert.equal(m.notifs.length, 0)
})

test('offrir à un groupe : exige la confirmation et le bon nombre', async () => {
  const m = monde()
  assert.equal((await appeler(m, ADMIN, offre({ cible: 'groupe' }))).code, 409)
  assert.equal((await appeler(m, ADMIN, offre({ cible: 'groupe', confirme: true }))).code, 409)
  assert.equal((await appeler(m, ADMIN, offre({ cible: 'groupe', confirme: true, attendu: 5 }))).code, 409)
  assert.equal(m.lignes.size, 1)
  const r = await appeler(m, ADMIN, offre({ cible: 'groupe', confirme: true, attendu: 2 }))
  assert.equal(r.code, 200)
  assert.equal(r.corps.offerts, 2)
  assert.equal(m.lignes.get(`${E.b}|seances`).source, 'offre')
  assert.equal(m.lignes.get(`${E.c}|seances`).source, 'offre')
  assert.equal(m.lignes.get(`${E.a}|seances`).source, 'achat')
  assert.equal(m.lignes.has(`${E.d}|seances`), false)
  assert.equal(m.notifs.length, 2)
})

test('offrir aux clubs : un club sans forfait actif est écarté', async () => {
  const m = monde()
  const apercu = await appeler(m, ADMIN, offre({ role: 'club', outil: 'finances', cible: 'groupe', apercu: true }))
  assert.deepEqual([apercu.corps.total, apercu.corps.a_offrir, apercu.corps.sans_forfait], [2, 1, 1])
  const r = await appeler(m, ADMIN, offre({ role: 'club', outil: 'finances', cible: 'groupe', confirme: true, attendu: 1 }))
  assert.equal(r.code, 200)
  assert.equal(m.lignes.get(`${C.actif}|finances`).source, 'offre')
  assert.equal(m.lignes.has(`${C.impaye}|finances`), false)
  assert.equal(m.notifs[0].lien, '/club')
})

test('offrir : une panne de notification ne défait pas l\'offre et le dit', async () => {
  const m = monde({ panneNotif: true })
  const r = await appeler(m, ADMIN, offre())
  assert.equal(r.code, 200)
  assert.equal(r.corps.offerts, 1)
  assert.equal(r.corps.notifies, 0)
  assert.equal(m.lignes.get(`${E.b}|seances`).source, 'offre')
})
