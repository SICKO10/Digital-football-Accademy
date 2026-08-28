-- Inscriptions newsletter depuis la page publique (formulaire rempli par des
-- visiteurs non connectés, d'où la policy INSERT ouverte) — même modèle que
-- demandes_club (supabase_demandes_club.sql).
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  source TEXT DEFAULT 'home'
);

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- N'importe qui (visiteur non connecté inclus) peut s'inscrire.
CREATE POLICY "public_insert_newsletter" ON newsletter_subscribers
  FOR INSERT WITH CHECK (true);

-- Lecture restreinte aux admins (contrairement à demandes_club, ouvert à tout
-- authentifié) : une liste d'emails est plus sensible qu'une demande de
-- contact déjà nominative — pas de raison qu'un compte joueur/club puisse la
-- lire. Même allowlist que le reste du dashboard coach (cf. lib/coachAdmin.js).
CREATE POLICY "coach_admin_lit_newsletter" ON newsletter_subscribers
  FOR SELECT USING (auth.jwt() ->> 'email' IN ('legacyattitude@gmail.com', 'januariojimmy@gmail.com'));
