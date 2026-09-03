-- Planification annuelle par catégorie précise (phases + semaines + échéances),
-- remplace l'ancienne "planification_annuelle" par pôle (supprimée).

CREATE TABLE plan_annuel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL,
  categorie TEXT NOT NULL,
  saison TEXT NOT NULL,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  nb_seances_semaine INT DEFAULT 2,
  projet_jeu TEXT,
  valeurs TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(club_id, categorie, saison)
);

CREATE TABLE plan_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plan_annuel(id) ON DELETE CASCADE,
  ordre INT NOT NULL,
  nom TEXT NOT NULL,
  type TEXT DEFAULT 'competition', -- 'preparation' | 'competition' | 'treve' | 'bilan'
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  duree_semaines INT,
  theme_offensif TEXT,
  sous_principes_offensifs TEXT[],
  theme_defensif TEXT,
  sous_principes_defensifs TEXT[],
  objectifs_prioritaires TEXT[],
  criteres_reussite TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE plan_semaines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plan_annuel(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES plan_phases(id) ON DELETE SET NULL,
  numero_semaine INT NOT NULL,
  mois TEXT,
  date_debut DATE,
  theme_offensif TEXT,
  sous_principe_offensif TEXT,
  theme_defensif TEXT,
  sous_principe_defensif TEXT,
  objectif_offensif TEXT,
  objectif_defensif TEXT,
  charge_s1 TEXT DEFAULT 'MOY', -- 'LEG' | 'MOY' | 'ELEV'
  charge_s2 TEXT DEFAULT 'MOY',
  competition TEXT,
  remarques TEXT,
  type_semaine TEXT DEFAULT 'normal', -- 'normal' | 'vacances' | 'bilan'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(plan_id, numero_semaine)
);

CREATE TABLE plan_competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plan_annuel(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  date DATE NOT NULL,
  type TEXT DEFAULT 'championnat', -- 'championnat' | 'coupe' | 'tournoi' | 'amical' | 'autre'
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE plan_annuel ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_semaines ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_competitions ENABLE ROW LEVEL SECURITY;

GRANT ALL ON plan_annuel, plan_phases, plan_semaines, plan_competitions TO authenticated;

-- plan_annuel : club/staff en écriture (miroir club_categories), lecture ouverte
-- aux éducateurs/joueurs/parents affiliés au club.
CREATE POLICY "club_gere_plan_annuel" ON plan_annuel FOR ALL
  USING (auth.uid() = club_id OR EXISTS (SELECT 1 FROM staff_club WHERE staff_club.club_id = plan_annuel.club_id AND staff_club.user_id = auth.uid()))
  WITH CHECK (auth.uid() = club_id OR EXISTS (SELECT 1 FROM staff_club WHERE staff_club.club_id = plan_annuel.club_id AND staff_club.user_id = auth.uid()));

CREATE POLICY "educateur_lit_plan_annuel" ON plan_annuel FOR SELECT
  USING (EXISTS (SELECT 1 FROM club_educateurs WHERE club_educateurs.club_id = plan_annuel.club_id AND club_educateurs.educateur_id = auth.uid() AND club_educateurs.statut = 'accepte'));

CREATE POLICY "joueur_lit_plan_annuel" ON plan_annuel FOR SELECT
  USING (EXISTS (SELECT 1 FROM affiliations a JOIN club_educateurs ce ON ce.educateur_id = a.educateur_id
    WHERE a.joueur_id = auth.uid() AND a.statut = 'accepte' AND ce.club_id = plan_annuel.club_id AND ce.statut = 'accepte'));

CREATE POLICY "parent_lit_plan_annuel" ON plan_annuel FOR SELECT
  USING (EXISTS (SELECT 1 FROM affiliations a JOIN club_educateurs ce ON ce.educateur_id = a.educateur_id
    WHERE a.statut = 'accepte' AND est_parent_accepte_de(a.joueur_id) AND ce.club_id = plan_annuel.club_id AND ce.statut = 'accepte'));

-- plan_phases/plan_semaines/plan_competitions : pas de club_id direct (rattachées
-- via plan_id) — mêmes règles, appliquées via une sous-requête sur plan_annuel.
-- Lecture déléguée à plan_annuel (mêmes ayants droit : club/staff, éducateurs,
-- joueurs, parents affiliés) via jointure sur plan_id — pas de simple "existe",
-- la sous-requête réapplique les vraies conditions d'appartenance au club.
CREATE POLICY "club_gere_plan_phases" ON plan_phases FOR ALL
  USING (EXISTS (SELECT 1 FROM plan_annuel pa WHERE pa.id = plan_phases.plan_id AND (pa.club_id = auth.uid() OR EXISTS (SELECT 1 FROM staff_club WHERE staff_club.club_id = pa.club_id AND staff_club.user_id = auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM plan_annuel pa WHERE pa.id = plan_phases.plan_id AND (pa.club_id = auth.uid() OR EXISTS (SELECT 1 FROM staff_club WHERE staff_club.club_id = pa.club_id AND staff_club.user_id = auth.uid()))));
CREATE POLICY "lecture_plan_phases" ON plan_phases FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM plan_annuel pa WHERE pa.id = plan_phases.plan_id AND (
      EXISTS (SELECT 1 FROM club_educateurs ce WHERE ce.club_id = pa.club_id AND ce.educateur_id = auth.uid() AND ce.statut = 'accepte')
      OR EXISTS (SELECT 1 FROM affiliations a JOIN club_educateurs ce ON ce.educateur_id = a.educateur_id WHERE a.joueur_id = auth.uid() AND a.statut = 'accepte' AND ce.club_id = pa.club_id AND ce.statut = 'accepte')
      OR EXISTS (SELECT 1 FROM affiliations a JOIN club_educateurs ce ON ce.educateur_id = a.educateur_id WHERE a.statut = 'accepte' AND est_parent_accepte_de(a.joueur_id) AND ce.club_id = pa.club_id AND ce.statut = 'accepte')
    )
  ));

CREATE POLICY "club_gere_plan_semaines" ON plan_semaines FOR ALL
  USING (EXISTS (SELECT 1 FROM plan_annuel pa WHERE pa.id = plan_semaines.plan_id AND (pa.club_id = auth.uid() OR EXISTS (SELECT 1 FROM staff_club WHERE staff_club.club_id = pa.club_id AND staff_club.user_id = auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM plan_annuel pa WHERE pa.id = plan_semaines.plan_id AND (pa.club_id = auth.uid() OR EXISTS (SELECT 1 FROM staff_club WHERE staff_club.club_id = pa.club_id AND staff_club.user_id = auth.uid()))));
CREATE POLICY "lecture_plan_semaines" ON plan_semaines FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM plan_annuel pa WHERE pa.id = plan_semaines.plan_id AND (
      EXISTS (SELECT 1 FROM club_educateurs ce WHERE ce.club_id = pa.club_id AND ce.educateur_id = auth.uid() AND ce.statut = 'accepte')
      OR EXISTS (SELECT 1 FROM affiliations a JOIN club_educateurs ce ON ce.educateur_id = a.educateur_id WHERE a.joueur_id = auth.uid() AND a.statut = 'accepte' AND ce.club_id = pa.club_id AND ce.statut = 'accepte')
      OR EXISTS (SELECT 1 FROM affiliations a JOIN club_educateurs ce ON ce.educateur_id = a.educateur_id WHERE a.statut = 'accepte' AND est_parent_accepte_de(a.joueur_id) AND ce.club_id = pa.club_id AND ce.statut = 'accepte')
    )
  ));

CREATE POLICY "club_gere_plan_competitions" ON plan_competitions FOR ALL
  USING (EXISTS (SELECT 1 FROM plan_annuel pa WHERE pa.id = plan_competitions.plan_id AND (pa.club_id = auth.uid() OR EXISTS (SELECT 1 FROM staff_club WHERE staff_club.club_id = pa.club_id AND staff_club.user_id = auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM plan_annuel pa WHERE pa.id = plan_competitions.plan_id AND (pa.club_id = auth.uid() OR EXISTS (SELECT 1 FROM staff_club WHERE staff_club.club_id = pa.club_id AND staff_club.user_id = auth.uid()))));
CREATE POLICY "lecture_plan_competitions" ON plan_competitions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM plan_annuel pa WHERE pa.id = plan_competitions.plan_id AND (
      EXISTS (SELECT 1 FROM club_educateurs ce WHERE ce.club_id = pa.club_id AND ce.educateur_id = auth.uid() AND ce.statut = 'accepte')
      OR EXISTS (SELECT 1 FROM affiliations a JOIN club_educateurs ce ON ce.educateur_id = a.educateur_id WHERE a.joueur_id = auth.uid() AND a.statut = 'accepte' AND ce.club_id = pa.club_id AND ce.statut = 'accepte')
      OR EXISTS (SELECT 1 FROM affiliations a JOIN club_educateurs ce ON ce.educateur_id = a.educateur_id WHERE a.statut = 'accepte' AND est_parent_accepte_de(a.joueur_id) AND ce.club_id = pa.club_id AND ce.statut = 'accepte')
    )
  ));
