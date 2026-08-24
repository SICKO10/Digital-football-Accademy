-- Ajoute ville/ligue/nombre de membres à demandes_club (formulaire /offres,
-- cf. src/pages/Offres.jsx) — affichés dans DashboardCoach.jsx > Demande
-- Club. Colonnes optionnelles : le formulaire ne les rend pas obligatoires
-- (comme message), donc les anciennes demandes auront simplement ces champs
-- à NULL.
ALTER TABLE demandes_club
  ADD COLUMN IF NOT EXISTS ville TEXT,
  ADD COLUMN IF NOT EXISTS ligue TEXT,
  ADD COLUMN IF NOT EXISTS nb_membres INTEGER;
