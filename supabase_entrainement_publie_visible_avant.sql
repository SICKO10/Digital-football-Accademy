-- Séance du jour (suite de supabase_entrainement_publie.sql), décision de
-- Kevin du 2026-11-02 : la séance est visible par le joueur dès sa
-- publication (la veille ou avant), et jusqu'à 22h00 heure de Paris le jour
-- de la séance. Avant, elle n'apparaissait qu'à partir de 0h00 le jour J.
-- Seule la fenêtre horaire change ; les règles de sécurité qui appellent
-- cette fonction restent identiques.
CREATE OR REPLACE FUNCTION seance_publiee_ouverte(p_date DATE, p_maintenant TIMESTAMPTZ DEFAULT now())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT p_maintenant < ((p_date + TIME '22:00') AT TIME ZONE 'Europe/Paris');
$$;
