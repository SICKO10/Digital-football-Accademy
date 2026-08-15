-- Notation d'un match par l'éducateur : une note/commentaire par joueur
-- (joueur_id = equipe_joueurs.id, PAS auth.users.id — les stats existantes
-- comme stats_match/presences_entrainement identifient déjà les joueurs par
-- leur ligne d'effectif, pas par leur compte, car un joueur peut ne pas
-- encore avoir de compte lié) + une note collective (joueur_id NULL).
CREATE TABLE IF NOT EXISTS notations_match (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES matchs_equipe(id) ON DELETE CASCADE,
  educateur_id UUID NOT NULL REFERENCES auth.users(id),
  joueur_id UUID REFERENCES equipe_joueurs(id) ON DELETE CASCADE,  -- NULL = note équipe
  note NUMERIC(3,1) CHECK (note >= 0 AND note <= 10),
  commentaire TEXT DEFAULT '',
  criteres JSONB DEFAULT '{}',
  -- ex: { "technique": 7, "physique": 8, "mental": 6, "tactique": 7 }
  est_note_equipe BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(match_id, joueur_id)
);

ALTER TABLE notations_match ENABLE ROW LEVEL SECURITY;

-- Educateur peut tout faire sur ses propres notations
DROP POLICY IF EXISTS "nm_educateur" ON notations_match;
CREATE POLICY "nm_educateur" ON notations_match
FOR ALL USING (auth.uid() = educateur_id)
WITH CHECK (auth.uid() = educateur_id);

-- Joueur peut lire SA note individuelle (via son lien equipe_joueurs.joueur_id,
-- pas notations_match.joueur_id directement — ce n'est pas son auth id) et les
-- notes d'équipe, mais UNIQUEMENT celles de l'éducateur auquel il est affilié
-- (le patch d'origine autorisait "est_note_equipe = true" sans aucune
-- restriction de club : n'importe quel joueur connecté aurait pu lire les
-- commentaires collectifs de n'importe quelle autre équipe).
DROP POLICY IF EXISTS "nm_joueur_read" ON notations_match;
CREATE POLICY "nm_joueur_read" ON notations_match
FOR SELECT USING (
  joueur_id IN (SELECT id FROM equipe_joueurs WHERE joueur_id = auth.uid())
  OR (
    est_note_equipe = true
    AND educateur_id IN (SELECT educateur_id FROM equipe_joueurs WHERE joueur_id = auth.uid())
  )
);
