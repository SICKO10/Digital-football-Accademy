-- ============================================================================
-- Bibliothèque du club, bloc 1 : VÉRIFICATIONS (lecture seule)
-- À lancer APRÈS supabase_bibliotheque_club.sql.
-- Lancé par Claude : supabase db query --linked -f supabase_bibliotheque_club_verification.sql --output-format json
-- Ne modifie aucune donnée : seule une table temporaire (effacée en fin de
-- session) sert à regrouper les résultats. Chaque ligne doit afficher ok = true.
-- ============================================================================

create temp table verif (ordre int, controle text, attendu text, obtenu text);

-- --- Structure --------------------------------------------------------------
insert into verif
select 1, 'table créée et vide', '0',
       (select count(*)::text from public.bibliotheque_club_procedes)
union all
select 2, 'RLS activée', 'true',
       (select relrowsecurity::text from pg_class where oid = 'public.bibliotheque_club_procedes'::regclass)
union all
select 3, 'règles de la table', 'bcp_ajout:INSERT,bcp_lecture:SELECT,bcp_modification:UPDATE,bcp_suppression:DELETE',
       (select string_agg(policyname || ':' || cmd, ',' order by policyname) from pg_policies
         where schemaname = 'public' and tablename = 'bibliotheque_club_procedes')
union all
select 4, 'règles réservées aux comptes connectés', '{authenticated}',
       (select string_agg(distinct roles::text, ',') from pg_policies
         where schemaname = 'public' and tablename = 'bibliotheque_club_procedes')
union all
select 5, 'pas de verrou outil payant sur la table', '0',
       (select count(*)::text from pg_policies where schemaname = 'public'
          and tablename = 'bibliotheque_club_procedes' and coalesce(qual, '') || coalesce(with_check, '') ilike '%outil_ferme%')
union all
select 6, 'fonctions présentes, protégées (security definer, search_path vide)',
       'a_permission_bibliotheque,bibliotheque_club_procedes_avant_ecriture,secu_educateur_accepte_club',
       (select string_agg(proname, ',' order by proname) from pg_proc
         where pronamespace = 'public'::regnamespace and prosecdef
           and proconfig @> array['search_path=""']
           and proname in ('a_permission_bibliotheque', 'secu_educateur_accepte_club', 'bibliotheque_club_procedes_avant_ecriture'))
union all
select 7, 'déclencheur auteur et dates', 'bibliotheque_club_procedes_avant_ecriture',
       (select string_agg(tgname, ',') from pg_trigger
         where tgrelid = 'public.bibliotheque_club_procedes'::regclass and not tgisinternal)
union all
select 8, 'aucun droit pour les visiteurs anonymes (table)', '0',
       (select count(*)::text from information_schema.role_table_grants
         where table_schema = 'public' and table_name = 'bibliotheque_club_procedes' and grantee in ('anon', 'PUBLIC'))
union all
select 9, 'aucun droit pour les visiteurs anonymes (fonctions)', 'false',
       (select bool_or(has_function_privilege('anon', p.oid, 'execute'))::text from pg_proc p
         where p.pronamespace = 'public'::regnamespace
           and p.proname in ('a_permission_bibliotheque', 'secu_educateur_accepte_club', 'bibliotheque_club_procedes_avant_ecriture'))
union all
select 10, 'role_permissions accepte bibliotheque (18 sections)', 'true / 18',
       (select (pg_get_constraintdef(oid) like '%''bibliotheque''%')::text || ' / ' ||
               (length(pg_get_constraintdef(oid)) - length(replace(pg_get_constraintdef(oid), '::text', ''))) / 6
          from pg_constraint where conname = 'role_permissions_section_check')
union all
select 11, 'aucun réglage bibliotheque existant (valeurs par défaut pour tous)', '0',
       (select count(*)::text from public.role_permissions where section = 'bibliotheque');

-- --- Simulation de vrais comptes (identifiants relevés en production) -------
-- Club A = af8db5d3 (compte club), club B = adf4b030.
-- Chaque ligne : lecture club A / écriture club A / éducateur accepté club A / lecture club B.

select set_config('request.jwt.claim.sub', 'af8db5d3-ea32-4d9b-b5bf-fb6062505826', false);
insert into verif select 20, 'compte du club A', 'true/true/false/false',
  public.a_permission_bibliotheque('af8db5d3-ea32-4d9b-b5bf-fb6062505826', false)::text || '/' ||
  public.a_permission_bibliotheque('af8db5d3-ea32-4d9b-b5bf-fb6062505826', true)::text || '/' ||
  public.secu_educateur_accepte_club('af8db5d3-ea32-4d9b-b5bf-fb6062505826')::text || '/' ||
  public.a_permission_bibliotheque('adf4b030-c08e-44c3-a2d5-a0fe39405209', false)::text;

select set_config('request.jwt.claim.sub', '650a1893-c3dc-4983-b823-f4bbdf4bd8a9', false);
insert into verif select 21, 'directeur sportif du club A (défaut : écrit)', 'true/true/true/false',
  public.a_permission_bibliotheque('af8db5d3-ea32-4d9b-b5bf-fb6062505826', false)::text || '/' ||
  public.a_permission_bibliotheque('af8db5d3-ea32-4d9b-b5bf-fb6062505826', true)::text || '/' ||
  public.secu_educateur_accepte_club('af8db5d3-ea32-4d9b-b5bf-fb6062505826')::text || '/' ||
  public.a_permission_bibliotheque('adf4b030-c08e-44c3-a2d5-a0fe39405209', false)::text;

select set_config('request.jwt.claim.sub', 'ba8559e9-4aab-40d6-9d33-3a22daac07b2', false);
insert into verif select 22, 'directeur sportif du club B (ne voit rien du club A)', 'false/false/false/true',
  public.a_permission_bibliotheque('af8db5d3-ea32-4d9b-b5bf-fb6062505826', false)::text || '/' ||
  public.a_permission_bibliotheque('af8db5d3-ea32-4d9b-b5bf-fb6062505826', true)::text || '/' ||
  public.secu_educateur_accepte_club('af8db5d3-ea32-4d9b-b5bf-fb6062505826')::text || '/' ||
  public.a_permission_bibliotheque('adf4b030-c08e-44c3-a2d5-a0fe39405209', false)::text;

select set_config('request.jwt.claim.sub', 'f99b69d4-bc88-4c4d-875b-bba253bcdc11', false);
insert into verif select 23, 'éducateur accepté du club A (lit, n''écrit pas)', 'false/false/true/false',
  public.a_permission_bibliotheque('af8db5d3-ea32-4d9b-b5bf-fb6062505826', false)::text || '/' ||
  public.a_permission_bibliotheque('af8db5d3-ea32-4d9b-b5bf-fb6062505826', true)::text || '/' ||
  public.secu_educateur_accepte_club('af8db5d3-ea32-4d9b-b5bf-fb6062505826')::text || '/' ||
  public.a_permission_bibliotheque('adf4b030-c08e-44c3-a2d5-a0fe39405209', false)::text;

-- Préparateur physique du club 11f0a171 : autre rôle du staff, lecture par défaut seulement.
select set_config('request.jwt.claim.sub', '9e67e075-bc8c-433a-9757-e25f9d8514ce', false);
insert into verif select 24, 'préparateur physique (défaut : lit, n''écrit pas)', 'true/false',
  public.a_permission_bibliotheque('11f0a171-db2a-4ec8-bf1b-90484b59a606', false)::text || '/' ||
  public.a_permission_bibliotheque('11f0a171-db2a-4ec8-bf1b-90484b59a606', true)::text;

select set_config('request.jwt.claim.sub', '', false);
insert into verif select 25, 'personne de connecté', 'false/false/false',
  public.a_permission_bibliotheque('af8db5d3-ea32-4d9b-b5bf-fb6062505826', false)::text || '/' ||
  public.a_permission_bibliotheque('af8db5d3-ea32-4d9b-b5bf-fb6062505826', true)::text || '/' ||
  public.secu_educateur_accepte_club('af8db5d3-ea32-4d9b-b5bf-fb6062505826')::text;

-- --- Résultat ---------------------------------------------------------------
select ordre, controle, attendu, obtenu, (attendu = obtenu) as ok from verif order by ordre;
