-- Vérification du bloc 1 (supabase_categories.sql, PLAN-categories.md). Lancer
-- après le fichier principal, le fichier en entier, d'un seul coup.
--
-- Rien n'est modifié en base : les cas d'essai (équipe « U15 ZZ9 » créée comme
-- avec le formulaire actuel, équipe d'essai renommée, fiche déplacée, lectures
-- « connecté en tant que » le club, un de ses éducateurs, un autre club, un
-- inconnu) tournent dans une sous-transaction annulée à la fin. Seuls les
-- résultats sont gardés, dans une table temporaire effacée en fin de session.
--
-- Résultat : un seul tableau. Chaque ligne doit avoir ok = true, sauf les
-- lignes « pour info » (ok vide).

drop table if exists pg_temp.controle_categories;
create temp table controle_categories (ordre int, cas text, attendu text, obtenu text);

-- ── Structure et données réelles (lecture seule) ────────────────────────────
insert into controle_categories
select 1, 'Table categories créée, règles d''accès actives', 'true',
  (select relrowsecurity::text from pg_class where oid = 'public.categories'::regclass);

insert into controle_categories
select 2, 'Une catégorie par club et nom nettoyé (autant que de couples club + nom)', 'true',
  ((select count(*) from public.categories) =
   (select count(distinct cc.club_id::text || '|' || upper(regexp_replace(trim(coalesce(cc.nom, '')), '\s+', '', 'g')))
    from public.club_categories cc where cc.club_id is not null))::text;

insert into controle_categories
select 3, 'Équipes de club sans catégorie', '0',
  (select count(*) from public.club_categories where club_id is not null and categorie_id is null)::text;

insert into controle_categories
select 4, 'Équipes rattachées à une catégorie d''un autre club ou d''un autre nom', '0',
  (select count(*) from public.club_categories cc
   join public.categories c on c.id = cc.categorie_id
   where c.club_id <> cc.club_id
      or c.nom_cle <> upper(regexp_replace(trim(coalesce(cc.nom, '')), '\s+', '', 'g')))::text;

insert into controle_categories
select 5, 'Fiches joueurs dont la catégorie diffère de celle de leur équipe', '0',
  (select count(*) from public.equipe_joueurs ej
   join public.club_categories cc on cc.id = ej.club_categorie_id
   where ej.categorie_id is distinct from cc.categorie_id)::text;

insert into controle_categories
select 6, 'Fiches sans équipe mais avec une catégorie', '0',
  (select count(*) from public.equipe_joueurs where club_categorie_id is null and categorie_id is not null)::text;

insert into controle_categories
select 7, 'Catégories en mode commun (toutes doivent être par équipe)', '0',
  (select count(*) from public.categories where mode <> 'par_equipe')::text;

insert into controle_categories
select 8, 'Catégories sans aucune équipe', '0',
  (select count(*) from public.categories c
   where not exists (select 1 from public.club_categories cc where cc.categorie_id = c.id))::text;

insert into controle_categories
select 9, 'Déclencheurs posés (équipe, fiche, suivi) et actifs', '3',
  (select count(*) from pg_trigger t
   where not t.tgisinternal and t.tgenabled <> 'D'
     and ((t.tgrelid = 'public.club_categories'::regclass
           and t.tgname in ('categories_rattacher_equipe', 'categories_suivre_equipe'))
          or (t.tgrelid = 'public.equipe_joueurs'::regclass and t.tgname = 'categories_rattacher_fiche')))::text;

insert into controle_categories
select 10, 'Garde des attributions de coach (saisons) toujours en place', '1',
  (select count(*) from pg_trigger
   where tgrelid = 'public.club_categories'::regclass and tgname = 'saison_garde_attribution_equipe' and tgenabled <> 'D')::text;

insert into controle_categories
select 11, 'Règles d''accès : lecture, création et suppression, aucune modification directe', 'categories_club_cree (INSERT), categories_club_supprime (DELETE), categories_lecture (SELECT)',
  (select string_agg(policyname || ' (' || cmd || ')', ', ' order by policyname) from pg_policies
   where schemaname = 'public' and tablename = 'categories');

insert into controle_categories
select 12, 'Visiteur non connecté : aucun accès à la table ni à la règle de lecture', 'false,false',
  has_table_privilege('anon', 'public.categories', 'select')::text || ',' ||
  has_function_privilege('anon', 'public.categories_peut_lire(uuid)', 'execute')::text;

insert into controle_categories
select 13, 'Fonctions des déclencheurs non appelables depuis le navigateur', 'false,false,false',
  has_function_privilege('authenticated', 'public.categories_rattacher_equipe()', 'execute')::text || ',' ||
  has_function_privilege('authenticated', 'public.categories_rattacher_fiche()', 'execute')::text || ',' ||
  has_function_privilege('authenticated', 'public.categories_suivre_equipe()', 'execute')::text;

-- ── Cas d'essai (tout est annulé à la fin) ──────────────────────────────────
do $$
declare
  v_club uuid;
  v_autre_club uuid;
  v_edu uuid;
  v_inconnu uuid := gen_random_uuid();
  v_nom_existant text;
  v_cat_existante uuid;
  v_nb_cat int;
  v_cat uuid;
  v_cat_essai uuid;
  v_cat_bis uuid;
  v_equipe_essai uuid;
  v_fiche uuid;
  v_res jsonb := '[]'::jsonb;
  v_txt text;
begin
  -- Le club qui a le plus d'équipes, une de ses catégories, un de ses
  -- éducateurs affiliés (s'il en a) et un autre club.
  select cc.club_id into v_club
  from public.club_categories cc where cc.club_id is not null
  group by cc.club_id order by count(*) desc, cc.club_id limit 1;
  select c.nom, c.id into v_nom_existant, v_cat_existante
  from public.categories c where c.club_id = v_club order by c.nom limit 1;
  select ce.educateur_id into v_edu from public.club_educateurs ce
  where ce.club_id = v_club and ce.statut = 'accepte' and ce.educateur_id <> v_club
  order by ce.educateur_id limit 1;
  select cc.club_id into v_autre_club
  from public.club_categories cc where cc.club_id is not null and cc.club_id <> v_club
  order by cc.club_id limit 1;
  select count(*) into v_nb_cat from public.categories where club_id = v_club;
  if v_club is null or v_cat_existante is null then
    raise exception 'Aucun club avec une catégorie : vérification impossible';
  end if;

  begin
    -- Le club crée une équipe comme avec le formulaire actuel (connecté, règles
    -- d'accès actives) dans une catégorie qui existe déjà.
    perform set_config('request.jwt.claim.sub', v_club::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', v_club, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';

    insert into public.club_categories (club_id, nom, equipe, educateur_id)
      values (v_club, v_nom_existant, 'ZZ9', null)
      returning categorie_id into v_cat;
    v_res := v_res || jsonb_build_object('ordre', 20, 'cas', 'Formulaire actuel : nouvelle équipe ' || v_nom_existant || ' ZZ9 rattachée à la catégorie ' || v_nom_existant,
      'attendu', 'true', 'obtenu', (v_cat = v_cat_existante)::text);

    -- Une équipe d'un nom nouveau crée sa catégorie, en mode par équipe.
    insert into public.club_categories (club_id, nom, equipe, educateur_id)
      values (v_club, ' Essai  Bloc1 ', 'A', null)
      returning id, categorie_id into v_equipe_essai, v_cat_essai;
    v_res := v_res || jsonb_build_object('ordre', 21, 'cas', 'Équipe d''un nom nouveau : catégorie créée, nom nettoyé, mode par équipe',
      'attendu', 'Essai  Bloc1,ESSAIBLOC1,par_equipe', 'obtenu',
      (select c.nom || ',' || c.nom_cle || ',' || c.mode from public.categories c where c.id = v_cat_essai));

    v_res := v_res || jsonb_build_object('ordre', 22, 'cas', 'Le club lit toutes ses catégories (essai compris)',
      'attendu', (v_nb_cat + 1)::text, 'obtenu', (select count(*) from public.categories where club_id = v_club)::text);

    insert into public.categories (club_id, nom) values (v_club, 'Essai direct');
    v_res := v_res || jsonb_build_object('ordre', 23, 'cas', 'Le club crée une catégorie directement',
      'attendu', '1', 'obtenu', (select count(*) from public.categories where club_id = v_club and nom = 'Essai direct')::text);

    begin
      insert into public.categories (club_id, nom) values (coalesce(v_autre_club, v_inconnu), 'Essai intrus');
      v_txt := 'accepté';
    exception when insufficient_privilege or foreign_key_violation then
      v_txt := 'refusé';
    end;
    v_res := v_res || jsonb_build_object('ordre', 24, 'cas', 'Le club crée une catégorie pour un autre club : refusé',
      'attendu', 'refusé', 'obtenu', v_txt);

    update public.categories set mode = 'commun' where id = v_cat_existante;
    v_res := v_res || jsonb_build_object('ordre', 25, 'cas', 'Le club change le mode directement : sans effet (passera par le bloc 8)',
      'attendu', 'par_equipe', 'obtenu', (select mode from public.categories where id = v_cat_existante));

    begin
      insert into public.categories (club_id, nom) values (v_club, ' essai BLOC1');
      v_txt := 'accepté';
    exception when unique_violation then
      v_txt := 'refusé';
    end;
    v_res := v_res || jsonb_build_object('ordre', 26, 'cas', 'Même nom écrit autrement (« essai BLOC1 ») : doublon refusé',
      'attendu', 'refusé', 'obtenu', v_txt);
    execute 'reset role';

    -- Un éducateur affilié lit les catégories de son club mais n'en crée pas.
    if v_edu is null then
      v_res := v_res || jsonb_build_object('ordre', 27, 'cas', 'Éducateur affilié : lit les catégories, ne peut pas en créer',
        'attendu', 'sans objet', 'obtenu', 'sans objet');
    else
      perform set_config('request.jwt.claim.sub', v_edu::text, true);
      perform set_config('request.jwt.claims', json_build_object('sub', v_edu, 'role', 'authenticated')::text, true);
      execute 'set local role authenticated';
      begin
        insert into public.categories (club_id, nom) values (v_club, 'Essai coach');
        v_txt := 'accepté';
      exception when insufficient_privilege then
        v_txt := 'refusé';
      end;
      v_res := v_res || jsonb_build_object('ordre', 27, 'cas', 'Éducateur affilié : lit les catégories, ne peut pas en créer',
        'attendu', (v_nb_cat + 2)::text || ',refusé', 'obtenu',
        (select count(*) from public.categories where club_id = v_club)::text || ',' || v_txt);
      execute 'reset role';
    end if;

    -- Un autre club et un compte inconnu ne voient rien.
    if v_autre_club is null then
      v_res := v_res || jsonb_build_object('ordre', 28, 'cas', 'Un autre club ne voit aucune catégorie de ce club',
        'attendu', 'sans objet', 'obtenu', 'sans objet');
    else
      perform set_config('request.jwt.claim.sub', v_autre_club::text, true);
      perform set_config('request.jwt.claims', json_build_object('sub', v_autre_club, 'role', 'authenticated')::text, true);
      execute 'set local role authenticated';
      v_res := v_res || jsonb_build_object('ordre', 28, 'cas', 'Un autre club ne voit aucune catégorie de ce club',
        'attendu', '0', 'obtenu', (select count(*) from public.categories where club_id = v_club)::text);
      execute 'reset role';
    end if;

    perform set_config('request.jwt.claim.sub', v_inconnu::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', v_inconnu, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    v_res := v_res || jsonb_build_object('ordre', 29, 'cas', 'Un compte connecté sans lien avec le club ne voit rien',
      'attendu', '0', 'obtenu', (select count(*) from public.categories where club_id = v_club)::text);
    execute 'reset role';
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '{}', true);

    -- Fiches joueurs : elles suivent leur équipe.
    select ej.id into v_fiche
    from public.equipe_joueurs ej
    join public.club_categories cc on cc.id = ej.club_categorie_id
    where cc.club_id = v_club
    order by ej.id limit 1;
    if v_fiche is null then
      v_res := v_res || jsonb_build_object('ordre', 30, 'cas', 'Fiche déplacée, équipe renommée, fiche retirée : la catégorie suit',
        'attendu', 'sans objet', 'obtenu', 'sans objet');
    else
      update public.equipe_joueurs set club_categorie_id = v_equipe_essai where id = v_fiche;
      v_txt := ((select categorie_id from public.equipe_joueurs where id = v_fiche) = v_cat_essai)::text;

      update public.club_categories set nom = 'Essai Bloc1 bis' where id = v_equipe_essai
        returning categorie_id into v_cat_bis;
      v_txt := v_txt || ',' || (v_cat_bis is not null and v_cat_bis <> v_cat_essai)::text
                     || ',' || ((select categorie_id from public.equipe_joueurs where id = v_fiche) = v_cat_bis)::text;

      update public.equipe_joueurs set club_categorie_id = null where id = v_fiche;
      v_txt := v_txt || ',' || ((select categorie_id from public.equipe_joueurs where id = v_fiche) is null)::text;

      v_res := v_res || jsonb_build_object('ordre', 30, 'cas', 'Fiche déplacée (suit), équipe renommée (nouvelle catégorie, fiche suit), fiche retirée (plus de catégorie)',
        'attendu', 'true,true,true,true', 'obtenu', v_txt);
    end if;

    -- Une valeur écrite à la main est recalculée.
    update public.club_categories set categorie_id = v_cat_existante where id = v_equipe_essai
      returning categorie_id into v_cat;
    v_res := v_res || jsonb_build_object('ordre', 31, 'cas', 'Catégorie forcée à la main sur une équipe : recalculée d''après son nom',
      'attendu', 'true', 'obtenu', (v_cat = coalesce(v_cat_bis, v_cat_essai))::text);

    -- Une catégorie qui a des équipes ne peut pas être supprimée.
    begin
      delete from public.categories where id = v_cat_existante;
      v_txt := 'accepté';
    exception when foreign_key_violation then
      v_txt := 'refusé';
    end;
    v_res := v_res || jsonb_build_object('ordre', 32, 'cas', 'Suppression d''une catégorie qui a des équipes : refusée',
      'attendu', 'refusé', 'obtenu', v_txt);

    v_res := v_res || jsonb_build_object('ordre', 40, 'cas', 'Tous les cas d''essai ont tourné jusqu''au bout',
      'attendu', 'oui', 'obtenu', 'oui');

    -- Tout annuler : seules les valeurs de v_res survivent.
    raise exception using errcode = 'P0001', message = 'fin_du_controle';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'fin_du_controle' then
      raise;
    end if;
  end;

  insert into controle_categories (ordre, cas, attendu, obtenu)
  select r.ordre, r.cas, r.attendu, r.obtenu
  from jsonb_to_recordset(v_res) as r(ordre int, cas text, attendu text, obtenu text);
end $$;

-- ── Pour info (comparer avec l'inventaire du 14/11 : 57 équipes, 38
-- catégories dont 14 à plusieurs équipes, si aucune équipe n'a été créée depuis)
insert into controle_categories
select 90, 'pour info : équipes, catégories, catégories à plusieurs équipes, fiches rattachées', null,
  (select count(*) from public.club_categories)::text || ', ' ||
  (select count(*) from public.categories)::text || ', ' ||
  (select count(*) from (select 1 from public.club_categories where categorie_id is not null
                         group by categorie_id having count(*) > 1) x)::text || ', ' ||
  (select count(*) from public.equipe_joueurs where categorie_id is not null)::text;

select ordre, cas, attendu, obtenu, case when attendu is null then null else attendu = obtenu end as ok
from controle_categories
order by ordre;
