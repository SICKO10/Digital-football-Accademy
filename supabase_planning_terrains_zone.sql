-- Zone occupée sur un créneau de planning terrain — permet à plusieurs
-- équipes de partager un même terrain au même horaire (foot à 11 sur un
-- demi-terrain chacune = 2 zones max ; foot à 5/futsal/U6-U11 jusqu'à 5
-- zones), cf. PlanningTerrains.jsx. 'plein' = le créneau occupe tout le
-- terrain (comportement actuel, valeur par défaut pour ne rien changer aux
-- créneaux existants).

alter table planning_terrains add column if not exists zone text default 'plein';
