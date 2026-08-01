import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Montants (centimes) des 3 produits joueur en euros — voir DashboardJoueur.jsx STRIPE_LINKS.
const MONTANT_MENSUEL = 1000   // 10€/mois
const MONTANT_ANNUEL = 10000   // 100€/an
const MONTANT_ANALYSE_UNITE = 6000 // 60€ à l'unité

// Montants des 2 produits éducateur — voir DashboardEducateur.jsx STRIPE_LINKS_EDU.
// Mêmes prix que le joueur (10€/100€) donc traités par le même code ; seul le
// plan appliqué diffère (educateur au lieu de starter/pro).

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})
const cryptoProvider = Stripe.createSubtleCryptoProvider()

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// Retrouve le profil concerné : client_reference_id (posé par le bouton
// depuis un dashboard connecté) en priorité, sinon stripe_customer_id déjà
// lié (renouvellements), sinon email de paiement en dernier recours.
async function trouverProfilId({ clientReferenceId, stripeCustomerId, email }: {
  clientReferenceId?: string | null
  stripeCustomerId?: string | null
  email?: string | null
}): Promise<string | null> {
  if (clientReferenceId) {
    const { data } = await supabaseAdmin.from('profiles').select('id').eq('id', clientReferenceId).maybeSingle()
    if (data) return data.id
  }
  if (stripeCustomerId) {
    const { data } = await supabaseAdmin.from('profiles').select('id').eq('stripe_customer_id', stripeCustomerId).maybeSingle()
    if (data) return data.id
  }
  if (email) {
    const { data } = await supabaseAdmin.from('profiles').select('id').eq('email', email).maybeSingle()
    if (data) return data.id
  }
  return null
}

async function crediterAnalyses(profileId: string, delta: number) {
  await supabaseAdmin.rpc('increment_analyses', { profile_id: profileId, delta })
}

Deno.serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature')
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
      undefined,
      cryptoProvider
    )
  } catch (err) {
    return new Response(`Signature invalide: ${err.message}`, { status: 400 })
  }

  try {
    switch (event.type) {
      // ── Premier paiement (abonnement ou analyse à l'unité) ──────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const email = session.customer_details?.email ?? null
        const stripeCustomerId = typeof session.customer === 'string' ? session.customer : null
        const montant = session.amount_total ?? 0

        if (session.mode === 'payment' && montant === MONTANT_ANALYSE_UNITE) {
          // Analyse vidéo à l'unité — achat ponctuel, crédité immédiatement.
          const profileId = await trouverProfilId({ clientReferenceId: session.client_reference_id, email })
          if (profileId) await crediterAnalyses(profileId, 1)
          break
        }

        if (session.mode === 'subscription' && (montant === MONTANT_MENSUEL || montant === MONTANT_ANNUEL)) {
          const profileId = await trouverProfilId({ clientReferenceId: session.client_reference_id, email })
          if (!profileId) break
          const cycle = montant === MONTANT_ANNUEL ? 'annuel' : 'mensuel'
          // Compat avec les verrous de fonctionnalités existants (profil.plan === 'pro'/'starter').
          const { data: profilActuel } = await supabaseAdmin.from('profiles').select('plan').eq('id', profileId).single()
          const nouveauPlan = profilActuel?.plan === 'educateur' ? 'educateur' : (cycle === 'annuel' ? 'pro' : 'starter')
          await supabaseAdmin.from('profiles').update({
            stripe_customer_id: stripeCustomerId,
            abonnement_actif: true,
            abonnement_cycle: cycle,
            abonnement_mois_payes: 0,
            plan: nouveauPlan,
          }).eq('id', profileId)
          // Le crédit d'analyses (annuel: +2, mensuel: bonus tous les 6 mois)
          // est géré par invoice.paid ci-dessous, y compris pour ce premier paiement.
        }
        break
      }

      // ── Chaque échéance payée (1er paiement inclus + tous les renouvellements) ──
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const stripeCustomerId = typeof invoice.customer === 'string' ? invoice.customer : null
        const montant = invoice.amount_paid ?? 0

        const profileId = await trouverProfilId({
          stripeCustomerId,
          email: invoice.customer_email ?? null,
        })
        if (!profileId) break

        if (montant === MONTANT_ANNUEL) {
          await crediterAnalyses(profileId, 2)
          await supabaseAdmin.from('profiles').update({ abonnement_actif: true }).eq('id', profileId)
        } else if (montant === MONTANT_MENSUEL) {
          const { data: profil } = await supabaseAdmin.from('profiles').select('abonnement_mois_payes').eq('id', profileId).single()
          const nouveauCompte = (profil?.abonnement_mois_payes ?? 0) + 1
          await supabaseAdmin.from('profiles').update({
            abonnement_mois_payes: nouveauCompte,
            abonnement_actif: true,
          }).eq('id', profileId)
          if (nouveauCompte % 6 === 0) await crediterAnalyses(profileId, 1)
        }
        break
      }

      // ── Résiliation / échec de paiement définitif ──────────────────────
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const stripeCustomerId = typeof subscription.customer === 'string' ? subscription.customer : null
        const profileId = await trouverProfilId({ stripeCustomerId })
        if (profileId) await supabaseAdmin.from('profiles').update({ abonnement_actif: false }).eq('id', profileId)
        break
      }
    }
  } catch (err) {
    console.error('stripe-webhook error', err)
    return new Response(`Erreur serveur: ${err.message}`, { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
})
