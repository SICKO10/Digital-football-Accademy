-- Attribution d'un pack équipement à une personne (joueur ou staff) — vue
-- club rapide ("qui a quel pack"), distincte des tailles individuelles
-- déclarées par chacun (equipement_tailles, inchangée, toujours éditable
-- depuis le dashboard joueur/éducateur).
--
-- Corrections par rapport au cahier des charges d'origine, mêmes raisons que
-- le reste de l'Inventaire :
-- - club_id UUID REFERENCES profiles(id), pas "club TEXT".
-- - user_id (pas "joueur_id") : la colonne doit accepter aussi bien un
--   joueur qu'un membre du staff, les packs pouvant cibler l'un ou l'autre.
-- - RLS via a_permission_inventaire() (déjà créée par supabase_inventaire.sql),
--   pas "EXISTS (SELECT 1 FROM profil_educateur ...)" qui exclurait le compte
--   club lui-même.
CREATE TABLE IF NOT EXISTS equipement_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pack_id UUID REFERENCES equipement_packs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (club_id, user_id)
);

ALTER TABLE equipement_attributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventaire_lecture_attributions" ON equipement_attributions;
CREATE POLICY "inventaire_lecture_attributions" ON equipement_attributions
  FOR SELECT USING (a_permission_inventaire(club_id, false) OR user_id = auth.uid());
DROP POLICY IF EXISTS "inventaire_ecriture_attributions" ON equipement_attributions;
CREATE POLICY "inventaire_ecriture_attributions" ON equipement_attributions
  FOR ALL USING (a_permission_inventaire(club_id, true)) WITH CHECK (a_permission_inventaire(club_id, true));

GRANT SELECT, INSERT, UPDATE, DELETE ON equipement_attributions TO authenticated;
