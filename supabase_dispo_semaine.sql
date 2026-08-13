-- Sondage hebdomadaire "jours disponibles" — indépendant des séances
-- (contrairement à `disponibilites`, qui répond à une séance déjà créée).
-- Le joueur coche, semaine après semaine, les jours où il est disponible
-- pour la semaine à venir ; l'éducateur voit la grille de toute son équipe
-- AVANT de créer ses séances, pour les placer aux bons jours.
--
-- Même pattern RLS que disponibilites.sql : le joueur possède sa ligne,
-- l'éducateur la lit via equipe_joueurs (jointure sur joueur_id, renseigné
-- à l'acceptation de l'invitation).

create table if not exists dispo_semaine (
  id            uuid primary key default gen_random_uuid(),
  joueur_id     uuid references profiles(id) on delete cascade not null,
  semaine_debut date not null, -- lundi de la semaine concernée
  jours         jsonb not null default '[]', -- dates ISO où le joueur est dispo, ex: ["2026-08-17","2026-08-19"]
  commentaire   text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (joueur_id, semaine_debut)
);

alter table dispo_semaine enable row level security;

drop policy if exists "joueur_own_dispo_semaine" on dispo_semaine;
create policy "joueur_own_dispo_semaine" on dispo_semaine
  for all using (auth.uid() = joueur_id) with check (auth.uid() = joueur_id);

drop policy if exists "educateur_read_dispo_semaine" on dispo_semaine;
create policy "educateur_read_dispo_semaine" on dispo_semaine
  for select using (
    exists (
      select 1 from equipe_joueurs ej
      where ej.joueur_id = dispo_semaine.joueur_id
      and ej.educateur_id = auth.uid()
    )
  );

grant select, insert, update, delete on dispo_semaine to authenticated;
