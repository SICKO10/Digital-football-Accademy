-- Un joueur peut avoir plusieurs equipe_joueurs (une par educateur_id — ex :
-- Senior R1 et Senior R3 au même club) mais historique_saisons a une
-- contrainte UNIQUE(joueur_id, saison) qui ne tient pas compte de l'équipe.
-- Quand deux coachs différents clôturent la même saison pour le même
-- joueur, GestionCloturesSaison.jsx (upsert onConflict: 'joueur_id,saison')
-- écrase silencieusement la ligne du premier coach — y compris educateur_id.
--
-- Remplacée par UNIQUE(joueur_id, educateur_id, saison) : une ligne par
-- équipe par saison, conforme à ce qu'attendent déjà les lectures
-- (GestionCloturesSaison.jsx filtre par educateur_id+saison,
-- DashboardJoueur.jsx/verifierCloturesSaison déduplique déjà par
-- `${educateur_id}_${saison}`). Élargir un UNIQUE ne peut jamais casser de
-- données existantes (moins restrictif), donc pas de nettoyage préalable.
-- Aucun changement RLS nécessaire.

ALTER TABLE historique_saisons DROP CONSTRAINT IF EXISTS historique_saisons_joueur_id_saison_key;
ALTER TABLE historique_saisons ADD CONSTRAINT historique_saisons_joueur_id_educateur_id_saison_key UNIQUE (joueur_id, educateur_id, saison);
