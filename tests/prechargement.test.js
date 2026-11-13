import test from 'node:test'
import assert from 'node:assert/strict'
import { memoriserVue, derniereVue, precharger } from '../src/lib/prechargement.js'

function stockage() {
  const m = new Map()
  globalThis.localStorage = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }
  return m
}

test('dernière vue : mémorisée pour les dashboards connus, ignorée sinon', () => {
  stockage()
  assert.equal(derniereVue(), null)
  memoriserVue('/educateur')
  assert.equal(derniereVue(), '/educateur')
  memoriserVue('/admin-inconnu')
  assert.equal(derniereVue(), '/educateur')
  memoriserVue('/club')
  assert.equal(derniereVue(), '/club')
})

test('dernière vue : valeur inconnue en stockage ignorée, stockage indisponible sans erreur', () => {
  const m = stockage()
  m.set('df_derniere_vue', '/n-importe-quoi')
  assert.equal(derniereVue(), null)
  delete globalThis.localStorage
  assert.equal(derniereVue(), null)
  assert.doesNotThrow(() => memoriserVue('/club'))
  assert.doesNotThrow(() => precharger(null))
  assert.doesNotThrow(() => precharger('/inconnu'))
})
