-- Support utilisateur → coach : tickets envoyés depuis le widget "💬 Support"
-- (onglet du ballon d'aide flottant, cf. components/FloatingHelper.jsx) et
-- traités depuis DashboardCoach.jsx (section "Support").
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sujet TEXT NOT NULL,
  message TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'ouvert' CHECK (statut IN ('ouvert', 'resolu')),
  reponse TEXT,
  coach_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Un utilisateur ne peut créer un ticket qu'en son propre nom.
CREATE POLICY "insert_own_support_ticket" ON support_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Lecture : l'auteur voit ses propres tickets ; les comptes coach analyseur
-- (identifiés par email, même liste que COACH_ADMIN_EMAILS dans
-- lib/coachAdmin.js — à garder synchronisée si cette liste change) voient
-- tous les tickets pour pouvoir y répondre. Contrairement à demandes_club,
-- ces messages sont potentiellement sensibles (plainte, souci de compte...),
-- donc pas de policy "authenticated = tout le monde" ici.
CREATE POLICY "select_support_ticket" ON support_tickets
  FOR SELECT USING (
    auth.uid() = user_id
    OR auth.jwt() ->> 'email' IN ('legacyattitude@gmail.com', 'januariojimmy@gmail.com')
  );

-- Modification (marquer résolu, écrire une réponse) : réservée aux comptes
-- coach analyseur.
CREATE POLICY "update_support_ticket_coach" ON support_tickets
  FOR UPDATE USING (
    auth.jwt() ->> 'email' IN ('legacyattitude@gmail.com', 'januariojimmy@gmail.com')
  );
