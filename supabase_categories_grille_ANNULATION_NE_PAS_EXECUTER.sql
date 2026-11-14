-- Retour arrière du bloc 4 (grille de convocation) : retire les 4 fonctions.
-- NE PAS EXÉCUTER sauf demande explicite. Les convocations déjà publiées par la
-- grille restent en base (elles sont de vraies convocations).
-- À lancer en entier, d'un seul coup. Aucune règle d'accès n'avait été modifiée.
begin;
drop function if exists public.categories_grille_matchs(uuid, date);
drop function if exists public.categories_grille_convoques(uuid, date);
drop function if exists public.categories_grille_prochaine_date(uuid);
drop function if exists public.categories_publier_convocation(uuid, uuid[], timestamptz);
commit;
