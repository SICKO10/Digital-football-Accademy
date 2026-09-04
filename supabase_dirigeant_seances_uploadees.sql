-- Même trou que déjà corrigé sur club_educateurs/materiel_distribution/
-- vehicules/planning_terrains/disponibilites/principes_jeu/evaluations_joueur :
-- seances_uploadees n'a aucune policy dirigeant, donc "Voir la fiche" ne
-- retournait jamais rien pour un dirigeant délégué (mesSeancesOuvertes vide
-- côté client, chargé correctement avec le bon educateur_id mais bloqué par
-- RLS côté serveur).

CREATE POLICY "dirigeant_lit_seances_uploadees" ON seances_uploadees FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM dirigeant_acces
    WHERE dirigeant_acces.dirigeant_id = auth.uid()
      AND dirigeant_acces.educateur_id = seances_uploadees.educateur_id
      AND dirigeant_acces.statut = 'accepte'
      AND (dirigeant_acces.permissions ->> 'entrainements') = ANY (ARRAY['lecture', 'edition'])
  ));
