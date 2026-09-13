-- Préparation tactique — restreint le partage "visible aux joueurs" à la
-- catégorie/équipe active au moment où l'éducateur active le partage, pas à
-- tous ses joueurs toutes catégories confondues (un même compte éducateur
-- peut gérer plusieurs équipes, ex: U18 et U11).
-- categorie_id référence club_categories(id) — NULL = comportement hérité
-- (visible à tous les joueurs affiliés à cet éducateur, comme avant cette
-- migration), non-NULL = restreint aux joueurs de cette équipe précise via
-- affiliations.equipe_joueur_id -> equipe_joueurs.club_categorie_id.

ALTER TABLE tactipads ADD COLUMN IF NOT EXISTS categorie_id UUID REFERENCES club_categories(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "joueurs_lecture_tactipads_partages" ON tactipads;
CREATE POLICY "joueurs_lecture_tactipads_partages" ON tactipads FOR SELECT USING (
  visible_joueurs = true
  AND EXISTS (
    SELECT 1 FROM affiliations a
    LEFT JOIN equipe_joueurs ej ON ej.id = a.equipe_joueur_id
    WHERE a.educateur_id = tactipads.educateur_id
    AND a.joueur_id = auth.uid()
    AND a.statut = 'accepte'
    AND (tactipads.categorie_id IS NULL OR ej.club_categorie_id = tactipads.categorie_id)
  )
);
