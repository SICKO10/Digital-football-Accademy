-- Bloc 8 (chantier catégories, PLAN-categories.md) : changement de mode.
--
-- Ce que fait ce fichier : deux fonctions, réservées au compte principal du
-- club (décision 2 du brief).
--   1. categories_mode_donnees : les joueurs de la catégorie avec, pour
--      chacun, le nombre de convocations et de présences par équipe (sert à
--      proposer une équipe à chaque joueur, le calcul est fait dans l'écran) ;
--   2. categorie_changer_mode : passe une catégorie d'un mode à l'autre, tout
--      ou rien.
--      - Par équipe → commun : seul le mode change. Les listes sont fusionnées
--        à l'affichage (bloc 3), aucune fiche ne bouge.
--      - Commun → par équipe : chaque joueur reçoit l'équipe choisie par le
--        club. Refusé si un joueur n'a pas d'équipe. Un joueur qui change
--        d'équipe passe chez le coach de sa nouvelle équipe, et son lien avec
--        l'ancien coach (affiliation) suit, quand c'est possible.
--
-- Dans les deux sens, rien n'est supprimé : matchs, entraînements,
-- convocations, présences, minutes et buts restent rattachés à l'équipe où ils
-- ont eu lieu, et à la même fiche joueur. Aucune règle d'accès n'est ajoutée
-- ni modifiée.
--
-- Avant de lancer : ~/Sauvegardes-DigitalFootball/sauvegarder.sh
-- À lancer en entier, d'un seul coup, dans Supabase (SQL Editor). Tout ou
-- rien. Relançable sans erreur.
-- Ensuite : supabase_categories_mode_verification.sql.

begin;

-- ── 0. Les blocs 1 et 3 doivent être appliqués ──────────────────────────────
do $$
begin
  if to_regclass('public.categories') is null
     or to_regprocedure('public.categories_commun_visible(uuid)') is null then
    raise exception 'Arrêt sans rien changer : appliquer d''abord supabase_categories.sql (bloc 1) et supabase_categories_commun.sql (bloc 3).';
  end if;
end $$;

-- ── 1. Données pour proposer une équipe à chaque joueur ─────────────────────
-- Une ligne par fiche de la catégorie. convocations et presences :
-- { "id de l'équipe": nombre }, comptés sur les matchs et entraînements des
-- équipes de la catégorie depuis p_depuis (toute l'histoire si vide).
-- Convocations : par compte (fiches sans compte : aucune). Présences : par fiche.
create or replace function public.categories_mode_donnees(p_categorie_id uuid, p_depuis date default null)
returns table (
  fiche_id uuid,
  joueur_id uuid,
  prenom text,
  nom text,
  equipe_id uuid,
  educateur_id uuid,
  created_at timestamptz,
  convocations jsonb,
  presences jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    ej.id,
    ej.joueur_id,
    ej.prenom::text,
    ej.nom::text,
    ej.club_categorie_id,
    ej.educateur_id,
    ej.created_at::timestamptz,
    coalesce((
      select jsonb_object_agg(x.equipe_id, x.n)
      from (
        select m.club_categorie_id as equipe_id, count(distinct cv.id) as n
        from public.convocation_joueurs cj
        join public.convocations cv on cv.id = cj.convocation_id
        join public.matchs_equipe m on m.id = cv.match_id
        join public.club_categories cc on cc.id = m.club_categorie_id
        where ej.joueur_id is not null
          and cj.joueur_id = ej.joueur_id
          and cc.categorie_id = c.id
          and cv.publiee is not false
          and (p_depuis is null or m.date >= p_depuis)
        group by m.club_categorie_id
      ) x
    ), '{}'::jsonb),
    coalesce((
      select jsonb_object_agg(x.equipe_id, x.n)
      from (
        select e.club_categorie_id as equipe_id, count(*) as n
        from public.presences_entrainement p
        join public.entrainements e on e.id = p.entrainement_id
        join public.club_categories cc on cc.id = e.club_categorie_id
        where p.joueur_id = ej.id
          and p.present is true
          and cc.categorie_id = c.id
          and (p_depuis is null or e.date >= p_depuis)
        group by e.club_categorie_id
      ) x
    ), '{}'::jsonb)
  from public.categories c
  join public.equipe_joueurs ej on ej.categorie_id = c.id
  where c.id = p_categorie_id
    and auth.uid() is not null
    and c.club_id = auth.uid()
$$;

-- ── 2. Changer le mode, tout ou rien ────────────────────────────────────────
-- p_repartition (commun → par équipe seulement) :
--   [{ "fiche_id": "...", "equipe_id": "..." }, ...]
-- Une ligne par joueur : chaque fiche sans compte, et une fiche par compte
-- (les autres fiches du même compte, rares, restent dans leur équipe).
-- Renvoie un résumé : fiches déplacées, affiliations déplacées, et la liste
-- des joueurs dont l'affiliation n'a pas pu suivre (avec la raison).
create or replace function public.categorie_changer_mode(p_categorie_id uuid, p_mode text, p_repartition jsonb default '[]'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cat public.categories%rowtype;
  v_n int;
  v_r record;
  v_a record;
  v_coach uuid;
  v_raison text;
  v_deplacees int := 0;
  v_aff int := 0;
  v_restees jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then
    raise exception 'Connexion requise.' using errcode = '42501';
  end if;

  select * into v_cat from public.categories where id = p_categorie_id for update;
  if not found or v_cat.club_id is distinct from auth.uid() then
    raise exception 'Seul le compte principal du club peut changer le mode de cette catégorie.' using errcode = '42501';
  end if;
  if p_mode is null or p_mode not in ('commun', 'par_equipe') then
    raise exception 'Mode inconnu : %', coalesce(p_mode, 'vide');
  end if;
  if v_cat.mode = p_mode then
    raise exception 'La catégorie % est déjà dans ce mode.', v_cat.nom;
  end if;

  -- Par équipe → commun : les listes sont fusionnées à l'affichage.
  if p_mode = 'commun' then
    update public.categories set mode = 'commun' where id = v_cat.id;
    return jsonb_build_object('mode', 'commun', 'fiches_deplacees', 0,
      'affiliations_deplacees', 0, 'affiliations_restees', '[]'::jsonb);
  end if;

  -- Commun → par équipe : contrôle complet de la répartition avant d'écrire.
  if p_repartition is null or jsonb_typeof(p_repartition) <> 'array' then
    raise exception 'Répartition manquante : chaque joueur doit recevoir une équipe.';
  end if;

  -- Personne ne modifie l'effectif pendant le changement.
  perform 1 from public.equipe_joueurs where categorie_id = v_cat.id for update;

  select count(*) into v_n
  from jsonb_to_recordset(p_repartition) r(fiche_id uuid, equipe_id uuid)
  left join public.equipe_joueurs ej on ej.id = r.fiche_id and ej.categorie_id = v_cat.id
  where ej.id is null;
  if v_n > 0 then
    raise exception 'Répartition refusée : % joueur(s) ne font pas partie de la catégorie %.', v_n, v_cat.nom;
  end if;

  select count(*) into v_n
  from jsonb_to_recordset(p_repartition) r(fiche_id uuid, equipe_id uuid)
  left join public.club_categories cc on cc.id = r.equipe_id and cc.categorie_id = v_cat.id
  where cc.id is null;
  if v_n > 0 then
    raise exception 'Répartition refusée : % joueur(s) sans équipe de la catégorie %.', v_n, v_cat.nom;
  end if;

  select count(*) - count(distinct r.fiche_id) into v_n
  from jsonb_to_recordset(p_repartition) r(fiche_id uuid, equipe_id uuid);
  if v_n > 0 then
    raise exception 'Répartition refusée : un joueur apparaît deux fois.';
  end if;

  select count(*) into v_n
  from (
    select ej.joueur_id
    from jsonb_to_recordset(p_repartition) r(fiche_id uuid, equipe_id uuid)
    join public.equipe_joueurs ej on ej.id = r.fiche_id
    where ej.joueur_id is not null
    group by ej.joueur_id
    having count(*) > 1
  ) x;
  if v_n > 0 then
    raise exception 'Répartition refusée : un même joueur reçoit deux équipes.';
  end if;

  -- Aucun joueur sans équipe : chaque fiche sans compte et chaque compte.
  select count(*) into v_n
  from (
    select ej.id::text
    from public.equipe_joueurs ej
    where ej.categorie_id = v_cat.id and ej.joueur_id is null
      and not exists (select 1 from jsonb_to_recordset(p_repartition) r(fiche_id uuid, equipe_id uuid)
                      where r.fiche_id = ej.id)
    union
    select ej.joueur_id::text
    from public.equipe_joueurs ej
    where ej.categorie_id = v_cat.id and ej.joueur_id is not null
      and not exists (select 1 from jsonb_to_recordset(p_repartition) r(fiche_id uuid, equipe_id uuid)
                      join public.equipe_joueurs e2 on e2.id = r.fiche_id
                      where e2.joueur_id = ej.joueur_id)
  ) x;
  if v_n > 0 then
    raise exception 'Répartition refusée : % joueur(s) sans équipe. Chaque joueur doit recevoir une équipe.', v_n;
  end if;

  update public.categories set mode = 'par_equipe' where id = v_cat.id;

  -- Seules les fiches qui changent d'équipe bougent : elles passent chez le
  -- coach de leur nouvelle équipe (aucun si l'équipe n'en a pas). Les autres
  -- gardent leur équipe et leur coach.
  for v_r in
    select ej.id as fiche_id, ej.joueur_id, ej.prenom, ej.nom,
           ej.club_categorie_id as ancienne_equipe, ej.educateur_id as ancien_coach,
           r.equipe_id as nouvelle_equipe, cc.educateur_id as nouveau_coach,
           trim(coalesce(cc.nom, '') || ' ' || coalesce(cc.equipe, '')) as equipe_label
    from jsonb_to_recordset(p_repartition) r(fiche_id uuid, equipe_id uuid)
    join public.equipe_joueurs ej on ej.id = r.fiche_id
    join public.club_categories cc on cc.id = r.equipe_id
    where ej.club_categorie_id is distinct from r.equipe_id
  loop
    update public.equipe_joueurs
    set club_categorie_id = v_r.nouvelle_equipe,
        educateur_id = v_r.nouveau_coach
    where id = v_r.fiche_id;
    v_deplacees := v_deplacees + 1;

    v_coach := v_r.nouveau_coach;
    if v_r.joueur_id is null or v_coach is not distinct from v_r.ancien_coach then
      continue;
    end if;

    -- Le lien du joueur avec son ancien coach suit : celui attaché à cette
    -- fiche, ou sans fiche précisée chez l'ancien coach. Un lien attaché à une
    -- autre fiche (autre catégorie du même coach) ne bouge pas.
    for v_a in
      select a.id
      from public.affiliations a
      where a.joueur_id = v_r.joueur_id
        and a.statut in ('accepte', 'en_attente')
        and (a.equipe_joueur_id = v_r.fiche_id
             or (a.equipe_joueur_id is null and a.educateur_id = v_r.ancien_coach))
        and a.educateur_id is distinct from v_coach
    loop
      if v_coach is null then
        v_raison := 'equipe_sans_coach';
      elsif exists (select 1 from public.affiliations a2
                    where a2.educateur_id = v_coach and a2.joueur_id = v_r.joueur_id) then
        v_raison := 'deja_lie';
      elsif exists (select 1 from public.equipe_joueurs e3
                    where e3.joueur_id = v_r.joueur_id and e3.id <> v_r.fiche_id
                      and e3.educateur_id = v_r.ancien_coach) then
        -- L'ancien coach le suit aussi dans une autre équipe : le lien reste.
        v_raison := 'ancien_coach_garde';
      else
        v_raison := null;
      end if;

      if v_raison is null then
        update public.affiliations set educateur_id = v_coach where id = v_a.id;
        v_aff := v_aff + 1;
      else
        v_restees := v_restees || jsonb_build_object(
          'fiche_id', v_r.fiche_id,
          'prenom', v_r.prenom,
          'nom', v_r.nom,
          'equipe', v_r.equipe_label,
          'raison', v_raison);
      end if;
    end loop;
  end loop;

  return jsonb_build_object('mode', 'par_equipe', 'fiches_deplacees', v_deplacees,
    'affiliations_deplacees', v_aff, 'affiliations_restees', v_restees);
end
$$;

revoke all on function public.categories_mode_donnees(uuid, date) from public, anon;
revoke all on function public.categorie_changer_mode(uuid, text, jsonb) from public, anon;
grant execute on function public.categories_mode_donnees(uuid, date) to authenticated, service_role;
grant execute on function public.categorie_changer_mode(uuid, text, jsonb) to authenticated, service_role;

commit;

-- Résumé affiché à la fin (lecture seule).
select
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname in ('categories_mode_donnees', 'categorie_changer_mode')) as fonctions_presentes,
  (select count(*) from public.categories where mode = 'commun') as categories_en_commun;
