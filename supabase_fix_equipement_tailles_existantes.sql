-- Corrige les champs équipement déjà créés avec l'ancienne liste générique
-- (25 options enfant+adulte mélangées) suite au fix DashboardClub.jsx :
-- chaussettes → pointures, reste (vêtements) → liste adulte réduite.
-- "sac" est déjà correct (taille_unique=true) : pas d'action nécessaire.

UPDATE equipement_champs
SET options = '["33","34","35","36","37","38","39","40","41","42","43","44","45","46"]'::jsonb,
    taille_unique = false
WHERE nom ILIKE 'chaussette%';

UPDATE equipement_champs
SET options = '["XS","S","M","L","XL","XXL"]'::jsonb
WHERE taille_unique = false
  AND jsonb_array_length(options) = 25
  AND options @> '["XXXL"]'::jsonb;
