-- Schémas CPA : évolution de "joueurs" (uniquement des ronds noir/blanc)
-- vers "elements" typés (joueur/carre/cercle_zone/fleche), pour supporter
-- les nouveaux outils de dessin (zones carrées/circulaires, flèches) en plus
-- des joueurs — plus "legende" (numéro de joueur → description du rôle,
-- ex. "1" → "Gardien"), éditée à côté du terrain.
ALTER TABLE cpa_schemas RENAME COLUMN joueurs TO elements;
ALTER TABLE cpa_schemas ADD COLUMN IF NOT EXISTS legende JSONB NOT NULL DEFAULT '{}';

-- Complète chaque élément existant (jusqu'ici uniquement des joueurs, sans
-- type ni id individuel) avec type='joueur' et un id stable — nécessaires
-- pour cibler un élément précis désormais (glisser-déposer, numérotation,
-- suppression par double-clic).
UPDATE cpa_schemas
SET elements = (
  SELECT COALESCE(jsonb_agg(elem || jsonb_build_object('type', 'joueur', 'id', gen_random_uuid())), '[]'::jsonb)
  FROM jsonb_array_elements(elements) elem
)
WHERE jsonb_typeof(elements) = 'array' AND jsonb_array_length(elements) > 0;
