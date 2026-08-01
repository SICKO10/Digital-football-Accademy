-- Table des rapports de scouting générés par les recruteurs (équivalent de
-- rapports_analyse côté éducateurs, adaptée au contexte recrutement).
create table if not exists rapports_scouting (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  recruteur_id uuid not null references profiles(id) on delete cascade,
  prenom_joueur text,
  poste text,
  club_observe text,
  recommandation text check (recommandation in ('recruter', 'a_suivre', 'pas_prioritaire')),
  contenu jsonb not null,
  mode_analyse text not null default 'vocale',
  date_analyse date
);

alter table rapports_scouting enable row level security;

create policy "recruteur_lecture_ses_rapports"
  on rapports_scouting for select
  using (auth.uid() = recruteur_id);

create policy "recruteur_insertion_ses_rapports"
  on rapports_scouting for insert
  with check (auth.uid() = recruteur_id);

create policy "recruteur_suppression_ses_rapports"
  on rapports_scouting for delete
  using (auth.uid() = recruteur_id);

grant select, insert, delete on rapports_scouting to authenticated;
