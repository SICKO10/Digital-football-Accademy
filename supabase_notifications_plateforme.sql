-- Communication plateforme (Digital Football → tous ses utilisateurs) —
-- même schéma que annonces_club (supabase_annonces_club.sql), niveau
-- plateforme entière au lieu d'un club. cible se base sur les familles de
-- profiles.plan déjà utilisées côté admin (cf. TYPE_FAMILIES,
-- src/pages/coach/constants.js) — il n'existe pas de colonne profiles.role
-- dans ce schéma, et pas de rôle "superadmin" : l'admin plateforme est
-- identifié par email (COACH_ADMIN_EMAILS, cf. lib/coachAdmin.js), même
-- pattern que support_tickets/parrainage/newsletter_subscribers.
CREATE TABLE IF NOT EXISTS notifications_plateforme (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre        TEXT NOT NULL,
  contenu      TEXT NOT NULL,
  type         TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'feature', 'maintenance', 'promo')),
  cible        TEXT NOT NULL DEFAULT 'tous' CHECK (cible IN ('tous', 'clubs', 'educateurs', 'joueurs')),
  envoye_email BOOLEAN NOT NULL DEFAULT false,
  actif        BOOLEAN NOT NULL DEFAULT true,
  auteur_id    UUID NOT NULL REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications_lues (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications_plateforme(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lu_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(notification_id, user_id)
);

ALTER TABLE notifications_plateforme ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_lues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifs_plateforme_read" ON notifications_plateforme;
DROP POLICY IF EXISTS "notifs_plateforme_manage" ON notifications_plateforme;
DROP POLICY IF EXISTS "notifs_lues_own" ON notifications_lues;

-- Lecture : tout utilisateur connecté voit les notifications actives (le
-- ciblage par plan est filtré côté client, comme annonces_club) ; l'admin
-- voit aussi les inactives pour l'historique dans "Communication".
CREATE POLICY "notifs_plateforme_read" ON notifications_plateforme
  FOR SELECT USING (
    actif = true
    OR auth.jwt() ->> 'email' IN ('legacyattitude@gmail.com', 'januariojimmy@gmail.com')
  );

-- Création/modification/désactivation réservées à l'admin plateforme.
CREATE POLICY "notifs_plateforme_manage" ON notifications_plateforme
  FOR ALL USING (auth.jwt() ->> 'email' IN ('legacyattitude@gmail.com', 'januariojimmy@gmail.com'))
  WITH CHECK (auth.jwt() ->> 'email' IN ('legacyattitude@gmail.com', 'januariojimmy@gmail.com'));

-- Chacun gère ses propres accusés de lecture.
CREATE POLICY "notifs_lues_own" ON notifications_lues
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
