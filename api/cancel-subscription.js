import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' })

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Non autorisé' })

  const token = authHeader.replace('Bearer ', '')

  // Vérifier le JWT Supabase et récupérer l'utilisateur
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: 'Token invalide' })

  // Récupérer le stripe_subscription_id depuis profiles
  const { data: profil, error: profileError } = await supabase
    .from('profiles')
    .select('stripe_subscription_id, stripe_customer_id, plan, email')
    .eq('id', user.id)
    .single()

  if (profileError || !profil) return res.status(404).json({ error: 'Profil introuvable' })

  // stripe_subscription_id n'est renseigné par le webhook que depuis une
  // correction récente — la plupart des comptes déjà abonnés n'en ont pas
  // encore (seulement stripe_customer_id). Fallback : retrouver la
  // subscription active via l'API Stripe à partir du customer, plutôt que de
  // bloquer la résiliation en attendant un backfill manuel en base.
  let subscriptionId = profil.stripe_subscription_id
  if (!subscriptionId) {
    if (!profil.stripe_customer_id) return res.status(400).json({ error: 'Aucun abonnement actif trouvé' })
    try {
      const subs = await stripe.subscriptions.list({ customer: profil.stripe_customer_id, status: 'active', limit: 1 })
      subscriptionId = subs.data[0]?.id
    } catch (err) {
      console.error('Erreur Stripe lookup subscription par customer:', err.message)
    }
    if (!subscriptionId) return res.status(400).json({ error: 'Aucun abonnement actif trouvé' })
  }

  try {
    // Annulation en fin de période (l'accès reste actif jusqu'à la prochaine date de renouvellement)
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    })
    // Persiste l'id retrouvé pour que la prochaine lecture n'ait plus besoin
    // du fallback ci-dessus.
    if (!profil.stripe_subscription_id) {
      await supabase.from('profiles').update({ stripe_subscription_id: subscriptionId }).eq('id', user.id)
    }

    console.log(`Résiliation programmée pour ${profil.email} (sub: ${subscriptionId})`)
    return res.status(200).json({ success: true, message: 'Résiliation programmée à la fin de la période' })
  } catch (err) {
    console.error('Erreur Stripe résiliation:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
