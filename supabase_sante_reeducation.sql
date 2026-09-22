-- Programme de rééducation par blessure, complète supabase_sante_equipe.sql.
--
-- Corrections vs. le patch fourni : pas de colonne joueur_id sur
-- reeducation_etapes (le patch la référence comme profiles(id), en
-- supposant blessures.joueur_id — cette colonne s'appelle
-- blessures.equipe_joueur_id dans le schéma réel, cf. supabase_sante_equipe.sql,
-- et référence equipe_joueurs, pas profiles). Le joueur concerné est déjà
-- déterminable via blessure_id → blessures.equipe_joueur_id, donc redondant
-- et sujet à la même erreur de FK que joueur_id sur blessures/suivi_medical.
-- Accès joueur/parent en lecture : même join via affiliations que
-- suivi_medical, pas de colonne joueur_id à comparer directement.

CREATE TABLE IF NOT EXISTS reeducation_etapes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blessure_id UUID NOT NULL REFERENCES blessures(id) ON DELETE CASCADE,
  educateur_id UUID NOT NULL,
  ordre INTEGER NOT NULL DEFAULT 1,
  titre TEXT NOT NULL,
  description TEXT,
  duree_estimee TEXT,
  statut TEXT NOT NULL DEFAULT 'a_faire' CHECK (statut IN ('a_faire', 'en_cours', 'validee')),
  date_validation DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reeducation_etapes_blessure ON reeducation_etapes(blessure_id);

ALTER TABLE reeducation_etapes ENABLE ROW LEVEL SECURITY;
GRANT ALL ON reeducation_etapes TO authenticated;

-- Éducateur propriétaire de la blessure parente : CRUD complet.
DROP POLICY IF EXISTS "educateur_gere_reeducation" ON reeducation_etapes;
CREATE POLICY "educateur_gere_reeducation" ON reeducation_etapes FOR ALL
  USING (auth.uid() = educateur_id)
  WITH CHECK (
    auth.uid() = educateur_id
    AND EXISTS (SELECT 1 FROM blessures WHERE blessures.id = reeducation_etapes.blessure_id AND blessures.educateur_id = auth.uid())
  );

-- Joueur/parent : lecture des étapes de leurs propres blessures.
DROP POLICY IF EXISTS "joueur_lit_reeducation" ON reeducation_etapes;
CREATE POLICY "joueur_lit_reeducation" ON reeducation_etapes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM blessures b
    JOIN affiliations a ON a.equipe_joueur_id = b.equipe_joueur_id
    WHERE b.id = reeducation_etapes.blessure_id AND a.statut = 'accepte'
      AND (a.joueur_id = auth.uid() OR est_parent_accepte_de(a.joueur_id))
  ));
