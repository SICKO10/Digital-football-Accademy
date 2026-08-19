-- Catalogue matériel éditable par club (articles personnalisés en plus du
-- catalogue global pré-rempli) + regroupement des distributions multi-articles
-- (panier) en un seul "lot".
--
-- Corrections par rapport au cahier des charges d'origine, mêmes raisons que
-- le reste de l'Inventaire (cf. supabase_inventaire.sql) :
-- - club_id UUID REFERENCES profiles(id), pas "club TEXT".
-- - materiel_distribution n'a pas de colonne "items" JSONB ni "equipe" — le
--   schéma réel stocke déjà un article par ligne (catalogue_id, nom_materiel,
--   categorie, quantite, equipe_nom). Un panier multi-articles devient donc un
--   insert groupé de plusieurs lignes partageant un même lot_id, pas une
--   nouvelle structure de données à réinterpréter partout ailleurs (validation/
--   refus de remise, affichage éducateur... tout ça continue de fonctionner
--   ligne par ligne sans changement).

ALTER TABLE materiel_catalogue ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE materiel_catalogue ADD COLUMN IF NOT EXISTS actif BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS idx_materiel_catalogue_club_id ON materiel_catalogue(club_id);

ALTER TABLE materiel_distribution ADD COLUMN IF NOT EXISTS lot_id UUID;

-- Un club ne doit voir/modifier que le catalogue global (club_id NULL) en
-- lecture seule, plus ses propres articles personnalisés en écriture.
DROP POLICY IF EXISTS "catalogue_lecture_tous" ON materiel_catalogue;
DROP POLICY IF EXISTS "inventaire_lecture_catalogue" ON materiel_catalogue;
CREATE POLICY "inventaire_lecture_catalogue" ON materiel_catalogue
  FOR SELECT USING (club_id IS NULL OR a_permission_inventaire(club_id, false));

DROP POLICY IF EXISTS "inventaire_ecriture_catalogue_club" ON materiel_catalogue;
CREATE POLICY "inventaire_ecriture_catalogue_club" ON materiel_catalogue
  FOR ALL USING (club_id IS NOT NULL AND a_permission_inventaire(club_id, true))
  WITH CHECK (club_id IS NOT NULL AND a_permission_inventaire(club_id, true));
