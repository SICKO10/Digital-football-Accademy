-- Bloc 8 (chantier catégories) : vérification de supabase_categories_mode.sql.
--
-- Lecture seule pour la base : la simulation est entièrement annulée à la fin.
-- À lancer en entier dans Supabase (SQL Editor), après supabase_categories_mode.sql.
-- Résultat : un tableau ; la colonne « ok » doit valoir true partout (vide =
-- ligne pour information).
--
-- Déroulé de la simulation (rien n'est gardé) :
--   - une vraie équipe T ayant un coach (éducateur A), catégorie « par équipe » ;
--   - une équipe d'essai « ZZ8 » ajoutée dans la même catégorie, confiée à un
--     autre éducateur B ;
--   - trois joueurs d'essai : Un (compte, équipe T, lié à A), Deux (sans
--     compte, ZZ8), Trois (compte, ZZ8) ; un match par équipe, des stats, une
--     convocation et une présence ;
--   - le club passe la catégorie en commun, essaie des répartitions fausses
--     (refusées), répartit (Un → ZZ8, Deux → T), puis revient en commun ;
--   - à chaque étape : les stats, présences et totaux par équipe sont comparés
--     à ceux d'avant.

create temp table if not exists controle_categories_mode (ordre int, cas text, attendu text, obtenu text);
truncate controle_categories_mode;

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

-- Empreinte de l'historique d'une catégorie : chaque ligne de stats et de
-- présence avec sa fiche et l'équipe de l'événement, puis les totaux par équipe.
create or replace function pg_temp.empreinte(p_cat uuid)
returns text
language sql
as $$
  select md5(
    coalesce((select string_agg(s.id::text || '|' || s.joueur_id::text || '|' || m.club_categorie_id::text || '|' || coalesce(s.minutes, 0)::text, ',' order by s.id)
              from public.stats_match s
              join public.matchs_equipe m on m.id = s.match_id
              join public.club_categories cc on cc.id = m.club_categorie_id
              where cc.categorie_id = p_cat), '') || '#' ||
    coalesce((select string_agg(p.entrainement_id::text || '|' || p.joueur_id::text || '|' || e.club_categorie_id::text || '|' || coalesce(p.present::text, ''), ',' order by p.entrainement_id, p.joueur_id)
              from public.presences_entrainement p
              join public.entrainements e on e.id = p.entrainement_id
              join public.club_categories cc on cc.id = e.club_categorie_id
              where cc.categorie_id = p_cat), '') || '#' ||
    coalesce((select string_agg(x.t, ',' order by x.t)
              from (select m.club_categorie_id::text || ':' || count(*)::text || ':' || coalesce(sum(s.minutes), 0)::text as t
                    from public.stats_match s
                    join public.matchs_equipe m on m.id = s.match_id
                    join public.club_categories cc on cc.id = m.club_categorie_id
                    where cc.categorie_id = p_cat
                    group by m.club_categorie_id) x), '') || '#' ||
    (select count(*)::text from public.equipe_joueurs where categorie_id = p_cat)
  )
$$;

-- ── Contrôles de structure ──────────────────────────────────────────────────
insert into controle_categories_mode
select 1, 'Les 2 fonctions du changement de mode sont présentes', '2',
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname in ('categories_mode_donnees', 'categorie_changer_mode'))::text
union all
select 2, 'Les visiteurs non connectés ne peuvent pas les appeler (anon refusé)', '0',
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname in ('categories_mode_donnees', 'categorie_changer_mode')
     and has_function_privilege('anon', p.oid, 'execute'))::text
union all
select 3, 'Aucune règle de modification directe des catégories (le mode passe par la fonction)', '0',
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'categories'
     and cmd in ('UPDATE', 'ALL'))::text
union all
select 4, 'Catégories en mode commun avant les essais (pour info)', null,
  (select count(*) from public.categories where mode = 'commun')::text;

-- ── Simulation ──────────────────────────────────────────────────────────────
do $$
declare
  v_t uuid; v_club uuid; v_cat uuid; v_nom text; v_a uuid; v_b uuid;
  v_c uuid; v_inconnu uuid := gen_random_uuid();
  v_zz uuid; v_autre_equipe uuid; v_m_t uuid; v_m_zz uuid; v_e_t uuid; v_conv uuid;
  v_p1 uuid; v_p2 uuid; v_f1 uuid; v_f2 uuid; v_f3 uuid; v_aff uuid;
  v_avant text; v_reelles text; v_rep jsonb; v_rep_essai jsonb;
  v_ret jsonb; v_n int; v_txt text;
  v_res jsonb := '[]'::jsonb;
begin
  select cc.id, cc.club_id, cc.categorie_id, cc.nom, cc.educateur_id
    into v_t, v_club, v_cat, v_nom, v_a
  from public.club_categories cc
  join public.categories c on c.id = cc.categorie_id and c.mode = 'par_equipe'
  where cc.club_id is not null and cc.educateur_id is not null and cc.educateur_id <> cc.club_id
  order by cc.id
  limit 1;
  if v_t is null then
    raise exception 'Aucune équipe de club « par équipe » avec un coach : vérification impossible';
  end if;

  select cc.educateur_id into v_b
  from public.club_categories cc
  where cc.educateur_id is not null and cc.educateur_id not in (v_a, v_club)
    and not public.categories_compte_educateur(v_cat, cc.educateur_id)
  order by (cc.club_id = v_club) desc, cc.educateur_id limit 1;
  if v_b is null then
    raise exception 'Il faut au moins deux coachs dans la base pour cette vérification';
  end if;

  select cc.educateur_id into v_c
  from public.club_categories cc
  where cc.educateur_id is not null and cc.educateur_id not in (v_a, v_club, v_b)
    and not exists (select 1 from public.club_categories x where x.club_id = v_club and x.educateur_id = cc.educateur_id)
  order by cc.educateur_id limit 1;

  select cc.id into v_autre_equipe
  from public.club_categories cc
  where cc.categorie_id is distinct from v_cat
  order by cc.id limit 1;

  -- Deux comptes existants servant de joueurs d'essai (sans fiche ni affiliation).
  select pr.id into v_p1
  from public.profiles pr
  where not exists (select 1 from public.equipe_joueurs ej where ej.joueur_id = pr.id)
    and not exists (select 1 from public.affiliations a where a.joueur_id = pr.id)
    and pr.id not in (v_a, v_b, v_club)
  order by pr.id limit 1;
  select pr.id into v_p2
  from public.profiles pr
  where not exists (select 1 from public.equipe_joueurs ej where ej.joueur_id = pr.id)
    and not exists (select 1 from public.affiliations a where a.joueur_id = pr.id)
    and pr.id not in (v_a, v_b, v_club, coalesce(v_p1, v_inconnu))
  order by pr.id limit 1;
  if v_p1 is null or v_p2 is null then
    raise exception 'Il faut deux comptes sans fiche joueur ni affiliation pour cette vérification';
  end if;

  begin
    insert into public.club_categories (club_id, nom, equipe, educateur_id)
      values (v_club, v_nom, 'ZZ8', v_b) returning id into v_zz;

    insert into public.equipe_joueurs (prenom, nom, educateur_id, club_categorie_id, joueur_id)
      values ('Essai', 'Bloc8 Un', v_a, v_t, v_p1) returning id into v_f1;
    insert into public.equipe_joueurs (prenom, nom, educateur_id, club_categorie_id, joueur_id)
      values ('Essai', 'Bloc8 Deux', v_b, v_zz, null) returning id into v_f2;
    insert into public.equipe_joueurs (prenom, nom, educateur_id, club_categorie_id, joueur_id)
      values ('Essai', 'Bloc8 Trois', v_b, v_zz, v_p2) returning id into v_f3;
    insert into public.affiliations (joueur_id, educateur_id, equipe_joueur_id, statut)
      values (v_p1, v_a, v_f1, 'accepte') returning id into v_aff;

    insert into public.matchs_equipe (educateur_id, club_categorie_id, date, heure, adversaire, domicile)
      values (v_a, v_t, date '2099-02-01', '14:00', 'Essai bloc 8', true) returning id into v_m_t;
    insert into public.matchs_equipe (educateur_id, club_categorie_id, date, heure, adversaire, domicile)
      values (v_b, v_zz, date '2099-02-08', '14:00', 'Essai bloc 8', true) returning id into v_m_zz;
    insert into public.convocations (match_id, educateur_id, publiee, publiee_at, expire_at)
      values (v_m_zz, v_b, true, now(), now() + interval '3 days') returning id into v_conv;
    insert into public.convocation_joueurs (convocation_id, joueur_id) values (v_conv, v_p1);
    insert into public.stats_match (match_id, joueur_id, educateur_id, minutes)
      values (v_m_t, v_f1, v_a, 70), (v_m_zz, v_f1, v_b, 20), (v_m_zz, v_f2, v_b, 40);
    insert into public.entrainements (educateur_id, club_categorie_id, date, heure, description)
      values (v_a, v_t, date '2099-02-03', '18:00', 'Essai bloc 8') returning id into v_e_t;
    insert into public.presences_entrainement (entrainement_id, joueur_id, educateur_id, statut, present)
      values (v_e_t, v_f2, v_a, 'present', true);

    v_avant := pg_temp.empreinte(v_cat);
    select md5(coalesce(string_agg(ej.id::text || '|' || ej.club_categorie_id::text || '|' || coalesce(ej.educateur_id::text, ''), ',' order by ej.id), ''))
      into v_reelles
    from public.equipe_joueurs ej
    where ej.categorie_id = v_cat and ej.id not in (v_f1, v_f2, v_f3);

    -- Répartition complète : chaque vrai joueur dans son équipe actuelle (une
    -- fiche par compte), Un → ZZ8, Deux → T, Trois reste en ZZ8.
    select coalesce(jsonb_agg(jsonb_build_object('fiche_id', x.id, 'equipe_id', x.club_categorie_id)), '[]'::jsonb)
      into v_rep
    from (
      select distinct on (coalesce(ej.joueur_id::text, ej.id::text)) ej.id, ej.club_categorie_id
      from public.equipe_joueurs ej
      where ej.categorie_id = v_cat and ej.id not in (v_f1, v_f2, v_f3)
      order by coalesce(ej.joueur_id::text, ej.id::text), ej.created_at, ej.id
    ) x;
    v_rep_essai := jsonb_build_array(
      jsonb_build_object('fiche_id', v_f1, 'equipe_id', v_zz),
      jsonb_build_object('fiche_id', v_f2, 'equipe_id', v_t),
      jsonb_build_object('fiche_id', v_f3, 'equipe_id', v_zz));

    -- ─ Qui peut changer le mode ─
    perform pg_temp.connecter(v_a);
    execute 'set local role authenticated';
    begin
      perform public.categorie_changer_mode(v_cat, 'commun');
      v_txt := 'accepté';
    exception when others then v_txt := 'refusé'; end;
    v_res := v_res || jsonb_build_object('ordre', 10, 'cas', 'Un éducateur de la catégorie ne peut pas changer le mode', 'attendu', 'refusé', 'obtenu', v_txt);
    select count(*) into v_n from public.categories_mode_donnees(v_cat);
    v_res := v_res || jsonb_build_object('ordre', 11, 'cas', 'Un éducateur ne lit pas les données de répartition', 'attendu', '0', 'obtenu', v_n::text);
    execute 'reset role';

    perform pg_temp.connecter(coalesce(v_c, v_inconnu));
    execute 'set local role authenticated';
    begin
      perform public.categorie_changer_mode(v_cat, 'commun');
      v_txt := 'accepté';
    exception when others then v_txt := 'refusé'; end;
    v_res := v_res || jsonb_build_object('ordre', 12, 'cas', 'Un autre club (ou un inconnu) ne peut pas changer le mode', 'attendu', 'refusé', 'obtenu', v_txt);
    execute 'reset role';

    perform pg_temp.connecter(v_club);
    execute 'set local role authenticated';
    update public.categories set mode = 'commun' where id = v_cat;
    get diagnostics v_n = row_count;
    v_res := v_res || jsonb_build_object('ordre', 13, 'cas', 'Le club ne peut pas modifier le mode en direct (sans la fonction)', 'attendu', '0', 'obtenu', v_n::text);

    -- ─ Données de répartition (club) ─
    select (convocations ->> v_zz::text) into v_txt from public.categories_mode_donnees(v_cat) where fiche_id = v_f1;
    v_res := v_res || jsonb_build_object('ordre', 14, 'cas', 'Le club voit la convocation de Un en ZZ8', 'attendu', '1', 'obtenu', coalesce(v_txt, 'rien'));
    select (presences ->> v_t::text) into v_txt from public.categories_mode_donnees(v_cat) where fiche_id = v_f2;
    v_res := v_res || jsonb_build_object('ordre', 15, 'cas', 'Le club voit la présence de Deux en T', 'attendu', '1', 'obtenu', coalesce(v_txt, 'rien'));

    -- ─ Par équipe → commun ─
    begin
      perform public.categorie_changer_mode(v_cat, 'par_equipe', v_rep || v_rep_essai);
      v_txt := 'accepté';
    exception when others then v_txt := 'refusé'; end;
    v_res := v_res || jsonb_build_object('ordre', 20, 'cas', 'Déjà par équipe : repasser par équipe est refusé', 'attendu', 'refusé', 'obtenu', v_txt);
    begin
      v_ret := public.categorie_changer_mode(v_cat, 'commun');
      v_txt := v_ret ->> 'mode';
    exception when others then v_txt := 'refusé : ' || sqlerrm; end;
    v_res := v_res || jsonb_build_object('ordre', 21, 'cas', 'Le club passe la catégorie en commun', 'attendu', 'commun', 'obtenu', v_txt);
    execute 'reset role';
    select mode into v_txt from public.categories where id = v_cat;
    v_res := v_res || jsonb_build_object('ordre', 22, 'cas', 'La catégorie est bien en commun', 'attendu', 'commun', 'obtenu', v_txt);
    v_res := v_res || jsonb_build_object('ordre', 23, 'cas', 'Après le passage en commun : stats, présences et totaux par équipe identiques', 'attendu', v_avant, 'obtenu', pg_temp.empreinte(v_cat));

    -- ─ Commun → par équipe : répartitions fausses, toutes refusées ─
    perform pg_temp.connecter(v_club);
    execute 'set local role authenticated';
    begin
      perform public.categorie_changer_mode(v_cat, 'par_equipe', '[]'::jsonb);
      v_txt := 'accepté';
    exception when others then v_txt := 'refusé'; end;
    v_res := v_res || jsonb_build_object('ordre', 30, 'cas', 'Répartition vide refusée', 'attendu', 'refusé', 'obtenu', v_txt);
    begin
      perform public.categorie_changer_mode(v_cat, 'par_equipe', v_rep || jsonb_build_array(
        jsonb_build_object('fiche_id', v_f1, 'equipe_id', v_zz), jsonb_build_object('fiche_id', v_f3, 'equipe_id', v_zz)));
      v_txt := 'accepté';
    exception when others then v_txt := 'refusé'; end;
    v_res := v_res || jsonb_build_object('ordre', 31, 'cas', 'Un joueur oublié (Deux sans équipe) : refusé', 'attendu', 'refusé', 'obtenu', v_txt);
    begin
      perform public.categorie_changer_mode(v_cat, 'par_equipe', v_rep || jsonb_build_array(
        jsonb_build_object('fiche_id', v_f1, 'equipe_id', coalesce(v_autre_equipe, v_inconnu)),
        jsonb_build_object('fiche_id', v_f2, 'equipe_id', v_t), jsonb_build_object('fiche_id', v_f3, 'equipe_id', v_zz)));
      v_txt := 'accepté';
    exception when others then v_txt := 'refusé'; end;
    v_res := v_res || jsonb_build_object('ordre', 32, 'cas', 'Une équipe d''une autre catégorie : refusé', 'attendu', 'refusé', 'obtenu', v_txt);
    begin
      perform public.categorie_changer_mode(v_cat, 'par_equipe', v_rep || v_rep_essai || jsonb_build_array(
        jsonb_build_object('fiche_id', v_f1, 'equipe_id', v_t)));
      v_txt := 'accepté';
    exception when others then v_txt := 'refusé'; end;
    v_res := v_res || jsonb_build_object('ordre', 33, 'cas', 'Un joueur avec deux équipes : refusé', 'attendu', 'refusé', 'obtenu', v_txt);
    execute 'reset role';
    select mode into v_txt from public.categories where id = v_cat;
    v_res := v_res || jsonb_build_object('ordre', 34, 'cas', 'Après les refus, rien n''a bougé (toujours en commun)', 'attendu', 'commun', 'obtenu', v_txt);
    select count(*) into v_n from public.equipe_joueurs where id = v_f1 and club_categorie_id = v_t and educateur_id = v_a;
    v_res := v_res || jsonb_build_object('ordre', 35, 'cas', 'Après les refus, Un est toujours en T chez A', 'attendu', '1', 'obtenu', v_n::text);

    -- ─ Commun → par équipe : la bonne répartition ─
    perform pg_temp.connecter(v_club);
    execute 'set local role authenticated';
    begin
      v_ret := public.categorie_changer_mode(v_cat, 'par_equipe', v_rep || v_rep_essai);
      v_txt := (v_ret ->> 'mode') || ', ' || (v_ret ->> 'fiches_deplacees') || ' déplacés, ' || (v_ret ->> 'affiliations_deplacees') || ' lien';
    exception when others then v_txt := 'refusé : ' || sqlerrm; end;
    v_res := v_res || jsonb_build_object('ordre', 40, 'cas', 'Le club repasse en par équipe : Un et Deux changent d''équipe, le lien de Un suit', 'attendu', 'par_equipe, 2 déplacés, 1 lien', 'obtenu', v_txt);
    execute 'reset role';
    select count(*) into v_n from public.equipe_joueurs where id = v_f1 and club_categorie_id = v_zz and educateur_id = v_b;
    v_res := v_res || jsonb_build_object('ordre', 41, 'cas', 'Un est en ZZ8 chez B', 'attendu', '1', 'obtenu', v_n::text);
    select count(*) into v_n from public.equipe_joueurs where id = v_f2 and club_categorie_id = v_t and educateur_id = v_a;
    v_res := v_res || jsonb_build_object('ordre', 42, 'cas', 'Deux est en T chez A', 'attendu', '1', 'obtenu', v_n::text);
    select count(*) into v_n from public.equipe_joueurs where id = v_f3 and club_categorie_id = v_zz and educateur_id = v_b;
    v_res := v_res || jsonb_build_object('ordre', 43, 'cas', 'Trois n''a pas bougé', 'attendu', '1', 'obtenu', v_n::text);
    select educateur_id::text into v_txt from public.affiliations where id = v_aff;
    v_res := v_res || jsonb_build_object('ordre', 44, 'cas', 'Le joueur Un est maintenant lié au coach B', 'attendu', v_b::text, 'obtenu', coalesce(v_txt, 'rien'));
    v_res := v_res || jsonb_build_object('ordre', 45, 'cas', 'Après la répartition : stats, présences et totaux par équipe identiques', 'attendu', v_avant, 'obtenu', pg_temp.empreinte(v_cat));
    select md5(coalesce(string_agg(ej.id::text || '|' || ej.club_categorie_id::text || '|' || coalesce(ej.educateur_id::text, ''), ',' order by ej.id), ''))
      into v_txt
    from public.equipe_joueurs ej
    where ej.categorie_id = v_cat and ej.id not in (v_f1, v_f2, v_f3);
    v_res := v_res || jsonb_build_object('ordre', 46, 'cas', 'Les vrais joueurs de la catégorie n''ont pas bougé (équipe et coach)', 'attendu', v_reelles, 'obtenu', v_txt);

    -- ─ Le coach B retrouve Un avec les règles actuelles ─
    perform pg_temp.connecter(v_b);
    execute 'set local role authenticated';
    select count(*) into v_n from public.equipe_joueurs where id = v_f1;
    v_res := v_res || jsonb_build_object('ordre', 50, 'cas', 'B voit Un dans son effectif (règles actuelles)', 'attendu', '1', 'obtenu', v_n::text);
    execute 'reset role';

    -- ─ Retour en commun ─
    perform pg_temp.connecter(v_club);
    execute 'set local role authenticated';
    begin
      v_ret := public.categorie_changer_mode(v_cat, 'commun');
      v_txt := v_ret ->> 'mode';
    exception when others then v_txt := 'refusé : ' || sqlerrm; end;
    v_res := v_res || jsonb_build_object('ordre', 60, 'cas', 'Le club revient en commun', 'attendu', 'commun', 'obtenu', v_txt);
    execute 'reset role';
    v_res := v_res || jsonb_build_object('ordre', 61, 'cas', 'Après l''aller-retour : stats, présences et totaux par équipe identiques', 'attendu', v_avant, 'obtenu', pg_temp.empreinte(v_cat));

    v_res := v_res || jsonb_build_object('ordre', 70, 'cas', 'Tous les cas d''essai ont tourné jusqu''au bout', 'attendu', 'oui', 'obtenu', 'oui');

    -- Tout annuler : seules les valeurs de v_res survivent.
    raise exception using errcode = 'P0001', message = 'fin_du_controle';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'fin_du_controle' then
      raise;
    end if;
  end;

  perform pg_temp.connecter(null);
  insert into controle_categories_mode (ordre, cas, attendu, obtenu)
  select r.ordre, r.cas, r.attendu, r.obtenu
  from jsonb_to_recordset(v_res) as r(ordre int, cas text, attendu text, obtenu text);
end $$;

-- ── Après la simulation : rien n'est resté ──────────────────────────────────
insert into controle_categories_mode
select 80, 'Rien n''est resté de la simulation (équipe ZZ8, matchs, fiches, mode commun)', '0,0,0,0,0',
  (select count(*) from public.club_categories where equipe = 'ZZ8') || ',' ||
  (select count(*) from public.matchs_equipe where adversaire = 'Essai bloc 8') || ',' ||
  (select count(*) from public.entrainements where description = 'Essai bloc 8') || ',' ||
  (select count(*) from public.equipe_joueurs where nom like 'Bloc8 %') || ',' ||
  ((select count(*) from public.categories where mode = 'commun')
   - (select obtenu::int from controle_categories_mode where ordre = 4));

-- Les empreintes (longues) ne sont comparées que par la colonne ok.
select ordre, cas,
  case when length(attendu) = 32 and attendu ~ '^[0-9a-f]+$' then 'empreinte' else attendu end as attendu,
  case when length(obtenu) = 32 and obtenu ~ '^[0-9a-f]+$' then (case when obtenu = attendu then 'empreinte' else 'différente' end) else obtenu end as obtenu,
  case when attendu is null then null else attendu = obtenu end as ok
from controle_categories_mode
order by ordre;
