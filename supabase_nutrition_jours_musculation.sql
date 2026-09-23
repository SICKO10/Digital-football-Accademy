-- Jours de musculation personnels (en plus des séances/matchs déjà connus
-- du club via entrainements/matchs_equipe) — saisis librement par le joueur
-- dans son profil nutrition, utilisés pour enrichir "Cette semaine" dans
-- NutritionDashboard.jsx (renderPlan) quand ils tombent un jour autrement
-- classé "repos".
ALTER TABLE nutrition_profil
  ADD COLUMN IF NOT EXISTS jours_musculation TEXT[] NOT NULL DEFAULT '{}';
