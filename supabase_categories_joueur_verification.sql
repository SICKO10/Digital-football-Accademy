-- Bloc 6 (chantier catégories) : vérification de supabase_categories_joueur.sql.
--
-- Lecture seule pour la base : la simulation est entièrement annulée à la fin.
-- À lancer en entier dans Supabase (SQL Editor), après supabase_categories_joueur.sql.
-- Résultat : un tableau ; la colonne « ok » doit valoir true partout (vide =
-- ligne pour information).
--
-- Déroulé de la simulation (rien n'est gardé) :
--   - une vraie équipe T ayant un coach (éducateur A) ;
--   - une équipe d'essai « ZZ9 » dans la même catégorie, confiée à un autre
--     éducateur B ; un entraînement pour chacune et un match pour ZZ9 ;
--   - deux comptes existants servent de joueurs d'essai (J1 avec une fiche dans
--     la catégorie, J2 sans fiche) ;
--   - la catégorie reste d'abord « par équipe », puis passe en « commun ».

create temp table if not exists controle_categories_joueur (ordre int, cas text, attendu text, obtenu text);
truncate controle_categories_joueur;

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

-- ── Structure ───────────────────────────────────────────────────────────────
insert into controle_categories_joueur
select 1, 'Les 3 fonctions du bloc 6 sont présentes', '3',
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('categories_joueur_dans_commun', 'categories_joueur_agenda', 'categories_joueur_convocations'))::text
union all
select 2, 'Aucune de ces fonctions n''est ouverte aux anonymes', '0',
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('categories_joueur_dans_commun', 'categories_joueur_agenda', 'categories_joueur_convocations')
     and has_function_privilege('anon', p.oid, 'execute'))::text
union all
select 3, 'La table disponibilites_categorie a ses 5 règles et la protection activée', '5,true',
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'disponibilites_categorie') || ',' ||
  (select relrowsecurity from pg_class where oid = 'public.disponibilites_categorie'::regclass)
union all
select 4, 'Catégories en mode commun avant les essais (pour info)', null,
  (select count(*) from public.categories where mode = 'commun')::text;

-- ── Simulation ──────────────────────────────────────────────────────────────
do $$
declare
  v_t uuid; v_club uuid; v_cat uuid; v_nom text; v_a uuid; v_b uuid;
  v_equipe_b uuid; v_match_b uuid; v_conv uuid;
  v_j1 uuid; v_j2 uuid; v_n int; v_txt text;
  v_date date := current_date + 5;
  v_res jsonb := '[]'::jsonb;
begin
  select cc.id, cc.club_id, cc.categorie_id, cc.nom, cc.educateur_id
    into v_t, v_club, v_cat, v_nom, v_a
  from public.club_categories cc
  where cc.club_id is not null and cc.categorie_id is not null
    and cc.educateur_id is not null and cc.educateur_id <> cc.club_id
  order by cc.id limit 1;
  if v_t is null then raise exception 'Aucune équipe de club avec un coach : vérification impossible'; end if;

  select cc.educateur_id into v_b
  from public.club_categories cc
  where cc.educateur_id is not null and cc.educateur_id not in (v_a, v_club)
    and not public.categories_compte_educateur(v_cat, cc.educateur_id)
  order by (cc.club_id = v_club) desc, cc.educateur_id limit 1;
  if v_b is null then raise exception 'Il faut au moins deux coachs dans la base pour cette vérification'; end if;

  select (array_agg(p.id order by p.id))[1], (array_agg(p.id order by p.id))[2]
    into v_j1, v_j2
  from (select id from public.profiles pr
        where not exists (select 1 from public.equipe_joueurs ej where ej.joueur_id = pr.id)
          and pr.id not in (v_a, v_b, v_club)
        order by id limit 2) p;
  if v_j2 is null then raise exception 'Il faut deux comptes sans fiche joueur pour cette vérification'; end if;

  begin
    insert into public.club_categories (club_id, nom, equipe, educateur_id)
      values (v_club, v_nom, 'ZZ9', v_b) returning id into v_equipe_b;

    insert into public.equipe_joueurs (prenom, nom, educateur_id, club_categorie_id, joueur_id)
      values ('Essai', 'Bloc6 1', v_a, v_t, v_j1);

    insert into public.entrainements (educateur_id, club_categorie_id, date, heure, description)
      values (v_a, v_t, v_date, '18:00', 'Essai bloc 6 A'), (v_b, v_equipe_b, v_date, '19:00', 'Essai bloc 6 B');
    insert into public.matchs_equipe (educateur_id, club_categorie_id, date, heure, adversaire, domicile)
      values (v_b, v_equipe_b, v_date, '15:30', 'Essai bloc 6 B', true) returning id into v_match_b;
    insert into public.convocations (match_id, educateur_id, publiee, publiee_at, expire_at)
      values (v_match_b, v_b, true, now(), now() + interval '3 days') returning id into v_conv;
    insert into public.convocation_joueurs (convocation_id, joueur_id) values (v_conv, v_j1);

    -- ─ Par équipe : agenda vide, réponse à la date refusée, mais le nom de l'équipe s'affiche ─
    perform pg_temp.connecter(v_j1);
    execute 'set local role authenticated';
    select count(*) into v_n from public.categories_joueur_agenda(30) where categorie_id = v_cat;
    v_res := v_res || jsonb_build_object('ordre', 10, 'cas', 'Par équipe : l''agenda de la catégorie reste vide', 'attendu', '0', 'obtenu', v_n::text);
    begin
      insert into public.disponibilites_categorie (joueur_id, categorie_id, date, statut) values (v_j1, v_cat, v_date, 'present');
      v_txt := 'accepté';
    exception when others then v_txt := 'refusé'; end;
    v_res := v_res || jsonb_build_object('ordre', 11, 'cas', 'Par équipe : répondre à la date est refusé', 'attendu', 'refusé', 'obtenu', v_txt);
    select count(*) into v_n from public.categories_joueur_convocations(array[v_match_b]);
    v_res := v_res || jsonb_build_object('ordre', 12, 'cas', 'Convoqué : le match et l''équipe s''affichent dans les deux modes', 'attendu', '1', 'obtenu', v_n::text);
    select count(*) into v_n from public.categories_joueur_convocations(array[v_match_b]) where equipe_lettre = 'ZZ9';
    v_res := v_res || jsonb_build_object('ordre', 13, 'cas', 'Le nom de l''équipe est celui du match (ZZ9)', 'attendu', '1', 'obtenu', v_n::text);
    execute 'reset role';

    -- ─ Passage en commun ─
    perform pg_temp.connecter(null);
    update public.categories set mode = 'commun' where id = v_cat;

    perform pg_temp.connecter(v_j1);
    execute 'set local role authenticated';
    select count(*) into v_n from public.categories_joueur_agenda(30) where categorie_id = v_cat and date = v_date;
    v_res := v_res || jsonb_build_object('ordre', 20, 'cas', 'Commun : le joueur voit 2 entraînements (équipes T et ZZ9) et 1 match', 'attendu', '3', 'obtenu', v_n::text);
    select count(*) into v_n from public.categories_joueur_agenda(30) where categorie_id = v_cat and date = v_date and type = 'match';
    v_res := v_res || jsonb_build_object('ordre', 21, 'cas', 'Dont 1 match', 'attendu', '1', 'obtenu', v_n::text);
    begin
      insert into public.disponibilites_categorie (joueur_id, categorie_id, date, statut) values (v_j1, v_cat, v_date, 'present');
      v_txt := 'accepté';
    exception when others then v_txt := 'refusé'; end;
    v_res := v_res || jsonb_build_object('ordre', 22, 'cas', 'Commun : le joueur répond « présent » à la date', 'attendu', 'accepté', 'obtenu', v_txt);
    update public.disponibilites_categorie set statut = 'absent' where joueur_id = v_j1 and categorie_id = v_cat and date = v_date;
    select count(*) into v_n from public.disponibilites_categorie where joueur_id = v_j1 and statut = 'absent';
    v_res := v_res || jsonb_build_object('ordre', 23, 'cas', 'Il peut changer sa réponse', 'attendu', '1', 'obtenu', v_n::text);
    begin
      insert into public.disponibilites_categorie (joueur_id, categorie_id, date, statut) values (v_j2, v_cat, v_date, 'present');
      v_txt := 'accepté';
    exception when others then v_txt := 'refusé'; end;
    v_res := v_res || jsonb_build_object('ordre', 24, 'cas', 'Il ne peut pas répondre à la place d''un autre', 'attendu', 'refusé', 'obtenu', v_txt);
    execute 'reset role';

    perform pg_temp.connecter(v_j2);
    execute 'set local role authenticated';
    select count(*) into v_n from public.categories_joueur_agenda(30) where categorie_id = v_cat;
    v_res := v_res || jsonb_build_object('ordre', 30, 'cas', 'Un compte sans fiche dans la catégorie ne voit rien', 'attendu', '0', 'obtenu', v_n::text);
    select count(*) into v_n from public.disponibilites_categorie;
    v_res := v_res || jsonb_build_object('ordre', 31, 'cas', 'Il ne lit pas les réponses des autres', 'attendu', '0', 'obtenu', v_n::text);
    begin
      insert into public.disponibilites_categorie (joueur_id, categorie_id, date, statut) values (v_j2, v_cat, v_date, 'present');
      v_txt := 'accepté';
    exception when others then v_txt := 'refusé'; end;
    v_res := v_res || jsonb_build_object('ordre', 32, 'cas', 'Il ne peut pas répondre (pas dans l''effectif)', 'attendu', 'refusé', 'obtenu', v_txt);
    select count(*) into v_n from public.categories_joueur_convocations(array[v_match_b]);
    v_res := v_res || jsonb_build_object('ordre', 33, 'cas', 'Il ne lit pas le match d''une convocation où il n''est pas', 'attendu', '0', 'obtenu', v_n::text);
    execute 'reset role';

    -- ─ L'encadrement lit les réponses (la grille de convocation s'en sert) ─
    perform pg_temp.connecter(v_b);
    execute 'set local role authenticated';
    select count(*) into v_n from public.disponibilites_categorie where categorie_id = v_cat and date = v_date;
    v_res := v_res || jsonb_build_object('ordre', 40, 'cas', 'L''éducateur B de la catégorie lit la réponse du joueur', 'attendu', '1', 'obtenu', v_n::text);
    execute 'reset role';

    perform pg_temp.connecter(null);
    execute 'set local role authenticated';
    select count(*) into v_n from public.disponibilites_categorie;
    v_res := v_res || jsonb_build_object('ordre', 41, 'cas', 'Sans connexion, aucune réponse lisible', 'attendu', '0', 'obtenu', v_n::text);
    execute 'reset role';

    v_res := v_res || jsonb_build_object('ordre', 60, 'cas', 'Tous les cas d''essai ont tourné jusqu''au bout', 'attendu', 'oui', 'obtenu', 'oui');

    raise exception using errcode = 'P0001', message = 'fin_du_controle';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'fin_du_controle' then raise; end if;
  end;

  perform pg_temp.connecter(null);
  insert into controle_categories_joueur (ordre, cas, attendu, obtenu)
  select r.ordre, r.cas, r.attendu, r.obtenu
  from jsonb_to_recordset(v_res) as r(ordre int, cas text, attendu text, obtenu text);
end $$;

-- ── Après la simulation : rien n'est resté ──────────────────────────────────
insert into controle_categories_joueur
select 70, 'Rien n''est resté de la simulation (équipe ZZ9, entraînements, fiche, réponse, mode commun)', '0,0,0,0,0',
  (select count(*) from public.club_categories where equipe = 'ZZ9') || ',' ||
  (select count(*) from public.entrainements where description like 'Essai bloc 6%') || ',' ||
  (select count(*) from public.equipe_joueurs where nom like 'Bloc6 %') || ',' ||
  (select count(*) from public.disponibilites_categorie where date = current_date + 5) || ',' ||
  ((select count(*) from public.categories where mode = 'commun')
   - (select obtenu::int from controle_categories_joueur where ordre = 4));

select ordre, cas, attendu, obtenu, case when attendu is null then null else attendu = obtenu end as ok
from controle_categories_joueur
order by ordre;
