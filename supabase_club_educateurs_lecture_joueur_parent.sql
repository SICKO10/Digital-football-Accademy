-- chargerInventaireJoueur (DashboardJoueur.jsx) lit club_educateurs en tout
-- premier pour retrouver le club de son éducateur, avant même de regarder
-- l'équipement — aucune policy SELECT existante ne couvre un joueur (ou son
-- parent) lisant la ligne de SON éducateur, donc la fonction s'arrêtait net
-- dès cette étape, laissant "Mon équipement" vide même quand un pack est
-- bien attribué côté club.
DROP POLICY IF EXISTS "joueur_lit_club_de_son_educateur" ON club_educateurs;
CREATE POLICY "joueur_lit_club_de_son_educateur" ON club_educateurs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM affiliations
      WHERE affiliations.educateur_id = club_educateurs.educateur_id
        AND affiliations.statut = 'accepte'
        AND (
          affiliations.joueur_id = auth.uid()
          OR est_parent_accepte_de(affiliations.joueur_id)
        )
    )
  );
