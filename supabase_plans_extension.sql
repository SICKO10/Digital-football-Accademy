-- Étend la contrainte CHECK sur profiles.plan pour accepter les nouveaux plans
-- tout en conservant les anciens (rétrocompatible avec les comptes existants).
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;

ALTER TABLE profiles ADD CONSTRAINT profiles_plan_check
  CHECK (plan IN (
    'joueur_starter', 'joueur_pro',
    'educateur', 'scout', 'club', 'dirigeant',
    -- anciens plans conservés pour compatibilité pendant la transition
    'fan', 'starter', 'pro', 'recruteur', 'coach'
  ));

-- Date de début d'abonnement (pour calculer les 6 mois avant l'analyse offerte joueur_pro)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS abonnement_debut TIMESTAMPTZ;
