-- Règlement de qualification configurable (nombre de meilleurs troisièmes
-- qui rejoignent, en plus des 2 premiers de chaque poule, la phase finale)
-- et fair-play (cartons saisis par équipe et par match) pour les tournois
-- organisés — cf. genererPhaseFinale/calculerClassement.
ALTER TABLE tournois_organises
  ADD COLUMN IF NOT EXISTS qualifies_meilleurs_troisiemes INTEGER DEFAULT 0;

ALTER TABLE tournois_matchs_organises
  ADD COLUMN IF NOT EXISTS cartons_jaunes_a INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cartons_jaunes_b INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cartons_rouges_a INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cartons_rouges_b INTEGER DEFAULT 0;
