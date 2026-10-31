-- Vérification du bloc 5 (supabase_saisons_demandes.sql). Lecture seule : rien
-- n'est écrit en base. À lancer après le fichier principal, puis coller le
-- tableau de résultat. Chaque ligne doit avoir ok = true.
--
-- Les tests « connecté en tant que » simulent un utilisateur le temps de la
-- requête (identifiants tirés au hasard, aucun compte réel touché).

create or replace function pg_temp.test_comme(p_user uuid, p_club uuid, p_categorie text)
returns boolean
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true);
  perform set_config('request.jwt.claims', case when p_user is null then '{}' else json_build_object('sub', p_user, 'role', 'authenticated')::text end, true);
  return public.saison_peut_valider(p_club, p_categorie);
end
$$;

with ids as (select gen_random_uuid() as club, gen_random_uuid() as inconnu),
tests(n, test, attendu, obtenu) as (
  -- Structure
  select 1, 'table saison_demandes existe', 'true', (to_regclass('public.saison_demandes') is not null)::text
  union all select 2, 'RLS active sur saison_demandes', 'true', (select relrowsecurity::text from pg_class where oid = 'public.saison_demandes'::regclass)
  union all select 3, 'règles d''accès saison_demandes (lecture, création)', '2', (select count(*)::text from pg_policies where tablename = 'saison_demandes')
  union all select 4, 'table saisons_closes_club existe', 'true', (to_regclass('public.saisons_closes_club') is not null)::text
  union all select 5, 'RLS active sur saisons_closes_club', 'true', (select relrowsecurity::text from pg_class where oid = 'public.saisons_closes_club'::regclass)
  union all select 6, 'règles d''accès saisons_closes_club (lecture, clôture, réouverture)', '3', (select count(*)::text from pg_policies where tablename = 'saisons_closes_club')
  union all select 7, 'fonctions saison_* créées', '6', (select count(*)::text from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' and p.proname in ('saison_tranche_age', 'saison_role_couvre_categorie', 'saison_est_membre_club', 'saison_peut_valider', 'saison_traiter_demande', 'saison_annuler_demande'))
  union all select 8, 'fonctions sécurisées (security definer)', '4', (select count(*)::text from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' and p.prosecdef and p.proname in ('saison_est_membre_club', 'saison_peut_valider', 'saison_traiter_demande', 'saison_annuler_demande'))
  union all select 9, 'visiteur non connecté ne peut pas valider (droit)', 'false', has_function_privilege('anon', 'public.saison_traiter_demande(uuid, text, text)', 'execute')::text
  union all select 10, 'utilisateur connecté peut appeler la validation', 'true', has_function_privilege('authenticated', 'public.saison_traiter_demande(uuid, text, text)', 'execute')::text
  union all select 11, 'aucune demande en base pour l''instant', '0', (select count(*)::text from saison_demandes)
  union all select 12, 'règles actuelles de club_categories intactes (coach déclare, réclame, quitte ; 1 seule après le bloc 8)', '3', (select count(*)::text from pg_policies where tablename = 'club_categories' and policyname in ('educateur_declare_sa_categorie', 'educateur_reclame_categorie_vacante', 'educateur_quitte_sa_categorie'))
  -- Règle des rôles
  union all select 20, 'responsable préformation valide U17', 'false', public.saison_role_couvre_categorie('responsable_preformation', 'U17')::text
  union all select 21, 'directeur sportif valide U17', 'true', public.saison_role_couvre_categorie('directeur_sportif', 'U17')::text
  union all select 22, 'président valide U17', 'true', public.saison_role_couvre_categorie('president', 'U17')::text
  union all select 23, 'secrétaire valide U17', 'false', public.saison_role_couvre_categorie('secretaire', 'U17')::text
  union all select 24, 'responsable formation valide U17', 'true', public.saison_role_couvre_categorie('responsable_formation', 'U17')::text
  union all select 25, 'responsable formation valide Seniors féminines (SeniorsF)', 'true', public.saison_role_couvre_categorie('responsable_formation', 'SeniorsF')::text
  union all select 26, 'responsable formation valide U13', 'false', public.saison_role_couvre_categorie('responsable_formation', 'U13')::text
  union all select 27, 'responsable préformation valide U13 féminines (U13F)', 'true', public.saison_role_couvre_categorie('responsable_preformation', 'U13F')::text
  union all select 28, 'responsable préformation valide U15', 'false', public.saison_role_couvre_categorie('responsable_preformation', 'U15')::text
  union all select 29, 'responsable école de foot valide U9', 'true', public.saison_role_couvre_categorie('responsable_ecole_foot', 'U9')::text
  union all select 30, 'responsable école de foot valide U11', 'false', public.saison_role_couvre_categorie('responsable_ecole_foot', 'U11')::text
  union all select 31, 'entraîneur valide U9', 'false', public.saison_role_couvre_categorie('entraineur', 'U9')::text
  union all select 32, 'catégorie inconnue (Vétérans) : responsable formation', 'false', public.saison_role_couvre_categorie('responsable_formation', 'Vétérans')::text
  union all select 33, 'catégorie inconnue (Vétérans) : directeur sportif', 'true', public.saison_role_couvre_categorie('directeur_sportif', 'Vétérans')::text
  union all select 13, 'option : colonne équipe sur historique_saisons', 'true', exists (select 1 from information_schema.columns where table_name = 'historique_saisons' and column_name = 'club_categorie_id')::text
  union all select 34, 'affiliation et clôture club : responsable formation', 'true', public.saison_role_couvre_categorie('responsable_formation', null)::text
  union all select 37, 'affiliation et clôture club : responsable préformation', 'false', public.saison_role_couvre_categorie('responsable_preformation', null)::text
  union all select 38, 'affiliation et clôture club : responsable école de foot', 'false', public.saison_role_couvre_categorie('responsable_ecole_foot', null)::text
  union all select 35, 'affiliation : directeur sportif', 'true', public.saison_role_couvre_categorie('directeur_sportif', null)::text
  union all select 36, 'affiliation : secrétaire', 'false', public.saison_role_couvre_categorie('secretaire', null)::text
  -- Connecté en tant que (simulation)
  union all select 40, 'compte principal du club valide U17', 'true', pg_temp.test_comme(ids.club, ids.club, 'U17')::text from ids
  union all select 41, 'compte principal du club valide une affiliation', 'true', pg_temp.test_comme(ids.club, ids.club, null)::text from ids
  union all select 42, 'utilisateur sans rôle dans ce club valide U17', 'false', pg_temp.test_comme(ids.inconnu, ids.club, 'U17')::text from ids
  union all select 43, 'visiteur non connecté valide U17', 'false', pg_temp.test_comme(null, ids.club, 'U17')::text from ids
)
select n, test, attendu, obtenu, (obtenu = attendu) as ok
from tests
order by n;
