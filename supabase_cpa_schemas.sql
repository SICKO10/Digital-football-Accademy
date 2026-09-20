-- Schémas de coups de pied arrêtés (CPA offensifs/défensifs), Projet
-- Sportif > Zones de terrain. Plusieurs schémas possibles par phase (un par
-- routine : corner, coup franc…), chacun avec ses joueurs représentés par
-- des ronds noir/blanc positionnés en % sur un demi-terrain (cf.
-- DemiTerrainSchema.jsx). Table séparée de terrain_zones (rectangles
-- étiquetés) — ici plusieurs lignes par phase, chacune un schéma complet.
CREATE TABLE IF NOT EXISTS cpa_schemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL,
  pole_key TEXT NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('cpa_offensif', 'cpa_defensif')),
  nom TEXT NOT NULL,
  joueurs JSONB NOT NULL DEFAULT '[]',
  ordre INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cpa_schemas_club_pole_phase ON cpa_schemas(club_id, pole_key, phase);

ALTER TABLE cpa_schemas ENABLE ROW LEVEL SECURITY;
GRANT ALL ON cpa_schemas TO authenticated;

-- Mêmes 4 policies que terrain_zones/terrain_fonds (club/staff CRUD,
-- éducateur affilié accepté CRUD, joueur/parent lecture seule).
DROP POLICY IF EXISTS "club_gere_cpa_schemas" ON cpa_schemas;
CREATE POLICY "club_gere_cpa_schemas" ON cpa_schemas FOR ALL
  USING (auth.uid() = club_id OR EXISTS (SELECT 1 FROM staff_club WHERE staff_club.club_id = cpa_schemas.club_id AND staff_club.user_id = auth.uid()))
  WITH CHECK (auth.uid() = club_id OR EXISTS (SELECT 1 FROM staff_club WHERE staff_club.club_id = cpa_schemas.club_id AND staff_club.user_id = auth.uid()));

DROP POLICY IF EXISTS "educateur_gere_cpa_schemas" ON cpa_schemas;
CREATE POLICY "educateur_gere_cpa_schemas" ON cpa_schemas FOR ALL
  USING (EXISTS (SELECT 1 FROM club_educateurs WHERE club_educateurs.club_id = cpa_schemas.club_id AND club_educateurs.educateur_id = auth.uid() AND club_educateurs.statut = 'accepte'))
  WITH CHECK (EXISTS (SELECT 1 FROM club_educateurs WHERE club_educateurs.club_id = cpa_schemas.club_id AND club_educateurs.educateur_id = auth.uid() AND club_educateurs.statut = 'accepte'));

DROP POLICY IF EXISTS "joueur_lit_cpa_schemas" ON cpa_schemas;
CREATE POLICY "joueur_lit_cpa_schemas" ON cpa_schemas FOR SELECT
  USING (EXISTS (SELECT 1 FROM affiliations a JOIN club_educateurs ce ON ce.educateur_id = a.educateur_id
    WHERE a.joueur_id = auth.uid() AND a.statut = 'accepte' AND ce.club_id = cpa_schemas.club_id AND ce.statut = 'accepte'));

DROP POLICY IF EXISTS "parent_lit_cpa_schemas" ON cpa_schemas;
CREATE POLICY "parent_lit_cpa_schemas" ON cpa_schemas FOR SELECT
  USING (EXISTS (SELECT 1 FROM affiliations a JOIN club_educateurs ce ON ce.educateur_id = a.educateur_id
    WHERE a.statut = 'accepte' AND est_parent_accepte_de(a.joueur_id) AND ce.club_id = cpa_schemas.club_id AND ce.statut = 'accepte'));
