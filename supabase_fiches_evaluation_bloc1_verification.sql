-- ============================================================================
-- Fiches d'évaluation, bloc 1 : VÉRIFICATIONS (lecture seule)
-- À lancer APRÈS supabase_fiches_evaluation_bloc1.sql.
-- Lancé par Claude : supabase db query --linked -f supabase_fiches_evaluation_bloc1_verification.sql --output-format json
-- Ne modifie aucune donnée : seule une table temporaire (effacée en fin de
-- session) regroupe les résultats. Chaque ligne doit afficher ok = true.
-- ============================================================================

create temp table verif (ordre int, controle text, attendu text, obtenu text);

-- --- Structure --------------------------------------------------------------
insert into verif
select 1, '5 tables créées et vides', '0/0/0/0/0',
       (select count(*) from public.bibliotheque_criteres)::text || '/' ||
       (select count(*) from public.parametres_evaluation)::text || '/' ||
       (select count(*) from public.modeles_evaluation)::text || '/' ||
       (select count(*) from public.modeles_evaluation_versions)::text || '/' ||
       (select count(*) from public.criteres_evaluation)::text
union all
select 2, 'RLS activée sur les 5 tables', '5',
       (select count(*)::text from pg_class where oid in (
          'public.bibliotheque_criteres'::regclass, 'public.parametres_evaluation'::regclass,
          'public.modeles_evaluation'::regclass, 'public.modeles_evaluation_versions'::regclass,
          'public.criteres_evaluation'::regclass) and relrowsecurity)
union all
select 3, 'règles des tables',
       'bibliotheque_criteres.bc_lecture:SELECT,criteres_evaluation.ce_ajout:INSERT,criteres_evaluation.ce_lecture:SELECT,criteres_evaluation.ce_modification:UPDATE,criteres_evaluation.ce_suppression:DELETE,modeles_evaluation.me_ajout:INSERT,modeles_evaluation.me_lecture:SELECT,modeles_evaluation.me_modification:UPDATE,modeles_evaluation.me_suppression:DELETE,modeles_evaluation_versions.mev_ajout:INSERT,modeles_evaluation_versions.mev_lecture:SELECT,modeles_evaluation_versions.mev_modification:UPDATE,modeles_evaluation_versions.mev_suppression:DELETE,parametres_evaluation.pe_ajout:INSERT,parametres_evaluation.pe_lecture:SELECT,parametres_evaluation.pe_modification:UPDATE',
       (select string_agg(tablename || '.' || policyname || ':' || cmd, ',' order by tablename, policyname) from pg_policies
         where schemaname = 'public' and tablename in ('bibliotheque_criteres','parametres_evaluation','modeles_evaluation','modeles_evaluation_versions','criteres_evaluation'))
union all
select 4, 'règles réservées aux comptes connectés', '{authenticated}',
       (select string_agg(distinct roles::text, ',') from pg_policies
         where schemaname = 'public' and tablename in ('bibliotheque_criteres','parametres_evaluation','modeles_evaluation','modeles_evaluation_versions','criteres_evaluation'))
union all
select 5, 'droits des comptes connectés',
       'bibliotheque_criteres:SELECT,criteres_evaluation:DELETE,criteres_evaluation:INSERT,criteres_evaluation:SELECT,criteres_evaluation:UPDATE,modeles_evaluation:DELETE,modeles_evaluation:INSERT,modeles_evaluation:SELECT,modeles_evaluation:UPDATE,modeles_evaluation_versions:DELETE,modeles_evaluation_versions:INSERT,modeles_evaluation_versions:SELECT,modeles_evaluation_versions:UPDATE,parametres_evaluation:INSERT,parametres_evaluation:SELECT,parametres_evaluation:UPDATE',
       (select string_agg(table_name || ':' || privilege_type, ',' order by table_name, privilege_type)
          from information_schema.role_table_grants
         where table_schema = 'public' and grantee = 'authenticated'
           and table_name in ('bibliotheque_criteres','parametres_evaluation','modeles_evaluation','modeles_evaluation_versions','criteres_evaluation'))
union all
select 6, 'aucun droit pour les visiteurs (tables)', '0',
       (select count(*)::text from information_schema.role_table_grants
         where table_schema = 'public' and grantee in ('anon', 'PUBLIC')
           and table_name in ('bibliotheque_criteres','parametres_evaluation','modeles_evaluation','modeles_evaluation_versions','criteres_evaluation'))
union all
select 7, '10 fonctions protégées (security definer, search_path vide)', '10',
       (select count(*)::text from pg_proc
         where pronamespace = 'public'::regnamespace and prosecdef and proconfig @> array['search_path=""']
           and proname in ('a_permission_modeles_evaluation','secu_educateur_peut_modele_evaluation','secu_modele_evaluation_lecture',
                           'secu_modele_evaluation_edition','secu_modele_evaluation_acces','secu_version_evaluation_acces',
                           'modeles_evaluation_avant_ecriture','modeles_evaluation_versions_avant_ecriture',
                           'criteres_evaluation_avant_ecriture','parametres_evaluation_avant_ecriture'))
union all
select 8, 'aucun droit pour les visiteurs (fonctions)', 'false',
       (select bool_or(has_function_privilege('anon', p.oid, 'execute'))::text from pg_proc p
         where p.pronamespace = 'public'::regnamespace
           and p.proname in ('a_permission_modeles_evaluation','secu_educateur_peut_modele_evaluation','secu_modele_evaluation_lecture',
                             'secu_modele_evaluation_edition','secu_modele_evaluation_acces','secu_version_evaluation_acces',
                             'modeles_evaluation_avant_ecriture','modeles_evaluation_versions_avant_ecriture',
                             'criteres_evaluation_avant_ecriture','parametres_evaluation_avant_ecriture'))
union all
select 9, '4 déclencheurs', 'criteres_evaluation_avant_ecriture,modeles_evaluation_avant_ecriture,modeles_evaluation_versions_avant_ecriture,parametres_evaluation_avant_ecriture',
       (select string_agg(tgname, ',' order by tgname) from pg_trigger
         where not tgisinternal and tgrelid in ('public.modeles_evaluation'::regclass, 'public.modeles_evaluation_versions'::regclass,
                                                'public.criteres_evaluation'::regclass, 'public.parametres_evaluation'::regclass))
union all
select 10, 'role_permissions accepte evaluations_modeles (19 sections)', 'true / 19',
       (select (pg_get_constraintdef(oid) like '%''evaluations_modeles''%')::text || ' / ' ||
               (length(pg_get_constraintdef(oid)) - length(replace(pg_get_constraintdef(oid), '::text', ''))) / 6
          from pg_constraint where conname = 'role_permissions_section_check')
union all
select 11, 'aucun réglage evaluations_modeles (valeurs par défaut pour tous)', '0',
       (select count(*)::text from public.role_permissions where section = 'evaluations_modeles');

-- --- Simulation de vrais comptes (identifiants relevés en production) -------
-- Club A = af8db5d3 (compte club), club B = adf4b030. Aucun réglage n'existe
-- encore : personne n'a coché « les éducateurs peuvent compléter ».
-- Colonnes : lit modèles A / écrit modèles A / lit modèles B / éducateur peut
-- créer dans A / éducateur peut créer hors club.

select set_config('request.jwt.claim.sub', 'af8db5d3-ea32-4d9b-b5bf-fb6062505826', false);
insert into verif select 20, 'compte du club A', 'true/true/false/false/false',
  public.secu_modele_evaluation_lecture('af8db5d3-ea32-4d9b-b5bf-fb6062505826', null)::text || '/' ||
  public.secu_modele_evaluation_edition('af8db5d3-ea32-4d9b-b5bf-fb6062505826', null)::text || '/' ||
  public.secu_modele_evaluation_lecture('adf4b030-c08e-44c3-a2d5-a0fe39405209', null)::text || '/' ||
  public.secu_educateur_peut_modele_evaluation('af8db5d3-ea32-4d9b-b5bf-fb6062505826')::text || '/' ||
  public.secu_educateur_peut_modele_evaluation(null)::text;

select set_config('request.jwt.claim.sub', '650a1893-c3dc-4983-b823-f4bbdf4bd8a9', false);
insert into verif select 21, 'directeur sportif du club A (défaut : écrit)', 'true/true/false/false/false',
  public.secu_modele_evaluation_lecture('af8db5d3-ea32-4d9b-b5bf-fb6062505826', null)::text || '/' ||
  public.secu_modele_evaluation_edition('af8db5d3-ea32-4d9b-b5bf-fb6062505826', null)::text || '/' ||
  public.secu_modele_evaluation_lecture('adf4b030-c08e-44c3-a2d5-a0fe39405209', null)::text || '/' ||
  public.secu_educateur_peut_modele_evaluation('af8db5d3-ea32-4d9b-b5bf-fb6062505826')::text || '/' ||
  public.secu_educateur_peut_modele_evaluation(null)::text;

select set_config('request.jwt.claim.sub', 'ba8559e9-4aab-40d6-9d33-3a22daac07b2', false);
insert into verif select 22, 'directeur sportif du club B (rien sur A)', 'false/false/true/false/false',
  public.secu_modele_evaluation_lecture('af8db5d3-ea32-4d9b-b5bf-fb6062505826', null)::text || '/' ||
  public.secu_modele_evaluation_edition('af8db5d3-ea32-4d9b-b5bf-fb6062505826', null)::text || '/' ||
  public.secu_modele_evaluation_lecture('adf4b030-c08e-44c3-a2d5-a0fe39405209', null)::text || '/' ||
  public.secu_educateur_peut_modele_evaluation('af8db5d3-ea32-4d9b-b5bf-fb6062505826')::text || '/' ||
  public.secu_educateur_peut_modele_evaluation(null)::text;

select set_config('request.jwt.claim.sub', 'f99b69d4-bc88-4c4d-875b-bba253bcdc11', false);
insert into verif select 23, 'éducateur accepté du club A (lit, n''écrit pas, club n''a pas autorisé)', 'true/false/false/false/false',
  public.secu_modele_evaluation_lecture('af8db5d3-ea32-4d9b-b5bf-fb6062505826', null)::text || '/' ||
  public.secu_modele_evaluation_edition('af8db5d3-ea32-4d9b-b5bf-fb6062505826', null)::text || '/' ||
  public.secu_modele_evaluation_lecture('adf4b030-c08e-44c3-a2d5-a0fe39405209', null)::text || '/' ||
  public.secu_educateur_peut_modele_evaluation('af8db5d3-ea32-4d9b-b5bf-fb6062505826')::text || '/' ||
  public.secu_educateur_peut_modele_evaluation(null)::text;

-- Préparateur physique du club 11f0a171 : lit (pour connaître les tests), n'écrit pas.
select set_config('request.jwt.claim.sub', '9e67e075-bc8c-433a-9757-e25f9d8514ce', false);
insert into verif select 24, 'préparateur physique (défaut : lit, n''écrit pas)', 'true/false',
  public.secu_modele_evaluation_lecture('11f0a171-db2a-4ec8-bf1b-90484b59a606', null)::text || '/' ||
  public.secu_modele_evaluation_edition('11f0a171-db2a-4ec8-bf1b-90484b59a606', null)::text;

-- Éducateur rattaché à aucun club : crée librement ses propres modèles.
select set_config('request.jwt.claim.sub', '19b17e6c-77e9-48fd-a4ee-b17d590be499', false);
insert into verif select 25, 'éducateur indépendant (ses modèles seulement)', 'false/false/false/false/true/true',
  public.secu_modele_evaluation_lecture('af8db5d3-ea32-4d9b-b5bf-fb6062505826', null)::text || '/' ||
  public.secu_modele_evaluation_edition('af8db5d3-ea32-4d9b-b5bf-fb6062505826', null)::text || '/' ||
  public.secu_modele_evaluation_lecture('adf4b030-c08e-44c3-a2d5-a0fe39405209', null)::text || '/' ||
  public.secu_educateur_peut_modele_evaluation('af8db5d3-ea32-4d9b-b5bf-fb6062505826')::text || '/' ||
  public.secu_educateur_peut_modele_evaluation(null)::text || '/' ||
  public.secu_modele_evaluation_edition(null, '19b17e6c-77e9-48fd-a4ee-b17d590be499')::text;

select set_config('request.jwt.claim.sub', '731fe931-0bd2-48ec-acba-33d6cea80e58', false);
insert into verif select 26, 'joueur (aucun accès)', 'false/false/false/false/false',
  public.secu_modele_evaluation_lecture('af8db5d3-ea32-4d9b-b5bf-fb6062505826', null)::text || '/' ||
  public.secu_modele_evaluation_edition('af8db5d3-ea32-4d9b-b5bf-fb6062505826', null)::text || '/' ||
  public.secu_modele_evaluation_lecture('adf4b030-c08e-44c3-a2d5-a0fe39405209', null)::text || '/' ||
  public.secu_educateur_peut_modele_evaluation('af8db5d3-ea32-4d9b-b5bf-fb6062505826')::text || '/' ||
  public.secu_educateur_peut_modele_evaluation(null)::text;

select set_config('request.jwt.claim.sub', '', false);
insert into verif select 27, 'personne de connecté', 'false/false/false',
  public.secu_modele_evaluation_lecture('af8db5d3-ea32-4d9b-b5bf-fb6062505826', null)::text || '/' ||
  public.secu_modele_evaluation_edition('af8db5d3-ea32-4d9b-b5bf-fb6062505826', null)::text || '/' ||
  public.secu_educateur_peut_modele_evaluation(null)::text;

-- --- Résultat ---------------------------------------------------------------
select ordre, controle, attendu, obtenu, (attendu = obtenu) as ok from verif order by ordre;
