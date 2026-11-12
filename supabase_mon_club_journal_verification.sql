-- Contrôle de supabase_mon_club_journal.sql (bloc 10 de PLAN-mon-club.md).
-- Lecture seule : ne modifie rien. Une seule ligne de résultat, chaque colonne
-- doit valoir ce qui est écrit à côté.

select
  -- la table existe : true
  to_regclass('public.mon_club_journal') is not null as table_creee,
  -- vide : 0 (aucun dashboard ne change)
  (select count(*) from public.mon_club_journal) as lignes_journal,
  -- règles d'accès activées : true
  (select relrowsecurity from pg_class where oid = 'public.mon_club_journal'::regclass) as rls_activee,
  -- une seule règle (lecture) : 1
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'mon_club_journal') as nb_regles,
  -- visiteur non connecté sans aucun droit : false
  has_table_privilege('anon', 'public.mon_club_journal', 'select') as anon_peut_lire,
  -- le navigateur connecté ne peut pas écrire : false
  has_table_privilege('authenticated', 'public.mon_club_journal', 'insert') as connecte_peut_ecrire;
