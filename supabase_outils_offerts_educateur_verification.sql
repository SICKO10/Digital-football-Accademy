-- Vérification du bloc 8 (outils fournis éducateur par éducateur). Lancer après
-- supabase_outils_offerts_educateur.sql, le fichier en entier, d'un seul coup.
--
-- Rien n'est modifié en base : les cas d'essai changent le club d'essai et
-- testfinal dans une sous-transaction annulée à la fin (seuls les résultats
-- sont gardés, dans une table temporaire effacée à la fin de la session).
-- Les contrôles 17 à 19 lisent les comptes réels sans rien changer.
--
-- Résultat : un seul tableau. Chaque ligne doit avoir ok = true.

drop table if exists pg_temp.controle_offerts_edu;
create temp table controle_offerts_edu (ordre int, cas text, attendu text, obtenu text);

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
  -- Un autre éducateur, qui n'est pas affilié au club d'essai (il ne sert qu'à
  -- vérifier qu'une ligne à son nom ne lui donne rien).
  select p.id into v_autre from public.profiles p
  where p.plan = 'educateur' and p.id <> v_edu
    and not exists (select 1 from public.club_educateurs ce where ce.club_id = v_club and ce.educateur_id = p.id)
  limit 1;
  if v_autre is null then
    raise exception 'Aucun éducateur non affilié au club d''essai pour le contrôle 7';
  end if;

  begin
    -- Départ propre : club au nouveau modèle, forfait actif de 7 places, aucun
    -- outil ouvert ni fourni ; testfinal sans outil à lui et sans avis.
    update public.profiles
      set modele_outils = true, abonnement_actif = true, palier = coalesce(palier, 'c200'), quota_equipes = 7
      where id = v_club;
    delete from public.outils_club_ouverts where club_id = v_club;
    delete from public.outils_educateur_fournis where club_id = v_club;
    delete from public.outils_comptes where compte_id in (v_edu, v_autre);
    delete from public.notifications where user_id = v_edu and type = 'outils_club_fin';
    perform set_config('request.jwt.claim.sub', v_edu::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', v_edu, 'role', 'authenticated')::text, true);

    v_res := v_res || jsonb_build_object('ordre', 1, 'cas', 'Rien n''est fourni : testfinal n''a pas Préparation physique',
      'attendu', 'false', 'obtenu', public.a_outil(v_edu, 'prep_physique')::text);

    insert into public.outils_educateur_fournis (club_id, educateur_id, outil) values (v_club, v_edu, 'prep_physique');

    v_res := v_res || jsonb_build_object('ordre', 2, 'cas', 'Préparation physique fournie à testfinal seul : il l''a',
      'attendu', 'true', 'obtenu', public.a_outil(v_edu, 'prep_physique')::text);
    v_res := v_res || jsonb_build_object('ordre', 3, 'cas', 'Mes outils de testfinal : Préparation physique avec la source club',
      'attendu', '1', 'obtenu', (select count(*) from public.outils_actifs(v_edu) a where a.outil = 'prep_physique' and a.source = 'club')::text);
    v_res := v_res || jsonb_build_object('ordre', 4, 'cas', 'Le verrou de Préparation physique s''ouvre pour testfinal',
      'attendu', 'false', 'obtenu', public.outil_ferme(array['prep_physique'], array[]::text[])::text);
    v_res := v_res || jsonb_build_object('ordre', 5, 'cas', 'Un autre outil (Séances) n''est pas fourni : testfinal ne l''a pas',
      'attendu', 'false', 'obtenu', public.a_outil(v_edu, 'seances')::text);
    v_res := v_res || jsonb_build_object('ordre', 6, 'cas', 'Aucun outil ouvert à tous : la liste des outils ouverts du club reste vide',
      'attendu', '0', 'obtenu', (select count(*) from public.outils_club_ouverts where club_id = v_club)::text);

    insert into public.outils_educateur_fournis (club_id, educateur_id, outil) values (v_club, v_autre, 'prep_physique');
    v_res := v_res || jsonb_build_object('ordre', 7, 'cas', 'Ligne au nom d''un éducateur non affilié au club : il n''a rien',
      'attendu', 'false', 'obtenu', public.a_outil(v_autre, 'prep_physique')::text);
    delete from public.outils_educateur_fournis where educateur_id = v_autre;

    update public.profiles set quota_equipes = 0 where id = v_club;
    v_res := v_res || jsonb_build_object('ordre', 8, 'cas', 'Éducateur au-delà de la limite : rien, malgré la ligne',
      'attendu', 'false', 'obtenu', public.a_outil(v_edu, 'prep_physique')::text);
    v_res := v_res || jsonb_build_object('ordre', 9, 'cas', 'Éducateur au-delà de la limite : le verrou reste fermé',
      'attendu', 'true', 'obtenu', public.outil_ferme(array['prep_physique'], array[]::text[])::text);
    v_res := v_res || jsonb_build_object('ordre', 10, 'cas', 'Passage à 0 place : testfinal reçoit un avis de fin (outil fourni à lui seul)',
      'attendu', '1', 'obtenu', (select count(*) from public.notifications where user_id = v_edu and type = 'outils_club_fin')::text);
    update public.profiles set quota_equipes = 7 where id = v_club;
    v_res := v_res || jsonb_build_object('ordre', 11, 'cas', 'La place revient : l''outil revient avec elle',
      'attendu', 'true', 'obtenu', public.a_outil(v_edu, 'prep_physique')::text);

    update public.profiles set modele_outils = false where id = v_club;
    v_res := v_res || jsonb_build_object('ordre', 12, 'cas', 'Club de l''ancien modèle : testfinal n''a pas Préparation physique',
      'attendu', 'false', 'obtenu', public.a_outil(v_edu, 'prep_physique')::text);
    update public.profiles set modele_outils = true where id = v_club;

    update public.profiles set abonnement_actif = false where id = v_club;
    v_res := v_res || jsonb_build_object('ordre', 13, 'cas', 'Club sans abonnement actif : testfinal n''a pas Préparation physique',
      'attendu', 'false', 'obtenu', public.a_outil(v_edu, 'prep_physique')::text);
    update public.profiles set abonnement_actif = true where id = v_club;

    update public.profiles set palier = null where id = v_club;
    v_res := v_res || jsonb_build_object('ordre', 14, 'cas', 'Club sans forfait choisi : testfinal n''a pas Préparation physique',
      'attendu', 'false', 'obtenu', public.a_outil(v_edu, 'prep_physique')::text);
    update public.profiles set palier = 'c200' where id = v_club;

    insert into public.outils_educateur_fournis (club_id, educateur_id, outil) values (v_club, v_edu, 'stages');
    v_res := v_res || jsonb_build_object('ordre', 15, 'cas', 'Stages fourni à un seul éducateur : règle actuelle gardée, pas d''accès',
      'attendu', 'false', 'obtenu', public.a_outil(v_edu, 'stages')::text);
    delete from public.outils_educateur_fournis where outil = 'stages' and club_id = v_club;

    -- Fourni à tous ET à lui seul : une seule ligne dans ses outils actifs.
    insert into public.outils_club_ouverts (club_id, outil) values (v_club, 'prep_physique');
    v_res := v_res || jsonb_build_object('ordre', 16, 'cas', 'Fourni à tous et à lui seul : une seule ligne source club',
      'attendu', '1', 'obtenu', (select count(*) from public.outils_actifs(v_edu) a where a.outil = 'prep_physique' and a.source = 'club')::text);
    delete from public.outils_club_ouverts where club_id = v_club;

    insert into public.outils_comptes (compte_id, outil, source) values (v_edu, 'prep_physique', 'achat');
    v_res := v_res || jsonb_build_object('ordre', 17, 'cas', 'Éducateur qui paie déjà Préparation physique : ses deux sources apparaissent',
      'attendu', 'achat, club', 'obtenu', (select string_agg(a.source, ', ' order by a.source) from public.outils_actifs(v_edu) a where a.outil = 'prep_physique'));
    delete from public.outils_comptes where compte_id = v_edu;

    -- Sans outil fourni à lui seul ni à tous : pas d'avis de fin au passage à 0 place.
    delete from public.outils_educateur_fournis where club_id = v_club;
    delete from public.notifications where user_id = v_edu and type = 'outils_club_fin';
    update public.profiles set quota_equipes = 0 where id = v_club;
    v_res := v_res || jsonb_build_object('ordre', 18, 'cas', 'Aucun outil fourni, passage à 0 place : aucun avis à tort',
      'attendu', '0', 'obtenu', (select count(*) from public.notifications where user_id = v_edu and type = 'outils_club_fin')::text);
    update public.profiles set quota_equipes = 7 where id = v_club;

    -- Écriture directe depuis le navigateur : refusée. Lecture : le club et
    -- l'éducateur voient la ligne, un autre compte ne la voit pas.
    insert into public.outils_educateur_fournis (club_id, educateur_id, outil) values (v_club, v_edu, 'prep_physique');
    perform set_config('request.jwt.claim.sub', v_club::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', v_club, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    begin
      insert into public.outils_educateur_fournis (club_id, educateur_id, outil) values (v_club, v_edu, 'seances');
      v_res := v_res || jsonb_build_object('ordre', 19, 'cas', 'Le club écrit directement dans la table depuis le navigateur : refusé',
        'attendu', 'refusé', 'obtenu', 'accepté');
    exception when insufficient_privilege then
      v_res := v_res || jsonb_build_object('ordre', 19, 'cas', 'Le club écrit directement dans la table depuis le navigateur : refusé',
        'attendu', 'refusé', 'obtenu', 'refusé');
    end;
    v_res := v_res || jsonb_build_object('ordre', 20, 'cas', 'Le club lit les lignes de ses éducateurs',
      'attendu', '1', 'obtenu', (select count(*) from public.outils_educateur_fournis where club_id = v_club)::text);
    execute 'reset role';
    perform set_config('request.jwt.claim.sub', v_edu::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', v_edu, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    v_res := v_res || jsonb_build_object('ordre', 21, 'cas', 'L''éducateur lit sa ligne',
      'attendu', '1', 'obtenu', (select count(*) from public.outils_educateur_fournis where educateur_id = v_edu)::text);
    execute 'reset role';
    perform set_config('request.jwt.claim.sub', v_autre::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', v_autre, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    v_res := v_res || jsonb_build_object('ordre', 22, 'cas', 'Un autre compte ne voit aucune ligne du club',
      'attendu', '0', 'obtenu', (select count(*) from public.outils_educateur_fournis where club_id = v_club)::text);
    execute 'reset role';

    v_res := v_res || jsonb_build_object('ordre', 23, 'cas', 'Tous les cas d''essai ont tourné jusqu''au bout',
      'attendu', 'oui', 'obtenu', 'oui');

    -- Tout annuler : seules les valeurs de v_res survivent.
    raise exception using errcode = 'P0001', message = 'fin_du_controle';
  exception when sqlstate 'P0001' then
    null;
  end;

  insert into controle_offerts_edu (ordre, cas, attendu, obtenu)
  select r.ordre, r.cas, r.attendu, r.obtenu
  from jsonb_to_recordset(v_res) as r(ordre int, cas text, attendu text, obtenu text);
end $$;

-- 24. Les cas d'essai n'ont rien laissé : aucune ligne « fourni à un éducateur ».
insert into controle_offerts_edu
select 24, 'Rien n''est resté en base après les essais (outils fournis éducateur par éducateur)', '0',
  count(*)::text
from public.outils_educateur_fournis;

-- 25. Comptes réels : la règle du bloc 1 (outils fournis à tous) donne les mêmes
--     accès qu'avant ce fichier. Comptes différents listés dans la colonne obtenu.
with outils(outil) as (
  values ('suivi_joueurs'), ('stats_collectives'), ('seances'), ('tactique'), ('bibliotheque'),
         ('prep_physique'), ('evaluations_video'), ('projet_sportif'), ('cff4'), ('stages'),
         ('competition'), ('finances'), ('vie_club')
), comparaison as (
  select p.id, o.outil,
    public.a_outil(p.id, o.outil) as nouvelle,
    exists (
      select 1 from public.outils_comptes oc
      where oc.compte_id = p.id and oc.outil = o.outil and (oc.fin_le is null or oc.fin_le > now())
    ) or exists (
      select 1
      from public.club_educateurs ce
      join public.profiles club on club.id = ce.club_id and club.abonnement_actif is true
      join public.outils_club_ouverts oo on oo.club_id = ce.club_id and oo.outil = o.outil
      join public.outils_comptes club_oc on club_oc.compte_id = ce.club_id and club_oc.outil = o.outil
        and (club_oc.fin_le is null or club_oc.fin_le > now())
      where ce.educateur_id = p.id and ce.statut = 'accepte'
    ) or (
      public.outil_offert_par_club(o.outil) and exists (
        select 1
        from public.club_educateurs ce
        join public.outils_club_ouverts oo on oo.club_id = ce.club_id and oo.outil = o.outil
        where ce.educateur_id = p.id and ce.statut = 'accepte'
          and public.club_offre_outils(ce.club_id)
          and public.educateur_a_place(ce.club_id, p.id)
      )
    ) as ancienne
  from public.profiles p
  cross join outils o
)
insert into controle_offerts_edu
select 25, 'Comptes réels : accès identiques à ceux d''avant ce fichier (différences)', '0',
  case when count(*) = 0 then '0'
       else count(*)::text || ' : ' || string_agg(left(c.id::text, 8) || ' ' || c.outil, ', ') end
from comparaison c
where c.nouvelle is distinct from c.ancienne;

-- 26. Le déclencheur du bloc 6 est bien en place sur les profils.
insert into controle_offerts_edu
select 26, 'Déclencheur d''avis de fin présent sur les profils', '1',
  count(*)::text
from pg_trigger t
where t.tgname = 'trigger_prevenir_fin_outils_club' and t.tgrelid = 'public.profiles'::regclass and not t.tgisinternal;

select ordre, cas, attendu, obtenu, attendu = obtenu as ok
from controle_offerts_edu
order by ordre;
