-- Module Nutrition (Dashboard Joueur, forfait Pro) : profil physique,
-- suivi de poids, journal alimentaire. Contrairement à Santé/blessures
-- (rattachées à equipe_joueurs, géré par l'éducateur), c'est une donnée
-- purement personnelle saisie par le joueur lui-même sur son propre compte
-- — joueur_id REFERENCES profiles(id) est donc correct ici, pas besoin de
-- passer par equipe_joueurs.

CREATE TABLE IF NOT EXISTS nutrition_profil (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  joueur_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  poids_kg NUMERIC(5,1),
  taille_cm INTEGER,
  age INTEGER,
  sexe TEXT NOT NULL DEFAULT 'homme' CHECK (sexe IN ('homme', 'femme')),
  poste TEXT CHECK (poste IN ('gardien', 'defenseur', 'milieu', 'attaquant')),
  nb_entrainements_semaine INTEGER NOT NULL DEFAULT 3,
  objectif TEXT NOT NULL DEFAULT 'performance' CHECK (objectif IN ('performance', 'prise_masse', 'perte_poids', 'endurance')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nutrition_poids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  joueur_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  poids_kg NUMERIC(5,1) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(joueur_id, date)
);

CREATE TABLE IF NOT EXISTS nutrition_journal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  joueur_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  repas TEXT NOT NULL CHECK (repas IN ('petit_dejeuner', 'collation_matin', 'dejeuner', 'collation_apres', 'diner')),
  aliment_nom TEXT NOT NULL,
  quantite_g INTEGER,
  calories NUMERIC(7,1),
  proteines_g NUMERIC(6,1),
  glucides_g NUMERIC(6,1),
  lipides_g NUMERIC(6,1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nutrition_poids_joueur ON nutrition_poids(joueur_id, date);
CREATE INDEX IF NOT EXISTS idx_nutrition_journal_joueur_date ON nutrition_journal(joueur_id, date);

ALTER TABLE nutrition_profil ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_poids ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_journal ENABLE ROW LEVEL SECURITY;
GRANT ALL ON nutrition_profil TO authenticated;
GRANT ALL ON nutrition_poids TO authenticated;
GRANT ALL ON nutrition_journal TO authenticated;

-- Propriétaire uniquement, sur les trois tables (donnée strictement
-- personnelle — pas de lecture éducateur/club/parent ici, contrairement à
-- Santé : à ouvrir explicitement si un jour un staff doit voir ces données).
DROP POLICY IF EXISTS "nutrition_profil_owner" ON nutrition_profil;
CREATE POLICY "nutrition_profil_owner" ON nutrition_profil
  FOR ALL USING (auth.uid() = joueur_id) WITH CHECK (auth.uid() = joueur_id);

DROP POLICY IF EXISTS "nutrition_poids_owner" ON nutrition_poids;
CREATE POLICY "nutrition_poids_owner" ON nutrition_poids
  FOR ALL USING (auth.uid() = joueur_id) WITH CHECK (auth.uid() = joueur_id);

DROP POLICY IF EXISTS "nutrition_journal_owner" ON nutrition_journal;
CREATE POLICY "nutrition_journal_owner" ON nutrition_journal
  FOR ALL USING (auth.uid() = joueur_id) WITH CHECK (auth.uid() = joueur_id);
