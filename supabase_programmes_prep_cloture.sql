-- Permet de clôturer un programme de préparation physique (bouton dans
-- GestionPrepPhysique.jsx) avec un bilan : ressenti général, nombre de
-- blessés sur la période, et 3 notes /5 (capacité à tenir un match de
-- 90 min, repères tactiques, qualité technique). Le programme reste
-- consultable ensuite dans l'onglet "Archivées" — statut réutilisé
-- (déjà 'actif' par défaut, jamais mis à jour jusqu'ici malgré le badge
-- "Terminé" déjà présent dans l'UI).

alter table programmes_prep add column if not exists ressenti_general text;
alter table programmes_prep add column if not exists nb_blesses integer;
alter table programmes_prep add column if not exists note_capacite_match integer check (note_capacite_match between 1 and 5);
alter table programmes_prep add column if not exists note_reperes_tactiques integer check (note_reperes_tactiques between 1 and 5);
alter table programmes_prep add column if not exists note_qualite_technique integer check (note_qualite_technique between 1 and 5);
alter table programmes_prep add column if not exists cloture_le timestamptz;
