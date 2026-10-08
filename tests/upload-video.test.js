/* global process */
// Tests de api/upload-video.js — sans réseau ni secret réel : le
// vérificateur de jeton et la configuration Cloudinary sont injectés.
// Lancer : npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { v2 as cloudinary } from 'cloudinary'
import { creerHandler, lireJeton, TYPES_UPLOAD, verifierJetonSupabase } from '../api/upload-video.js'

const SECRET = 'secret-de-test-ne-doit-jamais-sortir'
const config = { cloud_name: 'cloud-test', api_key: 'cle-publique-test', api_secret: SECRET }
const JETONS = { 'jeton-A': { id: 'utilisateur-A' } }

function reponse() {
  const r = { statut: null, corps: null }
  r.status = (s) => { r.statut = s; return r }
  r.json = (c) => { r.corps = c; return r }
  return r
}

function handlerAvec({ verifierJeton, lireConfig = () => config } = {}) {
  const appels = []
  const verif = verifierJeton || (async (jeton) => { appels.push(jeton); return JETONS[jeton] || null })
  return { handler: creerHandler({ verifierJeton: verif, lireConfig, maintenant: () => 1_760_000_000_000 }), appels }
}

const requete = ({ methode = 'POST', auth, corps = {} } = {}) => ({
  method: methode, headers: auth ? { authorization: auth } : {}, body: corps,
})

test('refuse toute méthode autre que POST', async () => {
  const { handler } = handlerAvec()
  const res = reponse()
  await handler(requete({ methode: 'GET', auth: 'Bearer jeton-A' }), res)
  assert.equal(res.statut, 405)
})

test('anonyme (sans en-tête Authorization) : 401, aucune signature, vérificateur non appelé', async () => {
  const { handler, appels } = handlerAvec()
  const res = reponse()
  await handler(requete({ corps: { userId: 'utilisateur-A' } }), res)
  assert.equal(res.statut, 401)
  assert.equal(res.corps.params, undefined)
  assert.equal(appels.length, 0)
})

test('en-tête mal formé : 401', async () => {
  for (const auth of ['jeton-A', 'Token jeton-A', 'Bearer', 'Bearer ', 'Bearer a b']) {
    const { handler } = handlerAvec()
    const res = reponse()
    await handler(requete({ auth }), res)
    assert.equal(res.statut, 401, `en-tête « ${auth} » accepté à tort`)
  }
})

test('jeton invalide ou expiré : 401', async () => {
  const { handler } = handlerAvec()
  const res = reponse()
  await handler(requete({ auth: 'Bearer jeton-inconnu' }), res)
  assert.equal(res.statut, 401)
  assert.equal(res.corps.params, undefined)
})

test("utilisateur authentifié ne peut pas signer au nom d'un autre : userId du corps ignoré", async () => {
  const { handler } = handlerAvec()
  const res = reponse()
  await handler(requete({ auth: 'Bearer jeton-A', corps: { userId: 'utilisateur-B', folder: 'digital-football/utilisateur-B' } }), res)
  assert.equal(res.statut, 200)
  assert.equal(res.corps.params.folder, 'digital-football/utilisateur-A')
  assert.ok(!JSON.stringify(res.corps).includes('utilisateur-B'))
})

test('le secret Cloudinary ne figure jamais dans la réponse', async () => {
  const { handler } = handlerAvec()
  const res = reponse()
  await handler(requete({ auth: 'Bearer jeton-A' }), res)
  assert.equal(res.statut, 200)
  assert.ok(!JSON.stringify(res.corps).includes(SECRET))
  assert.equal(res.corps.api_secret, undefined)
})

test('signature valide et formats signés (vidéo par défaut)', async () => {
  const { handler } = handlerAvec()
  const res = reponse()
  await handler(requete({ auth: 'Bearer jeton-A' }), res)
  const { signature, api_key, ...signes } = res.corps.params
  assert.equal(api_key, config.api_key)
  assert.equal(res.corps.resource_type, 'video')
  assert.equal(signes.allowed_formats, TYPES_UPLOAD.video.allowed_formats)
  assert.equal(signature, cloudinary.utils.api_sign_request(signes, SECRET))
  // Retirer ou modifier allowed_formats invalide la signature.
  const sansFormats = { ...signes }; delete sansFormats.allowed_formats
  assert.notEqual(signature, cloudinary.utils.api_sign_request(sansFormats, SECRET))
  assert.notEqual(signature, cloudinary.utils.api_sign_request({ ...signes, allowed_formats: 'exe,html' }, SECRET))
})

test('type image (avatars) : formats image uniquement', async () => {
  const { handler } = handlerAvec()
  const res = reponse()
  await handler(requete({ auth: 'Bearer jeton-A', corps: { kind: 'image' } }), res)
  assert.equal(res.statut, 200)
  assert.equal(res.corps.resource_type, 'image')
  assert.equal(res.corps.params.allowed_formats, 'jpg,jpeg,png,webp')
})

test('type de fichier non prévu : 400', async () => {
  for (const kind of ['raw', 'exe', 'html', '__proto__', 'constructor', 'toString']) {
    const { handler } = handlerAvec()
    const res = reponse()
    await handler(requete({ auth: 'Bearer jeton-A', corps: { kind } }), res)
    assert.equal(res.statut, 400, `type « ${kind} » accepté à tort`)
  }
})

test('configuration Cloudinary absente : refus 500, aucune signature', async () => {
  const { handler } = handlerAvec({ lireConfig: () => null })
  const res = reponse()
  await handler(requete({ auth: 'Bearer jeton-A' }), res)
  assert.equal(res.statut, 500)
  assert.equal(res.corps.params, undefined)
})

test('vérificateur en erreur (ex. config Supabase absente) : refus 500, jamais de signature', async () => {
  const { handler } = handlerAvec({ verifierJeton: async () => { throw new Error('config_supabase_absente') } })
  const res = reponse()
  await handler(requete({ auth: 'Bearer jeton-A' }), res)
  assert.equal(res.statut, 500)
  assert.equal(res.corps.params, undefined)
})

test('vérificateur réel sans SUPABASE_URL/SERVICE_ROLE_KEY : lève une erreur (aucun appel réseau)', async () => {
  const sauve = { url: process.env.SUPABASE_URL, cle: process.env.SUPABASE_SERVICE_ROLE_KEY }
  delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SERVICE_ROLE_KEY
  try { await assert.rejects(() => verifierJetonSupabase('jeton-A'), /config_supabase_absente/) }
  finally {
    if (sauve.url) process.env.SUPABASE_URL = sauve.url
    if (sauve.cle) process.env.SUPABASE_SERVICE_ROLE_KEY = sauve.cle
  }
})

test('lireJeton', () => {
  assert.equal(lireJeton({ headers: { authorization: 'Bearer abc.def' } }), 'abc.def')
  assert.equal(lireJeton({ headers: {} }), null)
  assert.equal(lireJeton({}), null)
})
