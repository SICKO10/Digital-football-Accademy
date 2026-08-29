-- Bibliothèque vidéo (YouTube) — 3 portées : 'df' (Digital Football, visible
-- de tous), 'club' (uploadé par le club, cf. profiles où plan='club'),
-- 'perso' (éducateur, cf. profiles où plan='educateur').
--
-- Corrections par rapport à la première version proposée :
-- - club_id UUID (references profiles.id) au lieu d'un champ `club` TEXT :
--   toutes les autres tables de portée club (club_categories, club_educateurs)
--   utilisent déjà club_id, jamais le nom du club en texte libre (fragile —
--   un club qui change de nom casserait le lien, et deux clubs peuvent
--   partager le même nom).
-- - RLS réellement scopée par type/propriétaire au lieu de USING (true), qui
--   aurait laissé n'importe quel utilisateur connecté lire/modifier/supprimer
--   le contenu de n'importe quel club ou éducateur.
--
-- La version non corrigée (schéma `club` TEXT + policy USING(true)) avait déjà
-- été appliquée telle quelle en base avant cette migration — DROP explicite
-- pour repartir propre (table vide au moment de cette correction, 0 ligne,
-- donc aucune perte de données).
DROP TABLE IF EXISTS bibliotheque_videos;

CREATE TABLE bibliotheque_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('df', 'club', 'perso')),
  club_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  proprietaire_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  titre TEXT NOT NULL,
  description TEXT,
  youtube_url TEXT NOT NULL,
  youtube_id TEXT NOT NULL,
  categorie TEXT,
  tags TEXT[] DEFAULT '{}',
  duree TEXT,
  visible_joueurs BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT bibliotheque_videos_portee CHECK (
    (type = 'df' AND club_id IS NULL AND proprietaire_id IS NULL) OR
    (type = 'club' AND club_id IS NOT NULL AND proprietaire_id IS NULL) OR
    (type = 'perso' AND proprietaire_id IS NOT NULL AND club_id IS NULL)
  )
);

ALTER TABLE bibliotheque_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bv_select" ON bibliotheque_videos;
DROP POLICY IF EXISTS "bv_insert" ON bibliotheque_videos;
DROP POLICY IF EXISTS "bv_update" ON bibliotheque_videos;
DROP POLICY IF EXISTS "bv_delete" ON bibliotheque_videos;

-- Lecture : DF = tout le monde ; Club = le club lui-même, ses éducateurs
-- affiliés (acceptés), et leurs joueurs si visible_joueurs ; Perso =
-- l'éducateur propriétaire, et ses joueurs affiliés si visible_joueurs.
CREATE POLICY "bv_select" ON bibliotheque_videos FOR SELECT USING (
  type = 'df'
  OR (type = 'club' AND (
    club_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM club_educateurs ce
      WHERE ce.club_id = bibliotheque_videos.club_id AND ce.educateur_id = auth.uid() AND ce.statut = 'accepte'
    )
    OR (visible_joueurs AND EXISTS (
      SELECT 1 FROM affiliations a
      JOIN club_educateurs ce ON ce.educateur_id = a.educateur_id
      WHERE a.joueur_id = auth.uid() AND a.statut = 'accepte'
        AND ce.club_id = bibliotheque_videos.club_id AND ce.statut = 'accepte'
    ))
  ))
  OR (type = 'perso' AND (
    proprietaire_id = auth.uid()
    OR (visible_joueurs AND EXISTS (
      SELECT 1 FROM affiliations a
      WHERE a.joueur_id = auth.uid() AND a.educateur_id = bibliotheque_videos.proprietaire_id AND a.statut = 'accepte'
    ))
  ))
);

-- Écriture : DF réservé aux comptes admin DF identifiés par email (même
-- convention que COACH_ADMIN_EMAILS, src/lib/coachAdmin.js — profiles.plan
-- n'autorise pas la valeur 'coach', donc pas de colonne fiable à tester ici ;
-- si la liste change, la mettre à jour aussi dans ce fichier).
CREATE POLICY "bv_insert" ON bibliotheque_videos FOR INSERT WITH CHECK (
  (type = 'df' AND auth.jwt() ->> 'email' IN ('legacyattitude@gmail.com', 'januariojimmy@gmail.com'))
  OR (type = 'club' AND club_id = auth.uid())
  OR (type = 'perso' AND proprietaire_id = auth.uid())
);

CREATE POLICY "bv_update" ON bibliotheque_videos FOR UPDATE USING (
  (type = 'df' AND auth.jwt() ->> 'email' IN ('legacyattitude@gmail.com', 'januariojimmy@gmail.com'))
  OR (type = 'club' AND club_id = auth.uid())
  OR (type = 'perso' AND proprietaire_id = auth.uid())
);

CREATE POLICY "bv_delete" ON bibliotheque_videos FOR DELETE USING (
  (type = 'df' AND auth.jwt() ->> 'email' IN ('legacyattitude@gmail.com', 'januariojimmy@gmail.com'))
  OR (type = 'club' AND club_id = auth.uid())
  OR (type = 'perso' AND proprietaire_id = auth.uid())
);

GRANT SELECT, INSERT, UPDATE, DELETE ON bibliotheque_videos TO authenticated;
