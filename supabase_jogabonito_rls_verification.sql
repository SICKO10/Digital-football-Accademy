-- ════════════════════════════════════════════════════════════════════════
-- VÉRIFICATION (LECTURE SEULE) — Jogabonito : reels + interactions
-- À exécuter dans l'éditeur SQL Supabase AVANT supabase_jogabonito_rls.sql.
-- Aucune de ces requêtes ne modifie de donnée ni de configuration.
-- ════════════════════════════════════════════════════════════════════════

-- 1. RLS activée ?
-- Attendu : relrowsecurity = true pour les 5 tables. Une table à false est
-- lisible ET modifiable par n'importe qui disposant de la clé anon (publique,
-- présente dans le bundle du site) : à corriger en priorité.
SELECT relname AS table_name, relrowsecurity AS rls_active, relforcerowsecurity AS rls_forcee
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relname IN ('reels', 'likes', 'comments', 'reposts', 'video_favoris')
ORDER BY relname;

-- 2. Policies existantes.
-- Attendu, pour chaque table :
--   · SELECT : reels/likes/reposts/comments → true (flux public) ; video_favoris
--     → auth.uid() = user_id (+ "parent_lit_donnees_enfant", ajoutée par
--     supabase_parents_lecture_donnees_joueur.sql) ;
--   · INSERT : with_check = (auth.uid() = joueur_id) pour reels,
--     (auth.uid() = user_id) pour les interactions ;
--   · DELETE / UPDATE : qual = (auth.uid() = joueur_id | user_id).
-- ALERTE si une policy INSERT/UPDATE/DELETE a qual ou with_check = true, ou
-- s'applique au rôle anon/public : les policies permissives se cumulent (OR),
-- une seule policy trop large annule toutes les autres.
SELECT tablename, policyname, cmd, roles, permissive, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('reels', 'likes', 'comments', 'reposts', 'video_favoris')
ORDER BY tablename, cmd, policyname;

-- 3. Colonnes propriétaires (cohérence auth.uid() ↔ colonnes).
-- Attendu : reels.joueur_id, likes.user_id, comments.user_id,
-- reposts.user_id, video_favoris.user_id de type uuid. profiles.id = id de
-- auth.users (Register.jsx crée le profil avec id = userId de session).
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND ((table_name = 'reels' AND column_name IN ('id', 'joueur_id', 'video_url'))
    OR (table_name IN ('likes', 'comments', 'reposts', 'video_favoris') AND column_name IN ('id', 'user_id', 'joueur_id', 'clip_id')))
ORDER BY table_name, column_name;

-- 4. Profils sans compte d'authentification correspondant.
-- Attendu : 0. Un profil orphelin signalerait une incohérence profiles.id ↔
-- auth.users.id (les policies auth.uid() = joueur_id ne pourraient jamais
-- autoriser son propriétaire).
SELECT count(*) AS profils_sans_compte
FROM public.profiles p
LEFT JOIN auth.users u ON u.id = p.id
WHERE u.id IS NULL;

-- 5. Liens existants hors liste blanche (prépare la contrainte CHECK).
-- Attendu : idéalement 0. Les lignes listées ne seront PAS bloquées par la
-- contrainte (ajoutée NOT VALID), mais ne s'ouvrent plus à l'affichage
-- (estLienVideoAffichable) — à corriger ou supprimer par leur auteur.
-- Seuls id et domaine sont affichés (pas d'URL complète, pas d'auteur).
SELECT id, substring(video_url FROM '^[a-zA-Z]+://([^/?#]+)') AS domaine
FROM public.reels
WHERE video_url !~* '^https://((www|m)\.youtube\.com|youtube\.com|youtu\.be|(www|m|vm|vt)\.tiktok\.com|tiktok\.com|(www\.)?instagram\.com|(www|app)\.veo\.co|veo\.co|res\.cloudinary\.com)(/|$)';
