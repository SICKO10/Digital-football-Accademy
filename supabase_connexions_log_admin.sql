-- Lecture admin plateforme sur connexions_log (onglet Viewers déplacé du
-- dashboard éducateur vers /coach, cf. src/pages/coach/Viewers.jsx) — même
-- pattern email que le reste des tables admin de ce projet (cf.
-- supabase_support_tickets.sql). La policy existante (connexions_log_select,
-- self + éducateur affilié) reste en place, elle ne sert simplement plus à
-- l'UI éducateur actuelle mais ne pose pas de problème à rester.
DROP POLICY IF EXISTS "connexions_log_select" ON connexions_log;
CREATE POLICY "connexions_log_select" ON connexions_log
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM affiliations a
      WHERE a.joueur_id = connexions_log.user_id AND a.educateur_id = auth.uid() AND a.statut = 'accepte'
    )
    OR auth.jwt() ->> 'email' IN ('legacyattitude@gmail.com', 'januariojimmy@gmail.com')
  );
