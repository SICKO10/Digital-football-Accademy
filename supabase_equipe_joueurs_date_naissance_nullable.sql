-- Rend date_naissance optionnelle sur equipe_joueurs — si la colonne est déjà
-- nullable, cette commande est un no-op sans erreur (safe à relancer).
-- Le front (DashboardEducateur.jsx, ajouterJoueur/sauvegarderJoueur) convertit
-- déjà '' en null avant l'envoi ; si l'erreur persiste après ce fix front,
-- c'était probablement une contrainte NOT NULL en base qui bloquait même le
-- null envoyé.
ALTER TABLE equipe_joueurs ALTER COLUMN date_naissance DROP NOT NULL;
