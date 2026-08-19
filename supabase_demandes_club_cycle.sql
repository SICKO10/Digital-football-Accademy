-- Cycle (mensuel/annuel) choisi dans le nouveau toggle du formulaire club
-- (Offres.jsx) — permet à l'admin de voir directement quel lien envoyer
-- dans EmailBlockClub (DashboardCoach.jsx) sans redemander au club.
ALTER TABLE demandes_club ADD COLUMN IF NOT EXISTS cycle TEXT;
