-- convocations.match_id référence calendrier_matchs(id) alors que le code
-- (publierConvocation, DashboardEducateur.jsx) passe toujours un id venant
-- de matchs_equipe (la vraie table des matchs de l'équipe, chargée via
-- chargerMatchs — calendrier_matchs est une autre table, colonnes/usage
-- différents). D'où "violates foreign key constraint convocations_match_id_fkey"
-- dès qu'on publie une convocation pour un vrai match.

-- Vérifie d'abord qu'aucune convocation existante ne référence un match_id
-- absent de matchs_equipe — la nouvelle contrainte échouerait sinon avec une
-- erreur moins explicite (ne devrait rien trouver : les FK vers
-- calendrier_matchs n'ont jamais pu accepter un id de matchs_equipe).
DO $$
DECLARE
  orphelins TEXT;
BEGIN
  SELECT string_agg(c.id::text, ', ')
  INTO orphelins
  FROM convocations c
  WHERE c.match_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM matchs_equipe m WHERE m.id = c.match_id);

  IF orphelins IS NOT NULL THEN
    RAISE EXCEPTION 'Convocations avec un match_id absent de matchs_equipe, à examiner avant de changer la contrainte : %', orphelins;
  END IF;
END $$;

ALTER TABLE convocations DROP CONSTRAINT IF EXISTS convocations_match_id_fkey;
ALTER TABLE convocations
  ADD CONSTRAINT convocations_match_id_fkey
  FOREIGN KEY (match_id) REFERENCES matchs_equipe(id) ON DELETE CASCADE;
