-- Auto-déclaration : le joueur peut déclarer lui-même une blessure sur son
-- propre effectif (equipe_joueur_id via son affiliation acceptée), pas
-- seulement l'éducateur (jusqu'ici seule "educateur_gere_blessures" FOR ALL
-- permettait l'INSERT, cf. supabase_sante_equipe.sql). educateur_id n'est
-- jamais fait confiance tel quel depuis le client : la policy vérifie qu'il
-- correspond bien à l'éducateur de CETTE affiliation acceptée, pas une
-- valeur arbitraire envoyée par le joueur.
DROP POLICY IF EXISTS "joueur_declare_blessure" ON blessures;
CREATE POLICY "joueur_declare_blessure" ON blessures
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM affiliations
      WHERE affiliations.joueur_id = auth.uid() AND affiliations.statut = 'accepte'
        AND affiliations.equipe_joueur_id = blessures.equipe_joueur_id
        AND affiliations.educateur_id = blessures.educateur_id
    )
  );
