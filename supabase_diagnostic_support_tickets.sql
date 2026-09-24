-- Diagnostic à coller dans l'éditeur SQL Supabase (SQL Editor) — celui-ci
-- s'exécute avec les droits complets (postgres), donc il contredit toute
-- policy RLS et montre l'état réel de la table, indépendamment de ce que
-- l'appli voit.

-- 1. Combien de lignes existent, et lesquelles (avec l'email de l'auteur) ?
SELECT
  st.id,
  st.sujet,
  st.statut,
  st.created_at,
  u.email AS email_auteur
FROM support_tickets st
LEFT JOIN auth.users u ON u.id = st.user_id
ORDER BY st.created_at DESC;

-- 2. Les policies RLS actuellement actives sur la table (pour vérifier
--    qu'il n'y a pas une ancienne version dupliquée ou différente de ce
--    qui est dans supabase_support_tickets.sql).
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'support_tickets';
