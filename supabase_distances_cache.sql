-- Cache des trajets Mapbox (distance + durée) ville → ville, pour éviter de
-- rappeler l'API Mapbox (géocodage + directions) quand le même couple de
-- villes revient (adversaires récurrents d'une saison à l'autre). Utilisée
-- par calculerTrajet() dans src/lib/mapbox.js.
CREATE TABLE IF NOT EXISTS distances_cache (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ville_depart      TEXT NOT NULL,
  ville_arrivee     TEXT NOT NULL,
  distance_km       NUMERIC,
  duree_trajet_min  INTEGER,
  calculated_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(ville_depart, ville_arrivee)
);

ALTER TABLE distances_cache ENABLE ROW LEVEL SECURITY;

-- Pas de donnée sensible (juste ville → ville → distance), et alimentée côté
-- client à la volée (pas d'edge function dédiée) : lecture/écriture ouvertes
-- à tout utilisateur connecté.
CREATE POLICY "distances_cache_select" ON distances_cache FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "distances_cache_insert" ON distances_cache FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "distances_cache_update" ON distances_cache FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Colonnes distance/durée sur les déplacements eux-mêmes — utile pour les
-- natures sans match associé (tournoi, stage, autre), où matchs_equipe
-- n'existe pas pour porter distance_km/duree_trajet_min (déjà présentes sur
-- matchs_equipe, cf. estimerEtAppliquerHoraires dans DashboardEducateur.jsx).
ALTER TABLE deplacements ADD COLUMN IF NOT EXISTS distance_km NUMERIC;
ALTER TABLE deplacements ADD COLUMN IF NOT EXISTS duree_trajet_min INTEGER;
