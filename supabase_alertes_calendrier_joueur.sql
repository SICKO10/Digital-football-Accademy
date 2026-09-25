-- Alertes joueur "nouvel entraînement/match" et "changement d'horaire"
-- (DashboardJoueur.jsx) : ni entrainements ni matchs_equipe n'exposaient de
-- quoi distinguer "créé/modifié récemment" de "existe depuis longtemps" —
-- sans ça, dès l'activation de la fonctionnalité, TOUTE la saison déjà
-- planifiée (des dizaines de séances/matchs) se serait fait passer pour
-- "nouvelle" au premier login de chaque joueur. created_at/updated_at
-- permettent au front de ne signaler que ce qui a réellement changé depuis
-- la mise en service (cf. SEUIL_ALERTES_CALENDRIER côté JS) ou depuis la
-- création de la ligne.
ALTER TABLE entrainements ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE entrainements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE matchs_equipe ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE matchs_equipe ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Backfill des lignes déjà existantes : une valeur ancienne (pas now(), qui
-- ferait passer toute la saison en cours pour "créée à l'instant") — si
-- created_at existait déjà avec de vraies dates de création, ce backfill ne
-- touche à rien (WHERE ... IS NULL) et ces vraies dates, forcément
-- antérieures à aujourd'hui, produisent le même résultat souhaité.
UPDATE entrainements SET created_at = now() - interval '1 year' WHERE created_at IS NULL;
UPDATE entrainements SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE matchs_equipe SET created_at = now() - interval '1 year' WHERE created_at IS NULL;
UPDATE matchs_equipe SET updated_at = created_at WHERE updated_at IS NULL;

ALTER TABLE entrainements ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE entrainements ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE matchs_equipe ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE matchs_equipe ALTER COLUMN updated_at SET DEFAULT now();

-- updated_at n'est jamais passé explicitement par le front (chaque .update()
-- de DashboardEducateur.jsx ne connaît que les colonnes métier modifiées) —
-- un trigger générique le fait à sa place, seul moyen fiable de détecter
-- "modifié après création" pour l'alerte "changement d'horaire".
CREATE OR REPLACE FUNCTION bump_updated_at_calendrier()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_entrainements_updated_at ON entrainements;
CREATE TRIGGER trg_entrainements_updated_at BEFORE UPDATE ON entrainements
  FOR EACH ROW EXECUTE FUNCTION bump_updated_at_calendrier();

DROP TRIGGER IF EXISTS trg_matchs_equipe_updated_at ON matchs_equipe;
CREATE TRIGGER trg_matchs_equipe_updated_at BEFORE UPDATE ON matchs_equipe
  FOR EACH ROW EXECUTE FUNCTION bump_updated_at_calendrier();
