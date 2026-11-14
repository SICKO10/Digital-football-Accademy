-- Vérification du bloc 7 (PLAN-outils-offerts-suite.md). Lecture seule. Lancer
-- après supabase_rappel_fin_club.sql, le fichier en entier.
--
-- Résultat : un seul tableau. Chaque ligne doit avoir ok = true.

select ordre, controle, attendu, obtenu, attendu = obtenu as ok
from (
  select 1 as ordre, 'Table des rappels protégée (RLS), fermée au navigateur' as controle, 'true false false' as attendu,
    (select relrowsecurity::text from pg_class where oid = to_regclass('public.club_fin_rappel')) || ' ' ||
    has_table_privilege('anon', 'public.club_fin_rappel', 'select')::text || ' ' ||
    has_table_privilege('authenticated', 'public.club_fin_rappel', 'select')::text as obtenu

  union all
  select 2, 'Fonction du rappel fermée aux comptes connectés et aux visiteurs, ouverte au serveur', 'false false true',
    has_function_privilege('authenticated', 'public.rappeler_fin_programmee_clubs()', 'execute')::text || ' ' ||
    has_function_privilege('anon', 'public.rappeler_fin_programmee_clubs()', 'execute')::text || ' ' ||
    has_function_privilege('service_role', 'public.rappeler_fin_programmee_clubs()', 'execute')::text

  union all
  select 3, 'Extension pg_cron installée', '1',
    (select count(*)::text from pg_extension where extname = 'pg_cron')

  union all
  select 4, 'Tâche quotidienne présente et active (tous les jours à 07:00 UTC)', '1',
    (select count(*)::text from cron.job
     where jobname = 'rappel-fin-forfait-club' and schedule = '0 7 * * *' and active
       and command = 'select public.rappeler_fin_programmee_clubs()')

  union all
  select 5, 'Paiement et avis du bloc 5 inchangés (webhook, avis après la fin)', 'oui oui',
    (select case when md5(regexp_replace(prosrc, '\s', '', 'g')) = 'deb062b1f59814e3df5ffbd7cc927719' then 'oui' else 'non' end
     from pg_proc where oid = to_regprocedure('public.outils_synchroniser_abonnement(text, text, uuid, text, jsonb, integer, text, text, timestamptz, boolean, boolean)')) || ' ' ||
    (select case when md5(regexp_replace(prosrc, '\s', '', 'g')) = '9d584f5e56026752a1080e597c065655' then 'oui' else 'non' end
     from pg_proc where oid = to_regprocedure('public.prevenir_fin_outils_club()'))

  union all
  select 6, 'Déclencheur des avis du bloc 5 toujours actif', '1',
    (select count(*)::text from pg_trigger where tgname = 'trigger_avertir_fin_programmee_club' and not tgisinternal and tgenabled = 'O')

  union all
  select 7, 'Aucun rappel déjà parti par erreur à la mise en place', '0',
    (select count(*)::text from public.club_fin_rappel)
) c
order by ordre;
