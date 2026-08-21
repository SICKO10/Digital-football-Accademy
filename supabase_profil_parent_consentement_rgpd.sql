-- Consentement RGPD du parent, saisi sur l'écran "profil incomplet" de
-- DashboardParent.jsx (première connexion) — cf. sauvegarderProfilParent.
ALTER TABLE profil_parent
  ADD COLUMN IF NOT EXISTS consentement_rgpd BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consentement_date TIMESTAMPTZ;
