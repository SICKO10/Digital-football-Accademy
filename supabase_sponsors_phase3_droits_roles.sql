-- Sécurisation module Sponsors — PHASE 3 (droits par rôle appliqués en base).
--
-- PRÉREQUIS : phase 2 exécutée et vérifiée (V10 + tests T5-T9 OK).
--
-- Problème corrigé : la policy « Club manages sponsors » donne aujourd'hui
-- les 4 opérations à TOUT membre staff_club du club (buvette, arbitre,
-- intendant…), quel que soit son rôle, alors que l'interface limite la
-- section Sponsors à la matrice canViewSection / canEditSection('sponsors').
-- Via l'API directe, un rôle sans droit lit contrats, montants, contacts et
-- acces_token, et peut les modifier.
--
-- Effets :
--   A. sponsors : « Club manages sponsors » remplacée par 4 policies fondées
--      sur public.sponsors_peut_acceder(club_id, lecture|édition) :
--        SELECT  USING      (lecture)
--        INSERT  WITH CHECK (édition)
--        UPDATE  USING      (édition)  — la ligne actuelle
--                WITH CHECK (édition)  — la ligne modifiée : impossible de
--                                        déplacer un sponsor vers un club où
--                                        l'on n'a pas l'édition
--        DELETE  USING      (édition)
--      Droits résultants (identiques à DashboardClub.jsx, sauf rôle NULL) :
--        compte club (profiles.plan = 'club')       : tout ;
--        staff 'president'                          : tout ;
--        staff avec ligne role_permissions 'sponsors': can_view => lecture,
--                                                     can_view ET can_edit => édition ;
--        staff 'marketing' / 'secretaire' sans ligne : tout (défaut) ;
--        autre rôle sans ligne, rôle NULL           : rien.
--   B. niveaux_partenariat : TOUTES ses policies actuelles (définitions
--      inconnues dans le dépôt, à conserver depuis V2) remplacées par les
--      mêmes 4 policies. Seul lecteur : GestionSponsors.jsx (liste + jointure
--      sponsors -> niveaux_partenariat), rendu uniquement si
--      canViewSection('sponsors').
--   C. sponsor_clics_log : la lecture des statistiques suit le même droit de
--      lecture (StatsSponsors.jsx est un onglet de GestionSponsors).
--   D. anon et PUBLIC : aucun privilège sur niveaux_partenariat.
--
-- Changement visible assumé : un membre du staff SANS droit sponsors ne voit
-- plus l'alerte « contrat sponsor bientôt échu » sur l'accueil du dashboard
-- club (DashboardClub.jsx:385) — cohérent avec la section qu'il ne voit déjà
-- pas. Le bandeau (RPC) et les clics ne sont pas concernés.
--
-- Garde-fous : rollback complet si la phase 2 n'est pas appliquée, si une
-- policy inattendue existe, ou si un contrôle final échoue.
--
-- NE PAS EXÉCUTER SANS VALIDATION EXPLICITE.

begin;

set local check_function_bodies = on;

-- ─────────────────────────────────────────────────────────────────────────
-- 0. Garde-fous.
-- ─────────────────────────────────────────────────────────────────────────
do $$
declare
  v_inattendues text;
  v_pol record;
  v_type text;
begin
  if coalesce(obj_description(to_regprocedure('public.sponsors_peut_acceder(uuid, boolean)'), 'pg_proc'), '')
       not like 'digital-football:sponsors-phase1%' then
    raise exception 'ARRÊT : sponsors_peut_acceder (phase 1 révision 2) absente. Rien n''a été modifié.';
  end if;

  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sponsors'
             and policyname in ('sponsors_all', 'sponsors_bandeau_select')) then
    raise exception 'ARRÊT : phase 2 non appliquée (sponsors_all ou sponsors_bandeau_select présente). Rien n''a été modifié.';
  end if;

  select string_agg(policyname, ', ') into v_inattendues
  from pg_policies
  where schemaname = 'public' and tablename = 'sponsors'
    and policyname not in ('Club manages sponsors', 'sponsors_select_gestion', 'sponsors_insert_gestion',
                           'sponsors_update_gestion', 'sponsors_delete_gestion');
  if v_inattendues is not null then
    raise exception 'ARRÊT : policies inattendues sur sponsors (%). Rien n''a été modifié.', v_inattendues;
  end if;

  select string_agg(policyname, ', ') into v_inattendues
  from pg_policies
  where schemaname = 'public' and tablename = 'sponsor_clics_log'
    and policyname not in ('sponsor_clics_log_insert_membre', 'sponsor_clics_log_select', 'sponsor_clics_log_select_gestion');
  if v_inattendues is not null then
    raise exception 'ARRÊT : policies inattendues sur sponsor_clics_log (%). Rien n''a été modifié.', v_inattendues;
  end if;

  select c.udt_name into v_type from information_schema.columns c
  where c.table_schema = 'public' and c.table_name = 'niveaux_partenariat' and c.column_name = 'club_id';
  if v_type is distinct from 'uuid' then
    raise exception 'ARRÊT : niveaux_partenariat.club_id absente ou de type % (uuid attendu). Rien n''a été modifié.', coalesce(v_type, 'inexistant');
  end if;

  if not (select relrowsecurity from pg_class where oid = 'public.niveaux_partenariat'::regclass) then
    raise exception 'ARRÊT : RLS désactivée sur niveaux_partenariat (état différent de celui vérifié). Rien n''a été modifié.';
  end if;

  -- Trace des définitions remplacées (à comparer avec l'état de référence V2).
  for v_pol in
    select tablename, policyname, cmd, roles, qual, with_check from pg_policies
    where schemaname = 'public'
      and ((tablename = 'sponsors' and policyname = 'Club manages sponsors')
           or tablename = 'niveaux_partenariat'
           or (tablename = 'sponsor_clics_log' and policyname = 'sponsor_clics_log_select'))
  loop
    raise notice 'Remplacée : %.% [%] roles=% USING=% CHECK=%',
      v_pol.tablename, v_pol.policyname, v_pol.cmd, v_pol.roles, v_pol.qual, v_pol.with_check;
  end loop;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- A. sponsors.
-- ─────────────────────────────────────────────────────────────────────────
drop policy if exists "sponsors_select_gestion" on public.sponsors;
drop policy if exists "sponsors_insert_gestion" on public.sponsors;
drop policy if exists "sponsors_update_gestion" on public.sponsors;
drop policy if exists "sponsors_delete_gestion" on public.sponsors;

create policy "sponsors_select_gestion" on public.sponsors
  for select to authenticated
  using (public.sponsors_peut_acceder(club_id, false));

create policy "sponsors_insert_gestion" on public.sponsors
  for insert to authenticated
  with check (public.sponsors_peut_acceder(club_id, true));

create policy "sponsors_update_gestion" on public.sponsors
  for update to authenticated
  using (public.sponsors_peut_acceder(club_id, true))
  with check (public.sponsors_peut_acceder(club_id, true));

create policy "sponsors_delete_gestion" on public.sponsors
  for delete to authenticated
  using (public.sponsors_peut_acceder(club_id, true));

drop policy if exists "Club manages sponsors" on public.sponsors;

-- ─────────────────────────────────────────────────────────────────────────
-- B. niveaux_partenariat : remplacement de TOUTES les policies existantes.
-- ─────────────────────────────────────────────────────────────────────────
do $$
declare
  v_nom text;
begin
  for v_nom in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'niveaux_partenariat'
  loop
    execute format('drop policy %I on public.niveaux_partenariat', v_nom);
  end loop;
end;
$$;

create policy "niveaux_partenariat_select_gestion" on public.niveaux_partenariat
  for select to authenticated
  using (public.sponsors_peut_acceder(club_id, false));

create policy "niveaux_partenariat_insert_gestion" on public.niveaux_partenariat
  for insert to authenticated
  with check (public.sponsors_peut_acceder(club_id, true));

create policy "niveaux_partenariat_update_gestion" on public.niveaux_partenariat
  for update to authenticated
  using (public.sponsors_peut_acceder(club_id, true))
  with check (public.sponsors_peut_acceder(club_id, true));

create policy "niveaux_partenariat_delete_gestion" on public.niveaux_partenariat
  for delete to authenticated
  using (public.sponsors_peut_acceder(club_id, true));

revoke all on public.niveaux_partenariat from anon;
revoke all on public.niveaux_partenariat from public;
revoke truncate, references, trigger on public.niveaux_partenariat from authenticated;
grant select, insert, update, delete on public.niveaux_partenariat to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- C. sponsor_clics_log : lecture des statistiques.
-- ─────────────────────────────────────────────────────────────────────────
drop policy if exists "sponsor_clics_log_select" on public.sponsor_clics_log;
drop policy if exists "sponsor_clics_log_select_gestion" on public.sponsor_clics_log;
create policy "sponsor_clics_log_select_gestion" on public.sponsor_clics_log
  for select to authenticated
  using (public.sponsors_peut_acceder(club_id, false));

-- ─────────────────────────────────────────────────────────────────────────
-- D. Contrôles post-migration.
-- ─────────────────────────────────────────────────────────────────────────
do $$
declare
  v_bad text[] := array[]::text[];
  v_attendues text[];
  v_presentes text[];
  v_priv text;
begin
  v_attendues := array['sponsors_delete_gestion', 'sponsors_insert_gestion', 'sponsors_select_gestion', 'sponsors_update_gestion'];
  select array_agg(policyname::text order by policyname) into v_presentes
  from pg_policies where schemaname = 'public' and tablename = 'sponsors';
  if v_presentes is distinct from v_attendues then
    v_bad := array_append(v_bad, format('policies sponsors = %s', v_presentes));
  end if;

  v_attendues := array['niveaux_partenariat_delete_gestion', 'niveaux_partenariat_insert_gestion',
                       'niveaux_partenariat_select_gestion', 'niveaux_partenariat_update_gestion'];
  select array_agg(policyname::text order by policyname) into v_presentes
  from pg_policies where schemaname = 'public' and tablename = 'niveaux_partenariat';
  if v_presentes is distinct from v_attendues then
    v_bad := array_append(v_bad, format('policies niveaux_partenariat = %s', v_presentes));
  end if;

  v_attendues := array['sponsor_clics_log_insert_membre', 'sponsor_clics_log_select_gestion'];
  select array_agg(policyname::text order by policyname) into v_presentes
  from pg_policies where schemaname = 'public' and tablename = 'sponsor_clics_log';
  if v_presentes is distinct from v_attendues then
    v_bad := array_append(v_bad, format('policies sponsor_clics_log = %s', v_presentes));
  end if;

  -- UPDATE : USING et WITH CHECK tous deux présents et fondés sur l'édition.
  if exists (select 1 from pg_policies where schemaname = 'public'
             and tablename in ('sponsors', 'niveaux_partenariat') and cmd = 'UPDATE'
             and (qual is null or with_check is null
                  or qual not ilike '%sponsors_peut_acceder(club_id, true)%'
                  or with_check not ilike '%sponsors_peut_acceder(club_id, true)%')) then
    v_bad := array_append(v_bad, 'une policy UPDATE n''a pas USING et WITH CHECK en édition');
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public'
             and tablename in ('sponsors', 'niveaux_partenariat') and cmd = 'INSERT'
             and (with_check is null or with_check not ilike '%sponsors_peut_acceder(club_id, true)%')) then
    v_bad := array_append(v_bad, 'une policy INSERT n''a pas WITH CHECK en édition');
  end if;

  if exists (select 1 from pg_policies where schemaname = 'public'
             and tablename in ('sponsors', 'niveaux_partenariat', 'sponsor_clics_log')
             and (qual = 'true' or with_check = 'true' or 'anon' = any(roles) or 'public' = any(roles))) then
    v_bad := array_append(v_bad, 'policy en (true) ou ouverte à anon/public');
  end if;

  foreach v_priv in array array['select', 'insert', 'update', 'delete'] loop
    if has_table_privilege('anon', 'public.niveaux_partenariat', v_priv)
       or has_table_privilege('public', 'public.niveaux_partenariat', v_priv)
       or has_any_column_privilege('anon', 'public.niveaux_partenariat', v_priv) then
      v_bad := array_append(v_bad, format('anon/PUBLIC a %s sur niveaux_partenariat', v_priv));
    end if;
    if not has_table_privilege('authenticated', 'public.niveaux_partenariat', v_priv) then
      v_bad := array_append(v_bad, format('authenticated n''a pas %s sur niveaux_partenariat (GestionSponsors)', v_priv));
    end if;
  end loop;

  if array_length(v_bad, 1) > 0 then
    raise exception 'ÉCHEC contrôles phase 3 — transaction annulée : %', array_to_string(v_bad, ' ; ');
  end if;
  raise notice 'Phase 3 sponsors : contrôles OK';
end;
$$;

commit;
