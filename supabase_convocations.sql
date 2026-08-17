-- Convocation officielle pour un match : programme de la journée, terrain,
-- arbitre, groupe convoqué — publiée par l'éducateur, visible en widget sur
-- le dashboard de chaque joueur convoqué jusqu'à expiration automatique
-- (dimanche suivant 20h, filtré à la lecture, pas de cron nécessaire).
--
-- match_id référence matchs_equipe (pas "calendrier_matchs", qui n'existe
-- pas dans cette base).
--
-- Le groupe convoqué est une table de jonction (convocation_joueurs), pas un
-- tableau JSONB sur convocations : plus simple et plus fiable à filtrer côté
-- RLS qu'un containment JSONB (évite un LIKE texte sur du JSON, fragile).
CREATE TABLE IF NOT EXISTS convocations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES matchs_equipe(id) ON DELETE CASCADE,
  educateur_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  type_terrain TEXT NOT NULL DEFAULT 'Herbe' CHECK (type_terrain IN ('Herbe', 'Synthétique', 'Indoor')),
  arbitre_nom TEXT,
  notes TEXT,
  -- [{ heure: "19h15", label: "RDV Vestiaire", icone: "🚪" }, ...]
  timeline JSONB NOT NULL DEFAULT '[]',

  publiee BOOLEAN NOT NULL DEFAULT false,
  publiee_at TIMESTAMPTZ,
  expire_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_id)
);

CREATE TABLE IF NOT EXISTS convocation_joueurs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  convocation_id UUID NOT NULL REFERENCES convocations(id) ON DELETE CASCADE,
  joueur_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE (convocation_id, joueur_id)
);

ALTER TABLE convocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE convocation_joueurs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "educateur_gere_convocations" ON convocations;
CREATE POLICY "educateur_gere_convocations" ON convocations
  FOR ALL USING (educateur_id = auth.uid()) WITH CHECK (educateur_id = auth.uid());

-- Le joueur ne voit que ses convocations publiées et pas encore expirées —
-- c'est ce filtre (pas un cron qui repasserait publiee à false) qui fait
-- disparaître le widget automatiquement le dimanche soir.
DROP POLICY IF EXISTS "joueur_voit_sa_convocation" ON convocations;
CREATE POLICY "joueur_voit_sa_convocation" ON convocations
  FOR SELECT USING (
    publiee = true
    AND (expire_at IS NULL OR expire_at > now())
    AND EXISTS (SELECT 1 FROM convocation_joueurs cj WHERE cj.convocation_id = convocations.id AND cj.joueur_id = auth.uid())
  );

DROP POLICY IF EXISTS "educateur_gere_convocation_joueurs" ON convocation_joueurs;
CREATE POLICY "educateur_gere_convocation_joueurs" ON convocation_joueurs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM convocations c WHERE c.id = convocation_joueurs.convocation_id AND c.educateur_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM convocations c WHERE c.id = convocation_joueurs.convocation_id AND c.educateur_id = auth.uid())
  );

DROP POLICY IF EXISTS "joueur_voit_ses_convocations" ON convocation_joueurs;
CREATE POLICY "joueur_voit_ses_convocations" ON convocation_joueurs
  FOR SELECT USING (joueur_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON convocations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON convocation_joueurs TO authenticated;
