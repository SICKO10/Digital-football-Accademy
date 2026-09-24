-- Rendez-vous médicaux planifiables par le joueur (complète
-- supabase_sante_equipe.sql / supabase_sante_reeducation.sql) :
-- - suivi_medical servait jusqu'ici uniquement à consigner un compte-rendu
--   APRÈS une consultation passée (compte_rendu NOT NULL). On l'étend pour
--   représenter aussi un rdv à VENIR (compte_rendu rempli plus tard, une
--   fois le rdv passé) — même table, un statut distingue les deux états,
--   plutôt qu'une table séparée qui dupliquerait blessure_id/date/auteur.
-- - Le joueur peut désormais créer/gérer ses propres entrées (programmer un
--   rdv, remplir le compte-rendu après coup), en plus de l'éducateur.
-- - blessures.date_retour_estimee existait déjà (nullable = "inconnue" par
--   défaut) ; le joueur peut maintenant la renseigner lui-même — mais
--   seulement cette colonne (droit d'écriture au niveau colonne, pas un
--   accès UPDATE large sur blessures qui resterait piloté par l'éducateur
--   pour gravité/statut/etc.).

ALTER TABLE suivi_medical
  ALTER COLUMN compte_rendu DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS heure_rdv TIME,
  ADD COLUMN IF NOT EXISTS statut TEXT NOT NULL DEFAULT 'prevu' CHECK (statut IN ('prevu', 'effectue'));

-- Les lignes déjà existantes (créées avant ce patch) sont forcément des
-- comptes rendus déjà rédigés rétroactivement — jamais des rdv à venir.
UPDATE suivi_medical SET statut = 'effectue' WHERE statut = 'prevu' AND compte_rendu IS NOT NULL;

-- Le joueur gère ses propres entrées de suivi (programmer un rdv, marquer
-- fait + compte-rendu), uniquement sur une blessure qui le concerne via une
-- affiliation acceptée — même garde-fou que joueur_declare_blessure.
DROP POLICY IF EXISTS "joueur_gere_ses_rdv" ON suivi_medical;
CREATE POLICY "joueur_gere_ses_rdv" ON suivi_medical FOR ALL
  USING (
    auteur_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM blessures b JOIN affiliations a ON a.equipe_joueur_id = b.equipe_joueur_id
      WHERE b.id = suivi_medical.blessure_id AND a.joueur_id = auth.uid() AND a.statut = 'accepte'
    )
  )
  WITH CHECK (
    auteur_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM blessures b JOIN affiliations a ON a.equipe_joueur_id = b.equipe_joueur_id
      WHERE b.id = suivi_medical.blessure_id AND a.joueur_id = auth.uid() AND a.statut = 'accepte'
    )
  );

-- educateur_gere_suivi (supabase_sante_equipe.sql) ne couvrait que les
-- entrées dont l'éducateur est l'auteur — insuffisant maintenant qu'un
-- joueur peut créer les siennes : sans policy dédiée, l'éducateur ne
-- verrait jamais les rdv programmés par ses joueurs (alerte "Alertes &
-- infos" incluse). Lecture seule : l'éducateur ne modifie pas un rdv/compte-
-- rendu écrit par le joueur, comme l'inverse (joueur_gere_ses_rdv) ne touche
-- jamais une entrée écrite par l'éducateur.
DROP POLICY IF EXISTS "educateur_lit_tout_suivi" ON suivi_medical;
CREATE POLICY "educateur_lit_tout_suivi" ON suivi_medical FOR SELECT
  USING (EXISTS (SELECT 1 FROM blessures b WHERE b.id = suivi_medical.blessure_id AND b.educateur_id = auth.uid()));

-- date_retour_estimee : le joueur et l'éducateur partagent tous les deux le
-- même rôle Postgres "authenticated" (pas de rôle distinct par type de
-- compte côté Supabase) — un GRANT UPDATE(colonne) restreindrait donc AUSSI
-- l'éducateur, qui doit pouvoir modifier statut/gravité/etc. Une fonction
-- SECURITY DEFINER isole proprement les deux cas : le joueur ne peut
-- toucher que cette colonne, sur une blessure qui le concerne, sans qu'une
-- policy UPDATE générique sur la table ne soit nécessaire côté joueur.
CREATE OR REPLACE FUNCTION joueur_maj_date_retour(p_blessure_id UUID, p_date DATE)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE blessures SET date_retour_estimee = p_date, updated_at = now()
  WHERE id = p_blessure_id
    AND EXISTS (
      SELECT 1 FROM affiliations a
      WHERE a.equipe_joueur_id = blessures.equipe_joueur_id AND a.joueur_id = auth.uid() AND a.statut = 'accepte'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION joueur_maj_date_retour(UUID, DATE) TO authenticated;
