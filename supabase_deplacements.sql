-- Déplacements club (mini-bus / transport équipes) — outil administratif du club,
-- également accessible en lecture/écriture aux éducateurs affiliés.
create table if not exists deplacements (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references profiles(id) on delete cascade,
  equipe text,
  educateur_responsable text,
  date_depart date not null,
  heure_depart time,
  lieu_destination text,
  nature text check (nature in ('match', 'tournoi', 'stage', 'autre')),
  vehicule text,
  conducteur text,
  km_avant numeric,
  km_apres numeric,
  gasoil_avant text,
  gasoil_apres text,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

alter table deplacements enable row level security;

-- Le club lui-même, son staff (dirigeants) et ses éducateurs affiliés acceptés
-- peuvent tous lire/créer/modifier les déplacements de LEUR club.
create policy "membres_club_lecture_deplacements"
  on deplacements for select
  using (
    club_id = auth.uid()
    or exists (select 1 from staff_club sc where sc.club_id = deplacements.club_id and sc.user_id = auth.uid())
    or exists (select 1 from club_educateurs ce where ce.club_id = deplacements.club_id and ce.educateur_id = auth.uid() and ce.statut = 'accepte')
  );

create policy "membres_club_insertion_deplacements"
  on deplacements for insert
  with check (
    club_id = auth.uid()
    or exists (select 1 from staff_club sc where sc.club_id = deplacements.club_id and sc.user_id = auth.uid())
    or exists (select 1 from club_educateurs ce where ce.club_id = deplacements.club_id and ce.educateur_id = auth.uid() and ce.statut = 'accepte')
  );

create policy "membres_club_maj_deplacements"
  on deplacements for update
  using (
    club_id = auth.uid()
    or exists (select 1 from staff_club sc where sc.club_id = deplacements.club_id and sc.user_id = auth.uid())
    or exists (select 1 from club_educateurs ce where ce.club_id = deplacements.club_id and ce.educateur_id = auth.uid() and ce.statut = 'accepte')
  );

grant select, insert, update on deplacements to authenticated;
