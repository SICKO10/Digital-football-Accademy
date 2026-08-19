-- Retirer un article du catalogue (bouton "Retirer" dans "Gérer le
-- catalogue") doit fonctionner pour les articles globaux comme pour les
-- articles personnalisés d'un club, MAIS un article global (club_id NULL)
-- est une ligne PARTAGÉE par tous les clubs de la plateforme — la passer à
-- actif=false la masquerait pour tout le monde, pas seulement le club qui a
-- cliqué "Retirer". D'où cette table : pour un article global, "retirer"
-- crée une ligne de masquage propre à ce club (l'article existe toujours
-- pour les autres) ; pour un article personnalisé, "retirer" continue de
-- passer actif=false sur sa propre ligne (déjà scopée à ce club).
CREATE TABLE IF NOT EXISTS materiel_catalogue_masque (
  club_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  catalogue_id UUID NOT NULL REFERENCES materiel_catalogue(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (club_id, catalogue_id)
);

ALTER TABLE materiel_catalogue_masque ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventaire_lecture_masque" ON materiel_catalogue_masque;
CREATE POLICY "inventaire_lecture_masque" ON materiel_catalogue_masque
  FOR SELECT USING (a_permission_inventaire(club_id, false));

DROP POLICY IF EXISTS "inventaire_ecriture_masque" ON materiel_catalogue_masque;
CREATE POLICY "inventaire_ecriture_masque" ON materiel_catalogue_masque
  FOR ALL USING (a_permission_inventaire(club_id, true)) WITH CHECK (a_permission_inventaire(club_id, true));

GRANT SELECT, INSERT, UPDATE, DELETE ON materiel_catalogue_masque TO authenticated;
