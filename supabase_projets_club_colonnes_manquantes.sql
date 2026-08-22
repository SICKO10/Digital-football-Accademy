-- projets_club : sauvegarderEvenement dans DashboardClub.jsx écrit déjà
-- nom/description/date_debut/date_fin/responsable_id/responsable_nom/referents
-- (formulaire "Nouveau projet") mais la table réelle n'a que id/club_id/titre/
-- statut/taches/created_at/objectif/missions — chaque sauvegarde de projet
-- échoue avec "column does not exist". Même bug que evenements_club, trouvé
-- en vérifiant le schéma avant d'écrire l'alerte "projets" de AlertesClub
-- (sans ça, aucune ligne n'aurait jamais ces champs à afficher).
-- titre existant n'est pas renommé (conserve les projets déjà créés) : nom
-- s'ajoute à côté, à réconcilier plus tard si besoin.
ALTER TABLE projets_club
  ADD COLUMN IF NOT EXISTS nom TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS date_debut DATE,
  ADD COLUMN IF NOT EXISTS date_fin DATE,
  ADD COLUMN IF NOT EXISTS responsable_id UUID,
  ADD COLUMN IF NOT EXISTS responsable_nom TEXT,
  ADD COLUMN IF NOT EXISTS referents JSONB NOT NULL DEFAULT '[]';
