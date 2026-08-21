-- DashboardEducateur.jsx fait .upsert(payload, { onConflict: 'match_id' })
-- sur convocations (ligne ~3583) mais aucune contrainte UNIQUE n'existe sur
-- cette colonne, d'où l'erreur Postgres "no unique or exclusion constraint
-- matching the ON CONFLICT specification".

-- Vérifie d'abord s'il existe déjà des doublons de match_id — l'ajout de la
-- contrainte échouerait sinon avec une erreur moins explicite. S'il y en a,
-- le message ci-dessous liste les match_id concernés : à nettoyer (garder la
-- convocation la plus récente, supprimer les autres) avant de relancer.
DO $$
DECLARE
  doublons TEXT;
BEGIN
  SELECT string_agg(match_id::text || ' (' || nb || ' lignes)', ', ')
  INTO doublons
  FROM (
    SELECT match_id, COUNT(*) AS nb
    FROM convocations
    WHERE match_id IS NOT NULL
    GROUP BY match_id
    HAVING COUNT(*) > 1
  ) d;

  IF doublons IS NOT NULL THEN
    RAISE EXCEPTION 'Doublons de match_id dans convocations, à nettoyer avant d''ajouter la contrainte UNIQUE : %', doublons;
  END IF;
END $$;

ALTER TABLE convocations DROP CONSTRAINT IF EXISTS convocations_match_id_unique;
ALTER TABLE convocations ADD CONSTRAINT convocations_match_id_unique UNIQUE (match_id);
