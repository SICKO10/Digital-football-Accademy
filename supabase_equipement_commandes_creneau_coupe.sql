-- marquerEquipementPret (DashboardClub.jsx) envoie heure_debut_2/heure_fin_2
-- (créneau horaire coupé, ex: 8h-12h puis 14h-17h) dans le payload upsert
-- de equipement_commandes, mais ces colonnes n'existaient pas en base — d'où
-- "Could not find the 'heure_debut_2' column ... in the schema cache".
ALTER TABLE equipement_commandes ADD COLUMN IF NOT EXISTS heure_debut_2 TEXT;
ALTER TABLE equipement_commandes ADD COLUMN IF NOT EXISTS heure_fin_2 TEXT;
