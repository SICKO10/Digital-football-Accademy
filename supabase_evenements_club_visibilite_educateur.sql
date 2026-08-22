-- Visibilité par rôle sur un événement/projet club (case à cocher côté club,
-- consommée par AlertesPanel.jsx côté éducateur).
ALTER TABLE evenements_club
  ADD COLUMN IF NOT EXISTS visible_educateurs BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS visible_joueurs BOOLEAN NOT NULL DEFAULT false;

-- Colonnes déjà écrites par le formulaire "Événements & Projets" de
-- DashboardClub.jsx (evenementForm.description/participants/referents/
-- ressources_materielles/missions) mais absentes de la table réelle — chaque
-- sauvegarde échouait avec "column does not exist". Trouvé en vérifiant le
-- schéma avant d'ajouter les colonnes de visibilité, corrigé dans la foulée
-- plutôt que laissé cassé.
ALTER TABLE evenements_club
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS participants JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS referents JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS ressources_materielles JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS missions JSONB NOT NULL DEFAULT '[]';

-- evenements_club n'était lisible que par le club lui-même (club_id = auth.uid())
-- ou son staff_club — un éducateur affilié via club_educateurs (rôle distinct)
-- n'avait aucun accès, même en lecture : AlertesPanel y aurait toujours vu 0
-- ligne quel que soit visible_educateurs.
DROP POLICY IF EXISTS "educateur_lit_evenements_visibles" ON evenements_club;
CREATE POLICY "educateur_lit_evenements_visibles" ON evenements_club
  FOR SELECT USING (
    visible_educateurs = true
    AND EXISTS (
      SELECT 1 FROM club_educateurs ce
      WHERE ce.club_id = evenements_club.club_id AND ce.educateur_id = auth.uid() AND ce.statut = 'accepte'
    )
  );
