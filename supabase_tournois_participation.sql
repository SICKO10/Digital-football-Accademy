-- Module Tournoi — Phase 1 (« On participe »)
-- club_id référence profiles(id), comme le reste du schéma (club_educateurs,
-- club_categories, etc. — pas de type TEXT séparé pour identifier un club).

CREATE TABLE IF NOT EXISTS tournois_participation (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  club_categorie_id UUID REFERENCES club_categories(id) ON DELETE SET NULL,
  nom TEXT NOT NULL,
  organisateur TEXT,
  date_debut DATE NOT NULL,
  date_fin DATE,
  lieu TEXT,
  adresse TEXT,
  format TEXT DEFAULT 'Poules + KO',
  nb_equipes INTEGER,
  statut TEXT DEFAULT 'Inscrit' CHECK (statut IN ('Inscrit','Confirmé','En cours','Terminé','Annulé')),
  lien_reglement TEXT,
  contact_nom TEXT,
  contact_email TEXT,
  contact_tel TEXT,
  transport TEXT,
  heure_rdv TEXT,
  lieu_rdv TEXT,
  budget_inscription NUMERIC DEFAULT 0,
  budget_transport NUMERIC DEFAULT 0,
  budget_hebergement NUMERIC DEFAULT 0,
  nb_joueurs_max INTEGER DEFAULT 16,
  classement_final TEXT,
  trophee TEXT,
  galerie_urls TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Joueurs convoqués pour un tournoi. Référence equipe_joueurs (le roster tenu
-- par les éducateurs) plutôt que profiles : un joueur du roster peut ne pas
-- encore avoir de compte plateforme lié (equipe_joueurs.joueur_id nullable),
-- il doit rester convocable quand même.
CREATE TABLE IF NOT EXISTS tournois_convocations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournoi_id UUID NOT NULL REFERENCES tournois_participation(id) ON DELETE CASCADE,
  equipe_joueur_id UUID NOT NULL REFERENCES equipe_joueurs(id) ON DELETE CASCADE,
  statut TEXT DEFAULT 'En attente' CHECK (statut IN ('En attente','Présent','Absent')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tournoi_id, equipe_joueur_id)
);

-- Matchs joués pendant le tournoi
CREATE TABLE IF NOT EXISTS tournois_matchs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournoi_id UUID NOT NULL REFERENCES tournois_participation(id) ON DELETE CASCADE,
  phase TEXT DEFAULT 'Poule' CHECK (phase IN ('Poule','Quart de finale','Demi-finale','Petite finale','Finale')),
  adversaire TEXT NOT NULL,
  score_nous INTEGER,
  score_eux INTEGER,
  heure TEXT,
  terrain TEXT,
  buteurs TEXT[] DEFAULT '{}',
  cartons_jaunes TEXT[] DEFAULT '{}',
  cartons_rouges TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tournois_participation_club ON tournois_participation(club_id);
CREATE INDEX IF NOT EXISTS idx_tournois_convocations_tournoi ON tournois_convocations(tournoi_id);
CREATE INDEX IF NOT EXISTS idx_tournois_matchs_tournoi ON tournois_matchs(tournoi_id);

-- RLS ---------------------------------------------------------------------
-- Gère club_id = auth.uid() (compte club lui-même) ET la délégation staff_club
-- (dirigeant connecté sous son propre compte, cf. DashboardClub.jsx `resolvedClubId`
-- via staff_club.club_id quand profile.plan !== 'club'). SECURITY DEFINER pour
-- ne pas dépendre des policies RLS de staff_club dans le sous-select.
CREATE OR REPLACE FUNCTION is_club_manager(target_club_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT target_club_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM staff_club sc
      WHERE sc.club_id = target_club_id AND sc.user_id = auth.uid()
    );
$$;

ALTER TABLE tournois_participation ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournois_convocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournois_matchs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tournois_participation_manage" ON tournois_participation;
CREATE POLICY "tournois_participation_manage" ON tournois_participation FOR ALL
  USING (is_club_manager(club_id))
  WITH CHECK (is_club_manager(club_id));

DROP POLICY IF EXISTS "tournois_convocations_manage" ON tournois_convocations;
CREATE POLICY "tournois_convocations_manage" ON tournois_convocations FOR ALL
  USING (EXISTS (SELECT 1 FROM tournois_participation tp WHERE tp.id = tournoi_id AND is_club_manager(tp.club_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM tournois_participation tp WHERE tp.id = tournoi_id AND is_club_manager(tp.club_id)));

DROP POLICY IF EXISTS "tournois_matchs_manage" ON tournois_matchs;
CREATE POLICY "tournois_matchs_manage" ON tournois_matchs FOR ALL
  USING (EXISTS (SELECT 1 FROM tournois_participation tp WHERE tp.id = tournoi_id AND is_club_manager(tp.club_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM tournois_participation tp WHERE tp.id = tournoi_id AND is_club_manager(tp.club_id)));
