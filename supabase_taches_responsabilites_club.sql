-- Onglet "Tâches & Responsabilités" du dashboard club — même schéma de
-- sécurité que supabase_evenements_projets_club.sql (club_id référence
-- profiles(id), lecture/écriture réservées au club lui-même et à son staff).

-- ── Responsabilités récurrentes (qui s'occupe de quoi, en continu) ──────────
create table if not exists responsabilites_club (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references profiles(id) on delete cascade,
  domaine text,
  emoji text not null default '📋',
  tache text not null,
  responsable_id uuid references profiles(id) on delete set null,
  responsable_nom text,
  created_at timestamptz not null default now()
);

-- ── Tâches ponctuelles (à faire une fois, avec échéance/statut) ─────────────
create table if not exists taches_club (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references profiles(id) on delete cascade,
  titre text not null,
  emoji text not null default '✅',
  responsable_id uuid references profiles(id) on delete set null,
  responsable_nom text,
  echeance date,
  statut text not null check (statut in ('a_faire', 'en_cours', 'terminee')) default 'a_faire',
  created_at timestamptz not null default now()
);

alter table responsabilites_club enable row level security;
alter table taches_club enable row level security;

-- ── Lecture : club lui-même + tout membre de son staff ──
create policy "membres_club_lecture_responsabilites"
  on responsabilites_club for select
  using (
    club_id = auth.uid()
    or exists (select 1 from staff_club sc where sc.club_id = responsabilites_club.club_id and sc.user_id = auth.uid())
  );

create policy "membres_club_lecture_taches_club"
  on taches_club for select
  using (
    club_id = auth.uid()
    or exists (select 1 from staff_club sc where sc.club_id = taches_club.club_id and sc.user_id = auth.uid())
  );

-- ── Écriture : club lui-même + tout membre de son staff (le gating fin par
-- rôle — can_edit sur la section 'taches' — est géré côté front via
-- role_permissions, comme pour les autres sections administratives) ──
create policy "membres_club_ecriture_responsabilites"
  on responsabilites_club for all
  using (
    club_id = auth.uid()
    or exists (select 1 from staff_club sc where sc.club_id = responsabilites_club.club_id and sc.user_id = auth.uid())
  )
  with check (
    club_id = auth.uid()
    or exists (select 1 from staff_club sc where sc.club_id = responsabilites_club.club_id and sc.user_id = auth.uid())
  );

create policy "membres_club_ecriture_taches_club"
  on taches_club for all
  using (
    club_id = auth.uid()
    or exists (select 1 from staff_club sc where sc.club_id = taches_club.club_id and sc.user_id = auth.uid())
  )
  with check (
    club_id = auth.uid()
    or exists (select 1 from staff_club sc where sc.club_id = taches_club.club_id and sc.user_id = auth.uid())
  );

grant select, insert, update, delete on responsabilites_club to authenticated;
grant select, insert, update, delete on taches_club to authenticated;

-- Étend la matrice de permissions (role_permissions.section) avec la nouvelle
-- section 'taches' pilotant cet onglet — sans ça, sauvegarderPermissions
-- échoue dès qu'un rôle autre que président se voit accorder l'accès.
do $$
declare
  c record;
begin
  for c in
    select conname, conrelid::regclass::text as tbl
    from pg_constraint
    where conrelid = 'role_permissions'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%section%sportif%'
  loop
    execute format('alter table %s drop constraint %I', c.tbl, c.conname);
  end loop;
end $$;

alter table role_permissions
  add constraint role_permissions_section_check
  check (section in ('sportif', 'terrains', 'deplacements', 'budget', 'sponsors', 'repartition_bus', 'profil', 'evenements', 'organigramme', 'staff', 'inventaire', 'newsletter', 'taches'));
