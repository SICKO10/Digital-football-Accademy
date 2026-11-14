-- Bloc 7 (chantier catégories) : vérification de supabase_categories_renfort.sql.
--
-- Lecture seule pour la base : la simulation est entièrement annulée à la fin.
-- À lancer en entier dans Supabase (SQL Editor), après supabase_categories_renfort.sql.
-- Résultat : un tableau ; la colonne « ok » doit valoir true partout (vide =
-- ligne pour information).
--
-- Déroulé de la simulation (rien n'est gardé) :
--   - une vraie équipe T ayant un coach (éducateur A), catégorie « par équipe » ;
--   - une équipe d'essai « ZZ9 » ajoutée dans la même catégorie, confiée à un
--     autre éducateur B, avec deux joueurs d'essai (un avec compte, un sans) ;
--   - un match d'essai pour T ;
--   - A convoque le joueur de ZZ9 et saisit des statistiques avec ses droits
--     actuels (la ligne « accepté » prouve que la règle d'écriture existante
--     le permet) ;
--   - un éducateur C d'un autre club et un compte inconnu servent de témoins.

create temp table if not exists controle_categories_renfort (ordre int, cas text, attendu text, obtenu text);
truncate controle_categories_renfort;

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
insert into controle_categories_renfort
select 1, 'Les 2 fonctions du renfort sont présentes', '2',
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('categories_renforts_possibles', 'categories_renforts_match'))::text
union all
select 2, 'Les visiteurs non connectés ne peuvent pas les appeler (anon refusé)', '0',
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('categories_renforts_possibles', 'categories_renforts_match')
     and has_function_privilege('anon', p.oid, 'execute'))::text
union all
select 3, 'La règle de lecture des stats de ses propres fiches est présente', '1',
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'stats_match'
     and policyname = 'categories_renfort_stats_lecture')::text
union all
select 4, 'Catégories en mode commun avant les essais (pour info)', null,
  (select count(*) from public.categories where mode = 'commun')::text;

-- ── Simulation ──────────────────────────────────────────────────────────────
do $$
declare
  v_t uuid; v_club uuid; v_cat uuid; v_nom text; v_a uuid;
  v_b uuid; v_c uuid; v_inconnu uuid := gen_random_uuid();
  v_equipe_b uuid; v_match uuid; v_conv uuid;
  v_p1 uuid; v_f_a uuid; v_f_compte uuid; v_f_sans uuid;
  v_n int; v_txt text; v_mode text;
  v_res jsonb := '[]'::jsonb;
begin
  select cc.id, cc.club_id, cc.categorie_id, cc.nom, cc.educateur_id
    into v_t, v_club, v_cat, v_nom, v_a
  from public.club_categories cc
  join public.categories c on c.id = cc.categorie_id and c.mode = 'par_equipe'
  where cc.club_id is not null and cc.educateur_id is not null and cc.educateur_id <> cc.club_id
    and exists (select 1 from public.profil_educateur pe where pe.user_id = cc.educateur_id)
  order by cc.id
  limit 1;
  if v_t is null then
    raise exception 'Aucune équipe de club « par équipe » avec un coach : vérification impossible';
  end if;

  select cc.educateur_id into v_b
  from public.club_categories cc
  where cc.educateur_id is not null and cc.educateur_id not in (v_a, v_club)
    and not public.categories_compte_educateur(v_cat, cc.educateur_id)
    and not exists (select 1 from public.staff_club s where s.club_id = v_club and s.user_id = cc.educateur_id)
  order by (cc.club_id = v_club) desc, cc.educateur_id limit 1;
  if v_b is null then
    raise exception 'Il faut au moins deux coachs dans la base pour cette vérification';
  end if;

  select cc.educateur_id into v_c
  from public.club_categories cc
  where cc.educateur_id is not null and cc.educateur_id not in (v_a, v_club, v_b)
    and not exists (select 1 from public.club_categories x where x.club_id = v_club and x.educateur_id = cc.educateur_id)
    and not exists (select 1 from public.staff_club s where s.club_id = v_club and s.user_id = cc.educateur_id)
  order by cc.educateur_id limit 1;

  -- Un compte existant servant de joueur d'essai (jamais dans un effectif).
  select pr.id into v_p1
  from public.profiles pr
  where not exists (select 1 from public.equipe_joueurs ej where ej.joueur_id = pr.id)
    and pr.id not in (v_a, v_b, v_club)
  order by pr.id limit 1;
  if v_p1 is null then
    raise exception 'Il faut un compte sans fiche joueur pour cette vérification';
  end if;

  begin
    insert into public.club_categories (club_id, nom, equipe, educateur_id)
      values (v_club, v_nom, 'ZZ9', v_b)
      returning id into v_equipe_b;

    insert into public.equipe_joueurs (prenom, nom, educateur_id, club_categorie_id, joueur_id)
      values ('Essai', 'Bloc7 Compte', v_b, v_equipe_b, v_p1) returning id into v_f_compte;
    insert into public.equipe_joueurs (prenom, nom, educateur_id, club_categorie_id, joueur_id)
      values ('Essai', 'Bloc7 Sans', v_b, v_equipe_b, null) returning id into v_f_sans;
    insert into public.equipe_joueurs (prenom, nom, educateur_id, club_categorie_id, joueur_id)
      values ('Essai', 'Bloc7 Maison', v_a, v_t, null) returning id into v_f_a;

    insert into public.matchs_equipe (educateur_id, club_categorie_id, date, heure, adversaire, domicile)
      values (v_a, v_t, date '2099-01-02', '14:00', 'Essai bloc 7', true) returning id into v_match;

    -- ─ Liste des renforts possibles ─
    perform pg_temp.connecter(v_a);
    execute 'set local role authenticated';
    select count(*) into v_n from public.categories_renforts_possibles(v_t)
      where fiche_id in (v_f_compte, v_f_sans);
    v_res := v_res || jsonb_build_object('ordre', 10, 'cas', 'A voit les 2 joueurs d''essai de ZZ9 comme renforts possibles', 'attendu', '2', 'obtenu', v_n::text);
    select count(*) into v_n from public.categories_renforts_possibles(v_t) where fiche_id = v_f_a;
    v_res := v_res || jsonb_build_object('ordre', 11, 'cas', 'A ne se voit pas lui-même : ses propres joueurs ne sont pas des renforts', 'attendu', '0', 'obtenu', v_n::text);
    select count(*) into v_n from public.categories_renforts_possibles(v_equipe_b);
    v_res := v_res || jsonb_build_object('ordre', 12, 'cas', 'A ne peut pas demander les renforts de l''équipe de B', 'attendu', '0', 'obtenu', v_n::text);
    execute 'reset role';

    perform pg_temp.connecter(v_club);
    execute 'set local role authenticated';
    select count(*) into v_n from public.categories_renforts_possibles(v_t) where fiche_id in (v_f_compte, v_f_sans);
    v_res := v_res || jsonb_build_object('ordre', 13, 'cas', 'Le compte principal du club voit aussi les renforts possibles', 'attendu', '2', 'obtenu', v_n::text);
    execute 'reset role';

    perform pg_temp.connecter(coalesce(v_c, v_inconnu));
    execute 'set local role authenticated';
    select count(*) into v_n from public.categories_renforts_possibles(v_t);
    v_res := v_res || jsonb_build_object('ordre', 14, 'cas', 'Un éducateur d''un autre club (ou inconnu) ne voit rien', 'attendu', '0', 'obtenu', v_n::text);
    execute 'reset role';

    perform pg_temp.connecter(null);
    execute 'set local role authenticated';
    select count(*) into v_n from public.categories_renforts_possibles(v_t);
    v_res := v_res || jsonb_build_object('ordre', 15, 'cas', 'Sans connexion, aucun renfort', 'attendu', '0', 'obtenu', v_n::text);
    execute 'reset role';

    -- ─ A convoque le renfort et saisit ses statistiques (droits actuels) ─
    perform pg_temp.connecter(v_a);
    execute 'set local role authenticated';
    select count(*) into v_n from public.categories_renforts_match(v_match);
    v_res := v_res || jsonb_build_object('ordre', 20, 'cas', 'Avant toute convocation, aucun renfort sur le match', 'attendu', '0', 'obtenu', v_n::text);
    begin
      insert into public.convocations (match_id, educateur_id, publiee, publiee_at, expire_at)
        values (v_match, v_a, true, now(), now() + interval '3 days') returning id into v_conv;
      insert into public.convocation_joueurs (convocation_id, joueur_id) values (v_conv, v_p1);
      v_txt := 'accepté';
    exception when others then v_txt := 'refusé : ' || sqlerrm; end;
    v_res := v_res || jsonb_build_object('ordre', 21, 'cas', 'A convoque le joueur de ZZ9 avec ses droits actuels', 'attendu', 'accepté', 'obtenu', v_txt);
    select count(*) into v_n from public.categories_renforts_match(v_match) where fiche_id = v_f_compte;
    v_res := v_res || jsonb_build_object('ordre', 22, 'cas', 'Le joueur convoqué apparaît comme renfort du match', 'attendu', '1', 'obtenu', v_n::text);
    select equipe_nom || ' ' || equipe_lettre into v_txt from public.categories_renforts_match(v_match) where fiche_id = v_f_compte;
    v_res := v_res || jsonb_build_object('ordre', 23, 'cas', 'Son équipe d''origine est indiquée (« renfort ' || v_nom || ' ZZ9 »)', 'attendu', v_nom || ' ZZ9', 'obtenu', coalesce(v_txt, 'rien'));
    begin
      insert into public.stats_match (match_id, joueur_id, educateur_id, minutes)
        values (v_match, v_f_compte, v_a, 60), (v_match, v_f_sans, v_a, 30), (v_match, v_f_a, v_a, 90);
      v_txt := 'accepté';
    exception when others then v_txt := 'refusé : ' || sqlerrm; end;
    v_res := v_res || jsonb_build_object('ordre', 24, 'cas', 'A saisit les stats du match pour son équipe et les renforts (droits actuels)', 'attendu', 'accepté', 'obtenu', v_txt);
    select count(*) into v_n from public.categories_renforts_match(v_match) where fiche_id = v_f_sans and not convoque;
    v_res := v_res || jsonb_build_object('ordre', 26, 'cas', 'Le joueur sans compte n''est pas marqué « convoqué »', 'attendu', '1', 'obtenu', v_n::text);
    select count(*) into v_n from public.categories_renforts_match(v_match);
    v_res := v_res || jsonb_build_object('ordre', 25, 'cas', 'Le match compte 2 renforts (convoqué + joueur sans compte avec stats), pas le joueur de A', 'attendu', '2', 'obtenu', v_n::text);
    execute 'reset role';

    -- ─ B garde la main sur ses joueurs ─
    perform pg_temp.connecter(v_b);
    execute 'set local role authenticated';
    select count(*) into v_n from public.stats_match where match_id = v_match;
    v_res := v_res || jsonb_build_object('ordre', 30, 'cas', 'B lit les stats des 2 joueurs prêtés (pas celles du joueur de A)', 'attendu', '2', 'obtenu', v_n::text);
    select count(*) into v_n from public.categories_renforts_match(v_match);
    v_res := v_res || jsonb_build_object('ordre', 31, 'cas', 'B ne lit pas la liste des renforts du match de A', 'attendu', '0', 'obtenu', v_n::text);
    update public.stats_match set minutes = 1 where match_id = v_match;
    get diagnostics v_n = row_count;
    v_res := v_res || jsonb_build_object('ordre', 32, 'cas', 'B ne peut pas modifier les stats saisies par A', 'attendu', '0', 'obtenu', v_n::text);
    execute 'reset role';

    perform pg_temp.connecter(coalesce(v_c, v_inconnu));
    execute 'set local role authenticated';
    select count(*) into v_n from public.stats_match where match_id = v_match;
    v_res := v_res || jsonb_build_object('ordre', 33, 'cas', 'Un autre club ne lit aucune stat de ce match', 'attendu', '0', 'obtenu', v_n::text);
    execute 'reset role';

    select count(*) into v_n from public.equipe_joueurs where id in (v_f_compte, v_f_sans) and club_categorie_id = v_equipe_b;
    v_res := v_res || jsonb_build_object('ordre', 34, 'cas', 'Les 2 joueurs restent dans l''effectif de leur équipe d''origine', 'attendu', '2', 'obtenu', v_n::text);

    -- ─ En effectif commun : plus de renfort proposé (tout le monde est déjà dans la liste) ─
    perform pg_temp.connecter(null);
    update public.categories set mode = 'commun' where id = v_cat;
    perform pg_temp.connecter(v_a);
    execute 'set local role authenticated';
    select count(*) into v_n from public.categories_renforts_possibles(v_t);
    v_res := v_res || jsonb_build_object('ordre', 40, 'cas', 'Catégorie en commun : aucun renfort proposé', 'attendu', '0', 'obtenu', v_n::text);
    execute 'reset role';

    v_res := v_res || jsonb_build_object('ordre', 50, 'cas', 'Tous les cas d''essai ont tourné jusqu''au bout', 'attendu', 'oui', 'obtenu', 'oui');

    -- Tout annuler : seules les valeurs de v_res survivent.
    raise exception using errcode = 'P0001', message = 'fin_du_controle';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'fin_du_controle' then
      raise;
    end if;
  end;

  perform pg_temp.connecter(null);
  insert into controle_categories_renfort (ordre, cas, attendu, obtenu)
  select r.ordre, r.cas, r.attendu, r.obtenu
  from jsonb_to_recordset(v_res) as r(ordre int, cas text, attendu text, obtenu text);
end $$;

-- ── Après la simulation : rien n'est resté ──────────────────────────────────
insert into controle_categories_renfort
select 60, 'Rien n''est resté de la simulation (équipe ZZ9, match et fiches d''essai, mode commun)', '0,0,0,0',
  (select count(*) from public.club_categories where equipe = 'ZZ9') || ',' ||
  (select count(*) from public.matchs_equipe where adversaire = 'Essai bloc 7') || ',' ||
  (select count(*) from public.equipe_joueurs where nom like 'Bloc7 %') || ',' ||
  ((select count(*) from public.categories where mode = 'commun')
   - (select obtenu::int from controle_categories_renfort where ordre = 4));

select ordre, cas, attendu, obtenu, case when attendu is null then null else attendu = obtenu end as ok
from controle_categories_renfort
order by ordre;
