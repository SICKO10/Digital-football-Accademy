-- Sécurisation module Sponsors — PHASE 3b (prospects : droits par rôle).
--
-- PRÉREQUIS : phase 1 révision 2 exécutée (sponsors_peut_acceder avec
-- marqueur, search_path vide, rôle NULL refusé). Indépendante des phases 2,
-- 3 et 4 sur le plan technique ; à exécuter dans la même fenêtre que la
-- phase 3 (même nature : application en base de la matrice des droits).
--
-- État de production confirmé le 2026-10-15 :
--   prospects_sponsors : "membres_club_ecriture_prospects" FOR ALL et
--     "membres_club_lecture_prospects" SELECT — club ou TOUT membre du staff ;
--   prospects_echanges : "membres_club_ecriture_echanges" FOR ALL et
--     "membres_club_lecture_echanges" SELECT — via un prospect du club ou
--     de son staff.
-- Problème : tout rôle staff (buvette, arbitre, intendant…) lit et modifie
-- via l'API le CRM des prospects (contacts, téléphones, emails, budgets,
-- montants potentiels, motifs de refus), alors que l'interface le réserve à
-- canViewSection / canEditSection('sponsors').
--
-- Dépendances applicatives (seul consommateur : GestionSponsors.jsx, rendu
-- uniquement si canViewSection('sponsors'), readOnly = !canEditSection) :
--   prospects_sponsors : select('*').eq('club_id') (l.855) ;
--     insert / update(payload avec club_id = club courant).select() (l.892-893) ;
--     delete (l.902) ; update({ sponsor_id }) après conversion (l.994).
--   prospects_echanges : select('*').eq('prospect_id') (l.909) ;
--     insert({ prospect_id, type, contenu }).select() (l.914).
--   Aucune autre lecture/écriture (src, api, Edge Functions).
--
-- Effets :
--   A. Fonction public.sponsors_peut_acceder_prospect(prospect_id, edition) :
--      droit sur le club DU PROSPECT (SECURITY DEFINER : la résolution du
--      club ne dépend pas des droits de lecture de l'appelant).
--   B. prospects_sponsors : 4 policies sur sponsors_peut_acceder(club_id, …)
--        SELECT lecture ; INSERT/UPDATE/DELETE édition ;
--        UPDATE : USING ET WITH CHECK en édition => impossible de déplacer un
--        prospect vers un club où l'on n'a pas l'édition ;
--        INSERT/UPDATE : sponsor_id lié doit être NULL ou un sponsor du MÊME
--        club (pas de rattachement à la fiche d'un autre club).
--   C. prospects_echanges : 4 policies sur sponsors_peut_acceder_prospect :
--        SELECT lecture ; INSERT/UPDATE/DELETE édition sur le club du
--        prospect ; UPDATE : USING ET WITH CHECK => impossible de rattacher
--        un échange au prospect d'un club non autorisé.
--   D. anon et PUBLIC : aucun privilège ; authenticated : SELECT, INSERT,
--      UPDATE, DELETE (usages de GestionSponsors), sans TRUNCATE/REFERENCES/
--      TRIGGER.
--   Les suppressions en cascade (prospect -> échanges) et le SET NULL de
--   sponsor_id à la suppression d'un sponsor sont des actions de clé
--   étrangère : elles ne passent pas par la RLS et restent inchangées.
--
-- Droits résultants (identiques à DashboardClub.jsx, sauf rôle NULL) :
--   compte club (plan 'club'), staff 'president'           : lecture + édition ;
--   staff 'marketing' / 'secretaire' sans ligne role_permissions : lecture + édition ;
--   staff avec ligne role_permissions 'sponsors'           : can_view => lecture,
--                                                            can_view ET can_edit => édition ;
--   autre rôle sans ligne, rôle NULL, autre club, anon      : rien.
--
-- NE PAS EXÉCUTER SANS VALIDATION EXPLICITE.

begin;

set local check_function_bodies = on;

-- ─────────────────────────────────────────────────────────────────────────
-- 0. Garde-fous (lecture seule — exception => rollback complet).
-- ─────────────────────────────────────────────────────────────────────────
do $$
declare
  v_oid regprocedure;
  v_attendu record;
  v_type text;
  v_manquants text[] := array[]::text[];
  v_inattendues text;
  v_pol record;
begin
  -- 0a. sponsors_peut_acceder en révision 2.
  v_oid := to_regprocedure('public.sponsors_peut_acceder(uuid, boolean)');
  if v_oid is null
     or coalesce(obj_description(v_oid, 'pg_proc'), '') not like 'digital-football:sponsors-phase1%'
     or not coalesce((select 'search_path=""' = any(proconfig) from pg_proc where oid = v_oid), false)
     or (select prosrc from pg_proc where oid = v_oid) ilike '%coalesce(sc.role%' then
    raise exception 'ARRÊT : sponsors_peut_acceder absente ou pas en révision 2 (phase 1). Rien n''a été modifié.';
  end if;

  -- 0b. Colonnes et types utilisés par les policies.
  for v_attendu in
    select * from (values
      ('prospects_sponsors', 'id', 'uuid'),
      ('prospects_sponsors', 'club_id', 'uuid'),
      ('prospects_sponsors', 'sponsor_id', 'uuid'),
      ('prospects_echanges', 'prospect_id', 'uuid'),
      ('sponsors', 'id', 'uuid'),
      ('sponsors', 'club_id', 'uuid')
    ) as t(table_name, column_name, type_attendu)
  loop
    select c.udt_name into v_type from information_schema.columns c
    where c.table_schema = 'public' and c.table_name = v_attendu.table_name and c.column_name = v_attendu.column_name;
    if v_type is distinct from v_attendu.type_attendu then
      v_manquants := array_append(v_manquants,
        format('%s.%s : %s', v_attendu.table_name, v_attendu.column_name, coalesce(v_type, 'absente')));
    end if;
  end loop;
  if array_length(v_manquants, 1) > 0 then
    raise exception 'ARRÊT phase 3b — schéma différent des hypothèses (uuid attendu) : %. Rien n''a été modifié.', array_to_string(v_manquants, ' ; ');
  end if;

  -- 0c. RLS activée (sinon les policies seraient inertes).
  if not (select relrowsecurity from pg_class where oid = 'public.prospects_sponsors'::regclass)
     or not (select relrowsecurity from pg_class where oid = 'public.prospects_echanges'::regclass) then
    raise exception 'ARRÊT : RLS désactivée sur prospects_sponsors ou prospects_echanges. Rien n''a été modifié.';
  end if;

  -- 0d. Policies existantes = exactement celles confirmées (ou celles de ce
  --     fichier, en cas de ré-exécution). Toute autre policy permissive
  --     annulerait la restriction (combinaison en OU).
  select string_agg(policyname, ', ') into v_inattendues
  from pg_policies
  where schemaname = 'public' and tablename = 'prospects_sponsors'
    and policyname not in ('membres_club_ecriture_prospects', 'membres_club_lecture_prospects',
                           'prospects_sponsors_select_gestion', 'prospects_sponsors_insert_gestion',
                           'prospects_sponsors_update_gestion', 'prospects_sponsors_delete_gestion');
  if v_inattendues is not null then
    raise exception 'ARRÊT : policies inattendues sur prospects_sponsors (%). Rien n''a été modifié.', v_inattendues;
  end if;

  select string_agg(policyname, ', ') into v_inattendues
  from pg_policies
  where schemaname = 'public' and tablename = 'prospects_echanges'
    and policyname not in ('membres_club_ecriture_echanges', 'membres_club_lecture_echanges',
                           'prospects_echanges_select_gestion', 'prospects_echanges_insert_gestion',
                           'prospects_echanges_update_gestion', 'prospects_echanges_delete_gestion');
  if v_inattendues is not null then
    raise exception 'ARRÊT : policies inattendues sur prospects_echanges (%). Rien n''a été modifié.', v_inattendues;
  end if;

  -- 0e. Anti-écrasement de la fonction créée ici.
  v_oid := to_regprocedure('public.sponsors_peut_acceder_prospect(uuid, boolean)');
  if v_oid is not null
     and coalesce(obj_description(v_oid, 'pg_proc'), '') not like 'digital-football:sponsors-phase3b%' then
    raise exception 'ARRÊT : sponsors_peut_acceder_prospect existe déjà sans le marqueur de ce fichier. Rien n''a été modifié.';
  end if;

  -- 0f. Trace des définitions remplacées (à comparer avec l'état de référence V2).
  for v_pol in
    select tablename, policyname, cmd, roles, qual, with_check from pg_policies
    where schemaname = 'public'
      and policyname in ('membres_club_ecriture_prospects', 'membres_club_lecture_prospects',
                         'membres_club_ecriture_echanges', 'membres_club_lecture_echanges')
  loop
    raise notice 'Remplacée : %.% [%] roles=% USING=% CHECK=%',
      v_pol.tablename, v_pol.policyname, v_pol.cmd, v_pol.roles, v_pol.qual, v_pol.with_check;
  end loop;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- A. Droit sur le club d'un prospect.
-- Prospect inexistant => false. search_path vide, objets qualifiés.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.sponsors_peut_acceder_prospect(p_prospect_id uuid, p_edition boolean)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.prospects_sponsors p
    where p.id = p_prospect_id
      and public.sponsors_peut_acceder(p.club_id, p_edition)
  )
$$;

comment on function public.sponsors_peut_acceder_prospect(uuid, boolean) is
  'digital-football:sponsors-phase3b — droit lecture/édition sur le club du prospect (via sponsors_peut_acceder)';

revoke all on function public.sponsors_peut_acceder_prospect(uuid, boolean) from public, anon;
grant execute on function public.sponsors_peut_acceder_prospect(uuid, boolean) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- B. prospects_sponsors.
-- La condition sur sponsor_id lit public.sponsors avec les droits de
-- l'appelant : un éditeur des sponsors du club voit ses sponsors (même
-- droit), donc la conversion prospect -> sponsor (GestionSponsors l.994)
-- fonctionne ; un sponsor d'un autre club n'est jamais rattachable.
-- ─────────────────────────────────────────────────────────────────────────
drop policy if exists "prospects_sponsors_select_gestion" on public.prospects_sponsors;
drop policy if exists "prospects_sponsors_insert_gestion" on public.prospects_sponsors;
drop policy if exists "prospects_sponsors_update_gestion" on public.prospects_sponsors;
drop policy if exists "prospects_sponsors_delete_gestion" on public.prospects_sponsors;

create policy "prospects_sponsors_select_gestion" on public.prospects_sponsors
  for select to authenticated
  using (public.sponsors_peut_acceder(club_id, false));

create policy "prospects_sponsors_insert_gestion" on public.prospects_sponsors
  for insert to authenticated
  with check (
    public.sponsors_peut_acceder(club_id, true)
    and (sponsor_id is null
         or exists (select 1 from public.sponsors s
                    where s.id = prospects_sponsors.sponsor_id and s.club_id = prospects_sponsors.club_id))
  );

create policy "prospects_sponsors_update_gestion" on public.prospects_sponsors
  for update to authenticated
  using (public.sponsors_peut_acceder(club_id, true))
  with check (
    public.sponsors_peut_acceder(club_id, true)
    and (sponsor_id is null
         or exists (select 1 from public.sponsors s
                    where s.id = prospects_sponsors.sponsor_id and s.club_id = prospects_sponsors.club_id))
  );

create policy "prospects_sponsors_delete_gestion" on public.prospects_sponsors
  for delete to authenticated
  using (public.sponsors_peut_acceder(club_id, true));

drop policy if exists "membres_club_ecriture_prospects" on public.prospects_sponsors;
drop policy if exists "membres_club_lecture_prospects" on public.prospects_sponsors;

-- ─────────────────────────────────────────────────────────────────────────
-- C. prospects_echanges (droit vérifié à travers le club du prospect).
-- ─────────────────────────────────────────────────────────────────────────
drop policy if exists "prospects_echanges_select_gestion" on public.prospects_echanges;
drop policy if exists "prospects_echanges_insert_gestion" on public.prospects_echanges;
drop policy if exists "prospects_echanges_update_gestion" on public.prospects_echanges;
drop policy if exists "prospects_echanges_delete_gestion" on public.prospects_echanges;

create policy "prospects_echanges_select_gestion" on public.prospects_echanges
  for select to authenticated
  using (public.sponsors_peut_acceder_prospect(prospect_id, false));

create policy "prospects_echanges_insert_gestion" on public.prospects_echanges
  for insert to authenticated
  with check (public.sponsors_peut_acceder_prospect(prospect_id, true));

create policy "prospects_echanges_update_gestion" on public.prospects_echanges
  for update to authenticated
  using (public.sponsors_peut_acceder_prospect(prospect_id, true))
  with check (public.sponsors_peut_acceder_prospect(prospect_id, true));

create policy "prospects_echanges_delete_gestion" on public.prospects_echanges
  for delete to authenticated
  using (public.sponsors_peut_acceder_prospect(prospect_id, true));

drop policy if exists "membres_club_ecriture_echanges" on public.prospects_echanges;
drop policy if exists "membres_club_lecture_echanges" on public.prospects_echanges;

-- ─────────────────────────────────────────────────────────────────────────
-- D. Privilèges.
-- ─────────────────────────────────────────────────────────────────────────
revoke all on public.prospects_sponsors from anon;
revoke all on public.prospects_sponsors from public;
revoke truncate, references, trigger on public.prospects_sponsors from authenticated;
grant select, insert, update, delete on public.prospects_sponsors to authenticated;

revoke all on public.prospects_echanges from anon;
revoke all on public.prospects_echanges from public;
revoke truncate, references, trigger on public.prospects_echanges from authenticated;
grant select, insert, update, delete on public.prospects_echanges to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- E. Contrôles post-migration (même transaction : un échec annule tout).
-- ─────────────────────────────────────────────────────────────────────────
do $$
declare
  v_bad text[] := array[]::text[];
  v_presentes text[];
  v_table text;
  v_priv text;
  v_role text;
begin
  select array_agg(policyname::text order by policyname) into v_presentes
  from pg_policies where schemaname = 'public' and tablename = 'prospects_sponsors';
  if v_presentes is distinct from array['prospects_sponsors_delete_gestion', 'prospects_sponsors_insert_gestion',
                                        'prospects_sponsors_select_gestion', 'prospects_sponsors_update_gestion'] then
    v_bad := array_append(v_bad, format('policies prospects_sponsors = %s', v_presentes));
  end if;

  select array_agg(policyname::text order by policyname) into v_presentes
  from pg_policies where schemaname = 'public' and tablename = 'prospects_echanges';
  if v_presentes is distinct from array['prospects_echanges_delete_gestion', 'prospects_echanges_insert_gestion',
                                        'prospects_echanges_select_gestion', 'prospects_echanges_update_gestion'] then
    v_bad := array_append(v_bad, format('policies prospects_echanges = %s', v_presentes));
  end if;

  -- UPDATE : USING ET WITH CHECK en édition ; INSERT : WITH CHECK en édition.
  if exists (select 1 from pg_policies where schemaname = 'public'
             and tablename in ('prospects_sponsors', 'prospects_echanges') and cmd = 'UPDATE'
             and (qual is null or with_check is null
                  or qual not ilike '%, true)%' or with_check not ilike '%, true)%')) then
    v_bad := array_append(v_bad, 'une policy UPDATE n''a pas USING et WITH CHECK en édition');
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public'
             and tablename in ('prospects_sponsors', 'prospects_echanges') and cmd = 'INSERT'
             and (with_check is null or with_check not ilike '%, true)%')) then
    v_bad := array_append(v_bad, 'une policy INSERT n''a pas WITH CHECK en édition');
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public'
             and tablename in ('prospects_sponsors', 'prospects_echanges')
             and (qual = 'true' or with_check = 'true' or 'anon' = any(roles) or 'public' = any(roles))) then
    v_bad := array_append(v_bad, 'policy en (true) ou ouverte à anon/public');
  end if;

  foreach v_table in array array['public.prospects_sponsors', 'public.prospects_echanges'] loop
    foreach v_priv in array array['select', 'insert', 'update', 'delete'] loop
      foreach v_role in array array['anon', 'public'] loop
        if has_table_privilege(v_role, v_table, v_priv) or has_any_column_privilege(v_role, v_table, v_priv) then
          v_bad := array_append(v_bad, format('%s a %s sur %s', v_role, v_priv, v_table));
        end if;
      end loop;
      if not has_table_privilege('authenticated', v_table, v_priv) then
        v_bad := array_append(v_bad, format('authenticated n''a pas %s sur %s (GestionSponsors)', v_priv, v_table));
      end if;
    end loop;
  end loop;

  if has_function_privilege('anon', 'public.sponsors_peut_acceder_prospect(uuid, boolean)', 'execute')
     or not has_function_privilege('authenticated', 'public.sponsors_peut_acceder_prospect(uuid, boolean)', 'execute') then
    v_bad := array_append(v_bad, 'droits EXECUTE incorrects sur sponsors_peut_acceder_prospect');
  end if;

  if array_length(v_bad, 1) > 0 then
    raise exception 'ÉCHEC contrôles phase 3b — transaction annulée : %', array_to_string(v_bad, ' ; ');
  end if;
  raise notice 'Phase 3b prospects : contrôles OK';
end;
$$;

commit;
