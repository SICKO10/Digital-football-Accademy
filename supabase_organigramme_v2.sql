-- Organigramme V2 : arbre hiérarchique + import Excel/scan IA (DashboardClub.jsx).
-- La table organigramme_club existait déjà (supabase_organigramme_club.sql) avec
-- id/club_id/role/nom/prenom/telephone/email/photo_url/ordre — on ajoute juste les
-- deux colonnes nécessaires à la hiérarchie visuelle, sans toucher aux données
-- existantes (les membres déjà en base héritent de 'Autre' et resteront à la
-- racine de l'arbre tant que 'superieur' n'est pas renseigné).
ALTER TABLE organigramme_club
  ADD COLUMN IF NOT EXISTS departement TEXT DEFAULT 'Autre',
  ADD COLUMN IF NOT EXISTS superieur TEXT DEFAULT '';
