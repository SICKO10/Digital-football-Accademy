-- Parc de véhicules du club (plaque + capacité), utilisé par l'outil de
-- répartition mini-bus pour affecter automatiquement les déplacements.
create table if not exists vehicules (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references profiles(id) on delete cascade,
  plaque text not null,
  capacite integer not null,
  created_at timestamptz not null default now()
);

alter table vehicules enable row level security;

-- Lecture : club lui-même, staff (dirigeants) et éducateurs affiliés acceptés.
create policy "membres_club_lecture_vehicules"
  on vehicules for select
  using (
    club_id = auth.uid()
    or exists (select 1 from staff_club sc where sc.club_id = vehicules.club_id and sc.user_id = auth.uid())
    or exists (select 1 from club_educateurs ce where ce.club_id = vehicules.club_id and ce.educateur_id = auth.uid() and ce.statut = 'accepte')
  );

-- Écriture (gestion du parc) : club lui-même et staff uniquement, pas les éducateurs.
create policy "club_staff_insertion_vehicules"
  on vehicules for insert
  with check (
    club_id = auth.uid()
    or exists (select 1 from staff_club sc where sc.club_id = vehicules.club_id and sc.user_id = auth.uid())
  );

create policy "club_staff_maj_vehicules"
  on vehicules for update
  using (
    club_id = auth.uid()
    or exists (select 1 from staff_club sc where sc.club_id = vehicules.club_id and sc.user_id = auth.uid())
  );

create policy "club_staff_suppression_vehicules"
  on vehicules for delete
  using (
    club_id = auth.uid()
    or exists (select 1 from staff_club sc where sc.club_id = vehicules.club_id and sc.user_id = auth.uid())
  );

grant select, insert, update, delete on vehicules to authenticated;
