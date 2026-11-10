// Script de création des produits Stripe : jouable deux fois sans doublon,
// et ne touche jamais à un prix existant qui diffère. Faux client Stripe, sans réseau.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { creer } from '../scripts/stripe-creer-produits-outils.mjs'
import { lignesStripe } from '../src/lib/catalogueOutils.js'

function fauxStripe() {
  const produits = new Map()
  const prix = new Map()
  return {
    produits, prix,
    products: {
      retrieve: async (id) => { if (!produits.has(id)) throw Object.assign(new Error('absent'), { code: 'resource_missing' }); return produits.get(id) },
      create: async (p) => { produits.set(p.id, { ...p, active: true }) },
      update: async (id, m) => { Object.assign(produits.get(id), m) },
    },
    prices: {
      list: async ({ lookup_keys: [cle] }) => ({ data: prix.has(cle) ? [prix.get(cle)] : [] }),
      create: async (p) => { prix.set(p.lookup_key, { unit_amount: p.unit_amount, currency: p.currency, recurring: p.recurring }) },
    },
  }
}

const muet = () => {}

test('création : 30 prix, 15 produits, puis relance sans rien recréer', async () => {
  const s = fauxStripe()
  const un = await creer(s, muet)
  assert.equal(un.crees, 30)
  assert.equal(s.produits.size, 15)
  const deux = await creer(s, muet)
  assert.equal(deux.crees, 0)
  assert.equal(deux.existants, 30)
  assert.deepEqual(deux.differents, [])
  assert.equal(s.prix.size, 30)
})

test('un prix existant différent est signalé, jamais modifié', async () => {
  const s = fauxStripe()
  const l = lignesStripe()[0]
  s.prix.set(l.cle, { unit_amount: 999, currency: 'eur', recurring: { interval: l.intervalle } })
  const bilan = await creer(s, muet)
  assert.equal(bilan.differents.length, 1)
  assert.equal(bilan.crees, 29)
  assert.equal(s.prix.get(l.cle).unit_amount, 999)
})
