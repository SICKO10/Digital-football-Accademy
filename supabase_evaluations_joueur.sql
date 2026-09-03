-- Remplace l'ancien système de notation (notes_joueurs : 1 ligne par joueur/
-- éducateur, 4 étoiles + commentaire) par une vraie fiche d'évaluation par
-- saison : 3 évaluations (début/mi-saison/fin de saison), 4 aspects avec
-- points forts + points à améliorer, objectifs, satisfactions, et pour la
-- fin de saison uniquement plaisir terrain + note globale.
-- notes_joueurs n'est pas supprimée (1 ligne existante) mais n'est plus lue
-- ni écrite par l'app à partir de ce changement.

CREATE TABLE evaluations_joueur (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipe_joueur_id UUID NOT NULL REFERENCES equipe_joueurs(id) ON DELETE CASCADE,
  educateur_id UUID NOT NULL,
  saison TEXT NOT NULL,
  periode TEXT NOT NULL CHECK (periode IN ('debut', 'mi_saison', 'fin_saison')),

  tactique_points_forts TEXT, tactique_a_ameliorer TEXT,
  technique_points_forts TEXT, technique_a_ameliorer TEXT,
  physique_points_forts TEXT, physique_a_ameliorer TEXT,
  mental_points_forts TEXT, mental_a_ameliorer TEXT,

  objectif_personnel TEXT,
  objectif_collectif TEXT,
  satisfaction_staff SMALLINT CHECK (satisfaction_staff BETWEEN 1 AND 5),
  satisfaction_equipe SMALLINT CHECK (satisfaction_equipe BETWEEN 1 AND 5),
  plaisir_terrain SMALLINT CHECK (plaisir_terrain BETWEEN 1 AND 5), -- fin_saison uniquement (UI)
  note_globale_saison NUMERIC(4,1) CHECK (note_globale_saison BETWEEN 0 AND 20), -- fin_saison uniquement (UI)

  visible_joueur BOOLEAN NOT NULL DEFAULT false,
  autorise_prefill_joueur BOOLEAN NOT NULL DEFAULT false,
  verrouillee_joueur BOOLEAN NOT NULL DEFAULT false, -- true dès le premier enregistrement éducateur

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(equipe_joueur_id, educateur_id, saison, periode)
);

ALTER TABLE evaluations_joueur ENABLE ROW LEVEL SECURITY;
GRANT ALL ON evaluations_joueur TO authenticated;

-- Éducateur propriétaire : CRUD complet.
CREATE POLICY "educateur_gere_evaluations" ON evaluations_joueur FOR ALL
  USING (auth.uid() = educateur_id)
  WITH CHECK (auth.uid() = educateur_id);

-- Club (et staff_club) affilié à cet éducateur : lecture, miroir "club peut
-- voir notes de ses educateurs affilies" sur notes_joueurs.
CREATE POLICY "club_lit_evaluations" ON evaluations_joueur FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM club_educateurs
    WHERE club_educateurs.educateur_id = evaluations_joueur.educateur_id
      AND club_educateurs.statut = 'accepte'
      AND (club_educateurs.club_id = auth.uid() OR EXISTS (
        SELECT 1 FROM staff_club WHERE staff_club.club_id = club_educateurs.club_id AND staff_club.user_id = auth.uid()
      ))
  ));

-- Dirigeant délégué avec permission 'notes' : miroir dirigeant_lit_notes_joueurs.
CREATE POLICY "dirigeant_lit_evaluations" ON evaluations_joueur FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM dirigeant_acces
    WHERE dirigeant_acces.dirigeant_id = auth.uid() AND dirigeant_acces.educateur_id = evaluations_joueur.educateur_id
      AND dirigeant_acces.statut = 'accepte' AND (dirigeant_acces.permissions->>'notes') = ANY (ARRAY['lecture', 'edition'])
  ));

-- Joueur affilié à cette ligne d'effectif (via affiliations, même canal que
-- notes_joueurs) : lecture si visible OU si le pré-remplissage est autorisé
-- (il doit voir le brouillon pour pouvoir le compléter), écriture uniquement
-- si autorisé ET pas encore verrouillée par l'éducateur.
CREATE POLICY "joueur_lit_evaluations" ON evaluations_joueur FOR SELECT
  USING (
    (visible_joueur = true OR autorise_prefill_joueur = true)
    AND EXISTS (
      SELECT 1 FROM affiliations
      WHERE affiliations.joueur_id = auth.uid() AND affiliations.statut = 'accepte'
        AND affiliations.equipe_joueur_id = evaluations_joueur.equipe_joueur_id
    )
  );

CREATE POLICY "joueur_prerempli_evaluations" ON evaluations_joueur FOR UPDATE
  USING (
    autorise_prefill_joueur = true AND verrouillee_joueur = false
    AND EXISTS (
      SELECT 1 FROM affiliations
      WHERE affiliations.joueur_id = auth.uid() AND affiliations.statut = 'accepte'
        AND affiliations.equipe_joueur_id = evaluations_joueur.equipe_joueur_id
    )
  )
  WITH CHECK (
    autorise_prefill_joueur = true AND verrouillee_joueur = false
    AND EXISTS (
      SELECT 1 FROM affiliations
      WHERE affiliations.joueur_id = auth.uid() AND affiliations.statut = 'accepte'
        AND affiliations.equipe_joueur_id = evaluations_joueur.equipe_joueur_id
    )
  );

-- Parent accepté du joueur : lecture, correctement jointe via affiliations
-- (contrairement à la policy équivalente sur notes_joueurs, qui appelle
-- est_parent_accepte_de(joueur_id) en lui passant un equipe_joueur_id au
-- lieu d'un vrai compte joueur — comparaison qui ne matche jamais).
CREATE POLICY "parent_lit_evaluations" ON evaluations_joueur FOR SELECT
  USING (
    visible_joueur = true
    AND EXISTS (
      SELECT 1 FROM affiliations
      WHERE affiliations.statut = 'accepte' AND est_parent_accepte_de(affiliations.joueur_id)
        AND affiliations.equipe_joueur_id = evaluations_joueur.equipe_joueur_id
    )
  );
