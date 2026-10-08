// Source unique des liens de paiement Stripe (mode LIVE).
//
// Le webhook (supabase/functions/stripe-webhook) identifie le produit acheté
// par son montant (10€/100€/60€/paliers club), pas par ces clés — elles ne
// servent qu'à choisir le bon lien côté front. Penser à mettre à jour aussi
// les secrets STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET côté Supabase (clé
// live + endpoint webhook enregistré en mode live, cf. Developers > Webhooks).

export const STRIPE_LINKS = {
  starter: 'https://buy.stripe.com/fZu28sf9JgIKeu53xcdZ60g', // joueur mensuel — 10€/mois — live
  pro: 'https://buy.stripe.com/dRm00k3r1eACbhTffUdZ60e', // joueur annuel — 100€/an — live
  analyse_unite: 'https://buy.stripe.com/7sY7sM8Llakmeu55FkdZ60h', // analyse à l'unité — 60€ — live
}

export const STRIPE_LINKS_EDU = {
  edu_mensuel: 'https://buy.stripe.com/eVq9AU5z92RUdq15FkdZ604', // 10€/mois — live
  edu_annuel: 'https://buy.stripe.com/bJe3cw0ePfEG0Df2t8dZ607', // 100€/an — live
}

// Recruteur (interne : plan === 'recruteur'). "Scout" est le libellé marketing
// utilisé à l'inscription — ne pas renommer le plan, cf. DashboardScoutClub.jsx
// qui utilise déjà "Scout" pour une fonctionnalité différente (comptes club).
export const STRIPE_LINKS_RECRUTEUR = {
  mensuel: 'https://buy.stripe.com/4gM3cwf9J1NQadP6JodZ601', // 10€/mois — live
  annuel: 'https://buy.stripe.com/8x25kE0ePakmgCd0l0dZ603', // 100€/an — live
}

// Club — la facturation reste basée sur le nombre de licenciés (montants
// inchangés), mais l'affichage (label) est désormais exprimé en nombre
// d'équipes/dashboards, conformément au nouveau modèle self-service — les
// chiffres doivent rester synchronisés avec PALIERS_QUOTA_EQUIPES ci-dessous
// et avec le trigger SQL sync_quota_equipes (supabase_profiles_quota_equipes.sql).
export const STRIPE_LINKS_CLUB = {
  c0: { mensuel: 'https://buy.stripe.com/4gM5kE1iT1NQ85HebQdZ60i', annuel: 'https://buy.stripe.com/7sYdRa3r1eAC5Xz6JodZ609', label: "Jusqu'à 2 équipes", mensuelPrix: '50€/mois', annuelPrix: '500€/an' },
  c100: { mensuel: 'https://buy.stripe.com/eVq4gA2mX2RUadP3xcdZ605', annuel: 'https://buy.stripe.com/6oU9AU5z9csu5Xz2t8dZ60f', label: "Jusqu'à 4 équipes", mensuelPrix: '100€/mois', annuelPrix: '1000€/an' },
  c200: { mensuel: 'https://buy.stripe.com/14A6oI7HhfEG2Lnc3IdZ60c', annuel: 'https://buy.stripe.com/7sY14ogdN64671D1p4dZ60d', label: "Jusqu'à 7 équipes", mensuelPrix: '130€/mois', annuelPrix: '1300€/an' },
  c300: { mensuel: 'https://buy.stripe.com/3cI9AU1iT8ce0Df3xcdZ60b', annuel: 'https://buy.stripe.com/6oU14o8Llcsu5XzffUdZ606', label: "Jusqu'à 11 équipes", mensuelPrix: '160€/mois', annuelPrix: '1600€/an' },
  c400: { mensuel: 'https://buy.stripe.com/6oU6oI8Lldwy5Xz8RwdZ608', annuel: 'https://buy.stripe.com/fZu9AU6DddwyclX5FkdZ602', label: "Jusqu'à 15 équipes", mensuelPrix: '190€/mois', annuelPrix: '1900€/an' },
  c500: { mensuel: 'https://buy.stripe.com/00w6oIf9J2RU0DfebQdZ60a', annuel: 'https://buy.stripe.com/bJe8wQ6Dd2RUfy92t8dZ600', label: "Jusqu'à 22 équipes", mensuelPrix: '250€/mois', annuelPrix: '2500€/an' },
}

// Quota d'équipes (club_categories) inclus par palier — même clés que
// STRIPE_LINKS_CLUB, tenu en cohérence côté base par le trigger
// sync_quota_equipes (supabase_profiles_quota_equipes.sql). Le modèle
// "nombre d'équipes" n'est pas encore figé commercialement : cette
// correspondance est une première estimation, à ajuster avec le trigger SQL
// si les vraies offres changent.
export const PALIERS_QUOTA_EQUIPES = {
  c0: 2, c100: 4, c200: 7, c300: 11, c400: 15, c500: 22,
}

export const CONTACT_EMAIL = 'Jimmy.digital.football@gmail.com'

// client_reference_id permet au webhook Stripe (supabase/functions/stripe-webhook)
// d'identifier le profil à activer/créditer après paiement. prefilled_email
// pré-remplit le champ email du checkout Stripe pour éviter une ressaisie.
export const stripeUrl = (base, uid, email) => {
  const params = new URLSearchParams()
  if (uid) params.set('client_reference_id', uid)
  if (email) params.set('prefilled_email', email)
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}
