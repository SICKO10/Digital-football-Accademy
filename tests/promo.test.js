import test from 'node:test'
import assert from 'node:assert/strict'
import { PROMOS, promosActives, coutPremiereAnnee, PROMO_POURCENT } from '../src/lib/promo.js'

const palier = { mois: 130, an: 1300 }

test('promo mensuelle : 12 mensualités moins la remise du 1er mois', () => {
  assert.equal(coutPremiereAnnee(palier, 'mensuel'), 1469)
})

test('sans promo annuelle : le prix annuel reste inchangé', () => {
  assert.equal(PROMOS.annuel, null)
  assert.equal(coutPremiereAnnee(palier, 'annuel'), 1300)
})

test('promo annuelle déclarée : remise sur le prix annuel', () => {
  PROMOS.annuel = { pourcent: 20 }
  try {
    assert.equal(coutPremiereAnnee(palier, 'annuel'), 1040)
    assert.ok(promosActives().length === 0 || promosActives().some(p => p.mode === 'annuel'))
  } finally { PROMOS.annuel = null }
})

test('promo mensuelle sur plusieurs mois', () => {
  const avant = PROMOS.mensuel
  PROMOS.mensuel = { pourcent: 50, mois: 3 }
  try { assert.equal(coutPremiereAnnee({ mois: 100, an: 1000 }, 'mensuel'), 1050) } finally { PROMOS.mensuel = avant }
  assert.equal(PROMOS.mensuel.pourcent, PROMO_POURCENT)
})

test('rythme inconnu : erreur', () => {
  assert.throws(() => coutPremiereAnnee(palier, 'trimestriel'))
})
