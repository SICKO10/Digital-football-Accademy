-- Bloc 7 (chantier catégories, PLAN-categories.md) : renfort.
--
-- Un renfort = un joueur d'une autre équipe de la MÊME catégorie, convoqué
-- ponctuellement pour un match. Il reste dans l'effectif de son équipe
-- d'origine : aucune colonne n'est ajoutée, aucune fiche ne bouge. Il est
-- renfort quand l'équipe principale de sa fiche n'est pas l'équipe du match.
--
-- Ce que fait ce fichier (2 fonctions, 1 règle de lecture) :
--   1. categories_renforts_possibles(équipe) : les joueurs des AUTRES équipes
--      de la catégorie, avec seulement prénom, nom, poste, numéro, équipe et
--      le compte (nécessaire pour convoquer). Rien d'autre de la fiche.
--      Réservée à l'éducateur de l'équipe et au compte principal du club.
--      Ne renvoie rien si la catégorie est en effectif commun (tous les
--      joueurs sont déjà dans la liste) ou si l'équipe est seule.
--   2. categories_renforts_match(match) : les renforts d'un match, c'est-à-dire
--      les joueurs d'une autre équipe de la catégorie qui sont convoqués pour
--      ce match ou qui ont une ligne de statistiques sur ce match (colonne
--      « convoque » pour les distinguer). Réservée à l'éducateur du match et
--      au compte principal du club.
--   3. Règle de lecture ajoutée sur stats_match : l'éducateur d'un joueur
--      peut lire les statistiques de SES fiches, même saisies par un autre
--      éducateur (le renfort joue pour A, B continue de voir son joueur).
--      Aucune règle existante n'est modifiée ni retirée ; aucune règle
--      d'écriture n'est ajoutée : l'éducateur du match saisit avec ses droits
--      actuels (educateur_id = lui).
--
-- Mode « commun » : rien ne change (aucun renfort, tout le monde est déjà
-- dans la liste). Autre club : ne voit jamais rien.
--
-- Avant de lancer : ~/Sauvegardes-DigitalFootball/sauvegarder.sh
-- À lancer en entier, d'un seul coup, dans Supabase (SQL Editor). Tout ou
-- rien. Relançable sans erreur. Les blocs 1 et 3 (supabase_categories.sql et
-- supabase_categories_commun.sql) doivent être appliqués.
-- Ensuite : supabase_categories_renfort_verification.sql.

begin;

-- ── 0. Les blocs 1 et 3 doivent être appliqués ─────────────────────────────
do $$
begin
  if to_regprocedure('public.categories_compte_educateur(uuid,uuid)') is null then
    raise exception 'Arrêt sans rien changer : appliquer d''abord supabase_categories_commun.sql (bloc 3).';
  end if;
  if to_regclass('public.stats_match') is null then
    raise exception 'Arrêt sans rien changer : la table stats_match est introuvable.';
  end if;
end $$;

-- ── 1. Joueurs des autres équipes de la catégorie ──────────────────────────
create or replace function public.categories_renforts_possibles(p_club_categorie_id uuid)
returns table (
  fiche_id uuid,
  joueur_id uuid,
  prenom text,
  nom text,
  poste text,
  numero_maillot text,
  club_categorie_id uuid,
  equipe_nom text,
  equipe_lettre text
)
language sql
stable
security definer
set search_path = ''
as $$
  select ej.id, ej.joueur_id, ej.prenom, ej.nom, ej.poste, ej.numero_maillot::text,
         autre.id, autre.nom, autre.equipe
  from public.club_categories cc
  join public.categories c on c.id = cc.categorie_id
  join public.club_categories autre on autre.categorie_id = cc.categorie_id and autre.id <> cc.id
  join public.equipe_joueurs ej on ej.club_categorie_id = autre.id
  where cc.id = p_club_categorie_id
    and c.mode = 'par_equipe'
    and auth.uid() is not null
    and (c.club_id = auth.uid() or cc.educateur_id = auth.uid())
  order by autre.equipe, ej.nom, ej.prenom
$$;

-- ── 2. Renforts d'un match ─────────────────────────────────────────────────
-- « convoque » dit si le joueur est dans la convocation du match (un joueur
-- sans compte, ou dont la convocation a été retirée, n'apparaît ici que parce
-- qu'il a des statistiques sur ce match).
create or replace function public.categories_renforts_match(p_match_id uuid)
returns table (
  fiche_id uuid,
  joueur_id uuid,
  prenom text,
  nom text,
  poste text,
  numero_maillot text,
  club_categorie_id uuid,
  equipe_nom text,
  equipe_lettre text,
  convoque boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select x.fiche_id, x.joueur_id, x.prenom, x.nom, x.poste, x.numero_maillot,
         x.club_categorie_id, x.equipe_nom, x.equipe_lettre, x.convoque
  from (
    select ej.id as fiche_id, ej.joueur_id, ej.prenom, ej.nom, ej.poste, ej.numero_maillot::text as numero_maillot,
           autre.id as club_categorie_id, autre.nom as equipe_nom, autre.equipe as equipe_lettre,
           (ej.joueur_id is not null and exists (
              select 1
              from public.convocations cv
              join public.convocation_joueurs cj on cj.convocation_id = cv.id
              where cv.match_id = m.id and cj.joueur_id = ej.joueur_id
            )) as convoque,
           exists (
              select 1 from public.stats_match s where s.match_id = m.id and s.joueur_id = ej.id
            ) as a_des_stats
    from public.matchs_equipe m
    join public.club_categories cc on cc.id = m.club_categorie_id
    join public.categories c on c.id = cc.categorie_id
    join public.club_categories autre on autre.categorie_id = cc.categorie_id and autre.id <> cc.id
    join public.equipe_joueurs ej on ej.club_categorie_id = autre.id
    where m.id = p_match_id
      and auth.uid() is not null
      and (c.club_id = auth.uid() or m.educateur_id = auth.uid())
  ) x
  where x.convoque or x.a_des_stats
  order by x.equipe_lettre, x.nom, x.prenom
$$;

-- ── 3. L'éducateur d'un joueur lit les statistiques de ses fiches ──────────
-- Un renfort est saisi par l'éducateur du match : sans cette règle, son
-- éducateur d'origine ne verrait pas ces lignes.
do $$
begin
  if exists (select 1 from pg_class where oid = 'public.stats_match'::regclass and relrowsecurity) then
    drop policy if exists categories_renfort_stats_lecture on public.stats_match;
    create policy categories_renfort_stats_lecture on public.stats_match
      for select to authenticated
      using (
        exists (
          select 1 from public.equipe_joueurs ej
          where ej.id = stats_match.joueur_id and ej.educateur_id = auth.uid()
        )
      );
  end if;
end $$;

revoke all on function public.categories_renforts_possibles(uuid) from public, anon;
revoke all on function public.categories_renforts_match(uuid) from public, anon;
grant execute on function public.categories_renforts_possibles(uuid) to authenticated, service_role;
grant execute on function public.categories_renforts_match(uuid) to authenticated, service_role;

commit;

-- Résumé affiché à la fin (lecture seule) : doit afficher 2 fonctions et 1 règle.
select
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('categories_renforts_possibles', 'categories_renforts_match')) as fonctions,
  (select count(*) from pg_policies
   where schemaname = 'public' and tablename = 'stats_match'
     and policyname = 'categories_renfort_stats_lecture') as regle_stats;
