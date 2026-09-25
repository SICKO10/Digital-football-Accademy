-- Alerte joueur "séance supprimée" (DashboardJoueur.jsx) : une fois un
-- entrainement supprimé côté éducateur (DELETE), la ligne n'existe plus nulle
-- part — impossible de savoir après coup qu'une séance a disparu sans garder
-- une trace. Table de log dédiée plutôt qu'un soft-delete (colonne
-- supprime_at sur entrainements) pour ne rien changer au comportement
-- existant des requêtes qui lisent cette table partout ailleurs dans l'app.
CREATE TABLE IF NOT EXISTS entrainements_supprimes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entrainement_id UUID NOT NULL, -- pas de FK : la ligne d'origine n'existe plus au moment de l'insert
  educateur_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  club_categorie_id UUID REFERENCES club_categories(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  heure TEXT,
  supprime_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE entrainements_supprimes ENABLE ROW LEVEL SECURITY;

-- Lecture ouverte à tout compte connecté (même choix que
-- video_badges_select_authenticated, supabase_veo_import.sql) : une date de
-- séance annulée n'a rien de sensible, le filtrage par équipe se fait déjà
-- côté client (educateur_id/club_categorie_id, même pattern que
-- planningEntrainements). Pas de policy INSERT/UPDATE/DELETE pour les
-- clients : seule la fonction du trigger ci-dessous écrit ici (SECURITY
-- DEFINER, bypasse la RLS pour cet insert précis).
CREATE POLICY "entrainements_supprimes_select_authenticated" ON entrainements_supprimes
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE OR REPLACE FUNCTION log_entrainement_supprime()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO entrainements_supprimes (entrainement_id, educateur_id, club_categorie_id, date, heure)
  VALUES (OLD.id, OLD.educateur_id, OLD.club_categorie_id, OLD.date, OLD.heure);
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_entrainement_supprime ON entrainements;
CREATE TRIGGER trg_entrainement_supprime BEFORE DELETE ON entrainements
  FOR EACH ROW EXECUTE FUNCTION log_entrainement_supprime();

CREATE INDEX IF NOT EXISTS idx_entrainements_supprimes_educateur ON entrainements_supprimes(educateur_id, club_categorie_id);
