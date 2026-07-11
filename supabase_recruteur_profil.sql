-- Colonnes profil recruteur
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS type_recruteur TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS recherche_profil TEXT;
