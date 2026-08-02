-- Planning de la semaine : photo publiée par l'éducateur (profil_educateur),
-- visible automatiquement chez tous les joueurs affiliés acceptés.
ALTER TABLE profil_educateur
  ADD COLUMN IF NOT EXISTS planning_semaine_url TEXT,
  ADD COLUMN IF NOT EXISTS planning_semaine_publie_le TIMESTAMPTZ;
