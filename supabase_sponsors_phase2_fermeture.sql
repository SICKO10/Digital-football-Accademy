-- Sécurisation module Sponsors — PHASE 2 (fermeture), révision 2.
--
-- PRÉREQUIS, dans cet ordre :
--   1. supabase_sponsors_verification.sql exécuté, résultats conservés
--      (V1-V9 et V11-V14 : état de référence) ;
--   2. supabase_sponsors_phase1_fonctions_rpc.sql (révision 2) exécuté,
--      V15 conforme, tests F0 + T1-T4 OK ;
--   3. nouveau src/components/SponsorsBar.jsx (RPC sponsors_bandeau) déployé
--      en production ET vérifié (bandeau visible côté club, éducateur, joueur).
-- Sans le point 3, le bandeau disparaît pour les joueurs/éducateurs/parents
-- (aucune donnée perdue, mais régression visible).
--
-- Effets :
--   A. sponsors : suppression de "sponsors_all" (USING true, FOR ALL, TO
--      public) et de "sponsors_bandeau_select" (toutes colonnes, acces_token
--      compris, pour tout compte connecté). Reste "Club manages sponsors"
--      (club propriétaire + staff) — remplacée par des policies par rôle en
--      PHASE 3 (supabase_sponsors_phase3_droits_roles.sql).
--   B. sponsors : plus aucun privilège pour anon ni PUBLIC (aucun usage
--      direct légitime : le portail partenaire passe par une fonction
--      SECURITY DEFINER). authenticated garde SELECT/INSERT/UPDATE/DELETE
--      (GestionSponsors.jsx), perd TRUNCATE/REFERENCES/TRIGGER.
--   C. sponsor_clics_log : un clic n'est accepté que d'un membre du club,
--      pour un sponsor de ce club affiché en bandeau (fonction
--      sponsors_clic_autorise). anon et PUBLIC : aucun privilège.
--      authenticated : garde SELECT (StatsSponsors.jsx) et INSERT
--      (SponsorsBar.jsx), perd UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER.
--
-- Garde-fous : la transaction s'annule ENTIÈREMENT (rien n'est modifié) si
--   - les fonctions de la phase 1 ne sont pas la RÉVISION 2 (marqueur,
--     search_path vide, SECURITY DEFINER, rôle NULL non traité comme
--     président, EXECUTE refusé à anon/PUBLIC) ;
--   - la policy "Club manages sponsors" est absente, ou ne dépend pas de
--     auth.uid(), ou s'applique à anon ;
--   - la policy SELECT conservée sur sponsor_clics_log est en USING (true)
--     ou ne dépend pas de auth.uid() ;
--   - une policy inattendue existe sur sponsors ou sponsor_clics_log.
--
-- Rejouable : si la phase 3 a déjà été appliquée (policies sponsors_*_gestion
-- présentes à la place de "Club manages sponsors"), le script le détecte et
-- n'exige plus "Club manages sponsors".
--
-- NE PAS EXÉCUTER SANS VALIDATION EXPLICITE.

begin;

-- ─────────────────────────────────────────────────────────────────────────
-- 0. Garde-fous (lecture seule — exception => rollback complet).
-- ─────────────────────────────────────────────────────────────────────────
do $$
declare
  v_fonction text;
  v_oid regprocedure;
  v_inattendues text;
  v_phase3 boolean;
  v_pol record;
begin
  -- 0a. Phase 1 présente ET en révision 2.
  foreach v_fonction in array array[
    'public.sponsors_peut_acceder(uuid, boolean)',
    'public.sponsors_est_membre_club(uuid)',
    'public.sponsors_bandeau(uuid, text)',
    'public.sponsors_clic_autorise(uuid, uuid)'
  ] loop
    v_oid := to_regprocedure(v_fonction);
    if v_oid is null then
      raise exception 'ARRÊT : % absente (phase 1 non exécutée). Rien n''a été modifié.', v_fonction;
    end if;
    if coalesce(obj_description(v_oid, 'pg_proc'), '') not like 'digital-football:sponsors-phase1%' then
      raise exception 'ARRÊT : % sans marqueur de la phase 1 révision 2. Rien n''a été modifié.', v_fonction;
    end if;
    if not (select prosecdef from pg_proc where oid = v_oid) then
      raise exception 'ARRÊT : % n''est pas SECURITY DEFINER. Rien n''a été modifié.', v_fonction;
    end if;
    if not coalesce((select 'search_path=""' = any(proconfig) from pg_proc where oid = v_oid), false) then
      raise exception 'ARRÊT : % n''a pas search_path vide. Rien n''a été modifié.', v_fonction;
    end if;
    if has_function_privilege('anon', v_oid, 'execute') or has_function_privilege('public', v_oid, 'execute') then
      raise exception 'ARRÊT : % exécutable par anon ou PUBLIC. Rien n''a été modifié.', v_fonction;
    end if;
    if not has_function_privilege('authenticated', v_oid, 'execute') then
      raise exception 'ARRÊT : % non exécutable par authenticated (les policies échoueraient). Rien n''a été modifié.', v_fonction;
    end if;
  end loop;

  if (select prosrc from pg_proc where oid = 'public.sponsors_peut_acceder(uuid, boolean)'::regprocedure)
       ilike '%coalesce(sc.role%' then
    raise exception 'ARRÊT : sponsors_peut_acceder traite encore un rôle NULL comme président (révision 1). Rien n''a été modifié.';
  end if;

  -- 0b. État des policies de sponsors.
  v_phase3 := exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'sponsors' and policyname = 'sponsors_select_gestion'
  );

  if not v_phase3 then
    select * into v_pol from pg_policies
    where schemaname = 'public' and tablename = 'sponsors' and policyname = 'Club manages sponsors';
    if not found then
      raise exception 'ARRÊT : policy "Club manages sponsors" introuvable — le club perdrait l''accès à ses sponsors. Rien n''a été modifié.';
    end if;
    if v_pol.qual is null or v_pol.qual = 'true' or v_pol.qual not ilike '%auth.uid()%' then
      raise exception 'ARRÊT : "Club manages sponsors" ne dépend pas de auth.uid() (USING = %). À examiner. Rien n''a été modifié.', v_pol.qual;
    end if;
    if v_pol.with_check is not null and (v_pol.with_check = 'true' or v_pol.with_check not ilike '%auth.uid()%') then
      raise exception 'ARRÊT : "Club manages sponsors" a un WITH CHECK trop large (%). Rien n''a été modifié.', v_pol.with_check;
    end if;
    if 'anon' = any(v_pol.roles) then
      raise exception 'ARRÊT : "Club manages sponsors" s''applique explicitement à anon. Rien n''a été modifié.';
    end if;
  end if;

  select string_agg(policyname, ', ') into v_inattendues
  from pg_policies
  where schemaname = 'public' and tablename = 'sponsors'
    and policyname not in ('Club manages sponsors', 'sponsors_all', 'sponsors_bandeau_select',
                           'sponsors_select_gestion', 'sponsors_insert_gestion',
                           'sponsors_update_gestion', 'sponsors_delete_gestion');
  if v_inattendues is not null then
    raise exception 'ARRÊT : policies inattendues sur sponsors (%). À examiner avant fermeture. Rien n''a été modifié.', v_inattendues;
  end if;

  -- 0c. sponsor_clics_log : policies attendues uniquement, SELECT conservée
  --     dépendante de auth.uid().
  select string_agg(policyname || ' (' || cmd || ')', ', ') into v_inattendues
  from pg_policies
  where schemaname = 'public' and tablename = 'sponsor_clics_log'
    and policyname not in ('sponsor_clics_log_insert', 'sponsor_clics_log_insert_membre',
                           'sponsor_clics_log_select', 'sponsor_clics_log_select_gestion');
  if v_inattendues is not null then
    raise exception 'ARRÊT : policies inattendues sur sponsor_clics_log (%). À examiner avant fermeture. Rien n''a été modifié.', v_inattendues;
  end if;

  for v_pol in
    select * from pg_policies
    where schemaname = 'public' and tablename = 'sponsor_clics_log' and cmd = 'SELECT'
  loop
    if v_pol.qual is null or v_pol.qual = 'true' or v_pol.qual not ilike '%auth.uid()%' then
      raise exception 'ARRÊT : policy SELECT % sur sponsor_clics_log trop large (USING = %). Rien n''a été modifié.', v_pol.policyname, v_pol.qual;
    end if;
  end loop;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- A. sponsors : suppression des deux policies trop larges.
-- ─────────────────────────────────────────────────────────────────────────
drop policy if exists "sponsors_all" on public.sponsors;
drop policy if exists "sponsors_bandeau_select" on public.sponsors;

-- ─────────────────────────────────────────────────────────────────────────
-- B. sponsors : privilèges. REVOKE au niveau table retire aussi les
--    éventuels privilèges de colonne correspondants.
-- ─────────────────────────────────────────────────────────────────────────
revoke all on public.sponsors from anon;
revoke all on public.sponsors from public;
revoke truncate, references, trigger on public.sponsors from authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- C. sponsor_clics_log : statistiques non falsifiables.
-- Ancienne policy INSERT : WITH CHECK (auth.uid() IS NOT NULL) — n'importe
-- quel compte pouvait insérer des clics pour n'importe quel club/sponsor.
-- La policy SELECT existante est conservée ici (remplacée en phase 3).
-- ─────────────────────────────────────────────────────────────────────────
drop policy if exists "sponsor_clics_log_insert" on public.sponsor_clics_log;
drop policy if exists "sponsor_clics_log_insert_membre" on public.sponsor_clics_log;
create policy "sponsor_clics_log_insert_membre" on public.sponsor_clics_log
  for insert to authenticated
  with check (public.sponsors_clic_autorise(sponsor_id, club_id));

revoke all on public.sponsor_clics_log from anon;
revoke all on public.sponsor_clics_log from public;
revoke update, delete, truncate, references, trigger on public.sponsor_clics_log from authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- D. Contrôles post-migration (même transaction : un échec annule tout).
-- ─────────────────────────────────────────────────────────────────────────
do $$
declare
  v_bad text[] := array[]::text[];
  v_role text;
  v_priv text;
begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sponsors'
             and policyname in ('sponsors_all', 'sponsors_bandeau_select')) then
    v_bad := array_append(v_bad, 'policy large encore présente sur sponsors');
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public'
             and tablename in ('sponsors', 'sponsor_clics_log')
             and (qual = 'true' or with_check = 'true')) then
    v_bad := array_append(v_bad, 'une policy USING/WITH CHECK (true) subsiste sur sponsors ou sponsor_clics_log');
  end if;

  -- anon et PUBLIC : aucun privilège, ni de table ni de colonne.
  foreach v_role in array array['anon', 'public'] loop
    foreach v_priv in array array['select', 'insert', 'update', 'delete'] loop
      if has_table_privilege(v_role, 'public.sponsors', v_priv)
         or has_any_column_privilege(v_role, 'public.sponsors', v_priv) then
        v_bad := array_append(v_bad, format('%s a encore %s sur sponsors', v_role, v_priv));
      end if;
      if has_table_privilege(v_role, 'public.sponsor_clics_log', v_priv)
         or has_any_column_privilege(v_role, 'public.sponsor_clics_log', v_priv) then
        v_bad := array_append(v_bad, format('%s a encore %s sur sponsor_clics_log', v_role, v_priv));
      end if;
    end loop;
  end loop;

  -- authenticated : exactement ce que l'application utilise.
  foreach v_priv in array array['select', 'insert', 'update', 'delete'] loop
    if not has_table_privilege('authenticated', 'public.sponsors', v_priv) then
      v_bad := array_append(v_bad, format('authenticated a perdu %s sur sponsors (GestionSponsors)', v_priv));
    end if;
  end loop;
  if not has_table_privilege('authenticated', 'public.sponsor_clics_log', 'insert')
     or not has_table_privilege('authenticated', 'public.sponsor_clics_log', 'select') then
    v_bad := array_append(v_bad, 'authenticated a perdu INSERT/SELECT sur sponsor_clics_log');
  end if;
  if has_table_privilege('authenticated', 'public.sponsor_clics_log', 'update')
     or has_table_privilege('authenticated', 'public.sponsor_clics_log', 'delete') then
    v_bad := array_append(v_bad, 'authenticated peut encore modifier/supprimer des clics');
  end if;

  -- Portail partenaire : au moins une des deux fonctions reste exécutable
  -- par anon (get_sponsor_by_token aujourd'hui, sponsor_portail après la
  -- phase 4).
  if not (
    (to_regprocedure('public.get_sponsor_by_token(uuid)') is not null
       and has_function_privilege('anon', 'public.get_sponsor_by_token(uuid)', 'execute'))
    or (to_regprocedure('public.sponsor_portail(uuid)') is not null
       and has_function_privilege('anon', 'public.sponsor_portail(uuid)', 'execute'))
  ) then
    v_bad := array_append(v_bad, 'portail partenaire : aucune fonction de portail exécutable par anon');
  end if;

  if array_length(v_bad, 1) > 0 then
    raise exception 'ÉCHEC contrôles phase 2 — transaction annulée : %', array_to_string(v_bad, ' ; ');
  end if;
  raise notice 'Phase 2 sponsors : contrôles OK';
end;
$$;

commit;
