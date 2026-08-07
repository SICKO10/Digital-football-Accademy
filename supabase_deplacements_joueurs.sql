-- Répartition manuelle Bus 1 / Bus 2 / Location par déplacement.
-- bus_numero : 1 = Bus 1, 2 = Bus 2, 3 = Location.

create table if not exists deplacements_joueurs (
  id uuid primary key default gen_random_uuid(),
  deplacement_id uuid not null references deplacements(id) on delete cascade,
  joueur_id uuid not null references equipe_joueurs(id) on delete cascade,
  bus_numero integer not null default 1 check (bus_numero in (1, 2, 3)),
  created_at timestamptz not null default now(),
  unique (deplacement_id, joueur_id)
);

alter table deplacements_joueurs enable row level security;

-- Lecture/écriture : le club (via deplacements.club_id) + tout membre de son staff.
create policy "membres_club_lecture_deplacements_joueurs"
  on deplacements_joueurs for select
  using (
    exists (
      select 1 from deplacements d
      where d.id = deplacements_joueurs.deplacement_id
        and (d.club_id = auth.uid() or exists (select 1 from staff_club sc where sc.club_id = d.club_id and sc.user_id = auth.uid()))
    )
  );

create policy "membres_club_ecriture_deplacements_joueurs"
  on deplacements_joueurs for all
  using (
    exists (
      select 1 from deplacements d
      where d.id = deplacements_joueurs.deplacement_id
        and (d.club_id = auth.uid() or exists (select 1 from staff_club sc where sc.club_id = d.club_id and sc.user_id = auth.uid()))
    )
  )
  with check (
    exists (
      select 1 from deplacements d
      where d.id = deplacements_joueurs.deplacement_id
        and (d.club_id = auth.uid() or exists (select 1 from staff_club sc where sc.club_id = d.club_id and sc.user_id = auth.uid()))
    )
  );

grant select, insert, update, delete on deplacements_joueurs to authenticated;
