-- NE PAS EXÉCUTER sauf décision explicite de revenir en arrière sur le bloc 2
-- du chantier outils à la carte (supabase_outils_a_la_carte.sql).
--
-- Effet : supprime les 4 tables des outils (et toutes leurs lignes : achats,
-- essais, outils ouverts, affichages), les 4 fonctions et la colonne
-- profiles.modele_outils. Irréversible sans la sauvegarde faite avant le bloc.
-- Ne pas lancer après le bloc 7 (premiers paiements de test) sans vérifier que
-- plus rien n'utilise ces tables (webhook, api/outils.js, verrou du bloc 15).

begin;

-- Tables d'abord : leurs règles d'accès utilisent les fonctions.
drop table if exists public.outils_affichage_educateur;
drop table if exists public.outils_club_ouverts;
drop table if exists public.outils_essais_utilises;
drop table if exists public.outils_comptes;

drop function if exists public.a_outil(uuid, text);
drop function if exists public.outils_actifs(uuid);
drop function if exists public.outils_educateur_du_club(uuid);
drop function if exists public.outils_gere_club(uuid);

alter table public.profiles drop column if exists modele_outils;

commit;
