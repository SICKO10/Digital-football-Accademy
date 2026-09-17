-- Planning tournoi : heure de fin de journée + pause méridienne bloquée sur
-- tous les terrains — sans ça, genererPlanning ne connaît que l'heure de
-- début et enchaîne les matchs sans jamais s'arrêter ni prévoir de pause.
ALTER TABLE tournois_organises
ADD COLUMN IF NOT EXISTS heure_fin TIME,
ADD COLUMN IF NOT EXISTS pause_midi_debut TIME DEFAULT '12:00',
ADD COLUMN IF NOT EXISTS pause_midi_duree INTEGER DEFAULT 90;
