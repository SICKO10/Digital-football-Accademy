-- SPONSORS DE TOURNOI — emplacements publicitaires sur la page publique de
-- suivi (/tournoi/:code) ET la page d'inscription des équipes
-- (/tournoi/:code/inscription), + mêmes statistiques (vues/clics/CTR) que
-- pour les stages, cf. supabase_stats_sponsors_phase1.sql. C'est la phase 2
-- annoncée lors de cette dernière migration (tournois hors scope à l'époque,
-- aucun système de sponsor n'existait encore pour eux).
--
-- NE PAS EXÉCUTER SANS VALIDATION EXPLICITE. Transactionnel, additif.
--
-- Dépend de (déjà exécutés, confirmés par les migrations tournois en place) :
--   - supabase_tournois_organises.sql / _fix_complete.sql (is_club_manager, tournois_organises)
--   - supabase_tournois_organises_public_read.sql (le pattern "code_public IS NOT NULL"
--     repris ici à l'identique pour la lecture publique)

begin;

-- ────────────────────────────────────────────────────────────────────────
-- 1. tournois_sponsors — même forme que stages_sponsors (montant interne,
-- jamais exposé au public : contrairement aux stages (lecture publique via
-- une fonction stage_public() qui choisit elle-même les champs renvoyés),
-- les pages publiques tournoi lisent les tables DIRECTEMENT (select('*')),
-- donc la confidentialité du montant doit être garantie par les GRANT
-- colonne par colonne ci-dessous, pas seulement par la RLS au niveau ligne.
-- ────────────────────────────────────────────────────────────────────────
create table if not exists tournois_sponsors (
  id uuid primary key default gen_random_uuid(),
  tournoi_id uuid not null references tournois_organises(id) on delete cascade,
  nom text not null,
  lien_url text,
  message text,
  montant numeric,
  logo_url text,
  actif boolean not null default true,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_tournois_sponsors_tournoi on tournois_sponsors(tournoi_id);

alter table tournois_sponsors enable row level security;

drop policy if exists "tournois_sponsors_manage" on tournois_sponsors;
create policy "tournois_sponsors_manage" on tournois_sponsors for all
  using (exists (select 1 from tournois_organises t where t.id = tournoi_id and is_club_manager(t.club_id)))
  with check (exists (select 1 from tournois_organises t where t.id = tournoi_id and is_club_manager(t.club_id)));

drop policy if exists "tournois_sponsors_public_read" on tournois_sponsors;
create policy "tournois_sponsors_public_read" on tournois_sponsors for select
  using (actif and exists (select 1 from tournois_organises t where t.id = tournoi_id and t.code_public is not null));

-- Postgres combine les deux policies SELECT en OR (le club voit aussi les
-- sponsors masqués via la policy "manage" ci-dessus) ; la restriction qui
-- compte vraiment pour le public est le GRANT colonne par colonne suivant.
revoke all on tournois_sponsors from anon;
grant select (id, tournoi_id, nom, lien_url, message, logo_url, actif, created_at) on tournois_sponsors to anon;
grant select, insert, update, delete on tournois_sponsors to authenticated;

-- ────────────────────────────────────────────────────────────────────────
-- 2. Vues (page de suivi + page d'inscription, même compteur — "le même
-- mécanisme que pour les stages") et clics par sponsor. Écriture uniquement
-- via les deux RPC ci-dessous (p_code, pas p_tournoi_id) : pages publiques
-- sans compte, donc pas d'auth.uid() fiable pour une policy INSERT classique.
-- ────────────────────────────────────────────────────────────────────────
create table if not exists tournoi_vues_log (
  id uuid primary key default gen_random_uuid(),
  tournoi_id uuid not null references tournois_organises(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table tournoi_vues_log enable row level security;
revoke all on tournoi_vues_log from anon, authenticated;

drop policy if exists "tournoi_vues_log_select" on tournoi_vues_log;
create policy "tournoi_vues_log_select" on tournoi_vues_log for select to authenticated
  using (exists (select 1 from tournois_organises t where t.id = tournoi_vues_log.tournoi_id and is_club_manager(t.club_id)));

create table if not exists tournoi_sponsor_clics_log (
  id uuid primary key default gen_random_uuid(),
  tournoi_id uuid not null references tournois_organises(id) on delete cascade,
  sponsor_id uuid not null references tournois_sponsors(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table tournoi_sponsor_clics_log enable row level security;
revoke all on tournoi_sponsor_clics_log from anon, authenticated;

drop policy if exists "tournoi_sponsor_clics_log_select" on tournoi_sponsor_clics_log;
create policy "tournoi_sponsor_clics_log_select" on tournoi_sponsor_clics_log for select to authenticated
  using (exists (select 1 from tournois_organises t where t.id = tournoi_sponsor_clics_log.tournoi_id and is_club_manager(t.club_id)));

create index if not exists idx_tournoi_vues_log_tournoi on tournoi_vues_log(tournoi_id, created_at);
create index if not exists idx_tournoi_sponsor_clics_log_tournoi on tournoi_sponsor_clics_log(tournoi_id, created_at);
create index if not exists idx_tournoi_sponsor_clics_log_sponsor on tournoi_sponsor_clics_log(sponsor_id, created_at);

create or replace function public.loguer_vue_tournoi(p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_tournoi_id uuid;
begin
  select id into v_tournoi_id from tournois_organises where upper(code_public) = upper(p_code);
  if v_tournoi_id is not null then
    insert into tournoi_vues_log (tournoi_id) values (v_tournoi_id);
  end if;
end;
$$;
revoke execute on function public.loguer_vue_tournoi(text) from public;
grant execute on function public.loguer_vue_tournoi(text) to anon, authenticated;

create or replace function public.loguer_clic_sponsor_tournoi(p_code text, p_sponsor_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_tournoi_id uuid;
begin
  select t.id into v_tournoi_id
  from tournois_organises t
  join tournois_sponsors sp on sp.tournoi_id = t.id and sp.id = p_sponsor_id and sp.actif
  where upper(t.code_public) = upper(p_code);
  if v_tournoi_id is not null then
    insert into tournoi_sponsor_clics_log (tournoi_id, sponsor_id) values (v_tournoi_id, p_sponsor_id);
  end if;
end;
$$;
revoke execute on function public.loguer_clic_sponsor_tournoi(text, uuid) from public;
grant execute on function public.loguer_clic_sponsor_tournoi(text, uuid) to anon, authenticated;

commit;

-- ════════════════════════════════════════════════════════════════════════
-- TESTS suggérés (à lancer séparément, avec de vrais id/code) :
-- 1. select loguer_vue_tournoi('<code_public_existant>'); puis
--    select count(*) from tournoi_vues_log; -- +1
-- 2. select * from tournois_sponsors; en tant qu'anon (clé anon, pas de
--    session) sur un tournoi avec code_public : doit renvoyer nom/logo_url/
--    lien_url/message/actif/created_at, jamais montant ni created_by.
-- 3. select loguer_clic_sponsor_tournoi('<code>', '<id sponsor d un AUTRE tournoi>');
--    puis vérifier qu'aucune ligne n'a été insérée.
-- ════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════
-- ROLLBACK (NE PAS EXÉCUTER TEL QUEL — référence uniquement) :
--
-- drop function if exists public.loguer_clic_sponsor_tournoi(text, uuid);
-- drop function if exists public.loguer_vue_tournoi(text);
-- drop table if exists tournoi_sponsor_clics_log;
-- drop table if exists tournoi_vues_log;
-- drop table if exists tournois_sponsors;
-- ════════════════════════════════════════════════════════════════════════
