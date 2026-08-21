-- Réponse du joueur à une convocation (présent/absent) — table séparée de
-- convocation_joueurs (pure jonction "qui est convoqué", gérée exclusivement
-- par l'éducateur, RLS lecture seule pour le joueur) : le joueur a besoin
-- d'écrire ici sa propre réponse, cf. bouton Présent/Absent sur la card
-- convocation dans DashboardJoueur.jsx.
CREATE TABLE IF NOT EXISTS convocation_reponses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  convocation_id UUID NOT NULL REFERENCES convocations(id) ON DELETE CASCADE,
  joueur_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reponse TEXT NOT NULL CHECK (reponse IN ('present', 'absent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (convocation_id, joueur_id)
);

ALTER TABLE convocation_reponses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "joueur_gere_sa_reponse_convocation" ON convocation_reponses;
CREATE POLICY "joueur_gere_sa_reponse_convocation" ON convocation_reponses
  FOR ALL USING (joueur_id = auth.uid()) WITH CHECK (joueur_id = auth.uid());

-- L'éducateur propriétaire de la convocation doit pouvoir lire qui a répondu
-- quoi (utile pour un futur récapitulatif présences/absences côté éducateur).
DROP POLICY IF EXISTS "educateur_lit_reponses_ses_convocations" ON convocation_reponses;
CREATE POLICY "educateur_lit_reponses_ses_convocations" ON convocation_reponses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM convocations c WHERE c.id = convocation_reponses.convocation_id AND c.educateur_id = auth.uid())
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON convocation_reponses TO authenticated;
