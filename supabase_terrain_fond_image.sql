-- Zones de terrain : image de fond personnalisée uploadée par le club, pour
-- remplacer le terrain généré (rond central, surfaces, points de penalty)
-- par une photo/illustration réelle. Un seul réglage par club, réutilisé
-- pour tous les pôles/phases (cf. SectionZones dans ProjetSportif.jsx et
-- PreparationTactiqueJoueur.jsx qui la lisent toutes les deux).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS terrain_fond_url TEXT;
