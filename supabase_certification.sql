-- Table certifications
CREATE TABLE IF NOT EXISTS certifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  joueur_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  niveau TEXT NOT NULL,
  saison TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'en_attente', -- en_attente | validé | rejeté
  documents TEXT[] DEFAULT '{}',            -- URLs Cloudinary des feuilles de match
  commentaire_admin TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  validated_at TIMESTAMPTZ
);

-- RLS
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;

-- Le joueur peut voir ses propres certifications
CREATE POLICY "joueur_read_own" ON certifications
  FOR SELECT USING (auth.uid() = joueur_id);

-- Le joueur peut créer une certification
CREATE POLICY "joueur_insert_own" ON certifications
  FOR INSERT WITH CHECK (auth.uid() = joueur_id);

-- Tous les authentifiés peuvent lire (pour badge dans le feed)
CREATE POLICY "authenticated_read" ON certifications
  FOR SELECT USING (auth.role() = 'authenticated');

-- Les authentifiés peuvent mettre à jour le statut (coach/admin)
CREATE POLICY "authenticated_update" ON certifications
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Colonne style_de_jeu sur profiles (si pas déjà créée)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS style_de_jeu TEXT;

-- Colonne carte_fifa_url sur profiles (si pas déjà créée)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS carte_fifa_url TEXT;
