-- Bug : le premier enregistrement d'une fiche d'évaluation par le JOUEUR
-- échouait systématiquement ("Échec de l'enregistrement — vérifie ta
-- connexion et réessaie"). Cause : FicheEvaluationJoueur.jsx utilise
-- .upsert() (INSERT ... ON CONFLICT DO UPDATE), et evaluations_joueur
-- n'avait qu'une policy FOR UPDATE pour le joueur (joueur_prerempli_evaluations,
-- cf. supabase_evaluations_joueur.sql) — aucune policy FOR INSERT. Postgres
-- exige que le WITH CHECK d'une policy INSERT passe pour la ligne candidate
-- AVANT même d'évaluer un éventuel conflit/UPDATE, donc tout upsert() côté
-- joueur était rejeté par RLS, que la ligne existe déjà ou non.
-- Même condition que joueur_prerempli_evaluations, en miroir pour l'INSERT.

CREATE POLICY "joueur_insere_evaluations" ON evaluations_joueur FOR INSERT
  WITH CHECK (
    autorise_prefill_joueur = true AND verrouillee_joueur = false
    AND EXISTS (
      SELECT 1 FROM affiliations
      WHERE affiliations.joueur_id = auth.uid() AND affiliations.statut = 'accepte'
        AND affiliations.equipe_joueur_id = evaluations_joueur.equipe_joueur_id
    )
  );
