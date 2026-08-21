-- Complément à supabase_parents_lecture_donnees_joueur.sql : cette première
-- migration couvrait les tables où joueur_id/user_id est une colonne directe
-- de la ligne (via est_parent_accepte_de(colonne)). Elle manquait les tables
-- "d'équipe" dont la policy joueur existante passe par
-- `educateur_id IN (SELECT ... WHERE affiliations.joueur_id = auth.uid())`
-- — auth.uid() y est celui du PARENT connecté, jamais celui de l'enfant,
-- donc jamais vrai pour un parent quel que soit son accès. D'où les
-- sections "Compétition"/"Entraînements" restées vides après la première
-- migration (equipement_champs/equipement_packs ont le même souci via
-- ea.user_id = auth.uid()).

DROP POLICY IF EXISTS "parent_lit_matchs_equipe_enfant" ON matchs_equipe;
CREATE POLICY "parent_lit_matchs_equipe_enfant" ON matchs_equipe
  FOR SELECT USING (
    educateur_id IN (
      SELECT affiliations.educateur_id FROM affiliations
      WHERE affiliations.statut = 'accepte' AND est_parent_accepte_de(affiliations.joueur_id)
    )
  );

DROP POLICY IF EXISTS "parent_lit_entrainements_enfant" ON entrainements;
CREATE POLICY "parent_lit_entrainements_enfant" ON entrainements
  FOR SELECT USING (
    educateur_id IN (
      SELECT affiliations.educateur_id FROM affiliations
      WHERE affiliations.statut = 'accepte' AND est_parent_accepte_de(affiliations.joueur_id)
    )
  );

DROP POLICY IF EXISTS "parent_lit_champs_equipement_enfant" ON equipement_champs;
CREATE POLICY "parent_lit_champs_equipement_enfant" ON equipement_champs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM equipement_attributions ea
      JOIN equipement_packs p ON p.id = ea.pack_id
      WHERE est_parent_accepte_de(ea.user_id) AND equipement_champs.id = ANY (p.champs_ids)
    )
  );

DROP POLICY IF EXISTS "parent_lit_packs_equipement_enfant" ON equipement_packs;
CREATE POLICY "parent_lit_packs_equipement_enfant" ON equipement_packs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM equipement_attributions ea
      WHERE ea.pack_id = equipement_packs.id AND est_parent_accepte_de(ea.user_id)
    )
  );
