-- Accès par catégorie d'équipe, par rôle et par club (Staff → "Gérer les
-- permissions" → sous-section catégories). Complète role_permissions (qui
-- gère voir/modifier par onglet) avec un axe différent : quelles catégories
-- d'équipes (U15, U16, Seniors...) un rôle donné peut voir, quand il n'a pas
-- un accès complet à la section 'sportif'.
CREATE TABLE IF NOT EXISTS role_categories_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  categories JSONB NOT NULL DEFAULT '[]',
  -- ex: ["U15","U16","U17","U18","U19","U20"]
  acces_complet BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (club_id, role)
);

ALTER TABLE role_categories_access ENABLE ROW LEVEL SECURITY;

-- Remplace toute policy pré-existante trop permissive sur cette table (une
-- policy "USING (auth.uid() IS NOT NULL)" a été proposée un temps mais
-- ouvrirait la lecture/écriture de la config de TOUS les clubs à n'importe
-- quel utilisateur connecté de la plateforme — jamais exécutée en l'état).
DROP POLICY IF EXISTS "rca_all" ON role_categories_access;
DROP POLICY IF EXISTS "lecture_role_categories_access" ON role_categories_access;
DROP POLICY IF EXISTS "president_insertion_categories_access" ON role_categories_access;
DROP POLICY IF EXISTS "president_maj_categories_access" ON role_categories_access;
DROP POLICY IF EXISTS "president_suppression_categories_access" ON role_categories_access;

-- Lecture : le club lui-même + tout membre de son staff (chacun doit pouvoir
-- charger ses propres droits au démarrage du dashboard), même principe que
-- role_permissions.
CREATE POLICY "lecture_role_categories_access"
  ON role_categories_access FOR SELECT
  USING (
    club_id = auth.uid()
    OR EXISTS (SELECT 1 FROM staff_club sc WHERE sc.club_id = role_categories_access.club_id AND sc.user_id = auth.uid())
  );

-- Écriture : le club lui-même + le président uniquement, comme pour
-- role_permissions (seul le président configure qui voit quoi).
CREATE POLICY "president_insertion_categories_access"
  ON role_categories_access FOR INSERT
  WITH CHECK (
    club_id = auth.uid()
    OR EXISTS (SELECT 1 FROM staff_club sc WHERE sc.club_id = role_categories_access.club_id AND sc.user_id = auth.uid() AND sc.role = 'president')
  );

CREATE POLICY "president_maj_categories_access"
  ON role_categories_access FOR UPDATE
  USING (
    club_id = auth.uid()
    OR EXISTS (SELECT 1 FROM staff_club sc WHERE sc.club_id = role_categories_access.club_id AND sc.user_id = auth.uid() AND sc.role = 'president')
  );

CREATE POLICY "president_suppression_categories_access"
  ON role_categories_access FOR DELETE
  USING (
    club_id = auth.uid()
    OR EXISTS (SELECT 1 FROM staff_club sc WHERE sc.club_id = role_categories_access.club_id AND sc.user_id = auth.uid() AND sc.role = 'president')
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON role_categories_access TO authenticated;
