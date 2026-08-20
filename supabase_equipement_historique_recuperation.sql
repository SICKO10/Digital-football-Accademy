-- Historique des validations "J'ai récupéré" (équipement) — equipement_commandes
-- est upserted par personne (onConflict club_id+destinataire_id) : une nouvelle
-- préparation écrase la précédente, impossible d'y garder un historique des
-- remises passées. Table séparée, insert-only, une ligne par clic sur
-- "J'ai récupéré" (éducateur ou joueur) — cf. DashboardEducateur.jsx
-- marquerEquipementRecupereEduc / DashboardJoueur.jsx marquerEquipementRecupere.
CREATE TABLE IF NOT EXISTS equipement_recuperations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  destinataire_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  destinataire_nom TEXT,
  valide_le TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE equipement_recuperations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "club_lit_son_historique_equipement" ON equipement_recuperations;
CREATE POLICY "club_lit_son_historique_equipement" ON equipement_recuperations
  FOR SELECT USING (
    club_id = auth.uid()
    OR EXISTS (SELECT 1 FROM staff_club sc WHERE sc.club_id = equipement_recuperations.club_id AND sc.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "destinataire_cree_sa_validation_equipement" ON equipement_recuperations;
CREATE POLICY "destinataire_cree_sa_validation_equipement" ON equipement_recuperations
  FOR INSERT WITH CHECK (destinataire_id = auth.uid());

GRANT SELECT, INSERT ON equipement_recuperations TO authenticated;

-- Date/heure de la dernière validation sur la commande courante — affichage
-- rapide du statut FAIT sans jointure vers equipement_recuperations.
ALTER TABLE equipement_commandes ADD COLUMN IF NOT EXISTS recupere_le TIMESTAMPTZ;
