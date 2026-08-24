-- Historique des paiements Stripe, journalisé par supabase/functions/stripe-webhook
-- (invoice.paid pour les abonnements — 1er paiement + renouvellements — et
-- checkout.session.completed pour les analyses vidéo à l'unité). Alimente la
-- page Revenus de DashboardCoach.jsx. Aucune donnée avant le déploiement du
-- webhook modifié : ce n'est pas un backfill, la collecte démarre à zéro.
CREATE TABLE IF NOT EXISTS paiements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  montant INTEGER NOT NULL,              -- centimes, cohérent avec les montants Stripe (amount_total/amount_paid)
  type_utilisateur TEXT CHECK (type_utilisateur IN ('joueur', 'educateur', 'club', 'recruteur', 'dirigeant')),
  cycle TEXT CHECK (cycle IN ('mensuel', 'annuel', 'unite')),
  stripe_event_id TEXT NOT NULL UNIQUE,  -- idempotence : Stripe peut renvoyer le même event plusieurs fois
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_paiements_created_at ON paiements (created_at);

ALTER TABLE paiements ENABLE ROW LEVEL SECURITY;

-- Lecture réservée aux comptes coach analyseur (même allowlist que
-- COACH_ADMIN_EMAILS dans lib/coachAdmin.js et que supabase_support_tickets.sql
-- — à garder synchronisée si cette liste change). Pas de policy INSERT/UPDATE/
-- DELETE : seul le webhook Stripe (clé service_role, qui contourne RLS) écrit
-- dans cette table.
CREATE POLICY "select_paiements_coach" ON paiements
  FOR SELECT USING (
    auth.jwt() ->> 'email' IN ('legacyattitude@gmail.com', 'januariojimmy@gmail.com')
  );
