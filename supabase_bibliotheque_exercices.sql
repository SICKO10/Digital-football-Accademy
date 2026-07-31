-- Bibliothèque de procédés d'entraînement (réutilisables dans le rédacteur de fiche)
CREATE TABLE IF NOT EXISTS bibliotheque_exercices (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  educateur_id  UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type          TEXT CHECK (type IN ('jeu', 'exercice', 'situation', 'echauffement')) NOT NULL,
  nom           TEXT NOT NULL,
  theme         TEXT DEFAULT '',
  description   TEXT DEFAULT '',
  consignes     TEXT DEFAULT '',
  variables     TEXT DEFAULT '',
  duree         INTEGER DEFAULT NULL, -- minutes
  nb_joueurs    TEXT DEFAULT '',      -- ex: "10-14"
  tags          TEXT DEFAULT '',      -- ex: "conservation, pressing"
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE bibliotheque_exercices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proprio_exercices" ON bibliotheque_exercices
  FOR ALL USING (auth.uid() = educateur_id) WITH CHECK (auth.uid() = educateur_id);
