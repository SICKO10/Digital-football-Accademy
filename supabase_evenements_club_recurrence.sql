-- Ajoute la récurrence (badge informatif, pas de génération d'occurrences)
-- et la possibilité de masquer un événement du planning du club — celui-ci
-- affiche aujourd'hui evenements_club sans filtre (Planning.jsx), donc
-- sur_planning démarre à true pour ne rien changer aux événements existants.

ALTER TABLE evenements_club ADD COLUMN IF NOT EXISTS sur_planning boolean NOT NULL DEFAULT true;
ALTER TABLE evenements_club ADD COLUMN IF NOT EXISTS recurrent boolean NOT NULL DEFAULT false;
ALTER TABLE evenements_club ADD COLUMN IF NOT EXISTS frequence text CHECK (frequence IN ('hebdomadaire', 'mensuel', 'annuel'));
