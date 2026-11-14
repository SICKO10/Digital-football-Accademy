-- Retour arrière du bloc 8 (chantier catégories) : retire les deux fonctions
-- du changement de mode. NE PAS EXÉCUTER sans en avoir parlé.
--
-- Ce fichier ne remet PAS les catégories dans leur ancien mode et ne replace
-- pas les joueurs déjà répartis : seules les fonctions disparaissent (l'écran
-- « Changer de mode » affichera alors une erreur).

begin;
drop function if exists public.categorie_changer_mode(uuid, text, jsonb);
drop function if exists public.categories_mode_donnees(uuid, date);
commit;
