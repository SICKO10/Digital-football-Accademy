-- Téléphone de l'éducateur, affiché dans la modale détail de l'organigramme
-- club (onglet Organigramme, section Éducateurs) et éditable dans "Mon profil"
-- côté DashboardEducateur.jsx.
ALTER TABLE profil_educateur ADD COLUMN IF NOT EXISTS telephone TEXT;
