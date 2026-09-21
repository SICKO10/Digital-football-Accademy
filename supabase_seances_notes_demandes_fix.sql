-- Le code (DashboardEducateur.jsx, demanderNoteSeance/chargerXxx) utilise
-- partout `entrainement_id` et `club_categorie_id`, mais la table avait été
-- créée avec `seance_id` (jamais renommée) et sans `club_categorie_id` du
-- tout — d'où "Could not find the 'club_categorie_id' column..." dès qu'un
-- éducateur clique sur ⭐ pour demander un ressenti de séance.
ALTER TABLE seances_notes_demandes RENAME COLUMN seance_id TO entrainement_id;
ALTER TABLE seances_notes_demandes ADD COLUMN IF NOT EXISTS club_categorie_id UUID;
