-- "Taille unique" (ex : un sac) — pas d'options à choisir, le champ est
-- considéré rempli dès qu'il est présent dans le pack, sans saisie.
ALTER TABLE equipement_champs ADD COLUMN IF NOT EXISTS taille_unique BOOLEAN NOT NULL DEFAULT false;
