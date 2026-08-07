-- Retire le système de répartition nominative (quel joueur dans quel bus),
-- qui ne correspond pas au besoin réel (l'assignation se fait par véhicule ↔
-- déplacement/équipe, pas par joueur ↔ bus — cf. Vue mois > "Assigner les
-- bus" et "Répartition automatique", table deplacements.vehicule).

drop table if exists deplacements_joueurs;
