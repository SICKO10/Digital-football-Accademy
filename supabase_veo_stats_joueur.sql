-- Stats Veo saisies volontairement par le joueur (Carte Joueur) — il
-- consulte ses stats sur app.veo.co et les recopie ici, purement déclaratif,
-- pas de vérification serveur possible (même logique déjà assumée pour les
-- badges de tournoi auto-déclarés, cf. le commentaire de
-- joueur_badges_insert_self dans supabase_joueur_badges.sql).
--
-- Distinct de joueur_video_badges (supabase_veo_import.sql) : celui-ci est
-- un import CSV réel fait par l'éducateur, donc une donnée vérifiée — les
-- deux ne doivent jamais être confondus côté affichage recruteur, d'où un
-- type de badge séparé ci-dessous plutôt que de réutiliser 'video_verifiee'.
CREATE TABLE IF NOT EXISTS veo_stats_joueur (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  joueur_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  saison TEXT NOT NULL,
  equipe_label TEXT,
  numero_maillot INT,
  matchs INT DEFAULT 0,
  buts INT DEFAULT 0,
  tirs INT DEFAULT 0,
  passes_reussies INT DEFAULT 0,
  taux_conversion INT DEFAULT 0,
  nb_evenements INT DEFAULT 0,
  date_saisie TIMESTAMPTZ DEFAULT now(),
  UNIQUE (joueur_id, saison)
);

ALTER TABLE veo_stats_joueur ENABLE ROW LEVEL SECURITY;
GRANT ALL ON veo_stats_joueur TO authenticated;

-- Lecture ouverte à tout compte connecté (le joueur pour lui-même, le
-- recruteur/éducateur pour consulter un profil) — pas d'accès anonyme
-- (contrairement au USING (true) proposé, qui exposerait ces données à
-- internet sans authentification, même pattern que joueur_badges_select_authenticated).
DROP POLICY IF EXISTS "veo_stats_select_authenticated" ON veo_stats_joueur;
CREATE POLICY "veo_stats_select_authenticated" ON veo_stats_joueur
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "veo_stats_insert_self" ON veo_stats_joueur;
CREATE POLICY "veo_stats_insert_self" ON veo_stats_joueur
  FOR INSERT WITH CHECK (auth.uid() = joueur_id);

DROP POLICY IF EXISTS "veo_stats_update_self" ON veo_stats_joueur;
CREATE POLICY "veo_stats_update_self" ON veo_stats_joueur
  FOR UPDATE USING (auth.uid() = joueur_id) WITH CHECK (auth.uid() = joueur_id);

-- joueur_badges.type est une liste fermée (CHECK) qui ne contenait que des
-- types liés aux tournois — 'video_verifiee' du script d'origine n'existait
-- pas et aurait fait échouer l'insert. Ajout d'un type dédié, nommé pour ne
-- pas être confondu avec un badge d'import vérifié par l'éducateur.
ALTER TABLE joueur_badges DROP CONSTRAINT IF EXISTS joueur_badges_type_check;
ALTER TABLE joueur_badges ADD CONSTRAINT joueur_badges_type_check
  CHECK (type IN ('tournoi_participation', 'tournoi_victoire', 'meilleur_buteur', 'meilleur_joueur', 'meilleur_gardien', 'fair_play', 'champion', 'coupe', 'veo_stats_autodeclarees'));
