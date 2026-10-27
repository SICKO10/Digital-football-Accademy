// Tests de api/send-player-email.js — sans réseau ni secret : vérification
// du jeton, lecture du destinataire et envoi sont injectés.
// Lancer : npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { creerHandler, creerLimiteur } from '../api/send-player-email.js'

const DEST = '11111111-2222-3333-4444-555555555555'
const JETONS = { 'jeton-A': { id: 'expediteur-A' } }

function reponse() {
  const r = { statut: null, corps: null }
  r.status = (s) => { r.statut = s; return r }
  r.json = (c) => { r.corps = c; return r }
  return r
}

function monter({ destinataire = { email: 'joueur@example.com', prenom: 'Léo', actif: true }, limiteur } = {}) {
  const envois = []
  const handler = creerHandler({
    verifierJeton: async (j) => JETONS[j] || null,
    donnees: { destinataire: async () => destinataire },
    envoyer: async (mail) => { envois.push(mail); return { data: { id: 'x' } } },
    ...(limiteur ? { limiteur } : {}),
  })
  return { handler, envois }
}
const req = (body, jeton = 'jeton-A') => ({ method: 'POST', headers: jeton ? { authorization: `Bearer ${jeton}` } : {}, body })

test('sans jeton : refusé, aucun e-mail', async () => {
  const { handler, envois } = monter()
  const r = reponse()
  await handler(req({ type: 'like', userId: DEST }, null), r)
  assert.equal(r.statut, 401)
  assert.equal(envois.length, 0)
})

test("l'adresse fournie par le navigateur est ignorée : envoi au destinataire lu en base", async () => {
  const { handler, envois } = monter()
  const r = reponse()
  await handler(req({ type: 'message', userId: DEST, to: 'victime@example.com', contenu: 'Salut' }), r)
  assert.equal(r.statut, 200)
  assert.equal(envois.length, 1)
  assert.equal(envois[0].to, 'joueur@example.com')
})

test('type ou destinataire invalides : 400', async () => {
  const { handler, envois } = monter()
  for (const body of [{ type: 'inconnu', userId: DEST }, { type: 'like', userId: 'pas-un-uuid' }, { type: 'like' }]) {
    const r = reponse()
    await handler(req(body), r)
    assert.equal(r.statut, 400, JSON.stringify(body))
  }
  assert.equal(envois.length, 0)
})

test('contenu échappé, lien externe remplacé par le dashboard', async () => {
  const { handler, envois } = monter()
  const r = reponse()
  await handler(req({ type: 'commentaire', userId: DEST, contenu: '<a href="https://phishing.example">clique</a>', lien: 'https://phishing.example' }), r)
  assert.equal(r.statut, 200)
  assert.ok(!envois[0].html.includes('<a href="https://phishing'))
  assert.ok(envois[0].html.includes('&lt;a href='))
  assert.ok(envois[0].html.includes('https://digitalfootball.academy/dashboard'))
})

test('préférence e-mail désactivée : pas d\'envoi', async () => {
  const { handler, envois } = monter({ destinataire: { email: 'j@example.com', prenom: 'J', actif: false } })
  const r = reponse()
  await handler(req({ type: 'like', userId: DEST }), r)
  assert.equal(r.statut, 200)
  assert.equal(envois.length, 0)
})

test("limite d'envois par expéditeur", async () => {
  const { handler, envois } = monter({ limiteur: creerLimiteur({ max: 2 }) })
  const statuts = []
  for (let i = 0; i < 3; i++) { const r = reponse(); await handler(req({ type: 'like', userId: DEST }), r); statuts.push(r.statut) }
  assert.deepEqual(statuts, [200, 200, 429])
  assert.equal(envois.length, 2)
})
