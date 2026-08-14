-- club_recrutements existe déjà en base (le patch d'origine a été exécuté
-- avant d'être passé à Claude Code) mais avec une policy d'écriture
-- dangereuse : USING (auth.uid() IS NOT NULL) permet à N'IMPORTE QUEL
-- utilisateur connecté de créer/modifier/supprimer les annonces de
-- recrutement de N'IMPORTE QUEL club, pas seulement les siennes. À exécuter
-- dès que possible.

DROP POLICY IF EXISTS "cr_write" ON club_recrutements;
CREATE POLICY "cr_write" ON club_recrutements
  FOR ALL USING (auth.uid() = club_id) WITH CHECK (auth.uid() = club_id);
