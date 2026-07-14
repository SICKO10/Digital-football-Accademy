import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const PRICE_IDS = {
  starter:   'price_1ThwCxJKOH9Bhw9H6MsgxKZs',
  pro:       'price_1ThwE4JKOH9Bhw9HbmnsnZKc',
  recruteur: 'price_1ThwErJKOH9Bhw9HjhhGauD6',
  // Club et Éducateur partagent le même prix que recruteur pour l'instant.
  // Remplacer par de vrais price_id Stripe si vous créez des produits séparés.
  club:      'price_1ThwErJKOH9Bhw9HjhhGauD6',
  educateur: 'price_1ThwErJKOH9Bhw9HjhhGauD6',
}

const BASE_URL = 'https://digital-football-accademy.vercel.app'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { email, plan } = req.body

  if (!email || !plan) {
    return res.status(400).json({ error: 'Email et plan requis' })
  }

  if (!PRICE_IDS[plan]) {
    return res.status(400).json({ error: 'Plan invalide' })
  }

  const SUCCESS_URLS = {
    recruteur: `${BASE_URL}/recruteur`,
    club:      `${BASE_URL}/club`,
    educateur: `${BASE_URL}/educateur`,
  }
  const successUrl = SUCCESS_URLS[plan] || `${BASE_URL}/dashboard`

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: email,
      line_items: [{ price: PRICE_IDS[plan], quantity: 1 }],
      success_url: successUrl,
      cancel_url: `${BASE_URL}/register`,
      metadata: { plan }, // utilisé par le webhook pour définir le bon plan
    })

    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('Erreur Stripe:', err.message)
    return res.status(500).json({ error: err.message })
  }
}