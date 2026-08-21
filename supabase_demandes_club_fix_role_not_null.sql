-- Le nouveau formulaire club (Offres.jsx) n'envoie plus "role" (remplacé par
-- nb_licencies) mais la colonne est restée NOT NULL en prod, ce qui fait
-- échouer toute insertion avec "null value in column role violates not-null
-- constraint" (23502) — confirmé par un insert de test réel.
ALTER TABLE demandes_club ALTER COLUMN role DROP NOT NULL;
