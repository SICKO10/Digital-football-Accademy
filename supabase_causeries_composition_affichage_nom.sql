-- L'éducateur choisit si le terrain de composition affiche le prénom ou le
-- nom de famille sous chaque joueur — préférence propre à la fiche (une
-- causerie peut être présentée en groupe restreint où les prénoms suffisent,
-- ou publiée aux joueurs où le nom est plus formel), pas un réglage global.
ALTER TABLE causeries
  ADD COLUMN IF NOT EXISTS composition_affichage_nom TEXT NOT NULL DEFAULT 'nom'
    CHECK (composition_affichage_nom IN ('nom', 'prenom'));

-- CREATE OR REPLACE ne peut pas changer le type de retour d'une fonction
-- existante (nouvelle colonne composition_affichage_nom) — DROP requis.
DROP FUNCTION IF EXISTS mes_compositions_publiees();

CREATE OR REPLACE FUNCTION mes_compositions_publiees()
RETURNS TABLE (
  id UUID,
  educateur_id UUID,
  adversaire TEXT,
  date_match DATE,
  heure_match TEXT,
  formation TEXT,
  titulaires JSONB,
  remplacants JSONB,
  composition_affichage_nom TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT c.id, c.educateur_id, c.adversaire, c.date_match, c.heure_match, c.formation, c.titulaires, c.remplacants, c.composition_affichage_nom
  FROM causeries c
  WHERE c.composition_publiee = true
    AND EXISTS (
      SELECT 1 FROM equipe_joueurs ej
      WHERE ej.educateur_id = c.educateur_id AND ej.joueur_id = auth.uid()
    );
$$;

GRANT EXECUTE ON FUNCTION mes_compositions_publiees() TO authenticated;
