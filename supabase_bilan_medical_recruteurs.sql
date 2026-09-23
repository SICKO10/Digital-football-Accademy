-- Historique médical visible côté recrutement (Mon Réseau > Moteur de
-- Recrutement, éducateur/club — même fonctionnalité "pas encore lancée
-- publiquement" que profil_recrutement.visible_recruteurs, gatée sur le
-- compte de test en attendant le lancement du dashboard scout).
--
-- Principe : jamais de donnée médicale brute (notes, comptes rendus,
-- documents de suivi_medical) exposée à un recruteur, quel que soit le
-- consentement. Deux niveaux, chacun avec son propre opt-in explicite :
--
-- 1. RÉSUMÉ (bilan_medical_resume) — agrégats uniquement (nombre de
--    blessures, jours d'indisponibilité cumulés, répartition par gravité)
--    sur la saison en cours, visible si le joueur active
--    partage_bilan_medical. Aucun détail individuel.
-- 2. DÉTAIL (bilan_medical_detail) — liste des blessures (type, zone,
--    gravité, dates, statut — jamais les notes ni les documents), visible
--    uniquement si le joueur a explicitement accepté UNE demande précise
--    d'UN recruteur précis (table demandes_bilan_medical). Le joueur garde
--    la main : il voit qui demande, peut refuser, et peut révoquer
--    partage_bilan_medical à tout moment (coupe le résumé ET l'accès aux
--    demandes déjà acceptées, revérifié à chaque appel).
--
-- Les deux fonctions sont SECURITY DEFINER : le recruteur n'a jamais de
-- droit de lecture direct sur la table blessures (aucune policy ajoutée
-- dessus), seul le résultat agrégé/filtré des fonctions lui est accessible.

ALTER TABLE profil_recrutement
  ADD COLUMN IF NOT EXISTS partage_bilan_medical BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS demandes_bilan_medical (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruteur_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joueur_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT,
  statut TEXT NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'acceptee', 'refusee')),
  reponse_joueur TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  repondu_at TIMESTAMPTZ,
  UNIQUE (recruteur_id, joueur_id)
);

ALTER TABLE demandes_bilan_medical ENABLE ROW LEVEL SECURITY;
GRANT ALL ON demandes_bilan_medical TO authenticated;

-- Le recruteur crée sa demande et suit son statut — jamais de lecture des
-- demandes des autres recruteurs pour le même joueur.
DROP POLICY IF EXISTS "recruteur_cree_demande_bilan" ON demandes_bilan_medical;
CREATE POLICY "recruteur_cree_demande_bilan" ON demandes_bilan_medical FOR INSERT
  WITH CHECK (
    auth.uid() = recruteur_id
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.plan IN ('educateur', 'club'))
  );

DROP POLICY IF EXISTS "recruteur_lit_ses_demandes" ON demandes_bilan_medical;
CREATE POLICY "recruteur_lit_ses_demandes" ON demandes_bilan_medical FOR SELECT
  USING (auth.uid() = recruteur_id);

-- Le joueur voit les demandes qui le concernent et peut seulement y
-- répondre (statut/reponse_joueur) — jamais modifier qui la lui a envoyée.
DROP POLICY IF EXISTS "joueur_lit_demandes_le_concernant" ON demandes_bilan_medical;
CREATE POLICY "joueur_lit_demandes_le_concernant" ON demandes_bilan_medical FOR SELECT
  USING (auth.uid() = joueur_id);

DROP POLICY IF EXISTS "joueur_repond_a_la_demande" ON demandes_bilan_medical;
CREATE POLICY "joueur_repond_a_la_demande" ON demandes_bilan_medical FOR UPDATE
  USING (auth.uid() = joueur_id) WITH CHECK (auth.uid() = joueur_id);

-- Un WITH CHECK ne compare pas l'ancienne et la nouvelle ligne : sans ça,
-- le joueur pourrait réassigner sa réponse à un autre recruteur_id en même
-- temps qu'il répond. Restriction au niveau colonne : il ne peut modifier
-- que sa réponse, jamais qui a fait la demande ni pour quel joueur.
REVOKE UPDATE ON demandes_bilan_medical FROM authenticated;
GRANT UPDATE (statut, reponse_joueur, repondu_at) ON demandes_bilan_medical TO authenticated;

-- ── Résumé agrégé (saison en cours) ─────────────────────────────────────
CREATE OR REPLACE FUNCTION bilan_medical_resume(p_joueur_id UUID, p_saison TEXT)
RETURNS TABLE (nb_blessures INT, jours_indisponibilite INT, nb_graves INT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND plan IN ('educateur', 'club')) THEN
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM profil_recrutement WHERE joueur_id = p_joueur_id AND partage_bilan_medical = true) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*)::INT,
    COALESCE(SUM(GREATEST(COALESCE(b.date_retour_effective, CURRENT_DATE) - b.date_debut, 0)), 0)::INT,
    COUNT(*) FILTER (WHERE b.gravite = 'grave')::INT
  FROM blessures b
  JOIN equipe_joueurs ej ON ej.id = b.equipe_joueur_id
  WHERE ej.joueur_id = p_joueur_id AND b.saison = p_saison;
END;
$$;

-- ── Détail (uniquement si demande acceptée par le joueur) ───────────────
CREATE OR REPLACE FUNCTION bilan_medical_detail(p_joueur_id UUID)
RETURNS TABLE (type_blessure TEXT, zone_corps TEXT, gravite TEXT, date_debut DATE, date_retour_effective DATE, statut TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM demandes_bilan_medical
    WHERE recruteur_id = auth.uid() AND joueur_id = p_joueur_id AND statut = 'acceptee'
  ) THEN
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM profil_recrutement WHERE joueur_id = p_joueur_id AND partage_bilan_medical = true) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT b.type_blessure, b.zone_corps, b.gravite, b.date_debut, b.date_retour_effective, b.statut
  FROM blessures b
  JOIN equipe_joueurs ej ON ej.id = b.equipe_joueur_id
  WHERE ej.joueur_id = p_joueur_id
  ORDER BY b.date_debut DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION bilan_medical_resume(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION bilan_medical_detail(UUID) TO authenticated;
