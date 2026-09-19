-- Note de séance par les joueurs : l'éducateur demande un retour rapide
-- (charge de travail, plaisir, mots-clés) après un entraînement, consultable
-- ensuite dans Stats Équipe → onglet Séances.
CREATE TABLE IF NOT EXISTS seances_notes_demandes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entrainement_id UUID NOT NULL REFERENCES entrainements(id) ON DELETE CASCADE,
  educateur_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  club_categorie_id UUID,
  titre TEXT NOT NULL,
  date_seance DATE NOT NULL,
  statut TEXT NOT NULL DEFAULT 'ouverte' CHECK (statut IN ('ouverte', 'fermee')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (entrainement_id)
);

CREATE TABLE IF NOT EXISTS seances_notes_joueurs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demande_id UUID NOT NULL REFERENCES seances_notes_demandes(id) ON DELETE CASCADE,
  joueur_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  charge_travail INT NOT NULL CHECK (charge_travail BETWEEN 1 AND 5),
  notion_plaisir INT NOT NULL CHECK (notion_plaisir BETWEEN 1 AND 5),
  mots_cles TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (demande_id, joueur_id)
);

CREATE INDEX IF NOT EXISTS idx_seances_notes_demandes_educateur ON seances_notes_demandes(educateur_id);
CREATE INDEX IF NOT EXISTS idx_seances_notes_joueurs_demande ON seances_notes_joueurs(demande_id);

ALTER TABLE seances_notes_demandes ENABLE ROW LEVEL SECURITY;
ALTER TABLE seances_notes_joueurs ENABLE ROW LEVEL SECURITY;

-- Éducateur propriétaire : CRUD complet sur ses propres demandes.
CREATE POLICY "educateur_gere_demandes" ON seances_notes_demandes FOR ALL
  USING (auth.uid() = educateur_id) WITH CHECK (auth.uid() = educateur_id);

-- Joueur affilié (accepté) à cet éducateur : lecture des demandes.
CREATE POLICY "joueur_lit_demandes" ON seances_notes_demandes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM affiliations
    WHERE affiliations.joueur_id = auth.uid() AND affiliations.statut = 'accepte'
      AND affiliations.educateur_id = seances_notes_demandes.educateur_id
  )
);

-- Réponses : l'éducateur propriétaire de la demande voit tout ; chaque
-- joueur ne voit que sa propre réponse (pas celle des autres).
CREATE POLICY "educateur_lit_reponses" ON seances_notes_joueurs FOR SELECT USING (
  EXISTS (SELECT 1 FROM seances_notes_demandes d WHERE d.id = demande_id AND d.educateur_id = auth.uid())
);
CREATE POLICY "joueur_lit_sa_reponse" ON seances_notes_joueurs FOR SELECT USING (joueur_id = auth.uid());

-- Un joueur ne peut répondre qu'à une demande ouverte de son éducateur
-- affilié, et seulement en son propre nom.
CREATE POLICY "joueur_ecrit_sa_reponse" ON seances_notes_joueurs FOR INSERT WITH CHECK (
  joueur_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM seances_notes_demandes d
    JOIN affiliations a ON a.educateur_id = d.educateur_id
    WHERE d.id = demande_id AND d.statut = 'ouverte'
      AND a.joueur_id = auth.uid() AND a.statut = 'accepte'
  )
);
