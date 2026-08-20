-- Corrige les champs équipement déjà créés avec l'ancienne liste générique
-- (25 options enfant+adulte mélangées) suite au fix DashboardClub.jsx :
-- chaussettes → pointures, reste (vêtements) → liste adulte réduite.
-- "sac" est déjà correct (taille_unique=true) : pas d'action nécessaire.
-- options est de type text[] (pas jsonb) — ARRAY[...]::text[] plutôt que jsonb.

UPDATE equipement_champs
SET options = ARRAY['33','34','35','36','37','38','39','40','41','42','43','44','45','46']::text[],
    taille_unique = false
WHERE nom ILIKE 'chaussette%';

UPDATE equipement_champs
SET options = ARRAY['XS','S','M','L','XL','XXL']::text[]
WHERE taille_unique = false
  AND array_length(options, 1) = 25
  AND 'XXXL' = ANY(options);
