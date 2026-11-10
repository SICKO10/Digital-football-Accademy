import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { traiterEvenement } from './logique.js'

// Webhook des outils à la carte, séparé de `stripe-webhook` (joueur,
// recruteur, anciens liens club) qui n'est pas modifié. Ne traite que les
// paiements marqués `offre: outils` par api/outils.js. Clés dédiées :
// STRIPE_OUTILS_SECRET_KEY (ou à défaut STRIPE_SECRET_KEY) et
// STRIPE_OUTILS_WEBHOOK_SECRET (secret de signature de ce webhook).
//
// Réponse 200 : traité, déjà traité ou ignoré. Réponse 500 : rien n'a été
// écrit (la fonction base annule tout), Stripe relivre l'événement plus tard.

// Clé dédiée si elle existe, sinon la clé Stripe déjà utilisée par la plateforme.
const STRIPE_OUTILS_SECRET_KEY = Deno.env.get('STRIPE_OUTILS_SECRET_KEY') || Deno.env.get('STRIPE_SECRET_KEY') || ''
const STRIPE_OUTILS_WEBHOOK_SECRET = Deno.env.get('STRIPE_OUTILS_WEBHOOK_SECRET') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

for (const [nom, valeur] of Object.entries({ STRIPE_OUTILS_SECRET_KEY, STRIPE_OUTILS_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY })) {
  if (!valeur) console.error(`[stripe-webhook-outils] Variable d'environnement manquante: ${nom}`)
}

const stripe = new Stripe(STRIPE_OUTILS_SECRET_KEY || 'sk_missing', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})
const cryptoProvider = Stripe.createSubtleCryptoProvider()

const supabaseAdmin = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
)

async function appliquer(p: {
  evenementId: string, type: string, compteId: string, abonnementId: string,
  lignes: { outil: string, periodicite: string, item: string }[], palier: string | null, periodicite: string | null,
}) {
  const { data, error } = await supabaseAdmin.rpc('outils_appliquer_abonnement', {
    p_evenement: p.evenementId,
    p_type: p.type,
    p_compte: p.compteId,
    p_abonnement: p.abonnementId,
    p_lignes: p.lignes,
    p_palier: p.palier,
    p_periodicite: p.periodicite,
  })
  if (error) throw new Error(`outils_appliquer_abonnement: ${error.message}`)
  return data as string
}

Deno.serve(async (req) => {
  if (!STRIPE_OUTILS_SECRET_KEY || !STRIPE_OUTILS_WEBHOOK_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response('Configuration serveur incomplète (voir logs de la fonction)', { status: 500 })
  }

  const signature = req.headers.get('Stripe-Signature')
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature ?? '', STRIPE_OUTILS_WEBHOOK_SECRET, undefined, cryptoProvider)
  } catch (err) {
    console.error('[stripe-webhook-outils] Signature invalide', err.message)
    return new Response('Signature invalide', { status: 400 })
  }

  try {
    const resultat = await traiterEvenement(event, {
      recupererAbonnement: (id: string) => stripe.subscriptions.retrieve(id),
      appliquer,
    })
    console.log('[stripe-webhook-outils]', event.type, event.id, resultat.statut, resultat.raison ?? '')
  } catch (err) {
    console.error('[stripe-webhook-outils] Échec, Stripe relivrera', event.type, event.id, err.message)
    return new Response('Erreur serveur', { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
})
