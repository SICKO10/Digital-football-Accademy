/* global process */
// Contrôle (lecture seule) : chaque prix du catalogue existe-t-il dans Stripe,
// avec la bonne clé de recherche, le bon montant et la bonne période ?
//   node scripts/stripe-verifier-prix-outils.mjs
// La clé est demandée dans le terminal (ou variable STRIPE_OUTILS_SECRET_KEY).
import Stripe from 'stripe'
import { lignesStripe, comparerPrix } from '../src/lib/catalogueOutils.js'
import { demanderCle } from './_cle-stripe.mjs'

async function main() {
  const cle = process.env.STRIPE_OUTILS_SECRET_KEY || await demanderCle()
  if (!/^(sk|rk)_(test|live)_/.test(cle)) throw new Error('Ce n\'est pas une clé secrète Stripe (sk_test_ ou sk_live_).')
  const stripe = new Stripe(cle)
  const attendus = lignesStripe()
  const trouves = []
  for (let i = 0; i < attendus.length; i += 10) {
    const { data } = await stripe.prices.list({ lookup_keys: attendus.slice(i, i + 10).map(l => l.cle), active: true, limit: 10 })
    trouves.push(...data.map(p => ({ cle: p.lookup_key, montant: p.unit_amount, devise: p.currency, intervalle: p.recurring?.interval, live: p.livemode })))
  }
  const r = comparerPrix(attendus, trouves)
  console.log(`Mode Stripe : ${r.mode ?? 'aucun prix trouvé'}`)
  console.log(`${r.conformes} prix conformes sur ${r.total}.`)
  for (const m of r.manquants) console.log(`  MANQUE   ${m}`)
  for (const d of r.differents) console.log(`  DIFFÈRE  ${d}`)
  console.log(r.ok ? '\nCONTRÔLE VERT' : '\nCONTRÔLE ROUGE : relance le script de création, puis ce contrôle.')
  process.exitCode = r.ok ? 0 : 1
}

main().catch((err) => {
  console.error(`\nErreur : ${err.message}`)
  process.exitCode = 1
})
