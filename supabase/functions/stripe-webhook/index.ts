import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Montants (centimes) des 3 produits joueur — voir DashboardJoueur.jsx STRIPE_LINKS.
const MONTANT_MENSUEL = 1000   // 10€/mois
const MONTANT_ANNUEL = 10000   // 100€/an
const MONTANT_ANALYSE_UNITE = 6000 // 60€ à l'unité

// Éducateur/recruteur partagent ces mêmes montants (10€/100€) — seul le plan
// appliqué diffère. Le club a ses propres paliers (voir lib/stripeLinks.js
// STRIPE_LINKS_CLUB), dont un seul collisionne avec ceux ci-dessus (palier
// 101–200 joueurs = 100€/mois = 10000 centimes = MONTANT_ANNUEL) — voir
// resoudreCycleEtPlan ci-dessous pour la résolution.
const MONTANTS_CLUB_MENSUEL = [5000, 10000, 13000, 16000, 19000, 25000]
const MONTANTS_CLUB_ANNUEL = [50000, 100000, 130000, 160000, 190000, 250000]

// Variables d'env — lues sans "!" pour éviter un crash au chargement du
// module si l'une manque (ce qui ferait échouer 100% des requêtes sans
// aucun log exploitable). On préfère logger clairement puis répondre 500
// depuis l'intérieur du handler, cf. garde en début de Deno.serve.
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

for (const [nom, valeur] of Object.entries({ STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY })) {
  if (!valeur) console.error(`[stripe-webhook] Variable d'environnement manquante: ${nom} (à définir via "supabase secrets set")`)
}

const stripe = new Stripe(STRIPE_SECRET_KEY || 'sk_missing', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})
const cryptoProvider = Stripe.createSubtleCryptoProvider()

const supabaseAdmin = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
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
    const { data, error } = await supabaseAdmin.from('profiles').select('id').eq('id', clientReferenceId).maybeSingle()
    if (error) console.error('[stripe-webhook] erreur lookup par client_reference_id', error)
    if (data) return data.id
  }
  if (stripeCustomerId) {
    const { data, error } = await supabaseAdmin.from('profiles').select('id').eq('stripe_customer_id', stripeCustomerId).maybeSingle()
    if (error) console.error('[stripe-webhook] erreur lookup par stripe_customer_id', error)
    if (data) return data.id
  }
  if (email) {
    const { data, error } = await supabaseAdmin.from('profiles').select('id').eq('email', email).maybeSingle()
    if (error) console.error('[stripe-webhook] erreur lookup par email', error)
    if (data) return data.id
  }
  return null
}

async function crediterAnalyses(profileId: string, delta: number) {
  const { error } = await supabaseAdmin.rpc('increment_analyses', { profile_id: profileId, delta })
  if (error) console.error('[stripe-webhook] erreur increment_analyses', error)
}

// Détermine (cycle, estClub) à partir du montant. Les paliers club sont
// reconnus par leur montant SEUL, indépendamment du plan déjà en base : un
// compte peut payer un abonnement club avant même d'avoir plan='club' (ex.
// compte créé en 'educateur' puis converti club via le lien envoyé
// manuellement par le support, cf. lib/stripeLinks.js STRIPE_LINKS_CLUB
// "pas de libre-service") — sans ça, le paiement est capté par Stripe mais
// jamais reconnu ("montant non reconnu"), et le compte n'est jamais activé.
// Seul 10000 centimes (100€) est ambigu : à la fois "joueur/educateur/
// recruteur annuel" ET "club c100 mensuel" — on retombe sur le plan déjà en
// base uniquement pour ce cas précis.
function resoudreCycleEtPlan(montant: number, planActuel: string | undefined | null): { cycle: 'mensuel' | 'annuel', estClub: boolean } | null {
  if (MONTANTS_CLUB_MENSUEL.includes(montant) && montant !== MONTANT_ANNUEL) return { cycle: 'mensuel', estClub: true }
  if (MONTANTS_CLUB_ANNUEL.includes(montant)) return { cycle: 'annuel', estClub: true }
  if (montant === MONTANT_ANNUEL) {
    if (planActuel === 'club') return { cycle: 'mensuel', estClub: true }
    return { cycle: 'annuel', estClub: false }
  }
  if (montant === MONTANT_MENSUEL) return { cycle: 'mensuel', estClub: false }
  return null
}

Deno.serve(async (req) => {
  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[stripe-webhook] Configuration incomplète — requête rejetée. Vérifier les secrets avec: supabase secrets list')
    return new Response('Configuration serveur incomplète (voir logs de la fonction)', { status: 500 })
  }

  const signature = req.headers.get('Stripe-Signature')
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature ?? '',
      STRIPE_WEBHOOK_SECRET,
      undefined,
      cryptoProvider
    )
  } catch (err) {
    console.error('[stripe-webhook] Signature invalide', err.message)
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
          if (!profileId) { console.error('[stripe-webhook] checkout.session.completed (analyse unité): profil introuvable', { clientReferenceId: session.client_reference_id, email }); break }
          await crediterAnalyses(profileId, 1)
          break
        }

        if (session.mode === 'subscription') {
          const profileId = await trouverProfilId({ clientReferenceId: session.client_reference_id, email })
          if (!profileId) { console.error('[stripe-webhook] checkout.session.completed (abonnement): profil introuvable', { clientReferenceId: session.client_reference_id, email }); break }

          const { data: profilActuel, error: profilErr } = await supabaseAdmin.from('profiles').select('plan').eq('id', profileId).maybeSingle()
          if (profilErr) console.error('[stripe-webhook] erreur lecture profil', profilErr)

          const resolu = resoudreCycleEtPlan(montant, profilActuel?.plan)
          if (!resolu) { console.error('[stripe-webhook] checkout.session.completed: montant non reconnu', { montant, plan: profilActuel?.plan }); break }
          const { cycle, estClub } = resolu

          // profiles.plan est contraint par une CHECK constraint côté base à :
          // 'joueur_starter' | 'joueur_pro' | 'educateur' | 'scout' | 'club' | 'dirigeant'
          // (vérifié directement : 'pro', 'starter', 'recruteur', 'coach', 'fan' sont
          // TOUS rejetés). Le joueur n'a donc qu'un palier gratuit/payant, pas de
          // distinction mensuel/mannuel au niveau du plan — 'joueur_pro' dans les deux
          // cas, la différence vit uniquement dans abonnement_cycle.
          // Club : le montant fait foi, on force plan='club' même si le compte a été
          // créé sous un autre plan (educateur converti en club, cf. resoudreCycleEtPlan).
          // Educateur/scout : le plan ne change pas de valeur selon le cycle, seul
          // l'abonnement (actif/cycle) est mis à jour — pas de palier de fonctionnalités.
          const planSansPalier = ['educateur', 'scout'].includes(profilActuel?.plan ?? '')
          const nouveauPlan = estClub ? 'club' : planSansPalier ? profilActuel!.plan : 'joueur_pro'

          const { error: updateErr } = await supabaseAdmin.from('profiles').update({
            stripe_customer_id: stripeCustomerId,
            abonnement_actif: true,
            abonnement_cycle: cycle,
            abonnement_mois_payes: 0,
            plan: nouveauPlan,
          }).eq('id', profileId)
          if (updateErr) console.error('[stripe-webhook] erreur update profil (checkout.session.completed)', updateErr)
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
        if (!profileId) { console.error('[stripe-webhook] invoice.paid: profil introuvable', { stripeCustomerId, email: invoice.customer_email }); break }

        const { data: profil, error: profilErr } = await supabaseAdmin.from('profiles').select('plan, abonnement_mois_payes').eq('id', profileId).maybeSingle()
        if (profilErr) console.error('[stripe-webhook] erreur lecture profil (invoice.paid)', profilErr)

        const resoluInvoice = resoudreCycleEtPlan(montant, profil?.plan)
        if (!resoluInvoice) { console.error('[stripe-webhook] invoice.paid: montant non reconnu', { montant, plan: profil?.plan }); break }
        const { cycle } = resoluInvoice

        if (cycle === 'annuel') {
          await crediterAnalyses(profileId, 2)
          const { error } = await supabaseAdmin.from('profiles').update({ abonnement_actif: true }).eq('id', profileId)
          if (error) console.error('[stripe-webhook] erreur update abonnement_actif (invoice.paid annuel)', error)
        } else {
          const nouveauCompte = (profil?.abonnement_mois_payes ?? 0) + 1
          const { error } = await supabaseAdmin.from('profiles').update({
            abonnement_mois_payes: nouveauCompte,
            abonnement_actif: true,
          }).eq('id', profileId)
          if (error) console.error('[stripe-webhook] erreur update abonnement_mois_payes (invoice.paid mensuel)', error)
          if (nouveauCompte % 6 === 0) await crediterAnalyses(profileId, 1)
        }
        break
      }

      // ── Résiliation / échec de paiement définitif ──────────────────────
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const stripeCustomerId = typeof subscription.customer === 'string' ? subscription.customer : null
        const profileId = await trouverProfilId({ stripeCustomerId })
        if (!profileId) { console.error('[stripe-webhook] customer.subscription.deleted: profil introuvable', { stripeCustomerId }); break }
        const { error } = await supabaseAdmin.from('profiles').update({ abonnement_actif: false }).eq('id', profileId)
        if (error) console.error('[stripe-webhook] erreur update abonnement_actif (subscription.deleted)', error)
        break
      }

      default:
        // Événement reçu mais non géré (ex: invoice.payment_failed, customer.updated...) — normal, pas une erreur.
        break
    }
  } catch (err) {
    console.error('[stripe-webhook] Erreur non interceptée', event.type, err)
    return new Response(`Erreur serveur: ${err.message}`, { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
})
