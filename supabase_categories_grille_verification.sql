-- Bloc 4 (chantier catégories) : vérification de supabase_categories_grille.sql.
--
-- Lecture seule pour la base : la simulation est entièrement annulée à la fin.
-- À lancer en entier dans Supabase (SQL Editor), après supabase_categories_grille.sql.
-- Résultat : un tableau ; la colonne « ok » doit valoir true partout (vide =
-- ligne pour information).
--
-- Déroulé de la simulation (rien n'est gardé) :
--   - une vraie équipe T ayant un coach (éducateur A) ;
--   - une équipe d'essai « ZZ9 » ajoutée dans la même catégorie, confiée à un
--     autre éducateur B ; un match d'essai pour chacune, le même jour ;
--   - la catégorie reste d'abord « par équipe », puis passe en « commun » ;
--   - deux joueurs d'essai (deux comptes existants, fiches d'essai) ;
--   - un éducateur C d'un autre club et un compte inconnu servent de témoins.

create temp table if not exists controle_categories_grille (ordre int, cas text, attendu text, obtenu text);
truncate controle_categories_grille;

create or replace function pg_temp.connecter(p_compte uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_compte::text, ''), true);
  perform set_config('request.jwt.claims',
    case when p_compte is null then '{}' else json_build_object('sub', p_compte, 'role', 'authenticated')::text end, true);
end
$$;

-- ── Contrôles de structure ──────────────────────────────────────────────────
insert into controle_categories_grille
select 1, 'Les 4 fonctions de la grille sont présentes', '4',
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('categories_grille_matchs', 'categories_grille_convoques',
                       'categories_grille_prochaine_date', 'categories_publier_convocation'))::text
union all
select 2, 'Personne d''autre que les connectés ne peut les appeler (anon refusé)', '0',
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('categories_grille_matchs', 'categories_grille_convoques',
                       'categories_grille_prochaine_date', 'categories_publier_convocation')
     and has_function_privilege('anon', p.oid, 'execute'))::text
union all
select 3, 'Aucune règle d''accès ajoutée par ce bloc (règles « categories_commun » inchangées : 6)', '6',
  (select count(*) from pg_policies where schemaname = 'public' and policyname like 'categories\_commun\_%')::text
union all
select 4, 'Catégories en mode commun avant les essais (pour info)', null,
  (select count(*) from public.categories where mode = 'commun')::text;

-- ── Simulation ──────────────────────────────────────────────────────────────
do $$
declare
  v_t uuid; v_club uuid; v_cat uuid; v_nom text; v_a uuid;
  v_b uuid; v_c uuid; v_inconnu uuid := gen_random_uuid();
  v_equipe_b uuid; v_match_a uuid; v_match_b uuid;
  v_p1 uuid; v_p2 uuid; v_p3 uuid;
  v_date date := date '2099-01-02';
  v_conv uuid; v_n int; v_txt text; v_attendu_date date;
  v_res jsonb := '[]'::jsonb;
begin
  select cc.id, cc.club_id, cc.categorie_id, cc.nom, cc.educateur_id
    into v_t, v_club, v_cat, v_nom, v_a
  from public.club_categories cc
  where cc.club_id is not null and cc.categorie_id is not null
    and cc.educateur_id is not null and cc.educateur_id <> cc.club_id
  order by cc.id
  limit 1;
  if v_t is null then
    raise exception 'Aucune équipe de club avec un coach : vérification impossible';
  end if;

  select cc.educateur_id into v_b
  from public.club_categories cc
  where cc.educateur_id is not null and cc.educateur_id not in (v_a, v_club)
    and not public.categories_compte_educateur(v_cat, cc.educateur_id)
  order by (cc.club_id = v_club) desc, cc.educateur_id limit 1;

  select cc.educateur_id into v_c
  from public.club_categories cc
  where cc.educateur_id is not null and cc.educateur_id not in (v_a, v_club, coalesce(v_b, v_inconnu))
    and not exists (select 1 from public.club_categories x where x.club_id = v_club and x.educateur_id = cc.educateur_id)
    and not exists (select 1 from public.staff_club s where s.club_id = v_club and s.user_id = cc.educateur_id)
  order by cc.educateur_id limit 1;

  if v_b is null then
    raise exception 'Il faut au moins deux coachs dans la base pour cette vérification';
  end if;

  -- Trois comptes existants servant de joueurs d'essai (jamais dans un effectif).
  select (array_agg(p.id order by p.id))[1], (array_agg(p.id order by p.id))[2], (array_agg(p.id order by p.id))[3]
    into v_p1, v_p2, v_p3
  from (select id from public.profiles pr
        where not exists (select 1 from public.equipe_joueurs ej where ej.joueur_id = pr.id)
          and pr.id not in (v_a, v_b, v_club)
        order by id limit 3) p;
  if v_p3 is null then
    raise exception 'Il faut trois comptes sans fiche joueur pour cette vérification';
  end if;

  begin
    insert into public.club_categories (club_id, nom, equipe, educateur_id)
      values (v_club, v_nom, 'ZZ9', v_b)
      returning id into v_equipe_b;

    -- Joueurs d'essai : P1 et P2 dans l'effectif (équipe T), P3 hors catégorie.
    insert into public.equipe_joueurs (prenom, nom, educateur_id, club_categorie_id, joueur_id)
      values ('Essai', 'Bloc4 1', v_a, v_t, v_p1), ('Essai', 'Bloc4 2', v_a, v_t, v_p2);

    insert into public.matchs_equipe (educateur_id, club_categorie_id, date, heure, adversaire, domicile)
      values (v_a, v_t, v_date, '14:00', 'Essai bloc 4 A', true) returning id into v_match_a;
    insert into public.matchs_equipe (educateur_id, club_categorie_id, date, heure, adversaire, domicile)
      values (v_b, v_equipe_b, v_date, '15:30', 'Essai bloc 4 B', false) returning id into v_match_b;

    -- ─ Mode par équipe : la grille ne donne rien, la publication est refusée ─
    perform pg_temp.connecter(v_a);
    execute 'set local role authenticated';
    select count(*) into v_n from public.categories_grille_matchs(v_cat, v_date);
    v_res := v_res || jsonb_build_object('ordre', 10, 'cas', 'Par équipe : la grille ne montre aucun match', 'attendu', '0', 'obtenu', v_n::text);
    begin
      perform public.categories_publier_convocation(v_match_a, array[v_p1], now() + interval '3 days');
      v_txt := 'accepté';
    exception when raise_exception then v_txt := 'refusé'; end;
    v_res := v_res || jsonb_build_object('ordre', 11, 'cas', 'Par équipe : publier par la grille est refusé', 'attendu', 'refusé', 'obtenu', v_txt);
    execute 'reset role';

    -- ─ Passage en commun ─
    perform pg_temp.connecter(null);
    update public.categories set mode = 'commun' where id = v_cat;

    perform pg_temp.connecter(v_a);
    execute 'set local role authenticated';
    select count(*) into v_n from public.categories_grille_matchs(v_cat, v_date);
    v_res := v_res || jsonb_build_object('ordre', 20, 'cas', 'Commun : l''éducateur A voit les matchs des deux équipes ce jour-là', 'attendu', '2', 'obtenu', v_n::text);
    select count(*) into v_n from public.categories_grille_matchs(v_cat, v_date + 1);
    v_res := v_res || jsonb_build_object('ordre', 21, 'cas', 'Commun : un autre jour, aucun match', 'attendu', '0', 'obtenu', v_n::text);
    execute 'reset role';

    perform pg_temp.connecter(v_b);
    execute 'set local role authenticated';
    select count(*) into v_n from public.categories_grille_matchs(v_cat, v_date);
    v_res := v_res || jsonb_build_object('ordre', 22, 'cas', 'Commun : l''éducateur B voit aussi les deux matchs', 'attendu', '2', 'obtenu', v_n::text);
    execute 'reset role';

    perform pg_temp.connecter(coalesce(v_c, v_inconnu));
    execute 'set local role authenticated';
    select count(*) into v_n from public.categories_grille_matchs(v_cat, v_date);
    v_res := v_res || jsonb_build_object('ordre', 23, 'cas', 'Commun : un éducateur d''un autre club (ou inconnu) ne voit rien', 'attendu', '0', 'obtenu', v_n::text);
    begin
      perform public.categories_publier_convocation(v_match_a, array[v_p1], now() + interval '3 days');
      v_txt := 'accepté';
    exception when raise_exception then v_txt := 'refusé'; end;
    v_res := v_res || jsonb_build_object('ordre', 24, 'cas', 'Commun : un autre club ne peut pas convoquer', 'attendu', 'refusé', 'obtenu', v_txt);
    execute 'reset role';

    perform pg_temp.connecter(null);
    execute 'set local role authenticated';
    select count(*) into v_n from public.categories_grille_matchs(v_cat, v_date);
    v_res := v_res || jsonb_build_object('ordre', 25, 'cas', 'Commun : sans connexion, aucun match', 'attendu', '0', 'obtenu', v_n::text);
    execute 'reset role';

    -- ─ Éducateur A convoque pour son équipe ─
    perform pg_temp.connecter(v_a);
    execute 'set local role authenticated';
    v_conv := public.categories_publier_convocation(v_match_a, array[v_p1, v_p2], now() + interval '3 days');
    execute 'reset role';
    select count(*) into v_n from public.convocation_joueurs where convocation_id = v_conv;
    v_res := v_res || jsonb_build_object('ordre', 30, 'cas', 'A convoque 2 joueurs pour son match', 'attendu', '2', 'obtenu', v_n::text);
    select count(*) into v_n from public.convocations where id = v_conv and publiee and educateur_id = v_a;
    v_res := v_res || jsonb_build_object('ordre', 31, 'cas', 'La convocation est publiée, au nom de l''éducateur du match', 'attendu', '1', 'obtenu', v_n::text);

    perform pg_temp.connecter(v_a);
    execute 'set local role authenticated';
    begin
      perform public.categories_publier_convocation(v_match_b, array[v_p1], now() + interval '3 days');
      v_txt := 'accepté';
    exception when raise_exception then v_txt := 'refusé'; end;
    v_res := v_res || jsonb_build_object('ordre', 32, 'cas', 'A ne peut pas convoquer pour l''équipe de B', 'attendu', 'refusé', 'obtenu', v_txt);
    begin
      perform public.categories_publier_convocation(v_match_a, array[v_p3], now() + interval '3 days');
      v_txt := 'accepté';
    exception when raise_exception then v_txt := 'refusé'; end;
    v_res := v_res || jsonb_build_object('ordre', 33, 'cas', 'Un joueur hors effectif de la catégorie est refusé', 'attendu', 'refusé', 'obtenu', v_txt);
    execute 'reset role';
    select count(*) into v_n from public.convocation_joueurs where convocation_id = v_conv;
    v_res := v_res || jsonb_build_object('ordre', 34, 'cas', 'Après un refus, le groupe convoqué n''a pas bougé (tout ou rien)', 'attendu', '2', 'obtenu', v_n::text);

    -- Terrain et arbitre saisis par ailleurs sont conservés à la republication.
    update public.convocations set type_terrain = 'Synthétique', arbitre_nom = 'Essai arbitre', notes = 'Essai notes' where id = v_conv;
    perform pg_temp.connecter(v_a);
    execute 'set local role authenticated';
    perform public.categories_publier_convocation(v_match_a, array[v_p1], now() + interval '3 days');
    execute 'reset role';
    select count(*) into v_n from public.convocation_joueurs where convocation_id = v_conv;
    v_res := v_res || jsonb_build_object('ordre', 35, 'cas', 'Republier remplace le groupe (1 joueur) sur la même convocation', 'attendu', '1', 'obtenu', v_n::text);
    select count(*) into v_n from public.convocations where match_id = v_match_a;
    v_res := v_res || jsonb_build_object('ordre', 36, 'cas', 'Une seule convocation par match', 'attendu', '1', 'obtenu', v_n::text);
    select count(*) into v_n from public.convocations
      where id = v_conv and type_terrain = 'Synthétique' and arbitre_nom = 'Essai arbitre' and notes = 'Essai notes';
    v_res := v_res || jsonb_build_object('ordre', 37, 'cas', 'Terrain, arbitre et notes conservés', 'attendu', '1', 'obtenu', v_n::text);

    -- ─ Le club convoque pour toutes les équipes ─
    perform pg_temp.connecter(v_club);
    execute 'set local role authenticated';
    v_conv := public.categories_publier_convocation(v_match_b, array[v_p2], now() + interval '3 days');
    execute 'reset role';
    select count(*) into v_n from public.convocations where id = v_conv and educateur_id = v_b;
    v_res := v_res || jsonb_build_object('ordre', 40, 'cas', 'Le club convoque pour l''équipe de B ; la convocation reste au nom de B', 'attendu', '1', 'obtenu', v_n::text);

    -- ─ B voit les convoqués des deux équipes (conflits, bloc 5) ─
    perform pg_temp.connecter(v_b);
    execute 'set local role authenticated';
    select count(*) into v_n from public.categories_grille_convoques(v_cat, v_date);
    v_res := v_res || jsonb_build_object('ordre', 50, 'cas', 'B voit les convoqués des deux matchs (1 en A, 1 en B)', 'attendu', '2', 'obtenu', v_n::text);
    select count(*) into v_n from public.categories_grille_matchs(v_cat, v_date) where convocation_publiee;
    v_res := v_res || jsonb_build_object('ordre', 51, 'cas', 'La grille indique les deux convocations publiées', 'attendu', '2', 'obtenu', v_n::text);
    execute 'reset role';
    select min(m.date::date) into v_attendu_date
      from public.matchs_equipe m join public.club_categories cc on cc.id = m.club_categorie_id
      where cc.categorie_id = v_cat and m.date::date >= current_date;
    perform pg_temp.connecter(v_b);
    execute 'set local role authenticated';
    v_res := v_res || jsonb_build_object('ordre', 52, 'cas', 'Prochaine date de match de la catégorie',
      'attendu', v_attendu_date::text, 'obtenu', public.categories_grille_prochaine_date(v_cat)::text);
    execute 'reset role';

    v_res := v_res || jsonb_build_object('ordre', 60, 'cas', 'Tous les cas d''essai ont tourné jusqu''au bout', 'attendu', 'oui', 'obtenu', 'oui');

    -- Tout annuler : seules les valeurs de v_res survivent.
    raise exception using errcode = 'P0001', message = 'fin_du_controle';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'fin_du_controle' then
      raise;
    end if;
  end;

  perform pg_temp.connecter(null);
  insert into controle_categories_grille (ordre, cas, attendu, obtenu)
  select r.ordre, r.cas, r.attendu, r.obtenu
  from jsonb_to_recordset(v_res) as r(ordre int, cas text, attendu text, obtenu text);
end $$;

-- ── Après la simulation : rien n'est resté ──────────────────────────────────
insert into controle_categories_grille
select 70, 'Rien n''est resté de la simulation (équipe ZZ9, matchs et fiches d''essai, mode commun)', '0,0,0,0',
  (select count(*) from public.club_categories where equipe = 'ZZ9') || ',' ||
  (select count(*) from public.matchs_equipe where adversaire like 'Essai bloc 4%') || ',' ||
  (select count(*) from public.equipe_joueurs where nom like 'Bloc4 %') || ',' ||
  ((select count(*) from public.categories where mode = 'commun')
   - (select obtenu::int from controle_categories_grille where ordre = 4));

select ordre, cas, attendu, obtenu, case when attendu is null then null else attendu = obtenu end as ok
from controle_categories_grille
order by ordre;
