-- Suivi des clics sur le bandeau sponsor (bannière + bouton "Découvrir",
-- cf. SponsorsBar.jsx) — le club veut savoir combien de clics chaque
-- sponsor génère, par semaine/mois/année (StatsSponsors.jsx, onglet
-- "Statistiques" de GestionSponsors.jsx).
--
-- Table de log append-only, même esprit que connexions_log
-- (supabase_connexions_log.sql) : une ligne par clic, agrégation faite
-- côté client (pas de RPC de comptage) pour rester cohérent avec le seul
-- autre exemple d'analytics déjà présent dans l'app (Viewers.jsx).
CREATE TABLE IF NOT EXISTS sponsor_clics_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- 'banniere' (clic sur l'image/logo central) vs 'cta' (bouton "Découvrir",
  -- desktop uniquement) — distinction gardée pour un futur détail, pas
  -- encore affichée séparément dans StatsSponsors.jsx (total des deux).
  type TEXT NOT NULL CHECK (type IN ('banniere', 'cta')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE sponsor_clics_log ENABLE ROW LEVEL SECURITY;

-- N'importe quel utilisateur connecté (joueur, éducateur, staff) qui voit le
-- bandeau peut cliquer dessus et donc logger un clic — même portée que
-- sponsors_bandeau_select (supabase_sponsors_bandeau.sql), pas besoin d'être
-- affilié au club en question.
DROP POLICY IF EXISTS "sponsor_clics_log_insert" ON sponsor_clics_log;
CREATE POLICY "sponsor_clics_log_insert" ON sponsor_clics_log
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Lecture des stats réservée au club lui-même et à son staff (gestion des
-- sponsors, cf. GestionSponsors.jsx) — même pattern que
-- planning_terrains_exceptions (supabase_planning_terrains_exceptions.sql).
DROP POLICY IF EXISTS "sponsor_clics_log_select" ON sponsor_clics_log;
CREATE POLICY "sponsor_clics_log_select" ON sponsor_clics_log
  FOR SELECT TO authenticated
  USING (
    club_id = auth.uid()
    OR EXISTS (SELECT 1 FROM staff_club sc WHERE sc.club_id = sponsor_clics_log.club_id AND sc.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_sponsor_clics_log_club ON sponsor_clics_log(club_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sponsor_clics_log_sponsor ON sponsor_clics_log(sponsor_id, created_at);
