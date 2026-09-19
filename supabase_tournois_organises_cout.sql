-- Coût d'organisation d'un tournoi organisé — dépense côté budget club,
-- symétrique à prix_inscription_equipe/nb_equipes_prevues (recette).
ALTER TABLE tournois_organises
  ADD COLUMN IF NOT EXISTS cout_organisation NUMERIC DEFAULT 0;
