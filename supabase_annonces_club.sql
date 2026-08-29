-- Annonces internes du club (newsletter in-app) + doublon email optionnel via
-- l'edge function send-newsletter. club_id référence directement le compte club
-- (profiles.id), comme organigramme_club/club_educateurs — pas de colonne texte
-- "club" (le nom peut changer, l'id non).
CREATE TABLE IF NOT EXISTS annonces_club (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  titre          TEXT NOT NULL,
  contenu        TEXT NOT NULL,
  auteur_nom     TEXT NOT NULL,
  auteur_id      UUID NOT NULL,
  cible          TEXT NOT NULL DEFAULT 'tous' CHECK (cible IN ('tous', 'educateurs', 'joueurs')),
  envoye_email   BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_annonces_club_club_id ON annonces_club(club_id);

CREATE TABLE IF NOT EXISTS annonces_lues (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annonce_id   UUID NOT NULL REFERENCES annonces_club(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lu_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(annonce_id, user_id)
);

ALTER TABLE annonces_club ENABLE ROW LEVEL SECURITY;
ALTER TABLE annonces_lues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "annonces_club_manage" ON annonces_club;
DROP POLICY IF EXISTS "annonces_club_read" ON annonces_club;
DROP POLICY IF EXISTS "annonces_lues_own" ON annonces_lues;
DROP POLICY IF EXISTS "annonces_lues_club_read" ON annonces_lues;

-- Le club gère ses propres annonces (créer/modifier/supprimer) — même pattern que
-- organigramme_club : la matrice de permissions (role_permissions, section
-- 'messages') restreint déjà ça côté UI aux rôles délégués, la RLS elle-même
-- autorise tout titulaire du compte club.
CREATE POLICY "annonces_club_manage" ON annonces_club
  FOR ALL USING (auth.uid() = club_id) WITH CHECK (auth.uid() = club_id);

-- Lecture : le club lui-même, un éducateur affilié (club_educateurs, statut
-- accepté), ou un joueur affilié à l'un des éducateurs de ce club (affiliations,
-- statut accepté) — pas d'accès inter-clubs, contrairement à l'annuaire
-- organigramme qui est public entre utilisateurs connectés.
CREATE POLICY "annonces_club_read" ON annonces_club
  FOR SELECT USING (
    auth.uid() = club_id
    OR EXISTS (
      SELECT 1 FROM club_educateurs ce
      WHERE ce.club_id = annonces_club.club_id
        AND ce.educateur_id = auth.uid()
        AND ce.statut = 'accepte'
    )
    OR EXISTS (
      SELECT 1 FROM affiliations af
      JOIN club_educateurs ce ON ce.educateur_id = af.educateur_id
      WHERE ce.club_id = annonces_club.club_id
        AND af.joueur_id = auth.uid()
        AND af.statut = 'accepte'
        AND ce.statut = 'accepte'
    )
  );

-- Chacun gère ses propres accusés de lecture.
CREATE POLICY "annonces_lues_own" ON annonces_lues
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Le club lit les stats de lecture de ses propres annonces (compteur "X lus").
CREATE POLICY "annonces_lues_club_read" ON annonces_lues
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM annonces_club a
      WHERE a.id = annonces_lues.annonce_id AND a.club_id = auth.uid()
    )
  );
