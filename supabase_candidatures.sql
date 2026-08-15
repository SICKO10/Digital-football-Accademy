-- Candidatures d'un joueur à une annonce de recrutement (club_recrutements),
-- depuis le profil public du club (ClubPublic.jsx, onglet Recrutement).
CREATE TABLE IF NOT EXISTS candidatures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  joueur_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recrutement_id UUID REFERENCES club_recrutements(id) ON DELETE CASCADE,
  statut TEXT NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'vue', 'acceptee', 'refusee')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (joueur_id, recrutement_id)
);

ALTER TABLE candidatures ENABLE ROW LEVEL SECURITY;

-- Lecture : le joueur voit ses propres candidatures, le club voit celles reçues.
CREATE POLICY "lecture_candidatures" ON candidatures
  FOR SELECT USING (auth.uid() = joueur_id OR auth.uid() = club_id);

-- Écriture (postuler) : uniquement le joueur, pour lui-même.
CREATE POLICY "joueur_postule" ON candidatures
  FOR INSERT WITH CHECK (auth.uid() = joueur_id);

-- Mise à jour du statut (vue/acceptée/refusée) : uniquement le club concerné.
CREATE POLICY "club_traite_candidature" ON candidatures
  FOR UPDATE USING (auth.uid() = club_id) WITH CHECK (auth.uid() = club_id);

GRANT SELECT, INSERT, UPDATE ON candidatures TO authenticated;
