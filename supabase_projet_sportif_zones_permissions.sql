-- Extension du Projet Sportif : zones de terrain personnalisables (club crée
-- ses propres zones/légendes, affichées ensuite côté joueur) + permission
-- club→éducateur affilié pour éditer Projet Sportif / Planification (jusqu'ici
-- toujours lecture seule côté éducateur, cf. ProjetSportifEducateur.jsx).

-- ── Permissions : interrupteur global (profiles = compte club) + override
-- par éducateur (club_educateurs, NULL = suit le réglage global) ──────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS educateurs_editent_projet_sportif BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS educateurs_editent_planification BOOLEAN DEFAULT false;

ALTER TABLE club_educateurs
  ADD COLUMN IF NOT EXISTS peut_editer_projet_sportif BOOLEAN,
  ADD COLUMN IF NOT EXISTS peut_editer_planification BOOLEAN;

-- ── Zones de terrain personnalisées ────────────────────────────────────────
-- x/y/largeur/hauteur en % du terrain (0-100), même logique que les schémas
-- Tactipad/scan-procede déjà en place ailleurs dans le projet. phase inclut
-- deux valeurs propres à cette table (cpa_offensif/cpa_defensif, pour
-- séparer les CPA offensifs/défensifs sur la même page côté joueur) en plus
-- des 4 phases déjà utilisées par principes_jeu.
CREATE TABLE IF NOT EXISTS terrain_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL,
  pole_key TEXT NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('attaque', 'defense', 'transition_att', 'transition_def', 'cpa_offensif', 'cpa_defensif')),
  x NUMERIC NOT NULL, y NUMERIC NOT NULL, largeur NUMERIC NOT NULL, hauteur NUMERIC NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  couleur TEXT DEFAULT '#4ade80',
  ordre INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_terrain_zones_club_pole_phase ON terrain_zones(club_id, pole_key, phase);

ALTER TABLE terrain_zones ENABLE ROW LEVEL SECURITY;
GRANT ALL ON terrain_zones TO authenticated;

-- Club + staff_club : CRUD complet (miroir principes_jeu)
DROP POLICY IF EXISTS "club_gere_zones" ON terrain_zones;
CREATE POLICY "club_gere_zones" ON terrain_zones FOR ALL
  USING (auth.uid() = club_id OR EXISTS (SELECT 1 FROM staff_club WHERE staff_club.club_id = terrain_zones.club_id AND staff_club.user_id = auth.uid()))
  WITH CHECK (auth.uid() = club_id OR EXISTS (SELECT 1 FROM staff_club WHERE staff_club.club_id = terrain_zones.club_id AND staff_club.user_id = auth.uid()));

-- Éducateur affilié accepté : CRUD complet côté RLS — le trust boundary
-- reste "éducateur accepté de ce club" (même niveau que staff_club, comme
-- partout ailleurs dans ce projet) ; la permission fine (autorisé ou
-- lecture seule) est appliquée côté UI (canEditerProjetSportif), pas en RLS.
DROP POLICY IF EXISTS "educateur_gere_zones" ON terrain_zones;
CREATE POLICY "educateur_gere_zones" ON terrain_zones FOR ALL
  USING (EXISTS (SELECT 1 FROM club_educateurs WHERE club_educateurs.club_id = terrain_zones.club_id AND club_educateurs.educateur_id = auth.uid() AND club_educateurs.statut = 'accepte'))
  WITH CHECK (EXISTS (SELECT 1 FROM club_educateurs WHERE club_educateurs.club_id = terrain_zones.club_id AND club_educateurs.educateur_id = auth.uid() AND club_educateurs.statut = 'accepte'));

-- Joueur affilié (via affiliations → éducateur → club) : lecture seule
DROP POLICY IF EXISTS "joueur_lit_zones" ON terrain_zones;
CREATE POLICY "joueur_lit_zones" ON terrain_zones FOR SELECT
  USING (EXISTS (SELECT 1 FROM affiliations a JOIN club_educateurs ce ON ce.educateur_id = a.educateur_id
    WHERE a.joueur_id = auth.uid() AND a.statut = 'accepte' AND ce.club_id = terrain_zones.club_id AND ce.statut = 'accepte'));

-- Parent accepté d'un joueur affilié : lecture seule
DROP POLICY IF EXISTS "parent_lit_zones" ON terrain_zones;
CREATE POLICY "parent_lit_zones" ON terrain_zones FOR SELECT
  USING (EXISTS (SELECT 1 FROM affiliations a JOIN club_educateurs ce ON ce.educateur_id = a.educateur_id
    WHERE a.statut = 'accepte' AND est_parent_accepte_de(a.joueur_id) AND ce.club_id = terrain_zones.club_id AND ce.statut = 'accepte'));

-- ── principes_jeu / regles_jeu / planification_annuelle : l'éducateur passe
-- de lecture seule à CRUD complet côté RLS (même raisonnement que ci-dessus :
-- la granularité "autorisé ou non" reste gérée côté UI). Remplace les
-- anciennes policies SELECT-only par des policies FOR ALL.
DROP POLICY IF EXISTS "educateur_lit_principes" ON principes_jeu;
CREATE POLICY "educateur_gere_principes" ON principes_jeu FOR ALL
  USING (EXISTS (SELECT 1 FROM club_educateurs WHERE club_educateurs.club_id = principes_jeu.club_id AND club_educateurs.educateur_id = auth.uid() AND club_educateurs.statut = 'accepte'))
  WITH CHECK (EXISTS (SELECT 1 FROM club_educateurs WHERE club_educateurs.club_id = principes_jeu.club_id AND club_educateurs.educateur_id = auth.uid() AND club_educateurs.statut = 'accepte'));

DROP POLICY IF EXISTS "educateur_lit_regles" ON regles_jeu;
CREATE POLICY "educateur_gere_regles" ON regles_jeu FOR ALL
  USING (EXISTS (SELECT 1 FROM club_educateurs WHERE club_educateurs.club_id = regles_jeu.club_id AND club_educateurs.educateur_id = auth.uid() AND club_educateurs.statut = 'accepte'))
  WITH CHECK (EXISTS (SELECT 1 FROM club_educateurs WHERE club_educateurs.club_id = regles_jeu.club_id AND club_educateurs.educateur_id = auth.uid() AND club_educateurs.statut = 'accepte'));

DROP POLICY IF EXISTS "educateur_lit_planification" ON planification_annuelle;
CREATE POLICY "educateur_gere_planification" ON planification_annuelle FOR ALL
  USING (EXISTS (SELECT 1 FROM club_educateurs WHERE club_educateurs.club_id = planification_annuelle.club_id AND club_educateurs.educateur_id = auth.uid() AND club_educateurs.statut = 'accepte'))
  WITH CHECK (EXISTS (SELECT 1 FROM club_educateurs WHERE club_educateurs.club_id = planification_annuelle.club_id AND club_educateurs.educateur_id = auth.uid() AND club_educateurs.statut = 'accepte'));
