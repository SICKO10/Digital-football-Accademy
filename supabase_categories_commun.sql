-- Bloc 3 (chantier catégories, PLAN-categories.md) : effectif commun partagé.
--
-- Ce que fait ce fichier :
--   1. des fonctions qui disent qui fait partie d'une catégorie :
--      - est_educateur_de_categorie : coach d'une des équipes de la catégorie ;
--      - peut_voir_categorie : le club, ses éducateurs de la catégorie, le
--        président et le staff dont le rôle a cette catégorie (ou accès complet) ;
--   2. des règles d'accès AJOUTÉES (aucune n'est retirée ni modifiée), qui ne
--      servent que pour une catégorie en mode « commun » :
--      - equipe_joueurs : les fiches de la catégorie sont lisibles par tous ceux
--        qui voient la catégorie et modifiables par ses éducateurs ;
--      - convocations, convocation_joueurs, convocation_reponses,
--        disponibilites : lisibles pour les matchs et entraînements des équipes
--        de la catégorie (préparation de la grille de convocation, bloc 4).
--
-- Mode « par équipe » (toutes les catégories aujourd'hui) : rien ne change.
-- Un autre club ne voit jamais rien. La suppression d'une fiche reste réservée
-- à ceux qui le pouvaient déjà. Les matchs et entraînements eux-mêmes ne sont
-- pas ouverts aux autres éducateurs (certains écrans lisent tous les matchs
-- visibles sans filtre : le bloc 4 passera par une fonction dédiée).
--
-- Avant de lancer : ~/Sauvegardes-DigitalFootball/sauvegarder.sh
-- À lancer en entier, d'un seul coup, dans Supabase (SQL Editor). Tout ou
-- rien. Relançable sans erreur.
-- Ensuite : supabase_categories_commun_verification.sql.

begin;

-- ── 0. Le bloc 1 doit être appliqué ─────────────────────────────────────────
do $$
begin
  if to_regclass('public.categories') is null
     or not exists (select 1 from information_schema.columns
                    where table_schema = 'public' and table_name = 'equipe_joueurs' and column_name = 'categorie_id') then
    raise exception 'Arrêt sans rien changer : appliquer d''abord supabase_categories.sql (bloc 1).';
  end if;
end $$;

-- ── 1. Qui fait partie d'une catégorie ──────────────────────────────────────
-- Coach d'une des équipes de la catégorie (p_compte), quel que soit le mode.
create or replace function public.categories_compte_educateur(p_categorie_id uuid, p_compte uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_categorie_id is not null and p_compte is not null and exists (
    select 1 from public.club_categories cc
    where cc.categorie_id = p_categorie_id and cc.educateur_id = p_compte
  )
$$;

create or replace function public.est_educateur_de_categorie(p_categorie_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.categories_compte_educateur(p_categorie_id, auth.uid())
$$;

-- Le club, les éducateurs de la catégorie, le président, et le staff dont le
-- rôle a cette catégorie. Mêmes réglages que l'écran « Gérer les permissions »
-- (role_categories_access) ; sans réglage enregistré pour le rôle, mêmes
-- valeurs par défaut que src/lib/rolesClub.js.
create or replace function public.peut_voir_categorie(p_categorie_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.categories c
    where c.id = p_categorie_id
      and (
        c.club_id = auth.uid()
        or public.categories_compte_educateur(c.id, auth.uid())
        or exists (
          select 1
          from public.staff_club sc
          left join public.role_categories_access rca
            on rca.club_id = sc.club_id and rca.role = sc.role
          where sc.club_id = c.club_id
            and sc.user_id = auth.uid()
            and (
              sc.role = 'president'
              or rca.acces_complet is true
              or exists (
                select 1
                from jsonb_array_elements_text(
                       case when jsonb_typeof(rca.categories) = 'array' then rca.categories else '[]'::jsonb end
                     ) x(nom)
                where upper(regexp_replace(x.nom, '\s+', '', 'g')) = c.nom_cle
              )
              or (rca.id is null and (
                sc.role in ('directeur_sportif', 'secretaire')
                or (sc.role = 'responsable_formation'   and c.nom_cle in ('U15','U16','U17','U18','U19','U20','SENIORS'))
                or (sc.role = 'responsable_ecole_foot'  and c.nom_cle in ('U7','U8','U9','U10'))
                or (sc.role = 'responsable_preformation' and c.nom_cle in ('U11','U12','U13','U14'))
              ))
            )
        )
      )
  )
$$;

-- Catégorie en mode commun, vue (ou gérée) par la personne connectée.
create or replace function public.categories_commun_visible(p_categorie_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_categorie_id is not null
    and exists (select 1 from public.categories c where c.id = p_categorie_id and c.mode = 'commun')
    and public.peut_voir_categorie(p_categorie_id)
$$;

create or replace function public.categories_commun_educateur(p_categorie_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_categorie_id is not null
    and exists (select 1 from public.categories c where c.id = p_categorie_id and c.mode = 'commun')
    and public.categories_compte_educateur(p_categorie_id, auth.uid())
$$;

-- Match, entraînement ou convocation d'une équipe d'une catégorie commune
-- que la personne connectée voit.
create or replace function public.categories_match_commun_visible(p_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.matchs_equipe m
    join public.club_categories cc on cc.id = m.club_categorie_id
    where m.id = p_match_id
      and public.categories_commun_visible(cc.categorie_id)
  )
$$;

create or replace function public.categories_seance_commune_visible(p_seance_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.entrainements e
    join public.club_categories cc on cc.id = e.club_categorie_id
    where e.id = p_seance_id
      and public.categories_commun_visible(cc.categorie_id)
  )
$$;

create or replace function public.categories_convocation_commune_visible(p_convocation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.convocations cv
    where cv.id = p_convocation_id
      and public.categories_match_commun_visible(cv.match_id)
  )
$$;

revoke all on function public.categories_compte_educateur(uuid, uuid) from public, anon;
revoke all on function public.est_educateur_de_categorie(uuid) from public, anon;
revoke all on function public.peut_voir_categorie(uuid) from public, anon;
revoke all on function public.categories_commun_visible(uuid) from public, anon;
revoke all on function public.categories_commun_educateur(uuid) from public, anon;
revoke all on function public.categories_match_commun_visible(uuid) from public, anon;
revoke all on function public.categories_seance_commune_visible(uuid) from public, anon;
revoke all on function public.categories_convocation_commune_visible(uuid) from public, anon;
grant execute on function public.categories_compte_educateur(uuid, uuid) to authenticated, service_role;
grant execute on function public.est_educateur_de_categorie(uuid) to authenticated, service_role;
grant execute on function public.peut_voir_categorie(uuid) to authenticated, service_role;
grant execute on function public.categories_commun_visible(uuid) to authenticated, service_role;
grant execute on function public.categories_commun_educateur(uuid) to authenticated, service_role;
grant execute on function public.categories_match_commun_visible(uuid) to authenticated, service_role;
grant execute on function public.categories_seance_commune_visible(uuid) to authenticated, service_role;
grant execute on function public.categories_convocation_commune_visible(uuid) to authenticated, service_role;

-- ── 2. Effectif commun : fiches joueurs ─────────────────────────────────────
-- Lecture : tous ceux qui voient la catégorie.
drop policy if exists "categories_commun_lecture" on public.equipe_joueurs;
create policy "categories_commun_lecture" on public.equipe_joueurs
  for select to authenticated
  using (public.categories_commun_visible(categorie_id));

-- Modification par un éducateur de la catégorie. La fiche reste dans une
-- catégorie commune dont il est éducateur, et son « propriétaire »
-- (educateur_id) ne peut être qu'un éducateur de cette catégorie ou personne.
-- L'ajout d'un joueur passe par les règles existantes (l'éducateur ajoute
-- dans sa propre équipe ; la fiche rejoint la catégorie toute seule).
drop policy if exists "categories_commun_modification" on public.equipe_joueurs;
create policy "categories_commun_modification" on public.equipe_joueurs
  for update to authenticated
  using (public.categories_commun_educateur(categorie_id))
  with check (
    public.categories_commun_educateur(categorie_id)
    and (educateur_id is null or public.categories_compte_educateur(categorie_id, educateur_id))
  );

-- ── 3. Convocations et disponibilités des équipes de la catégorie ──────────
drop policy if exists "categories_commun_lecture" on public.convocations;
create policy "categories_commun_lecture" on public.convocations
  for select to authenticated
  using (public.categories_match_commun_visible(match_id));

drop policy if exists "categories_commun_lecture" on public.convocation_joueurs;
create policy "categories_commun_lecture" on public.convocation_joueurs
  for select to authenticated
  using (public.categories_convocation_commune_visible(convocation_id));

drop policy if exists "categories_commun_lecture" on public.convocation_reponses;
create policy "categories_commun_lecture" on public.convocation_reponses
  for select to authenticated
  using (public.categories_convocation_commune_visible(convocation_id));

drop policy if exists "categories_commun_lecture" on public.disponibilites;
create policy "categories_commun_lecture" on public.disponibilites
  for select to authenticated
  using (
    (match_id is not null and public.categories_match_commun_visible(match_id))
    or (seance_id is not null and public.categories_seance_commune_visible(seance_id))
  );

commit;

-- Résumé affiché à la fin (lecture seule).
select
  (select count(*) from public.categories where mode = 'commun') as categories_en_commun,
  (select count(*) from pg_policies where schemaname = 'public' and policyname like 'categories\_commun\_%') as regles_ajoutees;
