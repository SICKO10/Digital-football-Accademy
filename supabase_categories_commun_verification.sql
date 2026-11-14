-- Bloc 3 (chantier catégories) : vérification de supabase_categories_commun.sql.
--
-- Lecture seule pour la base : la simulation est entièrement annulée à la fin.
-- À lancer en entier dans Supabase (SQL Editor), après supabase_categories_commun.sql.
-- Résultat : un tableau ; la colonne « ok » doit valoir true partout (vide =
-- ligne pour information, « sans objet » = cas impossible à essayer faute de
-- données).
--
-- Déroulé de la simulation (rien n'est gardé) :
--   - une vraie équipe T ayant un coach (éducateur A), de préférence avec un
--     match convoqué ;
--   - une équipe d'essai « ZZ9 » ajoutée dans la même catégorie, confiée à un
--     autre éducateur B ;
--   - la catégorie reste d'abord « par équipe », puis passe en « commun » ;
--   - un éducateur C d'un autre club et un compte inconnu servent de témoins.

create temp table if not exists controle_categories_commun (ordre int, cas text, attendu text, obtenu text);
truncate controle_categories_commun;

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
insert into controle_categories_commun
select 1, 'Fonctions est_educateur_de_categorie et peut_voir_categorie présentes', '2',
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname in ('est_educateur_de_categorie', 'peut_voir_categorie'))::text
union all
select 2, 'Règles ajoutées : lecture et modification des fiches, lecture des convocations, convoqués, réponses, disponibilités', '6',
  (select count(*) from pg_policies where schemaname = 'public' and policyname in ('categories_commun_lecture', 'categories_commun_modification')
     and tablename in ('equipe_joueurs', 'convocations', 'convocation_joueurs', 'convocation_reponses', 'disponibilites'))::text
union all
select 3, 'Aucune suppression de fiche ajoutée par ce bloc', '0',
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'equipe_joueurs'
     and policyname like 'categories\_commun\_%' and cmd = 'DELETE')::text
union all
select 4, 'Personne n''est en mode commun avant les essais du club (pour info)', null,
  (select count(*) from public.categories where mode = 'commun')::text;

-- ── Simulation ──────────────────────────────────────────────────────────────
do $$
declare
  v_t uuid; v_club uuid; v_cat uuid; v_nom text; v_a uuid;
  v_b uuid; v_c uuid; v_inconnu uuid := gen_random_uuid();
  v_match uuid; v_equipe_b uuid; v_fiche_a uuid; v_fiche_b uuid;
  v_total int; v_conv int; v_convoques int; v_reponses int; v_dispos int;
  v_n int; v_txt text; v_avant int;
  v_res jsonb := '[]'::jsonb;
begin
  -- Équipe T : un club, un coach (A) ; de préférence avec un match convoqué
  -- et des fiches joueurs.
  select cc.id, cc.club_id, cc.categorie_id, cc.nom, cc.educateur_id
    into v_t, v_club, v_cat, v_nom, v_a
  from public.club_categories cc
  where cc.club_id is not null and cc.categorie_id is not null
    and cc.educateur_id is not null and cc.educateur_id <> cc.club_id
  order by exists (select 1 from public.convocations cv join public.matchs_equipe m on m.id = cv.match_id
                   where m.club_categorie_id = cc.id) desc,
           exists (select 1 from public.equipe_joueurs ej where ej.club_categorie_id = cc.id) desc,
           cc.id
  limit 1;
  if v_t is null then
    raise exception 'Aucune équipe de club avec un coach : vérification impossible';
  end if;

  select m.id into v_match
  from public.matchs_equipe m join public.convocations cv on cv.match_id = m.id
  where m.club_categorie_id = v_t
  order by m.date desc nulls last, m.id limit 1;

  -- Éducateur B : un autre coach, qui n'a aucune équipe dans cette catégorie.
  select cc.educateur_id into v_b
  from public.club_categories cc
  where cc.educateur_id is not null and cc.educateur_id not in (v_a, v_club)
    and not public.categories_compte_educateur(v_cat, cc.educateur_id)
  order by (cc.club_id = v_club) desc, cc.educateur_id limit 1;

  -- Éducateur C : coach sans aucune équipe ni rôle dans le club de T.
  select cc.educateur_id into v_c
  from public.club_categories cc
  where cc.educateur_id is not null and cc.educateur_id not in (v_a, v_club, coalesce(v_b, v_inconnu))
    and not exists (select 1 from public.club_categories x where x.club_id = v_club and x.educateur_id = cc.educateur_id)
    and not exists (select 1 from public.staff_club s where s.club_id = v_club and s.user_id = cc.educateur_id)
  order by cc.educateur_id limit 1;

  if v_b is null then
    raise exception 'Il faut au moins deux coachs dans la base pour cette vérification';
  end if;

  begin
    -- Équipe d'essai ZZ9 de la même catégorie, confiée à B (sans utilisateur
    -- connecté, comme une reprise : la garde des saisons le permet).
    insert into public.club_categories (club_id, nom, equipe, educateur_id)
      values (v_club, v_nom, 'ZZ9', v_b)
      returning id into v_equipe_b;
    v_res := v_res || jsonb_build_object('ordre', 10, 'cas', 'Équipe d''essai ZZ9 rattachée à la catégorie de T',
      'attendu', 'true', 'obtenu', ((select categorie_id from public.club_categories where id = v_equipe_b) = v_cat)::text);

    -- Fiche de T (éducateur A), pour les essais de modification.
    select ej.id into v_fiche_a from public.equipe_joueurs ej
    where ej.club_categorie_id = v_t order by ej.id limit 1;
    if v_fiche_a is null then
      insert into public.equipe_joueurs (prenom, nom, educateur_id, club_categorie_id)
        values ('Essai', 'Bloc3 A', v_a, v_t) returning id into v_fiche_a;
    end if;

    -- ─ Mode par équipe : les règles ajoutées ne donnent rien ─
    perform pg_temp.connecter(v_b);
    execute 'set local role authenticated';
    v_res := v_res || jsonb_build_object('ordre', 20, 'cas', 'Par équipe : B est bien éducateur de la catégorie, mais les règles du mode commun ne s''appliquent pas',
      'attendu', 'true,false', 'obtenu',
      public.est_educateur_de_categorie(v_cat)::text || ',' || public.categories_commun_visible(v_cat)::text);
    -- Ce que B lit aujourd'hui de l'équipe de A, d'après les règles existantes
    -- (0 attendu, sauf règle déjà en place) : sert de référence au retour en
    -- mode par équipe.
    select count(*) into v_avant from public.equipe_joueurs where club_categorie_id = v_t;
    v_res := v_res || jsonb_build_object('ordre', 21, 'cas', 'Par équipe : fiches de l''équipe de A lues par B avec les règles existantes (pour info)',
      'attendu', null, 'obtenu', v_avant::text);
    execute 'reset role';

    perform pg_temp.connecter(v_a);
    execute 'set local role authenticated';
    v_res := v_res || jsonb_build_object('ordre', 22, 'cas', 'Par équipe : règles du mode commun inactives pour A',
      'attendu', 'false', 'obtenu', public.categories_commun_visible(v_cat)::text);
    execute 'reset role';

    -- ─ Passage en commun (le vrai changement de mode viendra au bloc 8) ─
    perform pg_temp.connecter(null);
    update public.categories set mode = 'commun' where id = v_cat;
    select count(*) into v_total from public.equipe_joueurs where categorie_id = v_cat;

    -- B ajoute un joueur dans son équipe, avec l'ajout habituel de Mon équipe.
    perform pg_temp.connecter(v_b);
    execute 'set local role authenticated';
    begin
      insert into public.equipe_joueurs (prenom, nom, categorie, educateur_id, club_categorie_id)
        values ('Essai', 'Bloc3 B', v_nom, v_b, v_equipe_b) returning id into v_fiche_b;
      v_txt := 'accepté';
    exception when insufficient_privilege then
      v_txt := 'refusé';
    end;
    v_res := v_res || jsonb_build_object('ordre', 30, 'cas', 'Commun : B ajoute un joueur comme aujourd''hui (règles existantes)',
      'attendu', 'accepté', 'obtenu', v_txt);
    if v_fiche_b is not null then
      v_total := v_total + 1;
    end if;

    v_res := v_res || jsonb_build_object('ordre', 31, 'cas', 'Commun : B lit toutes les fiches de la catégorie',
      'attendu', v_total::text, 'obtenu', (select count(*) from public.equipe_joueurs where categorie_id = v_cat)::text);

    update public.equipe_joueurs set poste = 'Essai bloc 3' where id = v_fiche_a;
    get diagnostics v_n = row_count;
    v_res := v_res || jsonb_build_object('ordre', 32, 'cas', 'Commun : B modifie une fiche de l''équipe de A',
      'attendu', '1', 'obtenu', v_n::text);

    begin
      update public.equipe_joueurs set educateur_id = coalesce(v_c, v_inconnu) where id = v_fiche_a;
      v_txt := 'accepté';
    exception when insufficient_privilege or foreign_key_violation then
      v_txt := 'refusé';
    end;
    v_res := v_res || jsonb_build_object('ordre', 33, 'cas', 'Commun : B donne la fiche à un éducateur hors catégorie : refusé',
      'attendu', 'refusé', 'obtenu', v_txt);

    -- Sortir la fiche de la catégorie (autre équipe du club, ou aucune équipe).
    begin
      update public.equipe_joueurs set club_categorie_id = (
        select x.id from public.club_categories x where x.club_id = v_club and x.categorie_id <> v_cat order by x.id limit 1)
      where id = v_fiche_a;
      get diagnostics v_n = row_count;
      v_txt := case when v_n = 0 then 'refusé' else 'accepté' end;
    exception when insufficient_privilege then
      v_txt := 'refusé';
    end;
    v_res := v_res || jsonb_build_object('ordre', 34, 'cas', 'Commun : B sort la fiche de la catégorie : refusé',
      'attendu', 'refusé', 'obtenu', v_txt);

    begin
      delete from public.equipe_joueurs where id = v_fiche_a;
    exception when foreign_key_violation or insufficient_privilege then
      null;
    end;
    v_res := v_res || jsonb_build_object('ordre', 35, 'cas', 'Commun : B ne peut pas supprimer la fiche de A (la fiche est toujours là)',
      'attendu', '1', 'obtenu', (select count(*) from public.equipe_joueurs where id = v_fiche_a)::text);
    execute 'reset role';

    -- Les nombres attendus pour le match de T, comptés sans règle d'accès.
    perform pg_temp.connecter(null);
    if v_match is not null then
      select count(*) into v_conv from public.convocations where match_id = v_match;
      select count(*) into v_convoques from public.convocation_joueurs cj join public.convocations cv on cv.id = cj.convocation_id where cv.match_id = v_match;
      select count(*) into v_reponses from public.convocation_reponses cr join public.convocations cv on cv.id = cr.convocation_id where cv.match_id = v_match;
      select count(*) into v_dispos from public.disponibilites where match_id = v_match;
    end if;

    perform pg_temp.connecter(v_b);
    execute 'set local role authenticated';
    if v_match is null then
      v_res := v_res || jsonb_build_object('ordre', 36, 'cas', 'Commun : B lit la convocation d''un match de A (convocation, convoqués, réponses, disponibilités)',
        'attendu', 'sans objet', 'obtenu', 'sans objet');
    else
      v_res := v_res || jsonb_build_object('ordre', 36, 'cas', 'Commun : B lit la convocation d''un match de A (convocation, convoqués, réponses, disponibilités)',
        'attendu', v_conv || ',' || v_convoques || ',' || v_reponses || ',' || v_dispos,
        'obtenu',
        (select count(*) from public.convocations where match_id = v_match) || ',' ||
        (select count(*) from public.convocation_joueurs cj join public.convocations cv on cv.id = cj.convocation_id where cv.match_id = v_match) || ',' ||
        (select count(*) from public.convocation_reponses cr join public.convocations cv on cv.id = cr.convocation_id where cv.match_id = v_match) || ',' ||
        (select count(*) from public.disponibilites where match_id = v_match));
    end if;
    execute 'reset role';

    -- A voit le joueur ajouté par B.
    perform pg_temp.connecter(v_a);
    execute 'set local role authenticated';
    v_res := v_res || jsonb_build_object('ordre', 37, 'cas', 'Commun : A lit le joueur ajouté par B et toute la catégorie',
      'attendu', case when v_fiche_b is null then '0' else '1' end || ',' || v_total,
      'obtenu', (select count(*) from public.equipe_joueurs where id = v_fiche_b) || ','
                || (select count(*) from public.equipe_joueurs where categorie_id = v_cat));
    execute 'reset role';

    -- Le club voit toute la catégorie.
    perform pg_temp.connecter(v_club);
    execute 'set local role authenticated';
    v_res := v_res || jsonb_build_object('ordre', 38, 'cas', 'Commun : le club lit toutes les fiches de la catégorie',
      'attendu', v_total::text, 'obtenu', (select count(*) from public.equipe_joueurs where categorie_id = v_cat)::text);
    execute 'reset role';

    -- Témoins : un éducateur d'un autre club, un compte inconnu.
    if v_c is null then
      v_res := v_res || jsonb_build_object('ordre', 40, 'cas', 'Commun : un éducateur d''un autre club ne voit rien',
        'attendu', 'sans objet', 'obtenu', 'sans objet');
    else
      perform pg_temp.connecter(v_c);
      execute 'set local role authenticated';
      v_res := v_res || jsonb_build_object('ordre', 40, 'cas', 'Commun : un éducateur d''un autre club ne voit rien (fiches, règles, match)',
        'attendu', '0,false,false', 'obtenu',
        (select count(*) from public.equipe_joueurs where categorie_id = v_cat) || ','
        || public.peut_voir_categorie(v_cat) || ','
        || public.categories_match_commun_visible(coalesce(v_match, gen_random_uuid())));
      update public.equipe_joueurs set poste = 'intrus' where categorie_id = v_cat;
      get diagnostics v_n = row_count;
      v_res := v_res || jsonb_build_object('ordre', 41, 'cas', 'Commun : un éducateur d''un autre club ne modifie aucune fiche',
        'attendu', '0', 'obtenu', v_n::text);
      execute 'reset role';
    end if;

    perform pg_temp.connecter(v_inconnu);
    execute 'set local role authenticated';
    v_res := v_res || jsonb_build_object('ordre', 42, 'cas', 'Commun : un compte connecté sans lien ne voit rien',
      'attendu', '0,false', 'obtenu',
      (select count(*) from public.equipe_joueurs where categorie_id = v_cat) || ',' || public.peut_voir_categorie(v_cat));
    execute 'reset role';

    -- ─ Retour en par équipe : B ne voit plus que ses propres fiches ─
    perform pg_temp.connecter(null);
    update public.categories set mode = 'par_equipe' where id = v_cat;
    perform pg_temp.connecter(v_b);
    execute 'set local role authenticated';
    v_res := v_res || jsonb_build_object('ordre', 50, 'cas', 'Retour par équipe : B lit l''équipe de A exactement comme avant (ligne 21)',
      'attendu', v_avant::text, 'obtenu', (select count(*) from public.equipe_joueurs where club_categorie_id = v_t)::text);
    execute 'reset role';

    v_res := v_res || jsonb_build_object('ordre', 60, 'cas', 'Tous les cas d''essai ont tourné jusqu''au bout',
      'attendu', 'oui', 'obtenu', 'oui');

    -- Tout annuler : seules les valeurs de v_res survivent.
    raise exception using errcode = 'P0001', message = 'fin_du_controle';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'fin_du_controle' then
      raise;
    end if;
  end;

  perform pg_temp.connecter(null);
  insert into controle_categories_commun (ordre, cas, attendu, obtenu)
  select r.ordre, r.cas, r.attendu, r.obtenu
  from jsonb_to_recordset(v_res) as r(ordre int, cas text, attendu text, obtenu text);
end $$;

-- ── Après la simulation : rien n'est resté ──────────────────────────────────
insert into controle_categories_commun
select 70, 'Rien n''est resté de la simulation (équipe ZZ9, fiches d''essai, mode commun)', '0,0,0',
  (select count(*) from public.club_categories where equipe = 'ZZ9') || ',' ||
  (select count(*) from public.equipe_joueurs where nom in ('Bloc3 A', 'Bloc3 B') or poste in ('Essai bloc 3', 'intrus')) || ',' ||
  ((select count(*) from public.categories where mode = 'commun')
   - (select obtenu::int from controle_categories_commun where ordre = 4));

select ordre, cas, attendu, obtenu, case when attendu is null then null else attendu = obtenu end as ok
from controle_categories_commun
order by ordre;
