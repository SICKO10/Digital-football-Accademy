import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const config = {
  api: {
    bodyParser: false,
  },
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function getRawBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed')
  }

  const sig = req.headers['stripe-signature']
  const rawBody = await getRawBody(req)

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  // ── Premier achat ──────────────────────────────────────────────────────────
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const customerEmail = session.customer_details?.email

    let plan = 'pro'
    let analyses = 3

    try {
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id)
      const productName = lineItems.data[0]?.description?.toLowerCase() || ''

      if (productName.includes('starter')) {
        plan = 'starter'
        analyses = 2
      } else if (productName.includes('recruteur')) {
        plan = 'recruteur'
        analyses = 0
      } else {
        plan = 'pro'
        analyses = 3
      }
    } catch (err) {
      console.error('Erreur recuperation line items:', err.message)
    }

    if (customerEmail) {
      const { error } = await supabase
        .from('profiles')
        .update({ plan, analyses_restantes: analyses, abonnement_actif: true })
        .eq('email', customerEmail)
      if (error) console.error('Erreur Supabase checkout:', error.message)
    }
  }

  // ── Renouvellement mensuel ──────────────────────────────────────────────────
  if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object

    // Ignorer le premier paiement (déjà géré par checkout.session.completed)
    if (invoice.billing_reason === 'subscription_create') {
      return res.status(200).json({ received: true })
    }

    let customerEmail = invoice.customer_email
    if (!customerEmail && invoice.customer) {
      try {
        const customer = await stripe.customers.retrieve(invoice.customer)
        customerEmail = customer.email
      } catch (err) {
        console.error('Erreur récupération customer:', err.message)
      }
    }

    if (!customerEmail) return res.status(200).json({ received: true })

    // Récupérer le profil pour connaître le plan actuel et les analyses restantes
    const { data: profil, error: profileErr } = await supabase
      .from('profiles')
      .select('plan, analyses_restantes')
      .eq('email', customerEmail)
      .single()

    if (profileErr || !profil) {
      console.error('Profil introuvable pour', customerEmail)
      return res.status(200).json({ received: true })
    }

    // Analyses à ajouter selon le plan
    const analysesAdd = profil.plan === 'pro' ? 3 : profil.plan === 'starter' ? 1 : 0

    if (analysesAdd > 0) {
      const { error } = await supabase
        .from('profiles')
        .update({
          analyses_restantes: (profil.analyses_restantes || 0) + analysesAdd,
          abonnement_actif: true,
        })
        .eq('email', customerEmail)
      if (error) console.error('Erreur Supabase renouvellement:', error.message)
      else console.log(`Renouvellement ${customerEmail} : +${analysesAdd} analyses (total: ${(profil.analyses_restantes || 0) + analysesAdd})`)
    }
  }

  res.status(200).json({ received: true })
}