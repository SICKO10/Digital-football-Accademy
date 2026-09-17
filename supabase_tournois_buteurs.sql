-- Buteurs par match (tournois organisés, Phase B). RLS via is_club_manager()
-- (créée par supabase_tournois_fix_complete.sql) — même pattern que les
-- autres tables tournois_*, pas de policy ouverte à tout le monde.

CREATE TABLE IF NOT EXISTS tournois_buteurs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES tournois_matchs_organises(id) ON DELETE CASCADE,
  tournoi_id UUID NOT NULL REFERENCES tournois_organises(id) ON DELETE CASCADE,
  equipe_id UUID NOT NULL REFERENCES tournois_equipes(id) ON DELETE CASCADE,
  nom_joueur TEXT NOT NULL,
  prenom_joueur TEXT DEFAULT '',
  numero_maillot INTEGER,
  nb_buts INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tournois_buteurs_tournoi ON tournois_buteurs(tournoi_id);
CREATE INDEX IF NOT EXISTS idx_tournois_buteurs_match ON tournois_buteurs(match_id);

ALTER TABLE tournois_buteurs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tournois_buteurs_manage" ON tournois_buteurs;
CREATE POLICY "tournois_buteurs_manage" ON tournois_buteurs FOR ALL
  USING (EXISTS (SELECT 1 FROM tournois_organises t WHERE t.id = tournoi_id AND is_club_manager(t.club_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM tournois_organises t WHERE t.id = tournoi_id AND is_club_manager(t.club_id)));
