-- Référents (saisie libre nom/prénom, même principe que participants et
-- missions.participants) pour les événements ET les projets du club.
ALTER TABLE evenements_club ADD COLUMN IF NOT EXISTS referents JSONB NOT NULL DEFAULT '[]';
ALTER TABLE projets_club ADD COLUMN IF NOT EXISTS referents JSONB NOT NULL DEFAULT '[]';
