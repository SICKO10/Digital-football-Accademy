-- Équipe (participants, saisie libre prénom/nom) et matériel nécessaire par
-- étape de projet — même structure jsonb [{id, ...}] que missions.participants
-- et projets_club.referents (cf. supabase_projets_club_missions.sql), pour
-- rester cohérent avec le reste du fichier plutôt que d'introduire des
-- tables enfants supplémentaires.
ALTER TABLE projet_etapes ADD COLUMN IF NOT EXISTS participants JSONB DEFAULT '[]';
ALTER TABLE projet_etapes ADD COLUMN IF NOT EXISTS materiel JSONB DEFAULT '[]';
