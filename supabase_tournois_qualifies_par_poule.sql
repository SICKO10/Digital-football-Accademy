-- Nombre d'équipes qualifiées automatiquement par poule (1 ou 2) pour la
-- phase finale — jusqu'ici toujours fixé à 2, ce qui limitait trop les
-- combinaisons possibles pour tomber sur 2/4/8/16 qualifiés (ex: 5 poules ×
-- 2 = 10, impossible à ajuster à 8 sans ce réglage). Combiné à
-- qualifies_meilleurs_troisiemes (déjà existant, généralisé pour viser le
-- rang suivant : les meilleurs 2e si qualifies_par_poule = 1, les meilleurs
-- 3e si = 2), l'organisateur peut désormais viser n'importe quel total.
ALTER TABLE tournois_organises
ADD COLUMN IF NOT EXISTS qualifies_par_poule INTEGER DEFAULT 2;
