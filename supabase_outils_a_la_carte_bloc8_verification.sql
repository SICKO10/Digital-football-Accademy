-- Vérification du bloc 8 (lecture seule). À lancer après supabase_outils_a_la_carte_bloc8.sql.
-- Résultat attendu : une seule ligne, toutes les colonnes à true.

select
  to_regprocedure('public.outils_synchroniser_abonnement(text, text, uuid, text, jsonb, integer, text, text, timestamptz, boolean, boolean)') is not null as fonction_presente,
  not has_function_privilege('authenticated', 'public.outils_synchroniser_abonnement(text, text, uuid, text, jsonb, integer, text, text, timestamptz, boolean, boolean)', 'execute') as navigateur_sans_appel,
  not has_function_privilege('anon', 'public.outils_synchroniser_abonnement(text, text, uuid, text, jsonb, integer, text, text, timestamptz, boolean, boolean)', 'execute') as visiteur_sans_appel,
  has_function_privilege('service_role', 'public.outils_synchroniser_abonnement(text, text, uuid, text, jsonb, integer, text, text, timestamptz, boolean, boolean)', 'execute') as webhook_peut_appeler,
  to_regprocedure('public.outils_appliquer_abonnement(text, text, uuid, text, jsonb, text, text)') is not null as bloc7_intact;
