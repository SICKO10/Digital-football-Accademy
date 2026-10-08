-- Mémorise l'équipe active du coach (switcher multi-équipes) côté serveur,
-- en plus du localStorage existant (propre à chaque appareil). Sans ça, un
-- coach qui gère plusieurs équipes et se connecte depuis un nouvel appareil
-- (ex: tablette jamais utilisée) retombe sur la première équipe de la
-- liste au lieu de celle réellement active sur son ordi/téléphone — ses
-- widgets (présences du prochain entraînement, etc.) semblent alors vides
-- alors que les données existent, juste pour une autre équipe.
-- Cf. src/pages/DashboardEducateur.jsx : init() (résolution, priorité au
-- serveur) et changerEquipe() (écriture, fire-and-forget).
alter table profiles add column if not exists equipe_active_id uuid references club_categories(id);
