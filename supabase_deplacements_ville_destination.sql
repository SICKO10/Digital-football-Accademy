-- lieu_destination contient souvent un nom d'adversaire/de stade (ex: "USCA
-- FOOTBALL 2"), pas une ville géocodable par Mapbox — d'où un champ dédié
-- pour l'estimation de trajet (formulaire manuel de Deplacements.jsx), et
-- pré-rempli automatiquement depuis matchs_equipe.ville pour les déplacements
-- liés à un match (cf. creerDeplacementAutoMatch/estimerEtAppliquerHoraires
-- dans DashboardEducateur.jsx).

alter table deplacements add column if not exists ville_destination text;
