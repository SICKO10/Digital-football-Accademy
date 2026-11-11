-- ANNULATION du bloc 8. NE PAS EXÉCUTER sauf décision explicite, après sauvegarde.
-- Retire la fonction des changements d'abonnement. Le webhook répondra en
-- erreur sur ces événements (Stripe les relivrera) ; rien d'autre n'est touché.

begin;
drop function if exists public.outils_synchroniser_abonnement(text, text, uuid, text, jsonb, integer, text, text, timestamptz, boolean, boolean);
commit;
