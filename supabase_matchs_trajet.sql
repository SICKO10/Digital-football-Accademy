-- Ville du club (adresse de départ pour le calcul de trajet) + ville du lieu
-- d'un match Extérieur + cache du trajet calculé (évite de rappeler l'API
-- Mapbox à chaque affichage — recalculé seulement quand la ville change).

alter table profiles add column if not exists ville text;
alter table matchs_equipe add column if not exists ville text;
alter table matchs_equipe add column if not exists distance_km numeric(6,1);
alter table matchs_equipe add column if not exists duree_trajet_min integer;
