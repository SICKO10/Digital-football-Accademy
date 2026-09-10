-- Annonces réseau — feed d'annonces (recherche éducateur/club, tournoi,
-- détection...) diffusées sur une ou plusieurs régions, publiées depuis le
-- nouvel onglet "Annonces" d'Explorer (DashboardEducateur.jsx). auteur_id
-- référence profiles(id) — clubs et éducateurs sont tous deux des lignes de
-- profiles dans cette appli, pas auth.users directement (cf. convention des
-- autres tables club-scoped du projet).
create table if not exists annonces_reseau (
  id uuid primary key default gen_random_uuid(),
  auteur_id uuid not null references profiles(id) on delete cascade,
  auteur_type text not null check (auteur_type in ('educateur', 'club')),
  auteur_nom text not null,
  auteur_photo text,
  auteur_region text,
  type_annonce text not null check (type_annonce in ('recherche_educateur', 'recherche_club', 'tournoi', 'detection', 'autre')),
  titre text not null,
  description text,
  regions text[] not null default '{}',
  categories text[],
  date_evenement date,
  contact text,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_annonces_reseau_actif on annonces_reseau(actif);

alter table annonces_reseau enable row level security;

-- Lecture ouverte à tout utilisateur connecté (réseau inter-clubs, pas de
-- scoping par club) — même logique que profiles/messages pour l'explorer.
create policy "annonces_reseau_lecture" on annonces_reseau
  for select using (auth.uid() is not null);

create policy "annonces_reseau_ecriture" on annonces_reseau
  for all using (auteur_id = auth.uid())
  with check (auteur_id = auth.uid());

grant select, insert, update, delete on annonces_reseau to authenticated;
