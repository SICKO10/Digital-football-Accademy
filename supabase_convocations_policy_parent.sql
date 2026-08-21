-- Même besoin que pour le joueur : un parent consultant via DashboardParent.jsx
-- (joueurIdOverride) a sa PROPRE session (auth.uid() = son id à lui, pas
-- celui de l'enfant) — la policy joueur seule ne suffit pas pour lui.
DROP POLICY IF EXISTS "Parent voit convocation enfant" ON convocations;
CREATE POLICY "Parent voit convocation enfant" ON convocations
  FOR SELECT USING (
    publiee = true
    AND EXISTS (
      SELECT 1 FROM convocation_joueurs cj
      WHERE cj.convocation_id = convocations.id
        AND est_parent_accepte_de(cj.joueur_id)
    )
  );
