-- Fiche déplacement remplie par l'éducateur après le trajet (remarques
-- véhicule/générales, statut de complétion). Pas de km_depart/km_retour/
-- gasoil_depart/gasoil_retour/conducteur ni de bus_assignes ici : ces
-- champs existent déjà sur deplacements sous d'autres noms
-- (km_avant/km_apres, gasoil_avant/gasoil_apres, conducteur, vehicule) —
-- les dupliquer aurait cassé tout ce qui les lit déjà (Vue mois, Planning
-- week-end, Répartition mini-bus).

alter table deplacements add column if not exists remarques_vehicule text;
alter table deplacements add column if not exists remarques text;
alter table deplacements add column if not exists fiche_completee boolean not null default false;
alter table deplacements add column if not exists fiche_completee_le timestamptz;
