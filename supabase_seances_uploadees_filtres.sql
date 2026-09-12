-- Catégorie d'âge + type de séance, pour les nouveaux filtres "Mes séances"
-- (categorie_tactique existe déjà — seules ses valeurs possibles changent
-- côté application, migration côté DB pas nécessaire pour cette colonne).
ALTER TABLE seances_uploadees ADD COLUMN IF NOT EXISTS categorie_age TEXT;
ALTER TABLE seances_uploadees ADD COLUMN IF NOT EXISTS type_seance TEXT NOT NULL DEFAULT 'collectif' CHECK (type_seance IN ('collectif', 'individuel'));
