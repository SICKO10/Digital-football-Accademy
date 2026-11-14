-- RETOUR ARRIÈRE du bloc 1 (supabase_categories.sql). NE PAS EXÉCUTER sans
-- décision explicite : à n'utiliser que si le bloc 1 pose un problème et
-- qu'on veut revenir exactement à l'état d'avant.
--
-- Effet : supprime les déclencheurs, les colonnes categorie_id des équipes et
-- des fiches joueurs, puis la table categories (et les modes choisis).
-- Les équipes, fiches, matchs, entraînements et statistiques ne sont pas
-- touchés. Sans effet sur les autres blocs tant que les blocs 2 et suivants
-- ne sont pas appliqués (ils dépendent de cette table).

begin;

drop trigger if exists categories_rattacher_equipe on public.club_categories;
drop trigger if exists categories_suivre_equipe on public.club_categories;
drop trigger if exists categories_rattacher_fiche on public.equipe_joueurs;

drop function if exists public.categories_rattacher_equipe();
drop function if exists public.categories_suivre_equipe();
drop function if exists public.categories_rattacher_fiche();

alter table public.club_categories drop constraint if exists categories_equipe_rattachee;
drop index if exists public.club_categories_categorie_id_idx;
drop index if exists public.equipe_joueurs_categorie_id_idx;
alter table public.club_categories drop column if exists categorie_id;
alter table public.equipe_joueurs drop column if exists categorie_id;

drop table if exists public.categories;
drop function if exists public.categories_peut_lire(uuid);

commit;
