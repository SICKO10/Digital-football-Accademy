-- Module Tournoi — Phase 2 (« On organise »)
-- Même correctif que Phase 1 : club_id UUID → profiles(id), pas TEXT, et RLS
-- via la fonction is_club_manager() déjà créée par
-- supabase_tournois_fix_complete.sql (club_id = auth.uid() OU appartenance
-- staff_club — à exécuter avant ce script si pas déjà fait).

CREATE TABLE IF NOT EXISTS tournois_organises (
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

CREATE TABLE IF NOT EXISTS tournois_equipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournoi_id UUID NOT NULL REFERENCES tournois_organises(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  club TEXT,
  poule TEXT DEFAULT 'A',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tournois_matchs_organises (
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

CREATE INDEX IF NOT EXISTS idx_tournois_organises_club ON tournois_organises(club_id);
CREATE INDEX IF NOT EXISTS idx_tournois_equipes_tournoi ON tournois_equipes(tournoi_id);
CREATE INDEX IF NOT EXISTS idx_tournois_matchs_organises_tournoi ON tournois_matchs_organises(tournoi_id);

ALTER TABLE tournois_organises ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournois_equipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournois_matchs_organises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tournois_organises_manage" ON tournois_organises;
CREATE POLICY "tournois_organises_manage" ON tournois_organises FOR ALL
  USING (is_club_manager(club_id))
  WITH CHECK (is_club_manager(club_id));

DROP POLICY IF EXISTS "tournois_equipes_manage" ON tournois_equipes;
CREATE POLICY "tournois_equipes_manage" ON tournois_equipes FOR ALL
  USING (EXISTS (SELECT 1 FROM tournois_organises t WHERE t.id = tournoi_id AND is_club_manager(t.club_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM tournois_organises t WHERE t.id = tournoi_id AND is_club_manager(t.club_id)));

DROP POLICY IF EXISTS "tournois_matchs_organises_manage" ON tournois_matchs_organises;
CREATE POLICY "tournois_matchs_organises_manage" ON tournois_matchs_organises FOR ALL
  USING (EXISTS (SELECT 1 FROM tournois_organises t WHERE t.id = tournoi_id AND is_club_manager(t.club_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM tournois_organises t WHERE t.id = tournoi_id AND is_club_manager(t.club_id)));
