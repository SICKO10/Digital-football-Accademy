-- Marque une équipe comme "hôte" (le club organisateur) — exclue du calcul
-- de recette réelle puisqu'elle ne paie jamais sa propre inscription.
ALTER TABLE tournois_equipes
ADD COLUMN IF NOT EXISTS est_hote BOOLEAN NOT NULL DEFAULT false;
