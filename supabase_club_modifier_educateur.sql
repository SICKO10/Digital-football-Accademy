-- POINT 1 — le club (auth.uid() = profiles.id du club) n'avait aucune policy
-- lui permettant de lire les entraînements de ses éducateurs affiliés (seule
-- une policy "parent" existe, cf. supabase_parents_lecture_matchs_entrainements_equipement.sql) —
-- c'est ce qui empêchait Planning.jsx (src/pages/Planning.jsx, requête sur
-- entrainements.educateur_id) de remonter quoi que ce soit pour un compte club.
DROP POLICY IF EXISTS "club_lit_entrainements_educateurs_affilies" ON entrainements;
CREATE POLICY "club_lit_entrainements_educateurs_affilies" ON entrainements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM club_educateurs ce
      WHERE ce.educateur_id = entrainements.educateur_id
      AND ce.club_id = auth.uid()
      AND ce.statut = 'accepte'
    )
  );

-- POINT 3 — le club peut modifier prénom/nom/téléphone d'un éducateur affilié
-- (bouton "Modifier" dans la liste "Éducateurs affiliés", DashboardClub.jsx).
-- RPC plutôt qu'un .update() direct : profiles n'autorise en écriture que le
-- titulaire du compte (id = auth.uid()), pas le club — la fonction vérifie
-- elle-même l'affiliation acceptée avant de toucher prenom/nom (profiles,
-- source affichée dans cette liste via le join club_educateurs.educateur_id)
-- et telephone (profil_educateur, ajouté par ailleurs — cf.
-- supabase_profil_educateur_telephone.sql). Ne touche pas
-- profil_educateur.prenom/nom (champ distinct, propre à "Mon profil" côté
-- éducateur, hors du périmètre de cette modale).
CREATE OR REPLACE FUNCTION club_modifier_educateur(p_educateur_id uuid, p_prenom text, p_nom text, p_telephone text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM club_educateurs
    WHERE club_id = auth.uid() AND educateur_id = p_educateur_id AND statut = 'accepte'
  ) THEN
    RAISE EXCEPTION 'Cet éducateur n''est pas affilié à ton club';
  END IF;

  UPDATE profiles SET prenom = p_prenom, nom = p_nom WHERE id = p_educateur_id;

  INSERT INTO profil_educateur (user_id, telephone)
  VALUES (p_educateur_id, p_telephone)
  ON CONFLICT (user_id) DO UPDATE SET telephone = excluded.telephone;
END;
$$;

GRANT EXECUTE ON FUNCTION club_modifier_educateur(uuid, text, text, text) TO authenticated;
