-- Permissions par rôle pour le dashboard club (Staff → "Gérer les permissions").
-- Une ligne = ce que le rôle peut faire sur une section donnée, pour un club donné.
-- Le président n'a jamais de ligne ici : il voit et modifie tout, en dur côté
-- front (cf. canViewSection/canEditSection dans DashboardClub.jsx), et ne peut
-- pas être restreint.
create table if not exists role_permissions (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('president', 'directeur_sportif', 'marketing', 'secretaire', 'coach_adjoint', 'kine', 'intendant', 'preparateur_physique', 'comptable')),
  section text not null check (section in ('sportif', 'terrains', 'deplacements', 'budget', 'sponsors', 'repartition_bus', 'profil', 'evenements')),
  can_view boolean not null default false,
  can_edit boolean not null default false,
  created_at timestamptz not null default now(),
  unique (club_id, role, section)
);

alter table role_permissions enable row level security;

-- ── Lecture : le club lui-même + tout membre de son staff (chacun doit pouvoir
-- charger ses propres droits au démarrage du dashboard) ──
create policy "membres_club_lecture_permissions"
  on role_permissions for select
  using (
    club_id = auth.uid()
    or exists (select 1 from staff_club sc where sc.club_id = role_permissions.club_id and sc.user_id = auth.uid())
  );

-- ── Écriture : le club lui-même + le président uniquement (seul rôle habilité à
-- configurer la matrice depuis la modale "Gérer les permissions") ──
create policy "president_insertion_permissions"
  on role_permissions for insert
  with check (
    club_id = auth.uid()
    or exists (select 1 from staff_club sc where sc.club_id = role_permissions.club_id and sc.user_id = auth.uid() and sc.role = 'president')
  );

create policy "president_maj_permissions"
  on role_permissions for update
  using (
    club_id = auth.uid()
    or exists (select 1 from staff_club sc where sc.club_id = role_permissions.club_id and sc.user_id = auth.uid() and sc.role = 'president')
  );

create policy "president_suppression_permissions"
  on role_permissions for delete
  using (
    club_id = auth.uid()
    or exists (select 1 from staff_club sc where sc.club_id = role_permissions.club_id and sc.user_id = auth.uid() and sc.role = 'president')
  );

grant select, insert, update, delete on role_permissions to authenticated;
