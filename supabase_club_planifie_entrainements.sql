-- Le club a déjà une policy SELECT sur entrainements pour ses éducateurs
-- affiliés (cf. supabase_club_modifier_educateur.sql) mais aucune policy
-- d'écriture — nécessaire pour planifier des séances au calendrier depuis
-- le Dashboard Club (onglet "Séances"), qui apparaissent ensuite pour
-- l'éducateur exactement comme s'il les avait créées lui-même.
CREATE POLICY "club_planifie_entrainements_educateurs_affilies" ON entrainements
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM club_educateurs ce
      WHERE ce.educateur_id = entrainements.educateur_id
      AND ce.club_id = auth.uid()
      AND ce.statut = 'accepte'
    )
  );

CREATE POLICY "club_modifie_entrainements_educateurs_affilies" ON entrainements
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM club_educateurs ce
      WHERE ce.educateur_id = entrainements.educateur_id
      AND ce.club_id = auth.uid()
      AND ce.statut = 'accepte'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM club_educateurs ce
      WHERE ce.educateur_id = entrainements.educateur_id
      AND ce.club_id = auth.uid()
      AND ce.statut = 'accepte'
    )
  );

CREATE POLICY "club_supprime_entrainements_educateurs_affilies" ON entrainements
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM club_educateurs ce
      WHERE ce.educateur_id = entrainements.educateur_id
      AND ce.club_id = auth.uid()
      AND ce.statut = 'accepte'
    )
  );
