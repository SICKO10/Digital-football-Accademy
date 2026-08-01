-- Suivi de l'abonnement Stripe + solde de crédits d'analyses vidéo.
-- analyses_restantes devient un solde qui s'accumule (plus de remise à
-- zéro mensuelle) : +1 après 6 mois payés consécutifs en mensuel,
-- +2 à chaque paiement de l'offre annuelle, +1 par analyse achetée à
-- l'unité (60€). Voir supabase/functions/stripe-webhook/index.ts.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS abonnement_cycle TEXT CHECK (abonnement_cycle IN ('mensuel', 'annuel'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS abonnement_mois_payes INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);

-- Incrément atomique (évite les races entre deux webhooks concurrents).
CREATE OR REPLACE FUNCTION increment_analyses(profile_id UUID, delta INT)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE profiles SET analyses_restantes = COALESCE(analyses_restantes, 0) + delta WHERE id = profile_id;
$$;
