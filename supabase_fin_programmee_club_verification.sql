-- Vérification du bloc 5 (PLAN-outils-offerts-suite.md). Lecture seule. Lancer
-- après supabase_fin_programmee_club.sql, le fichier en entier.
--
-- Résultat : un seul tableau. Chaque ligne doit avoir ok = true.

select ordre, controle, attendu, obtenu, attendu = obtenu as ok
from (
  select 1 as ordre, 'Tables fin programmée et avis protégées (RLS)' as controle, 'true true' as attendu,
    (select relrowsecurity::text from pg_class where oid = to_regclass('public.club_fin_programmee')) || ' ' ||
    (select relrowsecurity::text from pg_class where oid = to_regclass('public.club_fin_avis')) as obtenu

  union all
  select 2, 'Le club, son staff et ses éducateurs lisent la fin programmée', '1',
    count(*)::text from pg_policies
    where schemaname = 'public' and tablename = 'club_fin_programmee' and policyname = 'club_fin_programmee_lecture'

  union all
  select 3, 'Personne n''écrit depuis le navigateur ; les avis restent au serveur', 'false false false',
    has_table_privilege('anon', 'public.club_fin_programmee', 'select')::text || ' ' ||
    has_table_privilege('authenticated', 'public.club_fin_programmee', 'insert')::text || ' ' ||
    has_table_privilege('authenticated', 'public.club_fin_avis', 'select')::text

  union all
  select 4, 'Déclencheurs actifs (avis avant la fin, avis après la fin)', '1 1',
    (select count(*)::text from pg_trigger where tgname = 'trigger_avertir_fin_programmee_club' and not tgisinternal and tgenabled = 'O') || ' ' ||
    (select count(*)::text from pg_trigger where tgname = 'trigger_prevenir_fin_outils_club' and not tgisinternal and tgenabled = 'O')

  union all
  select 5, 'Fonctions fermées aux comptes connectés', 'false false false false',
    has_function_privilege('authenticated', 'public.outils_synchroniser_abonnement(text, text, uuid, text, jsonb, integer, text, text, timestamptz, boolean, boolean)', 'execute')::text || ' ' ||
    has_function_privilege('authenticated', 'public.prevenir_fin_outils_club()', 'execute')::text || ' ' ||
    has_function_privilege('authenticated', 'public.avertir_fin_programmee_club()', 'execute')::text || ' ' ||
    has_function_privilege('authenticated', 'public.educateurs_prevenus_fin_club(uuid)', 'execute')::text

  union all
  select 6, 'Le webhook peut toujours appeler la fonction du paiement', 'true',
    has_function_privilege('service_role', 'public.outils_synchroniser_abonnement(text, text, uuid, text, jsonb, integer, text, text, timestamptz, boolean, boolean)', 'execute')::text

  union all
  select 7, 'Nombre d''éducateurs prévenus : ouvert au club connecté, fermé aux visiteurs', 'true false',
    has_function_privilege('authenticated', 'public.club_nb_educateurs_prevenus(uuid)', 'execute')::text || ' ' ||
    has_function_privilege('anon', 'public.club_nb_educateurs_prevenus(uuid)', 'execute')::text

  union all
  select 8, 'Nouvelles versions en place (paiement, avis après la fin)', 'oui oui',
    (select case when md5(regexp_replace(prosrc, '\s', '', 'g')) = 'deb062b1f59814e3df5ffbd7cc927719' then 'oui' else 'non' end
     from pg_proc where oid = to_regprocedure('public.outils_synchroniser_abonnement(text, text, uuid, text, jsonb, integer, text, text, timestamptz, boolean, boolean)')) || ' ' ||
    (select case when md5(regexp_replace(prosrc, '\s', '', 'g')) = '9d584f5e56026752a1080e597c065655' then 'oui' else 'non' end
     from pg_proc where oid = to_regprocedure('public.prevenir_fin_outils_club()'))

  union all
  select 9, 'Date écrite en français', '1er décembre 2026',
    public.date_fin_texte('2026-12-01 10:00+00'::timestamptz)

  union all
  select 10, 'Aucun club n''a encore de résiliation enregistrée', '0',
    (select count(*)::text from public.club_fin_programmee)
) c
order by ordre;
