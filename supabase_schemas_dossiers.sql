-- Dossiers pour organiser les schémas tactiques enregistrés (Tactipad).
-- Corrections par rapport au patch reçu :
-- - educateur_id référence profiles(id), pas auth.users(id) directement —
--   convention systématique du reste de cette base (disponibilites,
--   causeries, dispo_semaine...).
-- - La colonne dossier_id s'ajoute sur `tactipads` (le vrai nom de la table
--   des schémas sauvegardés, cf. Tactipad.jsx : chargerSchemas/
--   sauvegarderSchema) — `schemas_tactiques` n'existe pas dans cette base.

CREATE TABLE IF NOT EXISTS schemas_dossiers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  educateur_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  couleur TEXT DEFAULT '#4ade80',
  ordre INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE schemas_dossiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sd_own" ON schemas_dossiers;
CREATE POLICY "sd_own" ON schemas_dossiers
FOR ALL USING (auth.uid() = educateur_id)
WITH CHECK (auth.uid() = educateur_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON schemas_dossiers TO authenticated;

ALTER TABLE tactipads
  ADD COLUMN IF NOT EXISTS dossier_id UUID REFERENCES schemas_dossiers(id) ON DELETE SET NULL;
