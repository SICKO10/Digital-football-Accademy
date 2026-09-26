-- Onglet "Viewers" (Mon équipe → Viewers, DashboardEducateur.jsx) : nombre de
-- connexions par joueur, pour que l'éducateur voie qui utilise réellement
-- l'app. club_id n'existe nulle part dans ce projet comme table séparée
-- (club_id référence toujours profiles(id), cf. toutes les tables *_club) et
-- un éducateur peut gérer plusieurs équipes d'un même club : scoper par
-- affiliations (educateur_id = auth.uid(), même pattern que
-- evaluations_joueur/tests_physiques) est plus précis que par club entier —
-- un éducateur ne doit voir que SES joueurs, pas ceux des autres équipes du club.
CREATE TABLE IF NOT EXISTS connexions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('joueur', 'educateur')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE connexions_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "connexions_log_insert_self" ON connexions_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Un joueur voit ses propres connexions ; un éducateur voit celles des
-- joueurs qui lui sont affiliés (accepte), jamais celles d'un autre éducateur
-- du même club.
CREATE POLICY "connexions_log_select" ON connexions_log
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM affiliations a
      WHERE a.joueur_id = connexions_log.user_id AND a.educateur_id = auth.uid() AND a.statut = 'accepte'
    )
  );

CREATE INDEX IF NOT EXISTS idx_connexions_log_user ON connexions_log(user_id, created_at);
