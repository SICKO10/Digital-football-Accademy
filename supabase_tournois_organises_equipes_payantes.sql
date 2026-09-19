-- Sépare le nombre total d'équipes attendues (capacité/planning) du nombre
-- d'équipes payantes (invitées) — l'équipe du club hôte participe mais ne
-- paie pas son inscription, donc la recette prévisionnelle ne doit compter
-- que les équipes invitées, pas le total.
ALTER TABLE tournois_organises
ADD COLUMN IF NOT EXISTS nb_equipes_payantes INTEGER;
