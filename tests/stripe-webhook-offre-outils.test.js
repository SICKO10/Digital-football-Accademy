// L'ancien webhook doit ignorer les paiements des outils et rester inchangé pour les autres.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { porteLaMarqueOutils, factureDesOutils } from '../supabase/functions/stripe-webhook/offreOutils.js'

const outils = { offre: 'outils', compte_id: 'x' }

test('session, abonnement et facture marqués outils sont reconnus', () => {
  assert.equal(porteLaMarqueOutils({ metadata: outils }), true)
  assert.equal(porteLaMarqueOutils({ subscription_details: { metadata: outils } }), true)
  assert.equal(porteLaMarqueOutils({ parent: { subscription_details: { metadata: outils } } }), true)
  assert.equal(porteLaMarqueOutils({ lines: { data: [{ metadata: outils }] } }), true)
})

test('les paiements joueur, recruteur et ancien club ne sont pas reconnus', () => {
  assert.equal(porteLaMarqueOutils({ metadata: {} }), false)
  assert.equal(porteLaMarqueOutils({ metadata: { offre: 'joueur' } }), false)
  assert.equal(porteLaMarqueOutils({ lines: { data: [{ metadata: {} }] } }), false)
  assert.equal(porteLaMarqueOutils(null), false)
  assert.equal(porteLaMarqueOutils({}), false)
})

test('facture sans marque : on relit l\'abonnement chez Stripe', async () => {
  const lire = (metadata) => async (id) => { assert.equal(id, 'sub_1'); return { metadata } }
  assert.equal(await factureDesOutils({ subscription: 'sub_1' }, lire(outils)), true)
  assert.equal(await factureDesOutils({ subscription: 'sub_1' }, lire({})), false)
  assert.equal(await factureDesOutils({ parent: { subscription_details: { subscription: 'sub_1' } } }, lire(outils)), true)
})

test('facture sans abonnement : aucun appel Stripe', async () => {
  const lire = async () => { throw new Error('ne doit pas être appelé') }
  assert.equal(await factureDesOutils({ subscription: null }, lire), false)
  assert.equal(await factureDesOutils({}, lire), false)
})

test('abonnement introuvable : pas des outils ; autre panne : remonte l\'erreur', async () => {
  const introuvable = async () => { throw Object.assign(new Error('absent'), { statusCode: 404 }) }
  const panne = async () => { throw Object.assign(new Error('Stripe en panne'), { statusCode: 500 }) }
  assert.equal(await factureDesOutils({ subscription: 'sub_1' }, introuvable), false)
  await assert.rejects(factureDesOutils({ subscription: 'sub_1' }, panne), /Stripe en panne/)
})
