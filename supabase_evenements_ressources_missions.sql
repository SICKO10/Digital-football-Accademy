-- Ajoute ressources matérielles + missions au formulaire événement.
-- Table réelle : evenements_club (pas "evenements", qui n'existe pas).
ALTER TABLE evenements_club
  ADD COLUMN IF NOT EXISTS ressources_materielles JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS missions JSONB NOT NULL DEFAULT '[]';
