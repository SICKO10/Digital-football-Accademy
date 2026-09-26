-- Permet à l'admin plateforme (src/pages/coach/Viewers.jsx, filtre par club)
-- de résoudre "quels comptes appartiennent à ce club" — sans ça, l'admin ne
-- peut lire ni club_educateurs ni affiliations en dehors de ses propres
-- lignes (aucune des deux tables n'a de policy admin, cf.
-- supabase_club_educateurs_rls.sql / supabase_affiliations_lecture_club.sql).
-- Même pattern email que supabase_support_tickets.sql / supabase_connexions_log_admin.sql.
DROP POLICY IF EXISTS "club_educateurs_select_admin" ON club_educateurs;
CREATE POLICY "club_educateurs_select_admin" ON club_educateurs
  FOR SELECT USING (auth.jwt() ->> 'email' IN ('legacyattitude@gmail.com', 'januariojimmy@gmail.com'));

DROP POLICY IF EXISTS "affiliations_select_admin" ON affiliations;
CREATE POLICY "affiliations_select_admin" ON affiliations
  FOR SELECT USING (auth.jwt() ->> 'email' IN ('legacyattitude@gmail.com', 'januariojimmy@gmail.com'));
