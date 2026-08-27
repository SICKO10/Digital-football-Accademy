// Source unique des liens de paiement Stripe (mode TEST — préfixe `test_`).
// Avant mise en prod : recréer les mêmes produits dans l'environnement Stripe
// production et remplacer les URLs ci-dessous (sans `test_`).
//
// Le webhook (supabase/functions/stripe-webhook) identifie le produit acheté
// par son montant (10€/100€/60€), pas par ces clés — elles ne servent qu'à
// choisir le bon lien côté front.

export const STRIPE_LINKS = {
  starter: 'https://buy.stripe.com/test_cNi3cw3sg10R0q6gGM4ko07', // joueur mensuel — 10€/mois
  pro: 'https://buy.stripe.com/test_dRmfZi4wk10R4Gm2PW4ko06', // joueur annuel — 100€/an
  analyse_unite: 'https://buy.stripe.com/test_aFabJ27Iw6lbegW4Y44ko05', // analyse à l'unité — 60€
}

export const STRIPE_LINKS_EDU = {
  edu_mensuel: 'https://buy.stripe.com/test_3cI14o2oc8tj7Sy9ek4ko0p', // 10€/mois
  edu_annuel: 'https://buy.stripe.com/test_bJeeVegf2gZPfl01LS4ko0o', // 100€/an
}

// Recruteur (interne : plan === 'recruteur'). "Scout" est le libellé marketing
// utilisé à l'inscription — ne pas renommer le plan, cf. DashboardScoutClub.jsx
// qui utilise déjà "Scout" pour une fonctionnalité différente (comptes club).
export const STRIPE_LINKS_RECRUTEUR = {
  mensuel: 'https://buy.stripe.com/test_eVqfZiaUIbFvc8OfCI4ko0k', // 10€/mois
  annuel: 'https://buy.stripe.com/test_bJedRad2Q8tj3CieyE4ko0l', // 100€/an
}

// Club — paliers selon le nombre de licenciés, vérifié manuellement par le
// support avant envoi du lien de paiement adapté (pas de libre-service).
export const STRIPE_LINKS_CLUB = {
  c0: { mensuel: 'https://buy.stripe.com/test_28E4gA4wkgZP4GmgGM4ko08', annuel: 'https://buy.stripe.com/test_6oUfZibYMfVL1ua8ag4ko0m', label: '0–100 joueurs', mensuelPrix: '50€/mois', annuelPrix: '500€/an' },
  c100: { mensuel: 'https://buy.stripe.com/test_14A14o1k88tj7Syaio4ko0n', annuel: 'https://buy.stripe.com/test_14AfZie6UgZP2yecqw4ko09', label: '101–200 joueurs', mensuelPrix: '100€/mois', annuelPrix: '1000€/an' },
  c200: { mensuel: 'https://buy.stripe.com/test_9B67sM4wk24V3CiduA4ko0a', annuel: 'https://buy.stripe.com/test_3cIbJ22oc10R0q62PW4ko0b', label: '201–300 joueurs', mensuelPrix: '130€/mois', annuelPrix: '1300€/an' },
  c300: { mensuel: 'https://buy.stripe.com/test_aFaaEYgf238Z8WC3U04ko0c', annuel: 'https://buy.stripe.com/test_6oUdRa8MAfVLb4Kbms4ko0d', label: '301–400 joueurs', mensuelPrix: '160€/mois', annuelPrix: '1600€/an' },
  c400: { mensuel: 'https://buy.stripe.com/test_6oU8wQbYM6lbdcSeyE4ko0e', annuel: 'https://buy.stripe.com/test_4gMdRaaUI5h7a0G76c4ko0f', label: '401–500 joueurs', mensuelPrix: '190€/mois', annuelPrix: '1900€/an' },
  c500: { mensuel: 'https://buy.stripe.com/test_8x24gAd2QdND0q6gGM4ko0i', annuel: 'https://buy.stripe.com/test_6oU6oI9QE10R0q6cqw4ko0j', label: '500+ joueurs', mensuelPrix: '250€/mois', annuelPrix: '2500€/an' },
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

export const CONTACT_EMAIL = 'contact@digital-football.fr'

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
