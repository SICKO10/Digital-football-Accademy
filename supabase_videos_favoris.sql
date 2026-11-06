-- Favoris vidéo des éducateurs + dossiers de classement.
-- Chaque éducateur voit et gère uniquement ses propres favoris et dossiers.
--
-- videos_favoris_dossiers : les dossiers créés par l'éducateur.
-- videos_favoris : une ligne = une vidéo de la bibliothèque rangée par
--   l'éducateur. Pour une vidéo Digital Football (type 'df'), la ligne
--   signifie « favori ». Pour une vidéo perso de l'éducateur, la ligne ne
--   sert qu'à mémoriser son dossier (ses vidéos perso sont toujours dans
--   « Mes favoris »). dossier_id NULL = « Sans dossier ».
-- Supprimer un dossier ne supprime pas les vidéos : elles repassent en
-- « Sans dossier » (ON DELETE SET NULL).
-- Une vidéo ne peut être que dans un seul dossier (UNIQUE educateur+vidéo).

CREATE TABLE IF NOT EXISTS videos_favoris_dossiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  educateur_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS videos_favoris (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  educateur_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES bibliotheque_videos(id) ON DELETE CASCADE,
  dossier_id UUID REFERENCES videos_favoris_dossiers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (educateur_id, video_id)
);

CREATE INDEX IF NOT EXISTS videos_favoris_educateur_idx ON videos_favoris (educateur_id);
CREATE INDEX IF NOT EXISTS videos_favoris_dossiers_educateur_idx ON videos_favoris_dossiers (educateur_id);

ALTER TABLE videos_favoris_dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos_favoris ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vfd_proprietaire ON videos_favoris_dossiers;
CREATE POLICY vfd_proprietaire ON videos_favoris_dossiers
  FOR ALL TO authenticated
  USING (educateur_id = auth.uid())
  WITH CHECK (educateur_id = auth.uid());

DROP POLICY IF EXISTS vf_proprietaire ON videos_favoris;
CREATE POLICY vf_proprietaire ON videos_favoris
  FOR ALL TO authenticated
  USING (educateur_id = auth.uid())
  WITH CHECK (
    educateur_id = auth.uid()
    AND (dossier_id IS NULL OR EXISTS (
      SELECT 1 FROM videos_favoris_dossiers d
      WHERE d.id = dossier_id AND d.educateur_id = auth.uid()
    ))
  );
