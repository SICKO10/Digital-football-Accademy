-- Personnalisation du planning par équipe pour un joueur affilié à
-- plusieurs équipes en même temps (ex: Rayan en U18 ET U20 — il ne doit
-- compter que le mercredi en U20, le reste de la semaine il est avec les
-- U18). jours_actifs restreint, pour CETTE affiliation précise, les
-- entraînements qui comptent dans le planning/sondage agrégé du joueur à
-- ces seuls jours de la semaine. NULL ou tableau vide = tous les jours
-- (comportement actuel, aucun changement pour un joueur à une seule
-- équipe). Ne s'applique qu'aux entraînements (récurrents chaque semaine) —
-- pas aux matchs, ponctuels par nature, toujours tous affichés.
ALTER TABLE affiliations
  ADD COLUMN IF NOT EXISTS jours_actifs TEXT[];

COMMENT ON COLUMN affiliations.jours_actifs IS
  'Jours de la semaine (''lundi''..''dimanche'') où les entraînements de cette équipe comptent pour ce joueur. NULL/vide = tous les jours.';
