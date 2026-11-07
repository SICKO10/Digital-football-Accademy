-- Retire l'outil Séances donné à testfinal@gmail.com par
-- supabase_outils_bloc3_test_outil_seances.sql.
delete from public.outils_comptes oc
using auth.users u
where u.id = oc.compte_id
  and lower(u.email) = 'testfinal@gmail.com'
  and oc.outil = 'seances';
