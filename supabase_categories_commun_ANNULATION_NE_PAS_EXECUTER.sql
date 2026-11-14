-- NE PAS EXÉCUTER sauf demande explicite : retour arrière du bloc 3 du
-- chantier catégories (supabase_categories_commun.sql).
--
-- Retire uniquement ce que le bloc 3 a ajouté : les règles « categories_commun_* »
-- et leurs fonctions. Aucune donnée n'est touchée ; les catégories et le bloc 1
-- restent en place. Une catégorie déjà passée en commun perd alors son
-- effectif partagé (chaque éducateur ne revoit que ses propres fiches).

begin;

drop policy if exists "categories_commun_lecture" on public.equipe_joueurs;
drop policy if exists "categories_commun_modification" on public.equipe_joueurs;
drop policy if exists "categories_commun_lecture" on public.convocations;
drop policy if exists "categories_commun_lecture" on public.convocation_joueurs;
drop policy if exists "categories_commun_lecture" on public.convocation_reponses;
drop policy if exists "categories_commun_lecture" on public.disponibilites;

drop function if exists public.categories_convocation_commune_visible(uuid);
drop function if exists public.categories_match_commun_visible(uuid);
drop function if exists public.categories_seance_commune_visible(uuid);
drop function if exists public.categories_commun_educateur(uuid);
drop function if exists public.categories_commun_visible(uuid);
drop function if exists public.peut_voir_categorie(uuid);
drop function if exists public.est_educateur_de_categorie(uuid);
drop function if exists public.categories_compte_educateur(uuid, uuid);

commit;
