-- Contrôle de supabase_mon_club.sql (bloc 3 de PLAN-mon-club.md).
-- Lecture seule : ne modifie rien. Une seule ligne de résultat, chaque colonne
-- doit valoir ce qui est écrit à côté.

select
  -- les deux tables existent : true
  to_regclass('public.mon_club_reglages') is not null
    and to_regclass('public.mon_club_affichage') is not null as tables_creees,
  -- vides : 0 et 0 (aucun dashboard ne change)
  (select count(*) from public.mon_club_reglages) as lignes_reglages,
  (select count(*) from public.mon_club_affichage) as lignes_affichage,
  -- règles d'accès activées sur les deux : true
  (select bool_and(relrowsecurity) from pg_class
    where oid in ('public.mon_club_reglages'::regclass, 'public.mon_club_affichage'::regclass)) as rls_activee,
  -- règles en place : 6
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename in ('mon_club_reglages', 'mon_club_affichage')) as nb_regles,
  -- visiteur non connecté sans aucun droit : false
  has_table_privilege('anon', 'public.mon_club_affichage', 'select') as anon_peut_lire,
  -- fonctions d'accès présentes : true
  to_regprocedure('public.mon_club_peut_modifier(uuid)') is not null
    and to_regprocedure('public.mon_club_educateur_affilie(uuid, uuid)') is not null as fonctions_creees;
