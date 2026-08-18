-- Étend projets_club pour les missions détaillées (cf. formulaire projet,
-- DashboardClub.jsx) — même principe que evenements_club.missions déjà en
-- place, avec des champs supplémentaires propres aux projets : dates par
-- mission, 3 catégories de ressources, résultats et problème rencontré.
--
-- Format d'un élément de missions :
-- { id, titre, responsable_id, responsable_nom, participants: [{id, nom}],
--   objectif, comment, date_debut, date_fin,
--   ressource_humaine, ressource_materielle, ressource_financiere,
--   resultats, probleme_rencontre }
ALTER TABLE projets_club ADD COLUMN IF NOT EXISTS objectif TEXT;
ALTER TABLE projets_club ADD COLUMN IF NOT EXISTS missions JSONB DEFAULT '[]';
