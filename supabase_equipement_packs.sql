-- Packs équipement : regroupements nommés/configurables de champs de taille
-- existants (pas une re-création de champs — ça, ce sont déjà les boutons
-- "Pack Joueur"/"Pack Éducateur" ajoutés précédemment). Un pack référence
-- des champ_id déjà créés, pour les organiser/étiqueter visuellement.
--
-- Corrections par rapport au cahier des charges d'origine, mêmes raisons que
-- pour le reste de l'Inventaire (cf. supabase_inventaire.sql) :
-- - club_id UUID REFERENCES profiles(id), pas "club TEXT".
-- - RLS via a_permission_inventaire() (déjà créée par supabase_inventaire.sql),
--   pas "EXISTS (SELECT 1 FROM profil_educateur ...)" qui exclurait le compte
--   club lui-même (aucune ligne profil_educateur pour un compte club).
CREATE TABLE IF NOT EXISTS equipement_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  cible TEXT NOT NULL DEFAULT 'joueur', -- étiquette libre (joueur/educateur/les deux/dirigeant/...), pas une contrainte fonctionnelle ici
  champs_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  couleur TEXT NOT NULL DEFAULT '#4ade80',
  icone TEXT NOT NULL DEFAULT '👕',
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE equipement_packs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventaire_lecture_packs" ON equipement_packs;
CREATE POLICY "inventaire_lecture_packs" ON equipement_packs FOR SELECT USING (a_permission_inventaire(club_id, false));
DROP POLICY IF EXISTS "inventaire_ecriture_packs" ON equipement_packs;
CREATE POLICY "inventaire_ecriture_packs" ON equipement_packs FOR ALL USING (a_permission_inventaire(club_id, true)) WITH CHECK (a_permission_inventaire(club_id, true));

GRANT SELECT, INSERT, UPDATE, DELETE ON equipement_packs TO authenticated;
