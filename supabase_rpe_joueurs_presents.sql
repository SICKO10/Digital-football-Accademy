-- Ressenti RPE : la demande ne vise plus que les joueurs présents à la séance.
-- joueurs_cibles = profils des joueurs présents au moment de l'envoi.
-- NULL = anciennes demandes, envoyées à tous les affiliés : elles restent
-- visibles comme avant.

ALTER TABLE seances_notes_demandes ADD COLUMN IF NOT EXISTS joueurs_cibles UUID[];

DROP POLICY IF EXISTS "joueur_lit_demandes" ON seances_notes_demandes;
CREATE POLICY "joueur_lit_demandes" ON seances_notes_demandes FOR SELECT USING (
  (joueurs_cibles IS NULL OR auth.uid() = ANY (joueurs_cibles))
  AND EXISTS (
    SELECT 1 FROM affiliations
    WHERE affiliations.joueur_id = auth.uid() AND affiliations.statut = 'accepte'
      AND affiliations.educateur_id = seances_notes_demandes.educateur_id
  )
);

DROP POLICY IF EXISTS "joueur_ecrit_sa_reponse" ON seances_notes_joueurs;
CREATE POLICY "joueur_ecrit_sa_reponse" ON seances_notes_joueurs FOR INSERT WITH CHECK (
  joueur_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM seances_notes_demandes d
    JOIN affiliations a ON a.educateur_id = d.educateur_id
    WHERE d.id = demande_id AND d.statut = 'ouverte'
      AND (d.joueurs_cibles IS NULL OR auth.uid() = ANY (d.joueurs_cibles))
      AND a.joueur_id = auth.uid() AND a.statut = 'accepte'
  )
);
