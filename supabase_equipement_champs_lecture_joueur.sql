-- Une personne (joueur/éducateur) à qui un pack a été attribué doit pouvoir
-- lire les champs de taille qui composent ce pack — la policy existante ne
-- couvrait que le club/staff (a_permission_inventaire), pas la personne
-- concernée par l'attribution, même lacune que celle déjà corrigée sur
-- equipement_packs (cf. supabase_equipement_packs_lecture_joueur.sql).
DROP POLICY IF EXISTS "inventaire_lecture_champs" ON equipement_champs;
CREATE POLICY "inventaire_lecture_champs" ON equipement_champs
  FOR SELECT USING (
    a_permission_inventaire(club_id, false)
    OR EXISTS (
      SELECT 1 FROM equipement_attributions ea
      JOIN equipement_packs p ON p.id = ea.pack_id
      WHERE ea.user_id = auth.uid() AND equipement_champs.id = ANY(p.champs_ids)
    )
  );
