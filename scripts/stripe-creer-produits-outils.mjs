/* global process */
// Crée dans Stripe les produits et les prix des outils à la carte (éducateur)
// et des forfaits club, d'après src/lib/catalogueOutils.js (seule source).
//
// Sans doublon : on peut le relancer. Un produit a un identifiant fixe, un prix
// est retrouvé par sa clé de recherche (lookup_key). Un prix existant n'est
// jamais modifié (Stripe ne le permet pas) : s'il diffère du catalogue, le
// script le signale sans rien changer.
//
// Usage, dans le dossier du projet :
//   node scripts/stripe-creer-produits-outils.mjs --simulation   (rien n'est envoyé, aucune clé demandée)
//   node scripts/stripe-creer-produits-outils.mjs                (mode test : la clé est demandée, rien n'est affiché)
//   node scripts/stripe-creer-produits-outils.mjs --live         (bascule en production, bloc 16 seulement)
// La clé n'est jamais écrite dans un fichier ni affichée. Elle peut aussi venir
// de la variable STRIPE_OUTILS_SECRET_KEY.
import { pathToFileURL } from 'node:url'
import Stripe from 'stripe'
import { lignesStripe } from '../src/lib/catalogueOutils.js'
import { demanderCle } from './_cle-stripe.mjs'

const args = process.argv.slice(2)
const simulation = args.includes('--simulation')
const live = args.includes('--live')
const lignes = lignesStripe()

const euros = (c) => `${(c / 100).toLocaleString('fr-FR')} €`
const periode = (i) => (i === 'month' ? 'par mois' : 'par an')

function afficherSimulation() {
  console.log(`SIMULATION : rien n'est envoyé à Stripe. ${lignes.length} prix seraient créés :\n`)
  for (const l of lignes) console.log(`  ${l.cle.padEnd(44)} ${euros(l.montant).padStart(10)} ${periode(l.intervalle)}  (${l.produitNom})`)
}

async function produitExiste(stripe, id) {
  try {
    const p = await stripe.products.retrieve(id)
    return p
  } catch (err) {
    if (err?.code === 'resource_missing') return null
    throw err
  }
}

export async function creer(stripe, journal = console.log) {
  const bilan = { crees: 0, existants: 0, differents: [] }
  const produitsFaits = new Set()
  for (const l of lignes) {
    if (!produitsFaits.has(l.produitId)) {
      produitsFaits.add(l.produitId)
      const existant = await produitExiste(stripe, l.produitId)
      if (!existant) {
        await stripe.products.create({
          id: l.produitId,
          name: l.produitNom,
          metadata: { offre: 'outils', type: l.type, ref: l.ref },
        })
      } else if (!existant.active) {
        await stripe.products.update(l.produitId, { active: true })
      }
    }
    const { data } = await stripe.prices.list({ lookup_keys: [l.cle], active: true, limit: 1 })
    const prix = data[0]
    if (prix) {
      const pareil = prix.unit_amount === l.montant && prix.currency === 'eur' && prix.recurring?.interval === l.intervalle
      if (pareil) bilan.existants += 1
      else bilan.differents.push(`${l.cle} : Stripe a ${euros(prix.unit_amount)} ${prix.recurring?.interval}, le catalogue ${euros(l.montant)} ${l.intervalle}`)
      journal(`  ${pareil ? 'déjà là ' : 'DIFFÈRE '} ${l.cle}`)
      continue
    }
    await stripe.prices.create({
      product: l.produitId,
      currency: 'eur',
      unit_amount: l.montant,
      recurring: { interval: l.intervalle },
      lookup_key: l.cle,
      metadata: { offre: 'outils', type: l.type, ref: l.ref },
    })
    bilan.crees += 1
    journal(`  créé     ${l.cle}  ${euros(l.montant)} ${periode(l.intervalle)}`)
  }
  return bilan
}

async function main() {
  if (simulation) return afficherSimulation()
  const cle = process.env.STRIPE_OUTILS_SECRET_KEY || await demanderCle()
  if (!/^(sk|rk)_(test|live)_/.test(cle)) throw new Error('Ce n\'est pas une clé secrète Stripe (elle commence par sk_test_ ou sk_live_).')
  const cleLive = cle.includes('_live_')
  if (cleLive && !live) throw new Error('Clé de production détectée : relance avec --live si c\'est voulu (bloc 16). En attendant, utilise la clé de test.')
  if (!cleLive && live) throw new Error('--live demandé mais la clé est une clé de test.')
  console.log(cleLive ? 'MODE PRODUCTION (live)\n' : 'Mode test Stripe\n')
  const stripe = new Stripe(cle)
  const bilan = await creer(stripe)
  console.log(`\nTerminé : ${bilan.crees} prix créés, ${bilan.existants} déjà conformes, ${bilan.differents.length} différents.`)
  if (bilan.differents.length) {
    console.log('\nÀ regarder (le script ne modifie jamais un prix existant) :')
    for (const d of bilan.differents) console.log(`  - ${d}`)
    process.exitCode = 1
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(`\nErreur : ${err.message}`)
    process.exitCode = 1
  })
}
