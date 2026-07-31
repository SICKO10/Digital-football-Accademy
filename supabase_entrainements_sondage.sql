-- Clôture du sondage de disponibilité + heure de la séance sur entrainements
ALTER TABLE entrainements
  ADD COLUMN IF NOT EXISTS cloture_sondage_avant INTEGER DEFAULT NULL, -- heures avant la séance (1, 5, 24) ; NULL = pas de clôture auto
  ADD COLUMN IF NOT EXISTS sondage_clos BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS heure TEXT DEFAULT NULL; -- ex: "18:30"
