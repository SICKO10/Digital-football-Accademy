-- Contrôle de supabase_mon_club_journal_suite.sql (bloc 3 de PLAN-outils-offerts-suite.md).
-- Lecture seule : ne modifie rien. Une seule ligne de résultat, chaque colonne
-- doit valoir ce qui est écrit à côté.

select
  -- les cinq nouvelles actions sont acceptées : true
  (select pg_get_constraintdef(oid) like '%place_auto%' and pg_get_constraintdef(oid) like '%plus_fourni%'
     from pg_constraint where conrelid = 'public.mon_club_journal'::regclass and conname = 'mon_club_journal_action_check') as actions_ok,
  -- la colonne de l'état d'avant existe : true
  exists (select 1 from information_schema.columns
          where table_schema = 'public' and table_name = 'mon_club_journal' and column_name = 'etat_avant') as etat_avant_ok,
  -- l'outil peut être vide (pour les places) : YES
  (select is_nullable from information_schema.columns
   where table_schema = 'public' and table_name = 'mon_club_journal' and column_name = 'outil') as outil_nullable,
  -- la règle « place sans outil, outil sans place » existe : true
  exists (select 1 from pg_constraint
          where conrelid = 'public.mon_club_journal'::regclass and conname = 'mon_club_journal_objet_selon_action') as regle_objet_ok,
  -- aucune ligne de place ou d'outil fourni avant le premier essai : 0 (les anciennes lignes sont intactes)
  (select count(*) from public.mon_club_journal where action not in ('retire', 'reaffiche')) as lignes_nouvelles_actions,
  -- les règles d'accès n'ont pas bougé : 1
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'mon_club_journal') as nb_regles,
  -- le navigateur connecté ne peut toujours pas écrire : false
  has_table_privilege('authenticated', 'public.mon_club_journal', 'insert') as connecte_peut_ecrire;
