-- club_posts / club_posts_likes existaient déjà en base (RLS activée mais
-- AUCUNE policy créée) — avec RLS activé et zéro policy, Postgres refuse tout
-- accès par défaut : le feed semblait "ne rien faire" (SELECT silencieusement
-- vide, INSERT rejeté) alors qu'aucune erreur claire n'était visible côté
-- utilisateur. Les deux tables sont vides (0 ligne), donc sans risque à
-- corriger ici.
--
-- likes_count n'est PAS mis à jour par le client (contrairement à la version
-- proposée, un UPDATE direct depuis n'importe quel visiteur qui like/unlike
-- permettrait d'y écrire une valeur arbitraire, et deux likes simultanés
-- pourraient se marcher dessus en lisant une valeur locale déjà périmée) —
-- un trigger sur club_posts_likes le maintient de façon atomique côté base.

DROP POLICY IF EXISTS "club_posts_select" ON club_posts;
DROP POLICY IF EXISTS "club_posts_insert" ON club_posts;
DROP POLICY IF EXISTS "club_posts_delete" ON club_posts;

-- Lecture publique (page club publique) ; écriture réservée au club
-- lui-même ou à un éducateur affilié (club_educateurs, statut accepté).
CREATE POLICY "club_posts_select" ON club_posts FOR SELECT USING (true);

CREATE POLICY "club_posts_insert" ON club_posts FOR INSERT WITH CHECK (
  auteur_id = auth.uid() AND (
    club_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM club_educateurs ce
      WHERE ce.club_id = club_posts.club_id AND ce.educateur_id = auth.uid() AND ce.statut = 'accepte'
    )
  )
);

CREATE POLICY "club_posts_delete" ON club_posts FOR DELETE USING (
  club_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM club_educateurs ce
    WHERE ce.club_id = club_posts.club_id AND ce.educateur_id = auth.uid() AND ce.statut = 'accepte'
  )
);

GRANT SELECT, INSERT, DELETE ON club_posts TO authenticated;

DROP POLICY IF EXISTS "club_posts_likes_select" ON club_posts_likes;
DROP POLICY IF EXISTS "club_posts_likes_insert" ON club_posts_likes;
DROP POLICY IF EXISTS "club_posts_likes_delete" ON club_posts_likes;

CREATE POLICY "club_posts_likes_select" ON club_posts_likes FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "club_posts_likes_insert" ON club_posts_likes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "club_posts_likes_delete" ON club_posts_likes FOR DELETE USING (user_id = auth.uid());

GRANT SELECT, INSERT, DELETE ON club_posts_likes TO authenticated;

-- Un like par utilisateur et par post — évite qu'un double-clic ou un appel
-- rejoué ne fasse gonfler le compteur artificiellement.
ALTER TABLE club_posts_likes DROP CONSTRAINT IF EXISTS club_posts_likes_post_user_unique;
ALTER TABLE club_posts_likes ADD CONSTRAINT club_posts_likes_post_user_unique UNIQUE (post_id, user_id);

CREATE OR REPLACE FUNCTION maj_likes_count_club_post()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE club_posts SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE club_posts SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_club_posts_likes_ins ON club_posts_likes;
CREATE TRIGGER trg_club_posts_likes_ins AFTER INSERT ON club_posts_likes
  FOR EACH ROW EXECUTE FUNCTION maj_likes_count_club_post();

DROP TRIGGER IF EXISTS trg_club_posts_likes_del ON club_posts_likes;
CREATE TRIGGER trg_club_posts_likes_del AFTER DELETE ON club_posts_likes
  FOR EACH ROW EXECUTE FUNCTION maj_likes_count_club_post();
