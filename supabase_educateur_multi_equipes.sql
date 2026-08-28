-- Permet à un éducateur de gérer plusieurs équipes (switcher côté
-- DashboardEducateur.jsx). Rien n'empêchait déjà, côté base, qu'un même
-- educateur_id apparaisse sur plusieurs lignes club_categories — la limite
-- "un coach = une équipe" n'était qu'applicative (monCategorieClub = .find()).
-- Le vrai manque : entrainements et matchs_equipe n'ont pas de
-- club_categorie_id, donc impossible de distinguer les données des
-- différentes équipes d'un même coach une fois le switcher en place.
-- equipe_joueurs a déjà club_categorie_id (ajouté avant ce fichier) mais
-- peut contenir des lignes non renseignées (joueurs ajoutés avant que le
-- coach ait déclaré sa catégorie) — backfill inclus par sécurité.

alter table entrainements add column if not exists club_categorie_id uuid references club_categories(id);
alter table matchs_equipe add column if not exists club_categorie_id uuid references club_categories(id);

-- Backfill : à ce jour aucun coach n'a jamais pu avoir plus d'une ligne
-- club_categories (le switcher n'existait pas), donc le rattachement par
-- educateur_id est non ambigu pour toutes les lignes existantes.
update entrainements e set club_categorie_id = cc.id
from club_categories cc
where cc.educateur_id = e.educateur_id and e.club_categorie_id is null;

update matchs_equipe m set club_categorie_id = cc.id
from club_categories cc
where cc.educateur_id = m.educateur_id and m.club_categorie_id is null;

update equipe_joueurs j set club_categorie_id = cc.id
from club_categories cc
where cc.educateur_id = j.educateur_id and j.club_categorie_id is null;

create index if not exists idx_entrainements_club_categorie_id on entrainements(club_categorie_id);
create index if not exists idx_matchs_equipe_club_categorie_id on matchs_equipe(club_categorie_id);
create index if not exists idx_equipe_joueurs_club_categorie_id on equipe_joueurs(club_categorie_id);
