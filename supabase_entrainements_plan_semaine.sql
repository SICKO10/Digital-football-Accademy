-- Lien entre une séance d'entraînement réelle (entrainements, gérée côté
-- éducateur) et une semaine du plan annuel (plan_semaines, géré côté club) —
-- permet d'accrocher jusqu'à 5 séances déjà planifiées à une semaine du plan
-- annuel, et de les rouvrir depuis là. Nullable + on delete set null : une
-- semaine supprimée ne doit pas supprimer la séance réelle qui lui était
-- rattachée, juste détacher le lien.
alter table entrainements
  add column if not exists plan_semaine_id uuid references plan_semaines(id) on delete set null;

create index if not exists idx_entrainements_plan_semaine_id on entrainements(plan_semaine_id);
