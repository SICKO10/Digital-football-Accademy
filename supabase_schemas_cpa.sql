-- Bibliothèque personnelle de schémas CPA (TacticalBoard.jsx) : permet
-- d'enregistrer un schéma CPA offensif/défensif une fois construit, puis de
-- le recharger tel quel (avec ses étapes et son animation) dans n'importe
-- quelle future causerie, plutôt que de le refaire à chaque fois depuis un
-- terrain vide.
--
-- Outil personnel de l'éducateur (comme causeries, tactipads...), pas une
-- donnée partagée avec le reste du club : pas de club_id, RLS scopée
-- directement sur educateur_id = auth.uid(), même pattern que causeries.
--
-- data reprend tel quel le format multi-étapes de TacticalBoard
-- ({ etapes: [{ joueurs, ballon }] }) — pas de transformation, rechargé
-- directement via onChange(schema.data).

create table if not exists schemas_cpa (
  id uuid primary key default gen_random_uuid(),
  educateur_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in ('offensif', 'defensif')),
  nom text not null,
  data jsonb not null,
  created_at timestamptz not null default now()
);

alter table schemas_cpa enable row level security;

drop policy if exists "educateur_lecture_schemas_cpa" on schemas_cpa;
create policy "educateur_lecture_schemas_cpa"
  on schemas_cpa for select
  using (educateur_id = auth.uid());

drop policy if exists "educateur_ecriture_schemas_cpa" on schemas_cpa;
create policy "educateur_ecriture_schemas_cpa"
  on schemas_cpa for all
  using (educateur_id = auth.uid())
  with check (educateur_id = auth.uid());

grant select, insert, update, delete on schemas_cpa to authenticated;
