-- Tirs au but (matchs de coupe) : deux colonnes, nulles par défaut.
-- Le score du match reste celui du temps réglementaire.
ALTER TABLE matchs_equipe ADD COLUMN IF NOT EXISTS tab_nous INTEGER;
ALTER TABLE matchs_equipe ADD COLUMN IF NOT EXISTS tab_eux INTEGER;
