-- Préparation tactique — partage d'un schéma Tactipad aux joueurs affiliés de
-- l'éducateur (dashboard joueur), distinct du partage public existant
-- (tactipads.partage / partage_slug, lien anonyme sans authentification).
-- visible_joueurs est un partage interne : seuls les joueurs ayant une
-- affiliation acceptée avec cet éducateur (table affiliations) peuvent lire
-- le schéma, une fois le flag activé.

ALTER TABLE tactipads ADD COLUMN IF NOT EXISTS visible_joueurs BOOLEAN NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "joueurs_lecture_tactipads_partages" ON tactipads;
CREATE POLICY "joueurs_lecture_tactipads_partages" ON tactipads FOR SELECT USING (
  visible_joueurs = true
  AND EXISTS (
    SELECT 1 FROM affiliations a
    WHERE a.educateur_id = tactipads.educateur_id
    AND a.joueur_id = auth.uid()
    AND a.statut = 'accepte'
  )
);
