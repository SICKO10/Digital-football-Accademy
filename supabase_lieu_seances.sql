-- Ajoute le lieu (et l'heure pour les matchs) des séances, pour affichage
-- dans le calendrier joueur (widget "Prochaines échéances").
ALTER TABLE entrainements  ADD COLUMN IF NOT EXISTS lieu  TEXT;
ALTER TABLE matchs_equipe  ADD COLUMN IF NOT EXISTS lieu  TEXT;
ALTER TABLE matchs_equipe  ADD COLUMN IF NOT EXISTS heure TEXT;
