-- NE PAS EXÉCUTER. Annulation du bloc 5 (supabase_saisons_demandes.sql).
-- Supprime les demandes et les saisons closes déjà enregistrées. Ne touche à
-- aucune table existante avant le bloc 5.
--
-- Verrou : la ligne ci-dessous bloque tout le fichier. Ne la retirer que si
-- Claude le demande explicitement pour annuler le bloc 5.
do $$ begin raise exception 'Fichier d''annulation verrouillé : rien n''a été modifié.'; end $$;

-- Fonctions d'abord : saison_traiter_demande dépend de la table saison_demandes.
drop function if exists public.saison_traiter_demande(uuid, text, text);
drop function if exists public.saison_annuler_demande(uuid);
drop table if exists saison_demandes;
drop table if exists saisons_closes_club;
drop function if exists public.saison_peut_valider(uuid, text);
drop function if exists public.saison_est_membre_club(uuid);
drop function if exists public.saison_role_couvre_categorie(text, text);
drop function if exists public.saison_tranche_age(text);
