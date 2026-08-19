-- Ajoute la cible d'un champ de taille équipement (joueur / educateur / les
-- deux), pour que le formulaire "Mes tailles" côté joueur et côté éducateur
-- n'affiche que les champs qui les concernent. Additif sur le schéma déjà en
-- place (supabase_inventaire.sql, club_id UUID) — ne pas confondre avec un
-- éventuel script "club TEXT" qui recréerait les tables avec la mauvaise clé.
ALTER TABLE equipement_champs
  ADD COLUMN IF NOT EXISTS cible TEXT NOT NULL DEFAULT 'les deux'
  CHECK (cible IN ('joueur', 'educateur', 'les deux'));
