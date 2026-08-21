-- Bug : le bouton "J'ai récupéré" (joueur ET éducateur) insère bien une ligne
-- dans equipement_recuperations (policy destinataire_id = auth.uid() déjà OK,
-- cf. supabase_equipement_historique_recuperation.sql) mais l'UPDATE de
-- equipement_commandes (statut -> 'recupere') est silencieusement bloqué par
-- RLS : la seule policy d'écriture (inventaire_ecriture_commandes) n'autorise
-- que le club/staff via a_permission_inventaire, pas le destinataire lui-même.
-- Au refresh, statut est toujours 'pret' en base -> impression que le clic
-- "n'a pas été détecté".
DROP POLICY IF EXISTS "destinataire_valide_recuperation_commande" ON equipement_commandes;
CREATE POLICY "destinataire_valide_recuperation_commande" ON equipement_commandes
  FOR UPDATE USING (destinataire_id = auth.uid())
  WITH CHECK (destinataire_id = auth.uid());
