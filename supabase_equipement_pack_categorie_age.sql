-- Catégorie d'âge d'un pack équipement (enfant/adulte) — cf. DashboardClub.jsx,
-- sélecteur dans la modale pack, détermine les tailles proposées pour les
-- suggestions de type "vêtement" (Maillot, Short, Survêtement, Kway).
ALTER TABLE equipement_packs ADD COLUMN IF NOT EXISTS categorie_age TEXT
  CHECK (categorie_age IN ('enfant', 'adulte'));

UPDATE equipement_packs SET categorie_age = 'adulte' WHERE categorie_age IS NULL;

ALTER TABLE equipement_packs ALTER COLUMN categorie_age SET DEFAULT 'adulte';
