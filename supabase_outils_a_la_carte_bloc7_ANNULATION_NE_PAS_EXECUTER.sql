-- ANNULATION du bloc 7. NE PAS EXÉCUTER sauf décision explicite, après sauvegarde.
-- Retire la fonction du webhook des outils et le registre des événements traités.
-- Les outils déjà activés (outils_comptes) et les forfaits posés ne sont pas touchés.

begin;
drop function if exists public.outils_appliquer_abonnement(text, text, uuid, text, jsonb, text, text);
drop table if exists public.outils_stripe_evenements;
commit;
