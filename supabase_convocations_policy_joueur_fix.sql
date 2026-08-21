-- "Joueur voit sa convocation" s'appuyait sur convocations.joueurs_convoques
-- (colonne texte), jamais alimentée par publierConvocation (qui remplit
-- convocation_joueurs, une vraie table de liaison, à la place) — cette
-- policy ne laissait donc jamais aucun joueur lire sa propre convocation,
-- depuis toujours. convocation_joueurs est déjà librement lisible
-- ("lecture convocation joueurs", qual=true), donc seule cette étape
-- (lire la ligne convocations elle-même) était bloquée.
DROP POLICY IF EXISTS "Joueur voit sa convocation" ON convocations;
CREATE POLICY "Joueur voit sa convocation" ON convocations
  FOR SELECT USING (
    publiee = true
    AND EXISTS (
      SELECT 1 FROM convocation_joueurs cj
      WHERE cj.convocation_id = convocations.id
        AND cj.joueur_id = auth.uid()
    )
  );
