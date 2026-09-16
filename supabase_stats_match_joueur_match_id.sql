-- Recrutement Phase 3 : remontée automatique des stats depuis la feuille de
-- match (côté éducateur, table stats_match) vers stats_match_joueur — match_id
-- permet de savoir si un match donné a déjà été remonté pour un joueur donné,
-- pour mettre à jour plutôt que dupliquer en cas de correction ultérieure.
-- Nullable : les saisies manuelles/import Veo n'ont pas de match_id.
alter table stats_match_joueur
  add column if not exists match_id uuid references matchs_equipe(id) on delete set null;
