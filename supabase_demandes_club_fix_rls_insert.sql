-- La policy INSERT publique de demandes_club (cf. supabase_demandes_club.sql)
-- n'est plus active en prod : un insert anonyme échoue avec 42501 "new row
-- violates row-level security policy" alors que RLS est activée sur la
-- table. Recréation idempotente, avec vérification que RLS reste bien
-- activée (sinon la policy n'aurait aucun effet).
ALTER TABLE demandes_club ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert_demande_club" ON demandes_club;
CREATE POLICY "public_insert_demande_club" ON demandes_club
  FOR INSERT WITH CHECK (true);
