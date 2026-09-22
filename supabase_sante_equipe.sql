-- Section Santé (éducateur : déclaration/suivi des blessures — joueur/parent :
-- lecture seule) dans "Mon équipe".
--
-- Corrections vs. la première version du patch :
-- - blessures référence equipe_joueurs(id), pas profiles(id) : une ligne
--   d'effectif (equipe_joueurs) n'a pas toujours de compte joueur lié
--   (equipe_joueurs.joueur_id est nullable, "ajouté manuellement" par
--   l'éducateur) — même modèle que evaluations_joueur.equipe_joueur_id
--   (supabase_evaluations_joueur.sql). Un blessures.joueur_id NOT NULL
--   REFERENCES profiles(id) aurait rendu impossible de déclarer une
--   blessure pour tout joueur sans compte.
-- - Pas de colonne equipe_id sur blessures : ce projet n'a pas de table
--   "équipes" séparée pour l'éducateur — le rattachement équipe/catégorie
--   se fait déjà via equipe_joueurs.club_categorie_id.
-- - suivi_medical n'a pas sa propre colonne joueur_id (redondante avec
--   blessure_id → equipe_joueur_id, et sujette à la même erreur de FK).
-- - Accès joueur/parent : via affiliations (joueur_id = auth.uid(),
--   statut='accepte', equipe_joueur_id) + est_parent_accepte_de(), comme
--   partout ailleurs pour les données par joueur (evaluations_joueur,
--   supabase_parents_lecture_matchs_entrainements_equipement.sql) — pas de
--   lecture club/staff_club ni dirigeant délégué pour l'instant (donnée
--   médicale, périmètre volontairement restreint à éducateur + joueur +
--   parent ; à ouvrir explicitement si besoin).

CREATE TABLE IF NOT EXISTS blessures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipe_joueur_id UUID NOT NULL REFERENCES equipe_joueurs(id) ON DELETE CASCADE,
  educateur_id UUID NOT NULL,
  saison TEXT,
  type_blessure TEXT NOT NULL,
  zone_corps TEXT,
  gravite TEXT NOT NULL DEFAULT 'legere' CHECK (gravite IN ('legere', 'moderee', 'grave')),
  date_debut DATE NOT NULL,
  date_retour_estimee DATE,
  date_retour_effective DATE,
  statut TEXT NOT NULL DEFAULT 'en_cours' CHECK (statut IN ('en_cours', 'en_soin', 'retour_prog', 'gueri')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS suivi_medical (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blessure_id UUID NOT NULL REFERENCES blessures(id) ON DELETE CASCADE,
  auteur_id UUID NOT NULL,
  date_consultation DATE NOT NULL,
  specialiste TEXT,
  compte_rendu TEXT NOT NULL,
  document_path TEXT,   -- chemin dans le bucket privé 'documents-medicaux', pas une URL (signée à la demande, cf. plus bas)
  document_nom TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blessures_equipe_joueur ON blessures(equipe_joueur_id);
CREATE INDEX IF NOT EXISTS idx_blessures_educateur ON blessures(educateur_id);
CREATE INDEX IF NOT EXISTS idx_suivi_medical_blessure ON suivi_medical(blessure_id);

ALTER TABLE blessures ENABLE ROW LEVEL SECURITY;
ALTER TABLE suivi_medical ENABLE ROW LEVEL SECURITY;
GRANT ALL ON blessures TO authenticated;
GRANT ALL ON suivi_medical TO authenticated;

-- Éducateur propriétaire : CRUD complet.
DROP POLICY IF EXISTS "educateur_gere_blessures" ON blessures;
CREATE POLICY "educateur_gere_blessures" ON blessures FOR ALL
  USING (auth.uid() = educateur_id) WITH CHECK (auth.uid() = educateur_id);

-- Joueur affilié à cette ligne d'effectif : lecture.
DROP POLICY IF EXISTS "joueur_lit_blessures" ON blessures;
CREATE POLICY "joueur_lit_blessures" ON blessures FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM affiliations
    WHERE affiliations.joueur_id = auth.uid() AND affiliations.statut = 'accepte'
      AND affiliations.equipe_joueur_id = blessures.equipe_joueur_id
  ));

-- Parent accepté du joueur : lecture.
DROP POLICY IF EXISTS "parent_lit_blessures" ON blessures;
CREATE POLICY "parent_lit_blessures" ON blessures FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM affiliations
    WHERE affiliations.statut = 'accepte' AND est_parent_accepte_de(affiliations.joueur_id)
      AND affiliations.equipe_joueur_id = blessures.equipe_joueur_id
  ));

-- suivi_medical : l'éducateur auteur gère ses propres entrées (et seulement
-- sur une blessure dont il est déjà responsable, via la sous-requête du WITH CHECK).
DROP POLICY IF EXISTS "educateur_gere_suivi" ON suivi_medical;
CREATE POLICY "educateur_gere_suivi" ON suivi_medical FOR ALL
  USING (auth.uid() = auteur_id)
  WITH CHECK (
    auth.uid() = auteur_id
    AND EXISTS (SELECT 1 FROM blessures WHERE blessures.id = suivi_medical.blessure_id AND blessures.educateur_id = auth.uid())
  );

-- Joueur/parent : lecture du suivi médical de leurs propres blessures.
DROP POLICY IF EXISTS "joueur_lit_suivi" ON suivi_medical;
CREATE POLICY "joueur_lit_suivi" ON suivi_medical FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM blessures b
    JOIN affiliations a ON a.equipe_joueur_id = b.equipe_joueur_id
    WHERE b.id = suivi_medical.blessure_id AND a.statut = 'accepte'
      AND (a.joueur_id = auth.uid() OR est_parent_accepte_de(a.joueur_id))
  ));

-- ── Storage : bucket privé pour les comptes rendus médicaux ────────────────
-- Chemin : {equipe_joueur_id}/{blessure_id}/{fichier} — les policies
-- storage.objects revérifient à chaque accès (pas de signature stockée en
-- base, cf. document_path ci-dessus : une URL signée expire, elle n'a pas sa
-- place dans une table ; le front en génère une à la demande, courte durée).
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents-medicaux', 'documents-medicaux', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "documents_medicaux_upload_educateur" ON storage.objects;
CREATE POLICY "documents_medicaux_upload_educateur"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents-medicaux'
    AND EXISTS (
      SELECT 1 FROM blessures
      WHERE id = (storage.foldername(name))[2]::uuid
        AND educateur_id = auth.uid()
        AND equipe_joueur_id::text = (storage.foldername(name))[1]
    )
  );

DROP POLICY IF EXISTS "documents_medicaux_lecture" ON storage.objects;
CREATE POLICY "documents_medicaux_lecture"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents-medicaux'
    AND EXISTS (
      SELECT 1 FROM blessures b
      WHERE b.id = (storage.foldername(name))[2]::uuid
        AND (
          b.educateur_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM affiliations a
            WHERE a.equipe_joueur_id = b.equipe_joueur_id AND a.statut = 'accepte'
              AND (a.joueur_id = auth.uid() OR est_parent_accepte_de(a.joueur_id))
          )
        )
    )
  );
