-- Table des disponibilités déclarées par les joueurs (entraînements + matchs)
CREATE TABLE IF NOT EXISTS disponibilites (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  joueur_id        UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  entrainement_id  UUID REFERENCES entrainements(id) ON DELETE CASCADE,
  match_id         UUID REFERENCES matchs_equipe(id) ON DELETE CASCADE,
  statut           TEXT CHECK (statut IN ('present', 'absent', 'blesse', 'malade', 'convoque')) NOT NULL,
  commentaire      TEXT DEFAULT '',
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(joueur_id, entrainement_id),
  UNIQUE(joueur_id, match_id)
);

-- RLS
ALTER TABLE disponibilites ENABLE ROW LEVEL SECURITY;

-- Le joueur voit et gère ses propres dispos
CREATE POLICY "joueur_own_dispos" ON disponibilites
  FOR ALL USING (auth.uid() = joueur_id) WITH CHECK (auth.uid() = joueur_id);

-- L'éducateur dont l'effectif (equipe_joueurs) contient ce joueur peut lire ses dispos
-- equipe_joueurs.joueur_id est renseigné à l'acceptation de l'invitation (cf. AcceptInvite.jsx)
CREATE POLICY "educateur_read_dispos" ON disponibilites
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM equipe_joueurs ej
      WHERE ej.joueur_id = disponibilites.joueur_id
      AND ej.educateur_id = auth.uid()
    )
  );
