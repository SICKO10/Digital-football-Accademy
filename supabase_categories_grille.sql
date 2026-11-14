-- Bloc 4 (chantier catégories, PLAN-categories.md) : grille de convocation.
--
-- Ce que fait ce fichier (4 fonctions, aucune règle d'accès modifiée) :
--   1. categories_grille_matchs(catégorie, date) : les matchs de toutes les
--      équipes d'une catégorie EN EFFECTIF COMMUN un jour donné, avec
--      seulement les colonnes utiles à la grille (équipe, heure, adversaire,
--      convocation). Réservée à ceux qui voient la catégorie (club, ses
--      éducateurs, staff concerné). On ne passe PAS par une règle de lecture
--      sur matchs_equipe : certains écrans lisent tous les matchs visibles
--      sans filtre et en afficheraient trop.
--   2. categories_grille_convoques(catégorie, date) : qui est déjà convoqué
--      pour ces matchs (compte du joueur).
--   3. categories_grille_prochaine_date(catégorie) : date du prochain match de
--      la catégorie (la grille s'ouvre dessus).
--   4. categories_publier_convocation(match, joueurs, expiration) : publie la
--      convocation d'un match et remplace le groupe convoqué, en une seule
--      opération (tout ou rien). Autorisée pour l'éducateur du match (son
--      équipe seulement) et pour le compte principal du club (toutes les
--      équipes). Refuse tout joueur qui n'est pas dans l'effectif de la
--      catégorie. Si une convocation existe déjà, terrain, arbitre, notes et
--      programme sont conservés.
--
-- Mode « par équipe » : ces fonctions refusent ou ne renvoient rien, rien ne
-- change. Un autre club ne voit jamais rien.
--
-- Avant de lancer : ~/Sauvegardes-DigitalFootball/sauvegarder.sh
-- À lancer en entier, d'un seul coup, dans Supabase (SQL Editor). Tout ou
-- rien. Relançable sans erreur. Le bloc 3 (supabase_categories_commun.sql)
-- doit être appliqué.
-- Ensuite : supabase_categories_grille_verification.sql.

begin;

-- ── 0. Le bloc 3 doit être appliqué ─────────────────────────────────────────
do $$
begin
  if to_regprocedure('public.categories_commun_visible(uuid)') is null
     or to_regprocedure('public.categories_compte_educateur(uuid,uuid)') is null then
    raise exception 'Arrêt sans rien changer : appliquer d''abord supabase_categories_commun.sql (bloc 3).';
  end if;
end $$;

-- ── 1. Matchs de la catégorie un jour donné ────────────────────────────────
create or replace function public.categories_grille_matchs(p_categorie_id uuid, p_date date)
returns table (
  match_id uuid,
  club_categorie_id uuid,
  equipe_nom text,
  equipe_lettre text,
  date date,
  heure text,
  adversaire text,
  domicile boolean,
  educateur_id uuid,
  convocation_id uuid,
  convocation_publiee boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, cc.id, cc.nom, cc.equipe, m.date::date, m.heure, m.adversaire, m.domicile,
         m.educateur_id, cv.id, cv.publiee
  from public.matchs_equipe m
  join public.club_categories cc on cc.id = m.club_categorie_id
  left join public.convocations cv on cv.match_id = m.id
  where cc.categorie_id = p_categorie_id
    and m.date::date = p_date
    and public.categories_commun_visible(p_categorie_id)
  order by cc.equipe, m.heure, m.id
$$;

-- ── 2. Convoqués de ces matchs ─────────────────────────────────────────────
create or replace function public.categories_grille_convoques(p_categorie_id uuid, p_date date)
returns table (match_id uuid, joueur_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, cj.joueur_id
  from public.matchs_equipe m
  join public.club_categories cc on cc.id = m.club_categorie_id
  join public.convocations cv on cv.match_id = m.id
  join public.convocation_joueurs cj on cj.convocation_id = cv.id
  where cc.categorie_id = p_categorie_id
    and m.date::date = p_date
    and public.categories_commun_visible(p_categorie_id)
$$;

-- ── 3. Prochaine date de match de la catégorie ─────────────────────────────
create or replace function public.categories_grille_prochaine_date(p_categorie_id uuid)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select min(m.date::date)
  from public.matchs_equipe m
  join public.club_categories cc on cc.id = m.club_categorie_id
  where cc.categorie_id = p_categorie_id
    and m.date::date >= current_date
    and public.categories_commun_visible(p_categorie_id)
$$;

-- ── 4. Publier la convocation d'un match ───────────────────────────────────
create or replace function public.categories_publier_convocation(
  p_match_id uuid,
  p_joueur_ids uuid[],
  p_expire_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_educateur uuid;
  v_equipe uuid;
  v_categorie uuid;
  v_club uuid;
  v_mode text;
  v_ids uuid[];
  v_inconnus int;
  v_convocation uuid;
begin
  if auth.uid() is null then
    raise exception 'Connexion requise.';
  end if;

  select m.educateur_id, m.club_categorie_id into v_educateur, v_equipe
  from public.matchs_equipe m where m.id = p_match_id;
  if not found or v_equipe is null then
    raise exception 'Match introuvable ou sans équipe.';
  end if;

  select c.id, c.club_id, c.mode into v_categorie, v_club, v_mode
  from public.club_categories cc
  join public.categories c on c.id = cc.categorie_id
  where cc.id = v_equipe;
  if v_categorie is null or v_mode <> 'commun' then
    raise exception 'Cette catégorie n''est pas en effectif commun.';
  end if;

  -- Éducateur : son équipe seulement. Club : toutes les équipes.
  if not (
    v_club = auth.uid()
    or (v_educateur = auth.uid() and public.categories_compte_educateur(v_categorie, auth.uid()))
  ) then
    raise exception 'Tu ne peux pas convoquer pour cette équipe.';
  end if;

  select coalesce(array_agg(distinct x), '{}') into v_ids from unnest(coalesce(p_joueur_ids, '{}')) x;

  -- Chaque joueur convoqué doit faire partie de l'effectif de la catégorie.
  select count(*) into v_inconnus
  from unnest(v_ids) x
  where not exists (
    select 1 from public.equipe_joueurs ej
    where ej.categorie_id = v_categorie and ej.joueur_id = x
  );
  if v_inconnus > 0 then
    raise exception 'Un joueur n''est pas dans l''effectif de la catégorie.';
  end if;

  insert into public.convocations (match_id, educateur_id, publiee, publiee_at, expire_at)
  values (p_match_id, v_educateur, true, now(), p_expire_at)
  on conflict (match_id) do update
    set publiee = true, publiee_at = now(), expire_at = excluded.expire_at, updated_at = now()
  returning id into v_convocation;

  delete from public.convocation_joueurs where convocation_id = v_convocation;
  insert into public.convocation_joueurs (convocation_id, joueur_id)
  select v_convocation, x from unnest(v_ids) x;

  return v_convocation;
end
$$;

revoke all on function public.categories_grille_matchs(uuid, date) from public, anon;
revoke all on function public.categories_grille_convoques(uuid, date) from public, anon;
revoke all on function public.categories_grille_prochaine_date(uuid) from public, anon;
revoke all on function public.categories_publier_convocation(uuid, uuid[], timestamptz) from public, anon;
grant execute on function public.categories_grille_matchs(uuid, date) to authenticated, service_role;
grant execute on function public.categories_grille_convoques(uuid, date) to authenticated, service_role;
grant execute on function public.categories_grille_prochaine_date(uuid) to authenticated, service_role;
grant execute on function public.categories_publier_convocation(uuid, uuid[], timestamptz) to authenticated, service_role;

commit;

-- Résumé affiché à la fin (lecture seule) : doit afficher 4.
select count(*) as fonctions_grille
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and (p.proname like 'categories\_grille\_%' or p.proname = 'categories_publier_convocation');
