-- Causerie avant match (outil éducateur) — cf. CauserieAvantMatch.jsx.
-- Outil personnel de l'éducateur (comme tactipads, prep_physique...), pas
-- une donnée partagée avec le reste du club : pas de club_id, RLS scopée
-- directement sur educateur_id = auth.uid(), même pattern que tactipads.

create table if not exists causeries (
  id uuid primary key default gen_random_uuid(),
  educateur_id uuid not null references profiles(id) on delete cascade,
  equipe text,
  adversaire text not null,
  date_match date,
  domicile_exterieur text not null default 'domicile' check (domicile_exterieur in ('domicile', 'exterieur')),
  enjeu text,
  animation_avec_ballon text,
  animation_sans_ballon text,
  coups_pieds_arretes text,
  conclusion_motivation text,
  ton text not null default 'motivant' check (ton in ('motivant', 'calme', 'serieux', 'intense')),
  causerie_generee text,
  created_at timestamptz not null default now()
);

alter table causeries enable row level security;

drop policy if exists "educateur_lecture_causeries" on causeries;
create policy "educateur_lecture_causeries"
  on causeries for select
  using (educateur_id = auth.uid());

drop policy if exists "educateur_ecriture_causeries" on causeries;
create policy "educateur_ecriture_causeries"
  on causeries for all
  using (educateur_id = auth.uid())
  with check (educateur_id = auth.uid());

grant select, insert, update, delete on causeries to authenticated;
