-- Photo illustrative par phase de principes de jeu (Projet Sportif >
-- Principes de jeu) — pour l'instant utilisée uniquement pour Organisation
-- offensive/défensive côté UI, table ouverte aux 5 phases de principes_jeu
-- pour ne pas avoir à migrer si le besoin s'étend plus tard. Même schéma et
-- mêmes policies que terrain_fonds (une image par club_id/pole_key/phase,
-- gérée par upsert).
CREATE TABLE IF NOT EXISTS principes_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL,
  pole_key TEXT NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('attaque', 'defense', 'transition_att', 'transition_def', 'coups_pied_arretes')),
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (club_id, pole_key, phase)
);

ALTER TABLE principes_photos ENABLE ROW LEVEL SECURITY;
GRANT ALL ON principes_photos TO authenticated;

DROP POLICY IF EXISTS "club_gere_principes_photos" ON principes_photos;
CREATE POLICY "club_gere_principes_photos" ON principes_photos FOR ALL
  USING (auth.uid() = club_id OR EXISTS (SELECT 1 FROM staff_club WHERE staff_club.club_id = principes_photos.club_id AND staff_club.user_id = auth.uid()))
  WITH CHECK (auth.uid() = club_id OR EXISTS (SELECT 1 FROM staff_club WHERE staff_club.club_id = principes_photos.club_id AND staff_club.user_id = auth.uid()));

DROP POLICY IF EXISTS "educateur_gere_principes_photos" ON principes_photos;
CREATE POLICY "educateur_gere_principes_photos" ON principes_photos FOR ALL
  USING (EXISTS (SELECT 1 FROM club_educateurs WHERE club_educateurs.club_id = principes_photos.club_id AND club_educateurs.educateur_id = auth.uid() AND club_educateurs.statut = 'accepte'))
  WITH CHECK (EXISTS (SELECT 1 FROM club_educateurs WHERE club_educateurs.club_id = principes_photos.club_id AND club_educateurs.educateur_id = auth.uid() AND club_educateurs.statut = 'accepte'));

DROP POLICY IF EXISTS "joueur_lit_principes_photos" ON principes_photos;
CREATE POLICY "joueur_lit_principes_photos" ON principes_photos FOR SELECT
  USING (EXISTS (SELECT 1 FROM affiliations a JOIN club_educateurs ce ON ce.educateur_id = a.educateur_id
    WHERE a.joueur_id = auth.uid() AND a.statut = 'accepte' AND ce.club_id = principes_photos.club_id AND ce.statut = 'accepte'));

DROP POLICY IF EXISTS "parent_lit_principes_photos" ON principes_photos;
CREATE POLICY "parent_lit_principes_photos" ON principes_photos FOR SELECT
  USING (EXISTS (SELECT 1 FROM affiliations a JOIN club_educateurs ce ON ce.educateur_id = a.educateur_id
    WHERE a.statut = 'accepte' AND est_parent_accepte_de(a.joueur_id) AND ce.club_id = principes_photos.club_id AND ce.statut = 'accepte'));
