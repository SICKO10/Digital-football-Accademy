do $$ begin if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; create role authenticated nologin; create role service_role nologin; end if; end $$;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('bench.uid', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to public;
grant usage on schema public to anon, authenticated, service_role;
create extension if not exists pgcrypto;

create table public.profiles (id uuid primary key, plan text, modele_outils boolean not null default false, email text);
create table public.staff_club (id uuid primary key default gen_random_uuid(), club_id uuid references profiles(id) on delete cascade, user_id uuid references profiles(id) on delete cascade, role text, unique(club_id,user_id));
create table public.role_permissions (id uuid primary key default gen_random_uuid(), club_id uuid, role text, section text, can_view boolean, can_edit boolean,
  constraint role_permissions_section_check check (section = any (array['sportif','bibliotheque']::text[])));
create table public.role_categories_access (id uuid primary key default gen_random_uuid(), club_id uuid not null, role text not null, categories jsonb default '[]', acces_complet boolean default false, unique(club_id, role));
create table public.club_educateurs (id uuid primary key default gen_random_uuid(), club_id uuid not null references profiles(id), educateur_id uuid not null references profiles(id), statut text default 'en_attente', unique(club_id, educateur_id));
create table public.categories (id uuid primary key default gen_random_uuid(), club_id uuid not null, nom text not null, nom_cle text, mode text not null default 'par_equipe');
create table public.club_categories (id uuid primary key default gen_random_uuid(), club_id uuid not null references profiles(id), nom text not null, equipe text not null default 'A', educateur_id uuid references profiles(id), categorie_id uuid references categories(id));
create table public.equipe_joueurs (id uuid primary key default gen_random_uuid(), educateur_id uuid references profiles(id) on delete cascade, prenom text not null, nom text, poste text, categorie text, club_categorie_id uuid references club_categories(id), email text, joueur_id uuid references profiles(id), categorie_id uuid references categories(id));
create table public.affiliations (id uuid primary key default gen_random_uuid(), educateur_id uuid, joueur_id uuid references profiles(id) on delete cascade, statut text default 'en_attente', created_at timestamptz default now(), equipe_joueur_id uuid references equipe_joueurs(id));
create table public.parents_acces (id uuid primary key default gen_random_uuid(), joueur_id uuid, parent_id uuid, statut text);
create table public.dirigeant_acces (id uuid primary key default gen_random_uuid(), educateur_id uuid references profiles(id) on delete cascade, dirigeant_id uuid references profiles(id), statut text, permissions jsonb);
create table public.outils_comptes (compte_id uuid, outil text);
create table public.evaluations_joueur (id uuid primary key default gen_random_uuid(), equipe_joueur_id uuid not null references equipe_joueurs(id) on delete cascade, educateur_id uuid not null, saison text not null, periode text not null, visible_joueur boolean not null default false, autorise_prefill_joueur boolean not null default false, verrouillee_joueur boolean not null default false, updated_at timestamptz default now());

create function public.est_parent_accepte_de(p_joueur_id uuid) returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from parents_acces where joueur_id = p_joueur_id and parent_id = auth.uid() and statut = 'accepte') $$;
create function public.secu_educateur_accepte_club(p_club_id uuid) returns boolean language sql stable security definer set search_path to '' as $$
  select auth.uid() is not null and p_club_id is not null and exists (select 1 from public.club_educateurs ce where ce.club_id = p_club_id and ce.educateur_id = auth.uid() and ce.statut = 'accepte') $$;
create function public.secu_club_ou_president(p_club_id uuid) returns boolean language sql stable security definer set search_path to '' as $$
  select auth.uid() is not null and p_club_id is not null and ((p_club_id = auth.uid() and exists (select 1 from public.profiles pr where pr.id = p_club_id and pr.plan = 'club'))
    or exists (select 1 from public.staff_club sc where sc.club_id = p_club_id and sc.user_id = auth.uid() and sc.role = 'president')) $$;
create function public.secu_club_ou_staff(p_club_id uuid) returns boolean language sql stable security definer set search_path to '' as $$
  select auth.uid() is not null and p_club_id is not null and ((p_club_id = auth.uid() and exists (select 1 from public.profiles pr where pr.id = p_club_id and pr.plan = 'club'))
    or exists (select 1 from public.staff_club sc where sc.club_id = p_club_id and sc.user_id = auth.uid() and sc.role is not null)) $$;
create function public.categories_compte_educateur(p_categorie_id uuid, p_compte uuid) returns boolean language sql stable security definer set search_path to '' as $$
  select p_categorie_id is not null and p_compte is not null and exists (select 1 from public.club_categories cc where cc.categorie_id = p_categorie_id and cc.educateur_id = p_compte) $$;
create function public.categories_commun_educateur(p_categorie_id uuid) returns boolean language sql stable security definer set search_path to '' as $$
  select p_categorie_id is not null and exists (select 1 from public.categories c where c.id = p_categorie_id and c.mode = 'commun') and public.categories_compte_educateur(p_categorie_id, auth.uid()) $$;
create function public.outil_ferme(p_educateur text[], p_club text[]) returns boolean language sql stable security definer set search_path to '' as $$
  select coalesce((select p.modele_outils is true and p.plan = 'educateur' and cardinality(p_educateur) > 0
    and not exists (select 1 from unnest(p_educateur) o where exists (select 1 from public.outils_comptes oc where oc.compte_id = p.id and oc.outil = o)) from public.profiles p where p.id = auth.uid()), false) $$;

alter table public.evaluations_joueur enable row level security;
create policy club_lit_evaluations on public.evaluations_joueur for select using (exists (select 1 from club_educateurs where club_educateurs.educateur_id = evaluations_joueur.educateur_id and club_educateurs.statut = 'accepte' and (club_educateurs.club_id = auth.uid() or exists (select 1 from staff_club where staff_club.club_id = club_educateurs.club_id and staff_club.user_id = auth.uid()))));
create policy educateur_gere_evaluations on public.evaluations_joueur for all using (auth.uid() = educateur_id) with check (auth.uid() = educateur_id);
create policy verrou_outils on public.evaluations_joueur as restrictive for all to authenticated using (not (select outil_ferme('{suivi_joueurs}'::text[], '{}'::text[])));
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on public.outils_comptes from authenticated;
create table public.tests_physiques (id uuid primary key default gen_random_uuid());
