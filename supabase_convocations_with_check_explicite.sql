-- "Educateur gere convocations" est FOR ALL avec seulement USING, sans
-- WITH CHECK explicite — en théorie Postgres réutilise USING comme WITH
-- CHECK pour l'INSERT/UPDATE, mais l'erreur observée ("new row violates
-- row-level security policy") avec un compte/educateur_id pourtant
-- confirmés correspondants suggère que ça ne se comporte pas comme attendu
-- ici. Fix : WITH CHECK explicite, identique à USING, pour ne plus dépendre
-- de ce comportement implicite.
DROP POLICY IF EXISTS "Educateur gere convocations" ON convocations;
CREATE POLICY "Educateur gere convocations" ON convocations
  FOR ALL
  USING (educateur_id = auth.uid())
  WITH CHECK (educateur_id = auth.uid());
