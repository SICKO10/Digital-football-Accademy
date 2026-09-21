-- Galerie d'images de référence supplémentaires par phase (Projet Sportif >
-- Zones de terrain) — distincte de terrain_fonds (l'unique image de fond
-- utilisée comme support des zones dessinées) : ici, plusieurs images
-- simples par pôle+phase, sans zones associées, juste des visuels de
-- référence en plus (ex: plusieurs schémas de formation pour Organisation
-- offensive). Mêmes RLS que terrain_zones/terrain_fonds.
CREATE TABLE IF NOT EXISTS terrain_galerie (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL,
  pole_key TEXT NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('attaque', 'defense', 'transition_att', 'transition_def', 'cpa_offensif', 'cpa_defensif', 'pressing')),
  image_url TEXT NOT NULL,
  ordre INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_terrain_galerie_club_pole_phase ON terrain_galerie(club_id, pole_key, phase);

ALTER TABLE terrain_galerie ENABLE ROW LEVEL SECURITY;
GRANT ALL ON terrain_galerie TO authenticated;

DROP POLICY IF EXISTS "club_gere_galerie" ON terrain_galerie;
CREATE POLICY "club_gere_galerie" ON terrain_galerie FOR ALL
  USING (auth.uid() = club_id OR EXISTS (SELECT 1 FROM staff_club WHERE staff_club.club_id = terrain_galerie.club_id AND staff_club.user_id = auth.uid()))
  WITH CHECK (auth.uid() = club_id OR EXISTS (SELECT 1 FROM staff_club WHERE staff_club.club_id = terrain_galerie.club_id AND staff_club.user_id = auth.uid()));

DROP POLICY IF EXISTS "educateur_gere_galerie" ON terrain_galerie;
CREATE POLICY "educateur_gere_galerie" ON terrain_galerie FOR ALL
  USING (EXISTS (SELECT 1 FROM club_educateurs WHERE club_educateurs.club_id = terrain_galerie.club_id AND club_educateurs.educateur_id = auth.uid() AND club_educateurs.statut = 'accepte'))
  WITH CHECK (EXISTS (SELECT 1 FROM club_educateurs WHERE club_educateurs.club_id = terrain_galerie.club_id AND club_educateurs.educateur_id = auth.uid() AND club_educateurs.statut = 'accepte'));

DROP POLICY IF EXISTS "joueur_lit_galerie" ON terrain_galerie;
CREATE POLICY "joueur_lit_galerie" ON terrain_galerie FOR SELECT
  USING (EXISTS (SELECT 1 FROM affiliations a JOIN club_educateurs ce ON ce.educateur_id = a.educateur_id
    WHERE a.joueur_id = auth.uid() AND a.statut = 'accepte' AND ce.club_id = terrain_galerie.club_id AND ce.statut = 'accepte'));

DROP POLICY IF EXISTS "parent_lit_galerie" ON terrain_galerie;
CREATE POLICY "parent_lit_galerie" ON terrain_galerie FOR SELECT
  USING (EXISTS (SELECT 1 FROM affiliations a JOIN club_educateurs ce ON ce.educateur_id = a.educateur_id
    WHERE a.statut = 'accepte' AND est_parent_accepte_de(a.joueur_id) AND ce.club_id = terrain_galerie.club_id AND ce.statut = 'accepte'));
