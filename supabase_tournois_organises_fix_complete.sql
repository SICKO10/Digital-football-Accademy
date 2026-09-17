-- Corrige tournois_organises/tournois_equipes/tournois_matchs_organises créées
-- avec l'ancien schéma (club_id TEXT) puis les recrée avec le bon typage.
-- Sécurité intégrée : abandonne AVANT toute suppression si une des 3 tables
-- contient déjà des lignes (pas de perte de données possible).
-- Nécessite is_club_manager() (créée par supabase_tournois_fix_complete.sql).

DO $$
DECLARE
  total INTEGER;
BEGIN
  SELECT
    COALESCE((SELECT count(*) FROM tournois_organises), 0)
    + COALESCE((SELECT count(*) FROM tournois_equipes), 0)
    + COALESCE((SELECT count(*) FROM tournois_matchs_organises), 0)
  INTO total;

  IF total > 0 THEN
    RAISE EXCEPTION 'Abandon : % ligne(s) existante(s) dans les tables tournois_organises/equipes/matchs_organises — rien n''a été supprimé. Préviens-moi avant de continuer.', total;
  END IF;
END $$;

DROP TABLE IF EXISTS tournois_matchs_organises CASCADE;
DROP TABLE IF EXISTS tournois_equipes CASCADE;
DROP TABLE IF EXISTS tournois_organises CASCADE;

-- ── Recréation avec le schéma correct ───────────────────────────────────────

CREATE TABLE tournois_organises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  educateur_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  nom TEXT NOT NULL,
  date DATE,
  lieu TEXT,
  categorie_age TEXT,
  nb_terrains INTEGER DEFAULT 2,
  duree_match INTEGER DEFAULT 15,
  pause_minutes INTEGER DEFAULT 5,
  heure_debut TIME DEFAULT '09:00',
  format TEXT DEFAULT 'poules',
  nb_equipes_poule INTEGER DEFAULT 4,
  statut TEXT DEFAULT 'preparation' CHECK (statut IN ('preparation', 'en_cours', 'termine')),
  code_public TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tournois_equipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournoi_id UUID NOT NULL REFERENCES tournois_organises(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  club TEXT,
  poule TEXT DEFAULT 'A',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tournois_matchs_organises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournoi_id UUID NOT NULL REFERENCES tournois_organises(id) ON DELETE CASCADE,
  equipe_a_id UUID REFERENCES tournois_equipes(id) ON DELETE CASCADE,
  equipe_b_id UUID REFERENCES tournois_equipes(id) ON DELETE CASCADE,
  terrain INTEGER DEFAULT 1,
  heure_debut TIME,
  phase TEXT DEFAULT 'poule',
  poule TEXT,
  score_a INTEGER,
  score_b INTEGER,
  statut TEXT DEFAULT 'a_jouer' CHECK (statut IN ('a_jouer', 'termine')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tournois_organises_club ON tournois_organises(club_id);
CREATE INDEX idx_tournois_equipes_tournoi ON tournois_equipes(tournoi_id);
CREATE INDEX idx_tournois_matchs_organises_tournoi ON tournois_matchs_organises(tournoi_id);

ALTER TABLE tournois_organises ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournois_equipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournois_matchs_organises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tournois_organises_manage" ON tournois_organises FOR ALL
  USING (is_club_manager(club_id))
  WITH CHECK (is_club_manager(club_id));

CREATE POLICY "tournois_equipes_manage" ON tournois_equipes FOR ALL
  USING (EXISTS (SELECT 1 FROM tournois_organises t WHERE t.id = tournoi_id AND is_club_manager(t.club_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM tournois_organises t WHERE t.id = tournoi_id AND is_club_manager(t.club_id)));

CREATE POLICY "tournois_matchs_organises_manage" ON tournois_matchs_organises FOR ALL
  USING (EXISTS (SELECT 1 FROM tournois_organises t WHERE t.id = tournoi_id AND is_club_manager(t.club_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM tournois_organises t WHERE t.id = tournoi_id AND is_club_manager(t.club_id)));
