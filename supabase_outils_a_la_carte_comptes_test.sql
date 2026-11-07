-- Chantier outils à la carte : active le nouveau modèle sur les 3 comptes de
-- test seulement, et leur ouvre le dashboard sans paiement (abonnement_actif).
-- Aucun autre compte n'est touché : le filtre porte sur ces 3 adresses exactes.
--
-- À lancer APRÈS avoir créé les comptes (méthode : docs/outils-a-la-carte/
-- INVENTAIRE.md, section 6). Sans danger si un compte n'existe pas encore : il
-- est simplement absent du résultat, relancer ce fichier une fois créé.
-- Le résultat liste les comptes modifiés : il doit y en avoir 3.

update public.profiles p
set modele_outils = true,
    abonnement_actif = true
from auth.users u
where u.id = p.id
  and lower(u.email) in (
    'deabreu.amorim+edu1@gmail.com',
    'deabreu.amorim+club1@gmail.com',
    'deabreu.amorim+edu2@gmail.com'
  )
returning u.email, p.plan, p.modele_outils, p.abonnement_actif;
