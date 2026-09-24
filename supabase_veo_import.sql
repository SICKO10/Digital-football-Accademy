-- Import CSV Veo (Phase 3 Recrutement) — l'éducateur importe un export Veo
-- (plateforme d'analyse vidéo) depuis "Mon équipe", on en garde une trace
-- (raw_data/stats_extraites en JSONB, aucun format Veo stable connu pour
-- justifier des colonnes dédiées) et les joueurs associés à des lignes du
-- CSV reçoivent un badge "Vidéo vérifiée" pour la saison. Pas de table
-- `equipes` dans ce projet : une équipe est une ligne de club_categories,
-- référencée ici par club_categorie_id (même convention que
-- equipe_joueurs.club_categorie_id).
CREATE TABLE IF NOT EXISTS veo_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  educateur_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  club_categorie_id UUID REFERENCES club_categories(id) ON DELETE SET NULL,
  saison TEXT NOT NULL,
  nom_fichier TEXT,
  statut TEXT NOT NULL DEFAULT 'traite' CHECK (statut IN ('traite', 'erreur')),
  raw_data JSONB,
  stats_extraites JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE veo_imports ENABLE ROW LEVEL SECURITY;

-- Même pattern que evaluations_joueur/tests_physiques : l'éducateur est
-- propriétaire direct de la ligne. Pas de lecture joueur : l'historique
-- d'import est un outil interne éducateur, pas une donnée à exposer au joueur.
CREATE POLICY "educateur_full_veo_imports" ON veo_imports FOR ALL
  USING (auth.uid() = educateur_id) WITH CHECK (auth.uid() = educateur_id);

CREATE INDEX IF NOT EXISTS idx_veo_imports_educateur ON veo_imports(educateur_id, club_categorie_id, saison);

-- Badge "Vidéo vérifiée" — table dédiée plutôt que joueur_badges : celui-ci
-- n'autorise que le joueur à insérer ses propres lignes (policy
-- joueur_badges_insert_self, WITH CHECK joueur_id = auth.uid(),
-- supabase_joueur_badges.sql) et son CHECK sur `type` est une liste fermée
-- de badges de tournoi qu'on ne veut pas élargir pour un cas différent
-- (attribution par un tiers, l'éducateur, pas par le joueur lui-même).
CREATE TABLE IF NOT EXISTS joueur_video_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  joueur_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  educateur_id UUID NOT NULL REFERENCES profiles(id),
  saison TEXT NOT NULL,
  veo_import_id UUID REFERENCES veo_imports(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (joueur_id, saison)
);

ALTER TABLE joueur_video_badges ENABLE ROW LEVEL SECURITY;

-- auth.uid() = educateur_id (comme tests_physiques_rls), pas joueur_id :
-- c'est l'éducateur qui attribue le badge, le joueur ne fait que le lire.
CREATE POLICY "educateur_full_video_badges" ON joueur_video_badges FOR ALL
  USING (auth.uid() = educateur_id) WITH CHECK (auth.uid() = educateur_id);

-- Lecture ouverte à tout compte connecté — même choix que
-- joueur_badges_select_authenticated (supabase_joueur_badges_lecture_recruteurs.sql) :
-- le joueur doit voir son propre badge et le recruteur doit le voir sur la
-- fiche/l'explorer (DashboardRecruteur.jsx), l'écriture reste strictement
-- scopée à l'éducateur ci-dessus.
CREATE POLICY "video_badges_select_authenticated" ON joueur_video_badges
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_joueur_video_badges_joueur ON joueur_video_badges(joueur_id);
