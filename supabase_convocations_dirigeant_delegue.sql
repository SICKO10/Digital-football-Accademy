-- Un dirigeant délégué avec permission "Compétition" en édition
-- (dirigeant_acces.permissions->>'competition' = 'edition') peut désormais
-- publier/gérer les convocations pour l'éducateur qui l'a autorisé — même
-- principe que les autres sections déléguées (effectif, stats, etc.).
-- S'ajoute à la policy existante ("Educateur gere convocations"), qui reste
-- inchangée pour l'éducateur lui-même.
DROP POLICY IF EXISTS "Dirigeant gere convocations si delegue" ON convocations;
CREATE POLICY "Dirigeant gere convocations si delegue" ON convocations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM dirigeant_acces
      WHERE dirigeant_acces.educateur_id = convocations.educateur_id
        AND dirigeant_acces.dirigeant_id = auth.uid()
        AND dirigeant_acces.statut = 'accepte'
        AND dirigeant_acces.permissions->>'competition' = 'edition'
    )
  );
