-- Image de fond du terrain (Projet Sportif > Zones de terrain), jusqu'ici
-- un seul réglage par club (profiles.terrain_fond_url) partagé entre tous
-- les pôles ET toutes les phases — trop grossier, un club veut une image
-- différente par pôle (ex: Formation vs École de Foot) et par phase
-- (organisation offensive/défensive/transition/CPA), même granularité que
-- terrain_zones. Table séparée plutôt qu'une colonne : contrairement aux
-- zones (plusieurs lignes par pôle+phase), l'image est une valeur unique
-- par (club_id, pole_key, phase), gérée par upsert.
CREATE TABLE IF NOT EXISTS terrain_fonds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL,
  pole_key TEXT NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('attaque', 'defense', 'transition_att', 'transition_def', 'cpa_offensif', 'cpa_defensif')),
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (club_id, pole_key, phase)
);

ALTER TABLE terrain_fonds ENABLE ROW LEVEL SECURITY;
GRANT ALL ON terrain_fonds TO authenticated;

-- Mêmes 4 policies que terrain_zones (club/staff CRUD, éducateur affilié
-- accepté CRUD, joueur/parent lecture seule) — cf. supabase_projet_sportif_zones_permissions.sql.
DROP POLICY IF EXISTS "club_gere_fonds" ON terrain_fonds;
CREATE POLICY "club_gere_fonds" ON terrain_fonds FOR ALL
  USING (auth.uid() = club_id OR EXISTS (SELECT 1 FROM staff_club WHERE staff_club.club_id = terrain_fonds.club_id AND staff_club.user_id = auth.uid()))
  WITH CHECK (auth.uid() = club_id OR EXISTS (SELECT 1 FROM staff_club WHERE staff_club.club_id = terrain_fonds.club_id AND staff_club.user_id = auth.uid()));

DROP POLICY IF EXISTS "educateur_gere_fonds" ON terrain_fonds;
CREATE POLICY "educateur_gere_fonds" ON terrain_fonds FOR ALL
  USING (EXISTS (SELECT 1 FROM club_educateurs WHERE club_educateurs.club_id = terrain_fonds.club_id AND club_educateurs.educateur_id = auth.uid() AND club_educateurs.statut = 'accepte'))
  WITH CHECK (EXISTS (SELECT 1 FROM club_educateurs WHERE club_educateurs.club_id = terrain_fonds.club_id AND club_educateurs.educateur_id = auth.uid() AND club_educateurs.statut = 'accepte'));

DROP POLICY IF EXISTS "joueur_lit_fonds" ON terrain_fonds;
CREATE POLICY "joueur_lit_fonds" ON terrain_fonds FOR SELECT
  USING (EXISTS (SELECT 1 FROM affiliations a JOIN club_educateurs ce ON ce.educateur_id = a.educateur_id
    WHERE a.joueur_id = auth.uid() AND a.statut = 'accepte' AND ce.club_id = terrain_fonds.club_id AND ce.statut = 'accepte'));

DROP POLICY IF EXISTS "parent_lit_fonds" ON terrain_fonds;
CREATE POLICY "parent_lit_fonds" ON terrain_fonds FOR SELECT
  USING (EXISTS (SELECT 1 FROM affiliations a JOIN club_educateurs ce ON ce.educateur_id = a.educateur_id
    WHERE a.statut = 'accepte' AND est_parent_accepte_de(a.joueur_id) AND ce.club_id = terrain_fonds.club_id AND ce.statut = 'accepte'));

-- Reprise de l'ancien réglage unique (profiles.terrain_fond_url) comme
-- valeur de départ pour tous les pôles/phases d'un club qui en avait déjà
-- un — pour ne rien perdre visuellement, à affiner ensuite pôle par pôle.
INSERT INTO terrain_fonds (club_id, pole_key, phase, image_url)
SELECT p.id, poles.pole_key, phases.phase, p.terrain_fond_url
FROM profiles p
CROSS JOIN (VALUES ('ecole_de_foot'), ('ecole_de_foot_f'), ('preformation'), ('preformation_f'), ('formation'), ('formation_f'), ('pole_senior'), ('pole_senior_f')) AS poles(pole_key)
CROSS JOIN (VALUES ('attaque'), ('defense'), ('transition_att'), ('transition_def'), ('cpa_offensif'), ('cpa_defensif')) AS phases(phase)
WHERE p.terrain_fond_url IS NOT NULL
ON CONFLICT (club_id, pole_key, phase) DO NOTHING;
