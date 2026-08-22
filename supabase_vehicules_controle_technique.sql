-- Détail véhicule (modale ouverte au clic sur une plaque dans le parc,
-- Deplacements.jsx) : marque/modèle + dates de contrôle technique.
ALTER TABLE vehicules
  ADD COLUMN IF NOT EXISTS dernier_ct DATE,
  ADD COLUMN IF NOT EXISTS prochain_ct DATE,
  ADD COLUMN IF NOT EXISTS marque TEXT,
  ADD COLUMN IF NOT EXISTS modele TEXT;
