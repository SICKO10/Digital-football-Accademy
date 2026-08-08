-- Organigramme du club (annuaire de contacts affiché publiquement dans l'onglet
-- Administratif) — volontairement une table à part de `staff_club`, qui gère les
-- accès à l'app (RLS, matrice de permissions, invitations) via user_id + role
-- contraint ('president', 'directeur_sportif', ...). Ici `role` est un intitulé
-- libre ('Médecin', 'Responsable Buvette'...) et la plupart des membres n'ont pas
-- de compte (pas de user_id) : mélanger les deux aurait cassé la gestion des accès.
CREATE TABLE IF NOT EXISTS organigramme_club (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role        TEXT NOT NULL,
  nom         TEXT DEFAULT '',
  prenom      TEXT DEFAULT '',
  telephone   TEXT DEFAULT '',
  email       TEXT DEFAULT '',
  photo_url   TEXT,
  ordre       INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE organigramme_club ENABLE ROW LEVEL SECURITY;

-- Le club gère son propre organigramme (ajout/modif/suppression) — l'UI restreint
-- déjà ça au président ou aux rôles délégués avec le droit 'organigramme' via
-- role_permissions, mais la RLS elle-même autorise tout titulaire du compte club.
CREATE POLICY "club_manage_organigramme" ON organigramme_club
  FOR ALL USING (auth.uid() = club_id) WITH CHECK (auth.uid() = club_id);

-- Lecture ouverte à tout utilisateur connecté (annuaire de contacts, pas de donnée
-- sensible) — sur le même principe que les autres annuaires publics de l'app.
CREATE POLICY "organigramme_read_all" ON organigramme_club
  FOR SELECT USING (auth.uid() IS NOT NULL);
