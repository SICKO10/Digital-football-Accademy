-- ============================================================================
-- Fiches d'évaluation, bloc 2 : VÉRIFICATIONS (lecture seule)
-- À lancer APRÈS supabase_fiches_evaluation_bloc2.sql.
-- Lancé par Claude : supabase db query --linked -f supabase_fiches_evaluation_bloc2_verification.sql --output-format json
-- Ne modifie aucune donnée : seule une table temporaire (effacée en fin de
-- session) regroupe les résultats. Chaque ligne doit afficher ok = true.
-- ============================================================================

create temp table verif (ordre int, controle text, attendu text, obtenu text);

-- --- Structure --------------------------------------------------------------
insert into verif
select 1, '4 tables créées et vides', '0/0/0/0',
       (select count(*) from public.evaluations)::text || '/' ||
       (select count(*) from public.evaluation_resultats)::text || '/' ||
       (select count(*) from public.notes_suivi)::text || '/' ||
       (select count(*) from public.journal_acces_evaluations)::text
union all
select 2, 'RLS activée sur les 4 tables', '4',
       (select count(*)::text from pg_class where oid in (
          'public.evaluations'::regclass, 'public.evaluation_resultats'::regclass,
          'public.notes_suivi'::regclass, 'public.journal_acces_evaluations'::regclass) and relrowsecurity)
union all
select 3, 'règles des 4 tables',
       'evaluation_resultats.er_ajout:INSERT:PERMISSIVE,evaluation_resultats.er_lecture:SELECT:PERMISSIVE,evaluation_resultats.er_modification:UPDATE:PERMISSIVE,evaluation_resultats.er_suppression:DELETE:PERMISSIVE,evaluation_resultats.verrou_outils:ALL:RESTRICTIVE,evaluations.ev_ajout:INSERT:PERMISSIVE,evaluations.ev_lecture:SELECT:PERMISSIVE,evaluations.ev_modification:UPDATE:PERMISSIVE,evaluations.ev_suppression:DELETE:PERMISSIVE,evaluations.verrou_outils:ALL:RESTRICTIVE,journal_acces_evaluations.ja_lecture:SELECT:PERMISSIVE,notes_suivi.ns_ajout:INSERT:PERMISSIVE,notes_suivi.ns_lecture:SELECT:PERMISSIVE,notes_suivi.ns_modification:UPDATE:PERMISSIVE,notes_suivi.ns_suppression:DELETE:PERMISSIVE,notes_suivi.verrou_outils:ALL:RESTRICTIVE',
       (select string_agg(tablename || '.' || policyname || ':' || cmd || ':' || permissive, ',' order by tablename, policyname) from pg_policies
         where schemaname = 'public' and tablename in ('evaluations','evaluation_resultats','notes_suivi','journal_acces_evaluations'))
union all
select 4, 'règles réservées aux comptes connectés', '{authenticated}',
       '{' || (select string_agg(distinct array_to_string(roles, ','), ';') from pg_policies
         where schemaname = 'public' and tablename in ('evaluations','evaluation_resultats','notes_suivi','journal_acces_evaluations')) || '}'
union all
select 5, 'droits des comptes connectés',
       'evaluation_resultats:DELETE,evaluation_resultats:INSERT,evaluation_resultats:SELECT,evaluation_resultats:UPDATE,evaluations:DELETE,evaluations:INSERT,evaluations:SELECT,evaluations:UPDATE,journal_acces_evaluations:SELECT,notes_suivi:DELETE,notes_suivi:INSERT,notes_suivi:SELECT,notes_suivi:UPDATE',
       (select string_agg(table_name || ':' || privilege_type, ',' order by table_name, privilege_type)
          from information_schema.role_table_grants
         where table_schema = 'public' and grantee = 'authenticated'
           and table_name in ('evaluations','evaluation_resultats','notes_suivi','journal_acces_evaluations'))
union all
select 6, 'aucun droit pour les visiteurs (tables)', '0',
       (select count(*)::text from information_schema.role_table_grants
         where table_schema = 'public' and grantee in ('anon', 'PUBLIC')
           and table_name in ('evaluations','evaluation_resultats','notes_suivi','journal_acces_evaluations'))
union all
select 7, '20 fonctions (search_path vide), dont 18 protégées (security definer)', '20/20/18',
       (select count(*)::text || '/' ||
               count(*) filter (where p.proconfig @> array['search_path=""'])::text || '/' ||
               count(*) filter (where p.prosecdef)::text
          from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname in (
           'evaluation_cle_categorie','evaluation_famille_poste','evaluation_contexte_joueur','secu_categorie_effectif',
           'secu_staff_couvre_categorie','a_permission_evaluations','secu_membre_club','secu_educateur_a_le_joueur',
           'secu_est_le_joueur','secu_est_parent_du_joueur','secu_evaluation_droit_ligne','secu_evaluation_droit',
           'secu_note_droit_ligne','secu_version_lue_par_evaluation','secu_modele_lu_par_evaluation','noter_acces_evaluations',
           'evaluations_avant_ecriture','evaluation_resultats_avant_ecriture','notes_suivi_avant_ecriture','notes_suivi_apres_suppression'))
union all
select 8, 'aucun droit pour les visiteurs (fonctions) ; contexte joueur fermé aux comptes', 'false/false',
       (select bool_or(has_function_privilege('anon', p.oid, 'execute'))::text
          from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname in (
           'evaluation_contexte_joueur','secu_categorie_effectif','secu_staff_couvre_categorie','a_permission_evaluations',
           'secu_membre_club','secu_educateur_a_le_joueur','secu_est_le_joueur','secu_est_parent_du_joueur',
           'secu_evaluation_droit_ligne','secu_evaluation_droit','secu_note_droit_ligne','secu_version_lue_par_evaluation',
           'secu_modele_lu_par_evaluation','noter_acces_evaluations')) || '/' ||
       has_function_privilege('authenticated', 'public.evaluation_contexte_joueur(uuid)', 'execute')::text
union all
select 9, '4 déclencheurs',
       'evaluation_resultats_avant_ecriture,evaluations_avant_ecriture,notes_suivi_apres_suppression,notes_suivi_avant_ecriture',
       (select string_agg(tgname, ',' order by tgname) from pg_trigger
         where not tgisinternal and tgrelid in ('public.evaluations'::regclass, 'public.evaluation_resultats'::regclass, 'public.notes_suivi'::regclass))
union all
select 10, 'role_permissions accepte evaluations et evaluations_tests (21 sections)', 'true / 21',
       (select (pg_get_constraintdef(oid) like '%''evaluations''%' and pg_get_constraintdef(oid) like '%''evaluations_tests''%')::text || ' / ' ||
               (length(pg_get_constraintdef(oid)) - length(replace(pg_get_constraintdef(oid), '::text', ''))) / 6
          from pg_constraint where conname = 'role_permissions_section_check')
union all
select 11, 'critères, versions, modèles lisibles via une évaluation (3 règles ajoutées)',
       'criteres_evaluation.ce_lecture_evaluation,modeles_evaluation.me_lecture_evaluation,modeles_evaluation_versions.mev_lecture_evaluation',
       (select string_agg(tablename || '.' || policyname, ',' order by tablename) from pg_policies
         where schemaname = 'public' and policyname in ('ce_lecture_evaluation','mev_lecture_evaluation','me_lecture_evaluation'))
union all
select 12, 'anciennes fiches : club_lit_evaluations corrigée, autres règles intactes',
       'true/8',
       (select (qual like '%a_permission_evaluations%' and qual like '%secu_categorie_effectif%')::text from pg_policies
         where schemaname = 'public' and tablename = 'evaluations_joueur' and policyname = 'club_lit_evaluations') || '/' ||
       (select count(*)::text from pg_policies where schemaname = 'public' and tablename = 'evaluations_joueur')
union all
select 13, 'aucun réglage evaluations / evaluations_tests (valeurs par défaut pour tous)', '0',
       (select count(*)::text from public.role_permissions where section in ('evaluations', 'evaluations_tests'));

-- --- Simulation de vrais comptes (identifiants relevés en production) -------
-- Club A = af8db5d3 (seul club avec d'anciennes fiches : 34, catégories U12 et
-- U18). Ses deux directeurs sportifs ont l'accès complet aux catégories.
-- Colonnes : lit évaluations U12 / écrit évaluations / lit tests / lit tests club B.

select set_config('request.jwt.claim.sub', 'af8db5d3-ea32-4d9b-b5bf-fb6062505826', false);
insert into verif select 20, 'compte du club A (lit, n''écrit pas)', 'true/false/true/false',
  public.a_permission_evaluations('af8db5d3-ea32-4d9b-b5bf-fb6062505826', 'evaluations', false, 'U12')::text || '/' ||
  public.a_permission_evaluations('af8db5d3-ea32-4d9b-b5bf-fb6062505826', 'evaluations', true, 'U12')::text || '/' ||
  public.a_permission_evaluations('af8db5d3-ea32-4d9b-b5bf-fb6062505826', 'evaluations_tests', false, 'U12')::text || '/' ||
  public.a_permission_evaluations('adf4b030-c08e-44c3-a2d5-a0fe39405209', 'evaluations_tests', false, 'U12')::text;

select set_config('request.jwt.claim.sub', '650a1893-c3dc-4983-b823-f4bbdf4bd8a9', false);
insert into verif select 21, 'directeur sportif du club A (lit, n''écrit pas par défaut)', 'true/false/true/false',
  public.a_permission_evaluations('af8db5d3-ea32-4d9b-b5bf-fb6062505826', 'evaluations', false, 'U12')::text || '/' ||
  public.a_permission_evaluations('af8db5d3-ea32-4d9b-b5bf-fb6062505826', 'evaluations', true, 'U12')::text || '/' ||
  public.a_permission_evaluations('af8db5d3-ea32-4d9b-b5bf-fb6062505826', 'evaluations_tests', false, 'U12')::text || '/' ||
  public.a_permission_evaluations('adf4b030-c08e-44c3-a2d5-a0fe39405209', 'evaluations_tests', false, 'U12')::text;
insert into verif select 22, 'ce directeur lit toujours les 34 anciennes fiches', '34',
  (select count(*)::text from public.evaluations_joueur ej
    where exists (select 1 from public.club_educateurs ce
                  where ce.educateur_id = ej.educateur_id and ce.statut = 'accepte'
                    and public.a_permission_evaluations(ce.club_id, 'evaluations', false,
                          public.secu_categorie_effectif(ej.equipe_joueur_id))));

select set_config('request.jwt.claim.sub',
  (select sc.user_id::text from public.staff_club sc
    where sc.club_id = 'af8db5d3-ea32-4d9b-b5bf-fb6062505826' and sc.role = 'directeur_sportif'
      and sc.user_id::text like '9f30757b%'), false);
insert into verif select 23, 'second directeur sportif du club A : lit les 34 anciennes fiches', '34',
  (select count(*)::text from public.evaluations_joueur ej
    where exists (select 1 from public.club_educateurs ce
                  where ce.educateur_id = ej.educateur_id and ce.statut = 'accepte'
                    and public.a_permission_evaluations(ce.club_id, 'evaluations', false,
                          public.secu_categorie_effectif(ej.equipe_joueur_id))));

select set_config('request.jwt.claim.sub', 'ba8559e9-4aab-40d6-9d33-3a22daac07b2', false);
insert into verif select 24, 'directeur sportif du club B : rien sur A, lit chez lui', 'false/false/0/true',
  public.a_permission_evaluations('af8db5d3-ea32-4d9b-b5bf-fb6062505826', 'evaluations', false, 'U12')::text || '/' ||
  public.a_permission_evaluations('af8db5d3-ea32-4d9b-b5bf-fb6062505826', 'evaluations_tests', false, 'U12')::text || '/' ||
  (select count(*)::text from public.evaluations_joueur ej
    where exists (select 1 from public.club_educateurs ce
                  where ce.educateur_id = ej.educateur_id and ce.statut = 'accepte'
                    and public.a_permission_evaluations(ce.club_id, 'evaluations', false,
                          public.secu_categorie_effectif(ej.equipe_joueur_id)))) || '/' ||
  public.a_permission_evaluations('adf4b030-c08e-44c3-a2d5-a0fe39405209', 'evaluations', false, 'U12')::text;

-- Préparateur physique d'un autre club, périmètre réglé sur « Seniors »
select set_config('request.jwt.claim.sub',
  (select sc.user_id::text from public.staff_club sc
    where sc.role = 'preparateur_physique' and sc.user_id::text like '9e67e075%'), false);
insert into verif select 25, 'préparateur (périmètre Seniors) : tests Seniors oui, U12 non, évaluations non, écrit les tests Seniors', 'true/false/false/true',
  public.a_permission_evaluations(sc.club_id, 'evaluations_tests', false, 'SENIORS')::text || '/' ||
  public.a_permission_evaluations(sc.club_id, 'evaluations_tests', false, 'U12')::text || '/' ||
  public.a_permission_evaluations(sc.club_id, 'evaluations', false, 'SENIORS')::text || '/' ||
  public.a_permission_evaluations(sc.club_id, 'evaluations_tests', true, 'SENIORS')::text
  from public.staff_club sc where sc.role = 'preparateur_physique' and sc.user_id::text like '9e67e075%';

select set_config('request.jwt.claim.sub', '', false);
insert into verif select 26, 'personne de connecté', 'false/false/false',
  public.a_permission_evaluations('af8db5d3-ea32-4d9b-b5bf-fb6062505826', 'evaluations', false, 'U12')::text || '/' ||
  public.secu_evaluation_droit('00000000-0000-0000-0000-000000000000', 'lecture')::text || '/' ||
  public.secu_version_lue_par_evaluation('00000000-0000-0000-0000-000000000000')::text;

select ordre, controle, attendu, obtenu, (attendu = obtenu) as ok from verif order by ordre;
