-- Nettoyage : suppression du CSV import Veo côté éducateur (Recrutement
-- Phase 3, cf. supabase_veo_import.sql) — fonctionnalité retirée du code
-- (ImportVeo.jsx/BadgeVideoVerifiee.jsx supprimés) car basée sur une
-- prémisse fausse : Veo ne propose pas d'export CSV comme décrit.
--
-- joueur_video_badges avant veo_imports : elle référence veo_imports(id)
-- (veo_import_id), l'ordre évite tout souci de contrainte de clé étrangère.
DROP TABLE IF EXISTS joueur_video_badges;
DROP TABLE IF EXISTS veo_imports;
