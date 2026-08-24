-- Fil de conversation support (remplace le modèle "1 message + 1 réponse"
-- de support_tickets par un vrai historique multi-messages). Utilisé par
-- src/components/FloatingHelper.jsx (côté utilisateur, 4 dashboards) et
-- src/pages/coach/Support.jsx (côté coach).
CREATE TABLE IF NOT EXISTS support_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  contenu TEXT NOT NULL,
  is_coach BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON support_messages(ticket_id, created_at);

ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Lecture : l'auteur du ticket voit son fil ; les comptes coach analyseur
-- (même allowlist que supabase_support_tickets.sql) voient tous les fils.
CREATE POLICY "select_support_messages" ON support_messages
  FOR SELECT USING (
    auth.jwt() ->> 'email' IN ('legacyattitude@gmail.com', 'januariojimmy@gmail.com')
    OR EXISTS (SELECT 1 FROM support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
  );

-- Écriture : uniquement en son propre nom (sender_id = auth.uid()), et
-- seulement sur un ticket qu'on possède ou en tant que coach analyseur.
CREATE POLICY "insert_support_messages" ON support_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND (
      auth.jwt() ->> 'email' IN ('legacyattitude@gmail.com', 'januariojimmy@gmail.com')
      OR EXISTS (SELECT 1 FROM support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
    )
  );

-- Métadonnées de fil : dernière activité + horodatage de lecture par chaque
-- partie, pour l'indicateur "non lu" des deux côtés.
ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS dernier_message_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lu_par_coach_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lu_par_user_at TIMESTAMPTZ;

-- Migration des tickets existants : le message initial devient le premier
-- message du fil. Note : la table support_tickets en prod n'a jamais eu les
-- colonnes reponse/coach_id (contrairement à supabase_support_tickets.sql,
-- qui n'a apparemment jamais été exécuté en entier) — aucune réponse
-- historique à migrer, la colonne message reste en base (non supprimée).
INSERT INTO support_messages (ticket_id, sender_id, contenu, is_coach, created_at)
SELECT id, user_id, message, false, created_at FROM support_tickets
WHERE message IS NOT NULL;

UPDATE support_tickets SET dernier_message_at = created_at WHERE dernier_message_at IS NULL;
