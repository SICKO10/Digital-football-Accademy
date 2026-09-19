-- Ouvre la lecture de joueur_badges aux recruteurs (DashboardRecruteur.jsx)
-- — la policy self-only de la Phase F (joueur_badges_select_self,
-- supabase_joueur_badges.sql) ne permettait qu'au joueur concerné de voir
-- ses propres badges. Élargie à tout utilisateur connecté (même pattern que
-- lecture_authentifie_demande_club), pas un accès anonyme complet comme
-- proposé initialement — un badge n'a d'intérêt affiché que dans l'app, pas
-- besoin de l'exposer au public non connecté.
--
-- L'écriture reste strictement scopée à joueur_id = auth.uid()
-- (joueur_badges_insert_self, inchangée) : élargir aussi l'écriture comme
-- proposé initialement (WITH CHECK (auth.uid() IS NOT NULL)) aurait permis
-- à n'importe quel compte connecté de forger un badge pour n'importe quel
-- autre joueur — pas touché ici.
DROP POLICY IF EXISTS "joueur_badges_select_self" ON joueur_badges;
CREATE POLICY "joueur_badges_select_authenticated" ON joueur_badges
  FOR SELECT USING (auth.role() = 'authenticated');
