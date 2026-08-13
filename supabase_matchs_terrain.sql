-- Rattache un match à un terrain, pour que le planning des terrains puisse
-- n'afficher un match que sous le terrain où il se joue (aujourd'hui les
-- matchs sont affichés comme simple repère informatif sous CHAQUE terrain,
-- faute de colonne pour les distinguer — cf. commentaires "pas de terrain_id
-- en base" dans PlanningTerrains.jsx).
--
-- Note : la vraie table des matchs du club est `matchs_equipe` (colonnes date,
-- heure, adversaire, domicile, educateur_id...) — il n'existe ni table
-- `matchs`, ni `competitions`, ni `calendrier` dans cette base.
ALTER TABLE matchs_equipe
  ADD COLUMN IF NOT EXISTS terrain_id UUID REFERENCES terrains(id) ON DELETE SET NULL;
