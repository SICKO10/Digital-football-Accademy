-- Ajoute 3 champs pédagogiques au procédé de bibliothèque (distincts du champ
-- "theme" existant, qui mélangeait jusqu'ici thème tactique et objectif) :
-- objectif (ce que le joueur doit apprendre/améliorer), but (la règle
-- concrète du jeu/exercice pour le joueur), criteres_realisation (critères
-- techniques/tactiques de réussite). Cf. DashboardEducateur.jsx, modale
-- "Nouveau procédé" de la Bibliothèque.
alter table bibliotheque_exercices add column if not exists objectif text;
alter table bibliotheque_exercices add column if not exists but text;
alter table bibliotheque_exercices add column if not exists criteres_realisation text;
