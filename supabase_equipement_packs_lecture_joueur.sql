-- Une personne (joueur ou staff) à qui un pack a été attribué doit pouvoir
-- lire ce pack (nom, icône, champs_ids) pour afficher "Mon équipement" —
-- la policy existante ne couvrait que le club/staff (a_permission_inventaire),
-- pas la personne concernée par l'attribution elle-même.
DROP POLICY IF EXISTS "inventaire_lecture_packs" ON equipement_packs;
CREATE POLICY "inventaire_lecture_packs" ON equipement_packs
  FOR SELECT USING (
    a_permission_inventaire(club_id, false)
    OR EXISTS (SELECT 1 FROM equipement_attributions ea WHERE ea.pack_id = equipement_packs.id AND ea.user_id = auth.uid())
  );
