-- Test du bloc 7, compte club de test SEULEMENT : retire son forfait posé à la
-- main pour faire apparaître le nouvel écran « Active le forfait de ton club »
-- et le payer en mode test Stripe. Aucun autre compte n'est touché (adresse
-- précise, plan club, nouveau modèle).
-- Après le paiement test, le webhook remet abonnement_actif à vrai et pose le palier.

update public.profiles p
set abonnement_actif = false,
    palier = null
from auth.users u
where u.id = p.id
  and lower(u.email) = 'deabreu.amorim+club1@gmail.com'
  and p.plan = 'club'
  and p.modele_outils = true
returning u.email, p.plan, p.abonnement_actif, p.palier;
