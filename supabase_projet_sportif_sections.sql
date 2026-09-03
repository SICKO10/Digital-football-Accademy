-- Sections "Projet Sportif" par pôle : principes de jeu, planification annuelle,
-- règles du jeu. Écriture réservée au club + staff_club (même modèle que
-- club_categories) ; lecture ouverte aux éducateurs/joueurs/parents affiliés
-- au club concerné.

CREATE TABLE IF NOT EXISTS principes_jeu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL,
  pole_key TEXT NOT NULL,
  phase TEXT NOT NULL,        -- 'attaque' | 'defense' | 'transition_att' | 'transition_def' | 'coups_pied_arretes'
  principe TEXT NOT NULL,
  ordre INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS planification_annuelle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL,
  pole_key TEXT NOT NULL,
  saison TEXT NOT NULL,       -- ex: '2026-2027'
  periode_nom TEXT NOT NULL,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  type TEXT NOT NULL DEFAULT 'competition', -- 'preparation' | 'competition' | 'treve' | 'reprise'
  objectif_technique TEXT,
  objectif_physique TEXT,
  objectif_mental TEXT,
  objectif_tactique TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS regles_jeu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL,
  pole_key TEXT NOT NULL,
  categorie TEXT NOT NULL,
  titre TEXT NOT NULL,
  lien_externe TEXT,
  saison TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE principes_jeu ENABLE ROW LEVEL SECURITY;
ALTER TABLE planification_annuelle ENABLE ROW LEVEL SECURITY;
ALTER TABLE regles_jeu ENABLE ROW LEVEL SECURITY;

GRANT ALL ON principes_jeu, planification_annuelle, regles_jeu TO authenticated;

-- Club + staff_club : CRUD complet (miroir exact des policies club_categories)
CREATE POLICY "club_gere_principes" ON principes_jeu FOR ALL
  USING (auth.uid() = club_id OR EXISTS (SELECT 1 FROM staff_club WHERE staff_club.club_id = principes_jeu.club_id AND staff_club.user_id = auth.uid()))
  WITH CHECK (auth.uid() = club_id OR EXISTS (SELECT 1 FROM staff_club WHERE staff_club.club_id = principes_jeu.club_id AND staff_club.user_id = auth.uid()));

CREATE POLICY "club_gere_planification" ON planification_annuelle FOR ALL
  USING (auth.uid() = club_id OR EXISTS (SELECT 1 FROM staff_club WHERE staff_club.club_id = planification_annuelle.club_id AND staff_club.user_id = auth.uid()))
  WITH CHECK (auth.uid() = club_id OR EXISTS (SELECT 1 FROM staff_club WHERE staff_club.club_id = planification_annuelle.club_id AND staff_club.user_id = auth.uid()));

CREATE POLICY "club_gere_regles" ON regles_jeu FOR ALL
  USING (auth.uid() = club_id OR EXISTS (SELECT 1 FROM staff_club WHERE staff_club.club_id = regles_jeu.club_id AND staff_club.user_id = auth.uid()))
  WITH CHECK (auth.uid() = club_id OR EXISTS (SELECT 1 FROM staff_club WHERE staff_club.club_id = regles_jeu.club_id AND staff_club.user_id = auth.uid()));

-- Éducateurs affiliés au club : lecture seule (miroir "educateur peut voir categories de son club")
CREATE POLICY "educateur_lit_principes" ON principes_jeu FOR SELECT
  USING (EXISTS (SELECT 1 FROM club_educateurs WHERE club_educateurs.club_id = principes_jeu.club_id AND club_educateurs.educateur_id = auth.uid() AND club_educateurs.statut = 'accepte'));
CREATE POLICY "educateur_lit_planification" ON planification_annuelle FOR SELECT
  USING (EXISTS (SELECT 1 FROM club_educateurs WHERE club_educateurs.club_id = planification_annuelle.club_id AND club_educateurs.educateur_id = auth.uid() AND club_educateurs.statut = 'accepte'));
CREATE POLICY "educateur_lit_regles" ON regles_jeu FOR SELECT
  USING (EXISTS (SELECT 1 FROM club_educateurs WHERE club_educateurs.club_id = regles_jeu.club_id AND club_educateurs.educateur_id = auth.uid() AND club_educateurs.statut = 'accepte'));

-- Joueurs affiliés (via affiliations → éducateur → club) : lecture seule
CREATE POLICY "joueur_lit_principes" ON principes_jeu FOR SELECT
  USING (EXISTS (SELECT 1 FROM affiliations a JOIN club_educateurs ce ON ce.educateur_id = a.educateur_id
    WHERE a.joueur_id = auth.uid() AND a.statut = 'accepte' AND ce.club_id = principes_jeu.club_id AND ce.statut = 'accepte'));
CREATE POLICY "joueur_lit_planification" ON planification_annuelle FOR SELECT
  USING (EXISTS (SELECT 1 FROM affiliations a JOIN club_educateurs ce ON ce.educateur_id = a.educateur_id
    WHERE a.joueur_id = auth.uid() AND a.statut = 'accepte' AND ce.club_id = planification_annuelle.club_id AND ce.statut = 'accepte'));
CREATE POLICY "joueur_lit_regles" ON regles_jeu FOR SELECT
  USING (EXISTS (SELECT 1 FROM affiliations a JOIN club_educateurs ce ON ce.educateur_id = a.educateur_id
    WHERE a.joueur_id = auth.uid() AND a.statut = 'accepte' AND ce.club_id = regles_jeu.club_id AND ce.statut = 'accepte'));

-- Parents acceptés d'un joueur affilié : lecture seule (miroir parent_lit_..._enfant)
CREATE POLICY "parent_lit_principes" ON principes_jeu FOR SELECT
  USING (EXISTS (SELECT 1 FROM affiliations a JOIN club_educateurs ce ON ce.educateur_id = a.educateur_id
    WHERE a.statut = 'accepte' AND est_parent_accepte_de(a.joueur_id) AND ce.club_id = principes_jeu.club_id AND ce.statut = 'accepte'));
CREATE POLICY "parent_lit_planification" ON planification_annuelle FOR SELECT
  USING (EXISTS (SELECT 1 FROM affiliations a JOIN club_educateurs ce ON ce.educateur_id = a.educateur_id
    WHERE a.statut = 'accepte' AND est_parent_accepte_de(a.joueur_id) AND ce.club_id = planification_annuelle.club_id AND ce.statut = 'accepte'));
CREATE POLICY "parent_lit_regles" ON regles_jeu FOR SELECT
  USING (EXISTS (SELECT 1 FROM affiliations a JOIN club_educateurs ce ON ce.educateur_id = a.educateur_id
    WHERE a.statut = 'accepte' AND est_parent_accepte_de(a.joueur_id) AND ce.club_id = regles_jeu.club_id AND ce.statut = 'accepte'));
