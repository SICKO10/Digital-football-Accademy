-- Rend la composition (titulaires/remplacants/formation, cf.
-- supabase_causeries_composition.sql) visible en lecture seule aux joueurs
-- du roster de l'éducateur, une fois publiée par lui.
--
-- Pas de policy RLS SELECT large sur causeries : cette table contient aussi
-- le message du coach, le scouting adverse, les clés du match... du contenu
-- strictement privé à l'éducateur. Une RPC dédiée, qui ne renvoie que les
-- colonnes sûres de la composition, évite de tout exposer d'un coup.
ALTER TABLE causeries
  ADD COLUMN IF NOT EXISTS composition_publiee BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION mes_compositions_publiees()
RETURNS TABLE (
  id UUID,
  educateur_id UUID,
  adversaire TEXT,
  date_match DATE,
  heure_match TEXT,
  formation TEXT,
  titulaires JSONB,
  remplacants JSONB
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT c.id, c.educateur_id, c.adversaire, c.date_match, c.heure_match, c.formation, c.titulaires, c.remplacants
  FROM causeries c
  WHERE c.composition_publiee = true
    AND EXISTS (
      SELECT 1 FROM equipe_joueurs ej
      WHERE ej.educateur_id = c.educateur_id AND ej.joueur_id = auth.uid()
    );
$$;

GRANT EXECUTE ON FUNCTION mes_compositions_publiees() TO authenticated;
