-- Onglet "Événements & Projets" du dashboard club.

-- ── Événements ponctuels du club (tournois, soirées, réunions...) ───────────
create table if not exists evenements_club (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references profiles(id) on delete cascade,
  titre text not null,
  date date not null,
  heure time,
  lieu text,
  type text not null check (type in ('tournoi', 'soiree', 'reunion', 'autre')) default 'autre',
  description text,
  -- Participants invités : liste simple [{ id, nom, type }] avec type in
  -- ('educateur','staff','joueur') — pas de table de jonction séparée pour cette
  -- v1, la liste d'invités n'a pas besoin d'être interrogeable indépendamment.
  participants jsonb not null default '[]'::jsonb,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ── Projets suivis dans la durée ──────────────────────────────────────────
create table if not exists projets_club (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references profiles(id) on delete cascade,
  nom text not null,
  description text,
  date_debut date,
  date_fin date,
  -- Responsable : membre du staff (staff_club.id) ou le club lui-même (son propre
  -- profiles.id) — pas de FK stricte vers une seule table vu les deux cas possibles.
  responsable_id uuid,
  responsable_nom text,
  statut text not null check (statut in ('en_attente', 'en_cours', 'termine')) default 'en_attente',
  created_at timestamptz not null default now()
);

create table if not exists taches_projet (
  id uuid primary key default gen_random_uuid(),
  projet_id uuid not null references projets_club(id) on delete cascade,
  titre text not null,
  fait boolean not null default false,
  created_at timestamptz not null default now()
);

alter table evenements_club enable row level security;
alter table projets_club enable row level security;
alter table taches_projet enable row level security;

-- ── Lecture : club lui-même + tout membre de son staff ──
create policy "membres_club_lecture_evenements"
  on evenements_club for select
  using (
    club_id = auth.uid()
    or exists (select 1 from staff_club sc where sc.club_id = evenements_club.club_id and sc.user_id = auth.uid())
  );

create policy "membres_club_lecture_projets"
  on projets_club for select
  using (
    club_id = auth.uid()
    or exists (select 1 from staff_club sc where sc.club_id = projets_club.club_id and sc.user_id = auth.uid())
  );

create policy "membres_club_lecture_taches"
  on taches_projet for select
  using (
    exists (
      select 1 from projets_club p
      where p.id = taches_projet.projet_id
        and (p.club_id = auth.uid() or exists (select 1 from staff_club sc where sc.club_id = p.club_id and sc.user_id = auth.uid()))
    )
  );

-- ── Écriture : club lui-même + tout membre de son staff (le gating fin par
-- rôle — can_edit sur la section 'evenements' — est géré côté front via
-- role_permissions, comme pour les autres sections administratives) ──
create policy "membres_club_ecriture_evenements"
  on evenements_club for all
  using (
    club_id = auth.uid()
    or exists (select 1 from staff_club sc where sc.club_id = evenements_club.club_id and sc.user_id = auth.uid())
  )
  with check (
    club_id = auth.uid()
    or exists (select 1 from staff_club sc where sc.club_id = evenements_club.club_id and sc.user_id = auth.uid())
  );

create policy "membres_club_ecriture_projets"
  on projets_club for all
  using (
    club_id = auth.uid()
    or exists (select 1 from staff_club sc where sc.club_id = projets_club.club_id and sc.user_id = auth.uid())
  )
  with check (
    club_id = auth.uid()
    or exists (select 1 from staff_club sc where sc.club_id = projets_club.club_id and sc.user_id = auth.uid())
  );

create policy "membres_club_ecriture_taches"
  on taches_projet for all
  using (
    exists (
      select 1 from projets_club p
      where p.id = taches_projet.projet_id
        and (p.club_id = auth.uid() or exists (select 1 from staff_club sc where sc.club_id = p.club_id and sc.user_id = auth.uid()))
    )
  )
  with check (
    exists (
      select 1 from projets_club p
      where p.id = taches_projet.projet_id
        and (p.club_id = auth.uid() or exists (select 1 from staff_club sc where sc.club_id = p.club_id and sc.user_id = auth.uid()))
    )
  );

grant select, insert, update, delete on evenements_club to authenticated;
grant select, insert, update, delete on projets_club to authenticated;
grant select, insert, update, delete on taches_projet to authenticated;

-- Étend la matrice de permissions (role_permissions.section) avec la nouvelle
-- section 'evenements' pilotant l'onglet Événements & Projets.
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
  check (section in ('sportif', 'terrains', 'deplacements', 'budget', 'sponsors', 'repartition_bus', 'profil', 'evenements'));
