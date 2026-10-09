// Tests de api/upload-montage-clip.js (sans réseau ni secret réel).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { creerHandler } from '../api/upload-montage-clip.js'

const config = { cloud_name: 'c', api_key: 'k', api_secret: 'secret-montage-test' }
const A = '00000000-0000-0000-0000-000000000001'
const B = '00000000-0000-0000-0000-000000000002'

async function appeler({ auth, corps = {}, lireConfig = () => config }) {
  const handler = creerHandler({ verifierJeton: async (j) => (j === 'jeton-A' ? { id: A } : null), lireConfig })
  const r = { statut: null, corps: null }
  r.status = (s) => { r.statut = s; return r }
  r.json = (c) => { r.corps = c; return r }
  await handler({ method: 'POST', headers: auth ? { authorization: auth } : {}, body: corps }, r)
  return r
}

test('anonyme ou jeton invalide : 401 sans signature', async () => {
  for (const auth of [undefined, 'Bearer inconnu']) {
    const r = await appeler({ auth, corps: { userId: A } })
    assert.equal(r.statut, 401)
    assert.equal(r.corps.params, undefined)
  }
})
test("montage au nom d'un autre joueur : 403", async () => {
  const r = await appeler({ auth: 'Bearer jeton-A', corps: { joueurId: B } })
  assert.equal(r.statut, 403)
  assert.equal(r.corps.params, undefined)
})
test('joueur connecté : dossier imposé, formats vidéo, secret absent', async () => {
  for (const corps of [{}, { joueurId: A }, { userId: B }]) {
    const r = await appeler({ auth: 'Bearer jeton-A', corps })
    assert.equal(r.statut, 200)
    assert.equal(r.corps.resource_type, 'video')
    assert.equal(r.corps.params.folder, `montages/${A}`)
    assert.equal(r.corps.params.allowed_formats, 'mp4,mov,webm')
    assert.ok(!JSON.stringify(r.corps).includes(config.api_secret))
  }
})
test('configuration absente : 500', async () => {
  const r = await appeler({ auth: 'Bearer jeton-A', lireConfig: () => null })
  assert.equal(r.statut, 500)
})
