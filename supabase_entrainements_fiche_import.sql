-- Lien optionnel vers une fiche archivée (seances_uploadees) importée dans un entraînement programmé
ALTER TABLE entrainements
  ADD COLUMN IF NOT EXISTS fiche_id UUID REFERENCES seances_uploadees(id) ON DELETE SET NULL;
