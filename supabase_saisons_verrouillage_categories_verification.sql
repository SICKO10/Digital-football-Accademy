-- Vérification du bloc 8 (supabase_saisons_verrouillage_categories.sql).
-- Lecture seule : rien n'est écrit en base. À lancer après le fichier principal,
-- puis coller le tableau de résultat. Chaque ligne doit avoir ok = true
-- (la dernière ligne, « pour info », liste les règles restantes, ok vide).
--
-- Les tests « connecté en tant que » simulent un utilisateur le temps de la
-- requête (identifiants tirés au hasard, aucun compte réel touché).

create or replace function pg_temp.attribuer_comme(p_user uuid, p_club uuid, p_educateur uuid)
returns boolean
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true);
  perform set_config('request.jwt.claims', case when p_user is null then '{}' else json_build_object('sub', p_user, 'role', 'authenticated')::text end, true);
  return public.saison_peut_attribuer_equipe(p_club, p_educateur);
end
$$;

with ids as (select gen_random_uuid() as club, gen_random_uuid() as coach, gen_random_uuid() as autre),
tests(n, test, attendu, obtenu) as (
  -- Structure
  select 1, 'déclencheur posé sur club_categories', 'true', exists (select 1 from pg_trigger where tgrelid = 'public.club_categories'::regclass and tgname = 'saison_garde_attribution_equipe' and tgenabled <> 'D')::text
  union all select 2, 'fonction de règle sécurisée (security definer)', 'true', (select prosecdef::text from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' and p.proname = 'saison_peut_attribuer_equipe')
  union all select 3, 'règle « le coach déclare sa catégorie » supprimée', '0', (select count(*)::text from pg_policies where tablename = 'club_categories' and policyname = 'educateur_declare_sa_categorie')
  union all select 4, 'règle « le coach réclame une équipe vacante » supprimée', '0', (select count(*)::text from pg_policies where tablename = 'club_categories' and policyname = 'educateur_reclame_categorie_vacante')
  union all select 5, 'règle « le coach quitte son équipe » conservée', '1', (select count(*)::text from pg_policies where tablename = 'club_categories' and policyname = 'educateur_quitte_sa_categorie')
  union all select 6, 'RLS toujours active sur club_categories', 'true', (select relrowsecurity::text from pg_class where oid = 'public.club_categories'::regclass)
  union all select 7, 'visiteur non connecté : pas d''accès à la règle', 'false', has_function_privilege('anon', 'public.saison_peut_attribuer_equipe(uuid, uuid)', 'execute')::text
  union all select 8, 'validation des demandes du bloc 5 toujours en place', 'true', exists (select 1 from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' and p.proname = 'saison_traiter_demande' and p.prosecdef)::text
  -- Connecté en tant que (simulation)
  union all select 20, 'coach s''attribue une équipe', 'false', pg_temp.attribuer_comme(ids.coach, ids.club, ids.coach)::text from ids
  union all select 21, 'coach attribue une équipe à un autre coach', 'false', pg_temp.attribuer_comme(ids.coach, ids.club, ids.autre)::text from ids
  union all select 22, 'coach se retire (équipe sans coach)', 'true', pg_temp.attribuer_comme(ids.coach, ids.club, null)::text from ids
  union all select 23, 'compte principal du club attribue une équipe', 'true', pg_temp.attribuer_comme(ids.club, ids.club, ids.coach)::text from ids
  union all select 24, 'visiteur non connecté attribue une équipe', 'false', pg_temp.attribuer_comme(null, ids.club, ids.coach)::text from ids
)
select n, test, attendu, obtenu, (obtenu = attendu) as ok
from tests
union all
select 99, 'pour info : règles restantes sur club_categories', '', (select string_agg(policyname || ' (' || cmd || ')', ', ' order by policyname) from pg_policies where tablename = 'club_categories'), null
order by n;
