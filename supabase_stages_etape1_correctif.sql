-- ════════════════════════════════════════════════════════════════════
-- MODULE STAGES — Correctif de l'étape 1 (2026-10-24)
-- NE PAS EXÉCUTER SANS VALIDATION EXPLICITE. Faire une sauvegarde avant.
--
-- Constat : une première version du module (spécification initiale) avait
-- déjà été installée. Conséquences :
--   1. stages.club_id pointe vers une table « clubs » (inutilisée par
--      l'application) au lieu de profiles → impossible de créer un stage ;
--   2. ses règles d'accès, trop ouvertes, coexistent avec celles de
--      supabase_stages_etape1.sql (les règles s'additionnent) :
--        - tout le monde peut lire tous les stages et tout le planning,
--          brouillons compris (le lien public ne protège plus rien) ;
--        - n'importe qui, même sans compte, peut créer une inscription ;
--        - n'importe quel compte peut ajouter posts, sponsors, dépenses.
-- Ce correctif : re-pointe club_id vers profiles, ajoute les contrôles de
-- cohérence prévus, supprime les règles ouvertes, et ferme les 5 tables des
-- étapes suivantes (inscriptions, dépenses, posts, sponsors, tâches) en
-- attendant qu'elles soient construites et sécurisées.
-- Garde-fou : s'annule entièrement si une des 7 tables contient une ligne.
-- La table « clubs » n'est pas supprimée (aucune donnée n'est effacée).
-- ════════════════════════════════════════════════════════════════════
begin;

do $$
begin
  if exists (select 1 from public.stages) or exists (select 1 from public.stages_planning)
     or exists (select 1 from public.stages_inscriptions) or exists (select 1 from public.stages_depenses)
     or exists (select 1 from public.stages_posts) or exists (select 1 from public.stages_sponsors)
     or exists (select 1 from public.stages_taches) then
    raise exception 'Correctif annulé : une table du module Stages contient déjà des données. Rien n''a été modifié.';
  end if;
end $$;

-- 1. club_id → profiles (un club est une ligne profiles, plan = 'club')
alter table public.stages drop constraint if exists stages_club_id_fkey;
alter table public.stages add constraint stages_club_id_fkey
  foreign key (club_id) references public.profiles(id) on delete cascade;

-- Contrôles de cohérence prévus par l'étape 1 (absents de la 1re version)
alter table public.stages alter column statut set not null;
alter table public.stages alter column places_max set not null;
alter table public.stages alter column prix_inscription set not null;
alter table public.stages drop constraint if exists stages_statut_valide;
alter table public.stages add constraint stages_statut_valide
  check (statut in ('brouillon', 'ouvert', 'complet', 'termine'));
alter table public.stages drop constraint if exists stages_dates_valides;
alter table public.stages add constraint stages_dates_valides check (date_fin >= date_debut);
alter table public.stages drop constraint if exists stages_places_valides;
alter table public.stages add constraint stages_places_valides check (places_max > 0);
alter table public.stages drop constraint if exists stages_prix_valide;
alter table public.stages add constraint stages_prix_valide check (prix_inscription >= 0);

-- 2. Suppression des règles ouvertes de la 1re version
drop policy if exists "stages_select"        on public.stages;
drop policy if exists "stages_insert"        on public.stages;
drop policy if exists "stages_update"        on public.stages;
drop policy if exists "stages_delete"        on public.stages;
drop policy if exists "planning_select"      on public.stages_planning;
drop policy if exists "planning_insert"      on public.stages_planning;
drop policy if exists "inscriptions_select"  on public.stages_inscriptions;
drop policy if exists "inscriptions_insert"  on public.stages_inscriptions;
drop policy if exists "posts_select"         on public.stages_posts;
drop policy if exists "posts_insert"         on public.stages_posts;
drop policy if exists "sponsors_select"      on public.stages_sponsors;
drop policy if exists "sponsors_insert"      on public.stages_sponsors;
drop policy if exists "depenses_select"      on public.stages_depenses;
drop policy if exists "depenses_insert"      on public.stages_depenses;
drop policy if exists "taches_select"        on public.stages_taches;
drop policy if exists "taches_insert"        on public.stages_taches;

-- 3. Tables des étapes suivantes : fermées (RLS active, aucune règle =
--    aucun accès navigateur) jusqu'à leur construction.
alter table public.stages_inscriptions enable row level security;
alter table public.stages_depenses     enable row level security;
alter table public.stages_posts        enable row level security;
alter table public.stages_sponsors     enable row level security;
alter table public.stages_taches       enable row level security;
revoke all on public.stages_inscriptions, public.stages_depenses, public.stages_posts,
              public.stages_sponsors, public.stages_taches from anon;
revoke truncate, references, trigger on public.stages_inscriptions, public.stages_depenses,
              public.stages_posts, public.stages_sponsors, public.stages_taches from authenticated;

commit;

-- Vérification (lecture seule) — à lancer SEULE après le correctif :
-- attendu : club_id → profiles ; sur stages et stages_planning, uniquement
-- les règles stages_gestion_* et stages_planning_gestion ; aucune règle sur
-- les 5 autres tables.
-- select tablename, policyname, cmd from pg_policies
-- where schemaname = 'public' and tablename like 'stages%' order by 1, 2;
