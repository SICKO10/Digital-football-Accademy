-- Nettoyage de l'approche superseded documentée dans
-- supabase_educateur_equipes_scoping.sql : le multi-équipes éducateur a été
-- livré via club_categories/club_categorie_id (commit e3203e8), pas via
-- cette table educateur_equipes. Colonnes/table jamais lues par le front
-- (vérifié : aucune référence dans src/), sans risque à supprimer.

ALTER TABLE equipe_joueurs DROP COLUMN IF EXISTS equipe_id;
ALTER TABLE entrainements  DROP COLUMN IF EXISTS equipe_id;
ALTER TABLE matchs_equipe  DROP COLUMN IF EXISTS equipe_id;

DROP TABLE IF EXISTS educateur_equipes;
