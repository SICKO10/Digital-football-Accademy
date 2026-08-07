-- Détail par bus (km, gasoil, conducteur, remarques véhicule) sur la fiche
-- déplacement de l'éducateur, pour les déplacements avec plusieurs bus
-- assignés. Les bus assignés eux-mêmes restent dans deplacements.vehicule
-- (texte "PLAQUE1 + PLAQUE2", déjà utilisé partout ailleurs — Vue mois,
-- Planning week-end, Répartition mini-bus) : fiches_bus n'en est qu'un
-- détail par plaque, pas une nouvelle source de vérité sur qui est assigné.

alter table deplacements add column if not exists fiches_bus jsonb not null default '[]';
