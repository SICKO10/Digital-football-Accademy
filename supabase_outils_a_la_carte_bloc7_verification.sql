-- Vérification du bloc 7 (lecture seule). À lancer après supabase_outils_a_la_carte_bloc7.sql.
-- Résultat attendu : une seule ligne, toutes les colonnes à true.

select
  to_regclass('public.outils_stripe_evenements') is not null as table_evenements,
  (select relrowsecurity from pg_class where oid = 'public.outils_stripe_evenements'::regclass) as protection_activee,
  not has_table_privilege('authenticated', 'public.outils_stripe_evenements', 'select') as navigateur_sans_acces,
  to_regprocedure('public.outils_appliquer_abonnement(text, text, uuid, text, jsonb, text, text)') is not null as fonction_presente,
  not has_function_privilege('authenticated', 'public.outils_appliquer_abonnement(text, text, uuid, text, jsonb, text, text)', 'execute') as navigateur_sans_appel,
  has_function_privilege('service_role', 'public.outils_appliquer_abonnement(text, text, uuid, text, jsonb, text, text)', 'execute') as webhook_peut_appeler;
