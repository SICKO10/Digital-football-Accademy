-- Second créneau horaire (matin/après-midi) pour la récupération de
-- l'équipement — ex: 8h-12h et 14h-17h. Additif, optionnel : un club qui
-- n'a qu'un seul créneau continue de n'utiliser que heure_debut/heure_fin.
ALTER TABLE equipement_commandes ADD COLUMN IF NOT EXISTS heure_debut_2 TEXT;
ALTER TABLE equipement_commandes ADD COLUMN IF NOT EXISTS heure_fin_2 TEXT;
