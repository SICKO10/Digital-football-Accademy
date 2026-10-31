-- Parcours du coach visible dans Explorer : un bilan par saison et par équipe,
-- sans aucun nom de joueur ni d'adversaire (seulement des totaux).
-- Le coach publie ses totaux lui-même en ouvrant Mon profil (calculés depuis
-- ses matchs et séances) et choisit le niveau de pratique de chaque équipe.
-- Visible par les éducateurs et les clubs (profiles.plan), pas par les joueurs
-- ni les visiteurs. Rien d'existant n'est modifié. Relançable sans erreur.

create table if not exists coach_bilans_publics (
  educateur_id uuid not null references profiles(id) on delete cascade,
  saison text not null,                 -- '2026-2027'
  club_categorie_id uuid not null references club_categories(id) on delete cascade,
  club_nom text,
  categorie_nom text,                   -- ex. 'U18 A'
  niveau text,                          -- choisi par le coach : District, Régional 2…
  matchs int not null default 0,
  nb_v int not null default 0,
  nb_n int not null default 0,
  nb_d int not null default 0,
  buts_marques int not null default 0,
  buts_encaisses int not null default 0,
  presents int not null default 0,
  nb_presences int not null default 0,
  maj timestamptz not null default now(),
  primary key (educateur_id, saison, club_categorie_id),
  constraint coach_bilans_niveau_valide check (niveau is null or niveau in
    ('District', 'Régional 3', 'Régional 2', 'Régional 1', 'National 3', 'National 2', 'National 1'))
);

alter table coach_bilans_publics enable row level security;

drop policy if exists "coach_bilans_lecture" on coach_bilans_publics;
create policy "coach_bilans_lecture" on coach_bilans_publics
  for select to authenticated
  using (
    educateur_id = auth.uid()
    or exists (select 1 from profiles p where p.id = auth.uid() and p.plan in ('educateur', 'club'))
  );

-- Le coach n'écrit que ses propres lignes (une équipe d'une saison passée, qu'il
-- ne tient plus après la clôture, doit rester publiable).
drop policy if exists "coach_bilans_ecriture" on coach_bilans_publics;
create policy "coach_bilans_ecriture" on coach_bilans_publics
  for insert to authenticated
  with check (educateur_id = auth.uid());

drop policy if exists "coach_bilans_modification" on coach_bilans_publics;
create policy "coach_bilans_modification" on coach_bilans_publics
  for update to authenticated
  using (educateur_id = auth.uid())
  with check (educateur_id = auth.uid());

drop policy if exists "coach_bilans_suppression" on coach_bilans_publics;
create policy "coach_bilans_suppression" on coach_bilans_publics
  for delete to authenticated
  using (educateur_id = auth.uid());

revoke all on coach_bilans_publics from anon;
grant select, insert, update, delete on coach_bilans_publics to authenticated;
