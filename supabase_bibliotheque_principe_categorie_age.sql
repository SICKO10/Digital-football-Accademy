-- Modale de sauvegarde enrichie (procédés de bibliothèque, cf. modale
-- "Sauvegarder ce procédé" depuis un bloc de fiche) — deux nouveaux champs
-- collectés en plus de nom/theme déjà existants.
alter table bibliotheque_exercices
  add column if not exists principe_jeu text,
  add column if not exists categorie_age text default 'Pour tous';
