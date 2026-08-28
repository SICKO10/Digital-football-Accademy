-- Bug trouvé : le club voyait les stats/matchs d'une équipe (ex. U18) dans le
-- classement d'une autre (ex. U11) du même coach. Cause : matchs_equipe.
-- club_categorie_id (ajoutée par supabase_educateur_multi_equipes.sql) n'était
-- jamais écrite à la création d'un match (ajouterMatch/sauvegarderMatchForm/
-- sauvegarderMatchScanne dans DashboardEducateur.jsx) — corrigé côté code.
--
-- Ce fichier rattrape les matchs créés ENTRE la migration initiale et ce
-- correctif, qui ont donc club_categorie_id encore null. Backfill sûr
-- uniquement pour les éducateurs n'ayant qu'UNE seule ligne club_categories
-- (aucune ambiguïté possible) — pour un coach qui gère déjà plusieurs
-- équipes, impossible de deviner laquelle sans info supplémentaire
-- (matchs_equipe n'a pas de nom de catégorie en texte), ces matchs restent
-- null et devront être réassignés manuellement.
update matchs_equipe m set club_categorie_id = cc.id
from club_categories cc
where cc.educateur_id = m.educateur_id
  and m.club_categorie_id is null
  and (select count(*) from club_categories cc2 where cc2.educateur_id = m.educateur_id) = 1;
