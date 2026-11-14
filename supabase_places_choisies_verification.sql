-- Vérification du bloc 1 (places choisies, PLAN-outils-offerts-suite.md). Lancer
-- après supabase_places_choisies.sql, le fichier en entier, d'un seul coup.
--
-- Rien n'est modifié en base : les cas d'essai changent le club d'essai,
-- testfinal et un autre éducateur affilié pour l'occasion dans une
-- sous-transaction annulée à la fin (seuls les résultats sont gardés, dans une
-- table temporaire effacée à la fin de la session). Les contrôles 14 à 19
-- lisent les comptes réels sans rien changer.
--
-- Résultat : un seul tableau. Chaque ligne doit avoir ok = true.

drop table if exists pg_temp.controle_places;
create temp table controle_places (ordre int, cas text, attendu text, obtenu text);

do $$
declare
  v_club uuid;
  v_edu uuid;
  v_autre uuid;
  v_res jsonb := '[]'::jsonb;
begin
  select u.id into v_club from auth.users u where u.email = 'deabreu.amorim+club@gmail.com';
  select ce.educateur_id into v_edu from public.club_educateurs ce
  where ce.club_id = v_club and ce.statut = 'accepte' and ce.educateur_id::text like '75df7fba%'
  limit 1;
  if v_club is null or v_edu is null then
    raise exception 'Club d''essai ou testfinal introuvable (ou testfinal plus affilié au club)';
  end if;
  -- Un deuxième compte, affilié au club d'essai et passé au nouveau modèle
  -- seulement le temps des essais (tout est annulé à la fin).
  select p.id into v_autre from public.profiles p
  where p.plan is distinct from 'club' and p.id <> v_edu
    and not exists (select 1 from public.club_educateurs ce where ce.club_id = v_club and ce.educateur_id = p.id)
  -- De préférence un éducateur, affilié nulle part (aucun outil reçu d'ailleurs).
  order by p.plan is distinct from 'educateur',
    exists (select 1 from public.club_educateurs ce where ce.educateur_id = p.id and ce.statut = 'accepte'), p.id
  limit 1;
  if v_autre is null then
    raise exception 'Aucun autre compte hors du club d''essai pour les essais';
  end if;

  begin
    -- Départ propre : forfait actif de 7 places, aucun outil fourni, aucun
    -- choix de place, aucun avis ; l'autre éducateur affilié après testfinal.
    update public.profiles
      set modele_outils = true, abonnement_actif = true, palier = coalesce(palier, 'c200'), quota_equipes = 7
      where id = v_club;
    delete from public.outils_club_ouverts where club_id = v_club;
    delete from public.outils_educateur_fournis where club_id = v_club;
    delete from public.club_places_choisies where club_id = v_club;
    delete from public.outils_comptes where compte_id in (v_edu, v_autre);
    delete from public.notifications where user_id in (v_edu, v_autre) and type = 'outils_club_fin';
    update public.profiles set modele_outils = true where id = v_autre;
    insert into public.club_educateurs (id, club_id, educateur_id, statut, created_at)
      values (gen_random_uuid(), v_club, v_autre, 'accepte', now());

    v_res := v_res || jsonb_build_object('ordre', 1, 'cas', 'Aucun choix : rang par ancienneté (testfinal 1, autre 2)',
      'attendu', '1,2', 'obtenu',
      (select rang from public.rangs_places_club(v_club) where educateur_id = v_edu)::text || ',' ||
      (select rang from public.rangs_places_club(v_club) where educateur_id = v_autre)::text);

    update public.profiles set quota_equipes = 1 where id = v_club;
    v_res := v_res || jsonb_build_object('ordre', 2, 'cas', 'Aucun choix, 1 place : le plus ancien la garde (testfinal oui, autre non)',
      'attendu', 'true,false', 'obtenu',
      public.educateur_a_place(v_club, v_edu)::text || ',' || public.educateur_a_place(v_club, v_autre)::text);

    insert into public.club_places_choisies (club_id, educateur_id, etat, auteur_id) values (v_club, v_autre, 'choisi', v_club);
    v_res := v_res || jsonb_build_object('ordre', 3, 'cas', 'Place donnée à l''autre : il passe premier (autre 1, testfinal 2)',
      'attendu', '1,2', 'obtenu',
      (select rang from public.rangs_places_club(v_club) where educateur_id = v_autre)::text || ',' ||
      (select rang from public.rangs_places_club(v_club) where educateur_id = v_edu)::text);
    v_res := v_res || jsonb_build_object('ordre', 4, 'cas', 'Place donnée à l''autre, 1 place : il l''a, testfinal non',
      'attendu', 'true,false', 'obtenu',
      public.educateur_a_place(v_club, v_autre)::text || ',' || public.educateur_a_place(v_club, v_edu)::text);

    insert into public.outils_educateur_fournis (club_id, educateur_id, outil)
      values (v_club, v_edu, 'prep_physique'), (v_club, v_autre, 'prep_physique');
    v_res := v_res || jsonb_build_object('ordre', 5, 'cas', 'Outil fourni aux deux : seul celui qui a la place l''ouvre (autre oui, testfinal non)',
      'attendu', 'true,false', 'obtenu',
      public.a_outil(v_autre, 'prep_physique')::text || ',' || public.a_outil(v_edu, 'prep_physique')::text);

    delete from public.club_places_choisies where club_id = v_club;
    insert into public.club_places_choisies (club_id, educateur_id, etat, auteur_id) values (v_club, v_edu, 'retire', v_club);
    v_res := v_res || jsonb_build_object('ordre', 6, 'cas', 'Place retirée à testfinal : il n''a plus de rang, l''autre passe premier',
      'attendu', 'aucun,1', 'obtenu',
      coalesce((select rang from public.rangs_places_club(v_club) where educateur_id = v_edu)::text, 'aucun') || ',' ||
      (select rang from public.rangs_places_club(v_club) where educateur_id = v_autre)::text);

    update public.profiles set quota_equipes = 7 where id = v_club;
    v_res := v_res || jsonb_build_object('ordre', 7, 'cas', 'Place retirée, 7 places libres : testfinal n''a toujours rien',
      'attendu', 'false,false', 'obtenu',
      public.educateur_a_place(v_club, v_edu)::text || ',' || public.a_outil(v_edu, 'prep_physique')::text);

    delete from public.notifications where user_id in (v_edu, v_autre) and type = 'outils_club_fin';
    update public.profiles set quota_equipes = 0 where id = v_club;
    v_res := v_res || jsonb_build_object('ordre', 8, 'cas', 'Passage à 0 place : avis pour l''autre, aucun pour testfinal (il n''avait pas de place)',
      'attendu', '1,0', 'obtenu',
      (select count(*) from public.notifications where user_id = v_autre and type = 'outils_club_fin')::text || ',' ||
      (select count(*) from public.notifications where user_id = v_edu and type = 'outils_club_fin')::text);
    update public.profiles set quota_equipes = 7 where id = v_club;

    delete from public.club_places_choisies where club_id = v_club;
    v_res := v_res || jsonb_build_object('ordre', 9, 'cas', 'Choix effacé : testfinal retrouve sa place et son outil',
      'attendu', 'true,true', 'obtenu',
      public.educateur_a_place(v_club, v_edu)::text || ',' || public.a_outil(v_edu, 'prep_physique')::text);

    -- Écriture directe depuis le navigateur : refusée. Lecture : le club et
    -- l'éducateur voient la ligne, un autre compte ne la voit pas.
    insert into public.club_places_choisies (club_id, educateur_id, etat, auteur_id) values (v_club, v_edu, 'choisi', v_club);
    perform set_config('request.jwt.claim.sub', v_club::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', v_club, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    begin
      insert into public.club_places_choisies (club_id, educateur_id, etat) values (v_club, v_autre, 'choisi');
      v_res := v_res || jsonb_build_object('ordre', 10, 'cas', 'Le club écrit directement dans la table depuis le navigateur : refusé',
        'attendu', 'refusé', 'obtenu', 'accepté');
    exception when insufficient_privilege then
      v_res := v_res || jsonb_build_object('ordre', 10, 'cas', 'Le club écrit directement dans la table depuis le navigateur : refusé',
        'attendu', 'refusé', 'obtenu', 'refusé');
    end;
    v_res := v_res || jsonb_build_object('ordre', 11, 'cas', 'Le club lit les places choisies de ses éducateurs',
      'attendu', '1', 'obtenu', (select count(*) from public.club_places_choisies where club_id = v_club)::text);
    execute 'reset role';
    perform set_config('request.jwt.claim.sub', v_edu::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', v_edu, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    v_res := v_res || jsonb_build_object('ordre', 12, 'cas', 'L''éducateur lit sa ligne',
      'attendu', '1', 'obtenu', (select count(*) from public.club_places_choisies where educateur_id = v_edu)::text);
    execute 'reset role';
    perform set_config('request.jwt.claim.sub', v_autre::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', v_autre, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    v_res := v_res || jsonb_build_object('ordre', 13, 'cas', 'Un autre éducateur ne voit pas la ligne de testfinal',
      'attendu', '0', 'obtenu', (select count(*) from public.club_places_choisies where club_id = v_club)::text);
    execute 'reset role';

    v_res := v_res || jsonb_build_object('ordre', 20, 'cas', 'Tous les cas d''essai ont tourné jusqu''au bout',
      'attendu', 'oui', 'obtenu', 'oui');

    -- Tout annuler : seules les valeurs de v_res survivent.
    raise exception using errcode = 'P0001', message = 'fin_du_controle';
  exception when sqlstate 'P0001' then
    null;
  end;

  insert into controle_places (ordre, cas, attendu, obtenu)
  select r.ordre, r.cas, r.attendu, r.obtenu
  from jsonb_to_recordset(v_res) as r(ordre int, cas text, attendu text, obtenu text);
end $$;

-- 14. Photo du bloc 0 : les 2 couples club et éducateur ont toujours leur place.
insert into controle_places
select 14, 'Photo du bloc 0 : Test test (club d''essai) et tiago bustos (Mâcon) ont toujours leur place', '2',
  count(*) filter (where public.educateur_a_place(x.club_id, x.educateur_id))::text
from (values
  ('0e341547-f2de-4ac2-9229-4a2b2711652b'::uuid, '75df7fba-40e1-4c93-8902-91d7239c404c'::uuid),
  ('2b1e77de-a2bc-4e6d-bf4f-fa49c4f92d9b'::uuid, 'f5bf91dd-7ac4-4216-97d5-5feb17400be7'::uuid)
) as x(club_id, educateur_id);

-- 15. Nombre total de couples avec place, comme la requête 3 du bloc 0 (2 ce
--     jour-là) : attendu = ancienne règle recalculée, obtenu = nouvelle règle.
--     Plus de 2 des deux côtés si un éducateur s'est affilié depuis.
with affilies as (
  select ce.club_id, ce.educateur_id, min(ce.created_at) as depuis
  from public.club_educateurs ce
  join public.profiles c on c.id = ce.club_id and c.plan = 'club' and c.modele_outils is true
  where ce.statut = 'accepte' and ce.educateur_id is not null
  group by ce.club_id, ce.educateur_id
), ancienne as (
  select a.club_id, a.educateur_id,
    row_number() over (partition by a.club_id order by a.depuis, a.educateur_id) <= coalesce(c.quota_equipes, 0) as a_place
  from affilies a
  join public.profiles c on c.id = a.club_id
)
insert into controle_places
select 15, 'Nombre total de couples club et éducateur avec place (2 au bloc 0)',
  count(*) filter (where an.a_place)::text,
  count(*) filter (where public.educateur_a_place(an.club_id, an.educateur_id))::text
from ancienne an;

-- 16. Tous les clubs : la nouvelle règle donne les mêmes places que l'ancienne
--     (ancienneté seule, recalculée ici). Clubs différents listés dans obtenu.
with affilies as (
  select ce.club_id, ce.educateur_id, min(ce.created_at) as depuis
  from public.club_educateurs ce
  where ce.statut = 'accepte' and ce.educateur_id is not null
  group by ce.club_id, ce.educateur_id
), ancienne as (
  select a.club_id, a.educateur_id,
    row_number() over (partition by a.club_id order by a.depuis, a.educateur_id) <= coalesce(c.quota_equipes, 0) as a_place
  from affilies a
  join public.profiles c on c.id = a.club_id
)
insert into controle_places
select 16, 'Tous les clubs : mêmes places qu''avant ce fichier (différences)', '0',
  case when count(*) = 0 then '0'
       else count(*)::text || ' : ' || string_agg(distinct left(an.club_id::text, 8), ', ') end
from ancienne an
where an.a_place is distinct from public.educateur_a_place(an.club_id, an.educateur_id);

-- 17. Les cas d'essai n'ont rien laissé.
insert into controle_places
select 17, 'Rien n''est resté en base après les essais (places choisies)', '0', count(*)::text
from public.club_places_choisies;

-- 18. Le navigateur ne peut pas lire la liste des rangs d'un club.
insert into controle_places
select 18, 'Rangs réservés au serveur (navigateur connecté, visiteur)', 'false,false',
  has_function_privilege('authenticated', 'public.rangs_places_club(uuid)', 'execute')::text || ',' ||
  has_function_privilege('anon', 'public.rangs_places_club(uuid)', 'execute')::text;

-- 19. Le déclencheur d'avis de fin est en place et utilise le nouveau rang.
insert into controle_places
select 19, 'Déclencheur d''avis de fin présent et branché sur le nouveau rang', '1,true',
  (select count(*) from pg_trigger t
   where t.tgname = 'trigger_prevenir_fin_outils_club' and t.tgrelid = 'public.profiles'::regclass and not t.tgisinternal)::text
  || ',' || (pg_get_functiondef('public.prevenir_fin_outils_club()'::regprocedure) like '%rangs_places_club%')::text;

select ordre, cas, attendu, obtenu, attendu = obtenu as ok
from controle_places
order by ordre;
