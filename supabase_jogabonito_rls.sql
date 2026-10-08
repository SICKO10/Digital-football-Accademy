-- ════════════════════════════════════════════════════════════════════════
-- MIGRATION (NON APPLIQUÉE) — RLS minimales Jogabonito
-- À appliquer manuellement, APRÈS lecture des résultats de
-- supabase_jogabonito_rls_verification.sql, et après validation.
--
-- Principe : lecture publique du flux (consultable sans compte), écriture
-- réservée au propriétaire de la ligne (auth.uid()). Les policies ci-dessous
-- portent des noms préfixés "jb_" et ne remplacent QUE celles de même nom.
--
-- IMPORTANT — policies existantes : RLS cumule les policies permissives (OR).
-- Si la vérification (requête 2) révèle une policy INSERT/UPDATE/DELETE trop
-- large (qual/with_check = true, rôle anon/public), elle doit être supprimée
-- à la main (modèle en fin de fichier) : ce script ne supprime aucune policy
-- dont il ne connaît pas le nom, pour ne rien casser d'autre (ex. la policy
-- "parent_lit_donnees_enfant" de supabase_parents_lecture_donnees_joueur.sql
-- est conservée).
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── reels (colonne propriétaire : joueur_id = profiles.id = auth.users.id) ──
ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS jb_reels_lecture_publique ON public.reels;
CREATE POLICY jb_reels_lecture_publique ON public.reels
  FOR SELECT USING (true);

DROP POLICY IF EXISTS jb_reels_insert_auteur ON public.reels;
CREATE POLICY jb_reels_insert_auteur ON public.reels
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = joueur_id);

DROP POLICY IF EXISTS jb_reels_update_auteur ON public.reels;
CREATE POLICY jb_reels_update_auteur ON public.reels
  FOR UPDATE TO authenticated USING (auth.uid() = joueur_id) WITH CHECK (auth.uid() = joueur_id);

DROP POLICY IF EXISTS jb_reels_delete_auteur ON public.reels;
CREATE POLICY jb_reels_delete_auteur ON public.reels
  FOR DELETE TO authenticated USING (auth.uid() = joueur_id);

-- Liens limités aux plateformes prises en charge (même liste que
-- src/lib/liensVideo.js + res.cloudinary.com pour les vidéos uploadées).
-- NOT VALID : s'applique aux nouvelles lignes et modifications, sans échouer
-- sur d'éventuelles lignes anciennes (cf. requête 5 de la vérification).
ALTER TABLE public.reels DROP CONSTRAINT IF EXISTS jb_reels_video_url_autorisee;
ALTER TABLE public.reels ADD CONSTRAINT jb_reels_video_url_autorisee CHECK (
  video_url ~* '^https://((www|m)\.youtube\.com|youtube\.com|youtu\.be|(www|m|vm|vt)\.tiktok\.com|tiktok\.com|(www\.)?instagram\.com|(www|app)\.veo\.co|veo\.co|res\.cloudinary\.com)(/|$)'
) NOT VALID;

-- ── likes / reposts (propriétaire : user_id ; compteurs lus publiquement) ──
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS jb_likes_lecture_publique ON public.likes;
CREATE POLICY jb_likes_lecture_publique ON public.likes FOR SELECT USING (true);
DROP POLICY IF EXISTS jb_likes_insert_soi ON public.likes;
CREATE POLICY jb_likes_insert_soi ON public.likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS jb_likes_delete_soi ON public.likes;
CREATE POLICY jb_likes_delete_soi ON public.likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER TABLE public.reposts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS jb_reposts_lecture_publique ON public.reposts;
CREATE POLICY jb_reposts_lecture_publique ON public.reposts FOR SELECT USING (true);
DROP POLICY IF EXISTS jb_reposts_insert_soi ON public.reposts;
CREATE POLICY jb_reposts_insert_soi ON public.reposts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS jb_reposts_delete_soi ON public.reposts;
CREATE POLICY jb_reposts_delete_soi ON public.reposts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ── video_favoris (privés : seul l'utilisateur lit ses favoris) ──
ALTER TABLE public.video_favoris ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS jb_favoris_lecture_soi ON public.video_favoris;
CREATE POLICY jb_favoris_lecture_soi ON public.video_favoris FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS jb_favoris_insert_soi ON public.video_favoris;
CREATE POLICY jb_favoris_insert_soi ON public.video_favoris FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS jb_favoris_delete_soi ON public.video_favoris;
CREATE POLICY jb_favoris_delete_soi ON public.video_favoris FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ── comments (lecture publique ; écriture par l'auteur ; suppression par
--    l'auteur OU par le joueur visé — premier outil de modération pour un
--    joueur, souvent mineur, face à un commentaire déplacé) ──
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS jb_comments_lecture_publique ON public.comments;
CREATE POLICY jb_comments_lecture_publique ON public.comments FOR SELECT USING (true);
DROP POLICY IF EXISTS jb_comments_insert_soi ON public.comments;
CREATE POLICY jb_comments_insert_soi ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS jb_comments_delete_auteur_ou_joueur ON public.comments;
CREATE POLICY jb_comments_delete_auteur_ou_joueur ON public.comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = joueur_id);

COMMIT;

-- ── Modèle (à adapter, NE PAS exécuter tel quel) : retirer une policy trop
--    large repérée par la requête 2 de la vérification.
-- DROP POLICY "<nom exact de la policy>" ON public.<table>;
