-- Ajoute la phase "Pressing" aux zones de terrain et à leur image de fond
-- (Projet Sportif > Zones de terrain), en plus des 6 phases existantes.
ALTER TABLE terrain_zones DROP CONSTRAINT terrain_zones_phase_check;
ALTER TABLE terrain_zones ADD CONSTRAINT terrain_zones_phase_check
  CHECK (phase IN ('attaque', 'defense', 'transition_att', 'transition_def', 'cpa_offensif', 'cpa_defensif', 'pressing'));

ALTER TABLE terrain_fonds DROP CONSTRAINT terrain_fonds_phase_check;
ALTER TABLE terrain_fonds ADD CONSTRAINT terrain_fonds_phase_check
  CHECK (phase IN ('attaque', 'defense', 'transition_att', 'transition_def', 'cpa_offensif', 'cpa_defensif', 'pressing'));
