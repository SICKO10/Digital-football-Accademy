-- Profil club : liste des stades du club (nom + adresse), saisie libre en
-- JSONB — même principe que referents/missions (pas de table à part, un club
-- n'a besoin ni de RLS dédiée ni de relations FK pour une poignée de stades).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stades JSONB NOT NULL DEFAULT '[]';
