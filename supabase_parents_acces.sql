-- Accès parents (lecture seule du profil de leur enfant) — cf.
-- DashboardJoueur.jsx (section "Accès parents"), DashboardParent.jsx (nouveau
-- dashboard), et l'extension des edge functions envoyer-invitation/
-- accepter-invitation pour un nouveau rôle 'parent' (même flow par token que
-- joueur/dirigeant, pas supabase.auth.admin.inviteUserByEmail qui n'est pas
-- utilisé ailleurs dans ce projet — cf. RESEND_API_KEY + table invitations).

-- ── Table des accès parents ──────────────────────────────────────────────
-- joueur_id : le JOUEUR qui invite (auth.uid() du compte joueur), pas
-- equipe_joueurs.id — un joueur invite pour lui-même depuis son propre
-- dashboard, même convention que notations_match différencie déjà entre
-- "profil de compte" et "ligne d'effectif".
CREATE TABLE IF NOT EXISTS parents_acces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  joueur_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email_invite TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'en_attente'
    CHECK (statut IN ('en_attente', 'accepte', 'refuse')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(joueur_id, email_invite)  -- max 2 invitations par joueur géré en code (envoyer-invitation)
);

ALTER TABLE parents_acces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "joueur_gere_ses_invitations_parents" ON parents_acces;
CREATE POLICY "joueur_gere_ses_invitations_parents" ON parents_acces
  FOR ALL USING (joueur_id = auth.uid())
  WITH CHECK (joueur_id = auth.uid());

DROP POLICY IF EXISTS "parent_voit_son_acces" ON parents_acces;
CREATE POLICY "parent_voit_son_acces" ON parents_acces
  FOR SELECT USING (parent_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON parents_acces TO authenticated;

-- ── Profil parent (obligatoire, rempli à la première connexion) ─────────
CREATE TABLE IF NOT EXISTS profil_parent (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  joueur_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nom TEXT,
  prenom TEXT,
  telephone TEXT,
  email TEXT,
  profession TEXT,
  profil_complet BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profil_parent ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parent_gere_son_profil" ON profil_parent;
CREATE POLICY "parent_gere_son_profil" ON profil_parent
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Le joueur concerné peut voir qui a accès à son profil (nom/prénom
-- seulement côté UI, la table entière reste lisible par RLS mais
-- DashboardJoueur.jsx n'affiche que ça).
DROP POLICY IF EXISTS "joueur_voit_profils_de_ses_parents" ON profil_parent;
CREATE POLICY "joueur_voit_profils_de_ses_parents" ON profil_parent
  FOR SELECT USING (joueur_id = auth.uid());

-- Le club (lui-même ou son staff) peut lire les profils des parents des
-- joueurs affiliés à l'un de ses éducateurs — même chaîne club_id que le
-- reste de l'app (club_educateurs.club_id = auth.uid() OU staff_club),
-- pas la double sous-requête profil_educateur.club_id du patch fourni qui
-- ne correspond à aucune table réelle de ce schéma.
DROP POLICY IF EXISTS "club_lit_profils_parents" ON profil_parent;
CREATE POLICY "club_lit_profils_parents" ON profil_parent
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM affiliations a
      JOIN club_educateurs ce ON ce.educateur_id = a.educateur_id AND ce.statut = 'accepte'
      WHERE a.joueur_id = profil_parent.joueur_id
        AND a.statut = 'accepte'
        AND (
          ce.club_id = auth.uid()
          OR EXISTS (SELECT 1 FROM staff_club sc WHERE sc.club_id = ce.club_id AND sc.user_id = auth.uid())
        )
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON profil_parent TO authenticated;

-- ── Étend la table invitations existante pour supporter role='parent' ───
-- (educateur_id/equipe_joueur_id restent NOT applicable pour ce rôle, d'où
-- le DROP NOT NULL défensif — sans effet si déjà nullable).
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS joueur_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE invitations ALTER COLUMN educateur_id DROP NOT NULL;
