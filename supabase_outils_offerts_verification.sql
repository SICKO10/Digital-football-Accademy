-- Vérification du bloc 1 (outils offerts par le club). Lancer après
-- supabase_outils_offerts.sql, le fichier en entier, d'un seul coup.
--
-- Rien n'est modifié en base : les cas d'essai changent le club d'essai et
-- testfinal dans une sous-transaction annulée à la fin (seuls les résultats
-- sont gardés, dans une table temporaire effacée à la fin de la session).
-- Les contrôles 20 et 21 lisent les comptes réels sans rien changer.
--
-- Résultat : un seul tableau. Chaque ligne doit avoir ok = true.

drop table if exists pg_temp.controle_offerts;
create temp table controle_offerts (ordre int, cas text, attendu text, obtenu text);

do $$
declare
  v_club uuid;
  v_edu uuid;
  v_res jsonb := '[]'::jsonb;
begin
  select u.id into v_club from auth.users u where u.email = 'deabreu.amorim+club@gmail.com';
  select ce.educateur_id into v_edu from public.club_educateurs ce
  where ce.club_id = v_club and ce.statut = 'accepte' and ce.educateur_id::text like '75df7fba%'
  limit 1;
  if v_club is null or v_edu is null then
    raise exception 'Club d''essai ou testfinal introuvable (ou testfinal plus affilié au club)';
  end if;

  begin
    -- Départ propre : club au nouveau modèle, forfait actif de 7 places, aucun
    -- outil ouvert ; testfinal sans outil à lui ; connecté en tant que testfinal.
    update public.profiles
      set modele_outils = true, abonnement_actif = true, palier = coalesce(palier, 'c200'), quota_equipes = 7
      where id = v_club;
    delete from public.outils_club_ouverts where club_id = v_club;
    delete from public.outils_comptes where compte_id = v_edu;
    perform set_config('request.jwt.claim.sub', v_edu::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', v_edu, 'role', 'authenticated')::text, true);

    v_res := v_res || jsonb_build_object('ordre', 1, 'cas', 'Éducateur sans outil : le verrou de Tacticboard est fermé',
      'attendu', 'true', 'obtenu', public.outil_ferme(array['tactique'], array[]::text[])::text);
    v_res := v_res || jsonb_build_object('ordre', 2, 'cas', 'Club pas encore ouvert Tacticboard : l''éducateur ne l''a pas',
      'attendu', 'false', 'obtenu', public.a_outil(v_edu, 'tactique')::text);

    insert into public.outils_club_ouverts (club_id, outil) values (v_club, 'tactique');

    v_res := v_res || jsonb_build_object('ordre', 3, 'cas', 'Club nouveau modèle ouvre Tacticboard (sans le détenir) : l''éducateur l''a',
      'attendu', 'true', 'obtenu', public.a_outil(v_edu, 'tactique')::text);
    v_res := v_res || jsonb_build_object('ordre', 4, 'cas', 'Mes outils de l''éducateur : Tacticboard avec la source club',
      'attendu', '1', 'obtenu', (select count(*) from public.outils_actifs(v_edu) a where a.outil = 'tactique' and a.source = 'club')::text);
    v_res := v_res || jsonb_build_object('ordre', 5, 'cas', 'Le verrou de Tacticboard s''ouvre pour l''éducateur',
      'attendu', 'false', 'obtenu', public.outil_ferme(array['tactique'], array[]::text[])::text);
    v_res := v_res || jsonb_build_object('ordre', 6, 'cas', 'Séances non ouvert par le club : l''éducateur ne l''a pas',
      'attendu', 'false', 'obtenu', public.a_outil(v_edu, 'seances')::text);

    update public.profiles set quota_equipes = 1 where id = v_club;
    v_res := v_res || jsonb_build_object('ordre', 7, 'cas', 'Forfait 1 place, éducateur 1er affilié : il a une place',
      'attendu', 'true', 'obtenu', public.educateur_a_place(v_club, v_edu)::text);
    update public.profiles set quota_equipes = 0 where id = v_club;
    v_res := v_res || jsonb_build_object('ordre', 8, 'cas', 'Éducateur au-delà de la limite : il n''a pas Tacticboard',
      'attendu', 'false', 'obtenu', public.a_outil(v_edu, 'tactique')::text);
    v_res := v_res || jsonb_build_object('ordre', 9, 'cas', 'Éducateur au-delà de la limite : le verrou reste fermé',
      'attendu', 'true', 'obtenu', public.outil_ferme(array['tactique'], array[]::text[])::text);
    update public.profiles set quota_equipes = 7 where id = v_club;

    update public.profiles set modele_outils = false where id = v_club;
    v_res := v_res || jsonb_build_object('ordre', 10, 'cas', 'Club de l''ancien modèle : l''éducateur n''a pas Tacticboard',
      'attendu', 'false', 'obtenu', public.a_outil(v_edu, 'tactique')::text);
    update public.profiles set modele_outils = true where id = v_club;

    update public.profiles set abonnement_actif = false where id = v_club;
    v_res := v_res || jsonb_build_object('ordre', 11, 'cas', 'Club sans abonnement actif : l''éducateur n''a pas Tacticboard',
      'attendu', 'false', 'obtenu', public.a_outil(v_edu, 'tactique')::text);
    update public.profiles set abonnement_actif = true where id = v_club;

    update public.profiles set palier = null where id = v_club;
    v_res := v_res || jsonb_build_object('ordre', 12, 'cas', 'Club sans forfait choisi : l''éducateur n''a pas Tacticboard',
      'attendu', 'false', 'obtenu', public.a_outil(v_edu, 'tactique')::text);
    update public.profiles set palier = 'c200' where id = v_club;

    insert into public.outils_comptes (compte_id, outil, source) values (v_edu, 'tactique', 'achat');
    v_res := v_res || jsonb_build_object('ordre', 13, 'cas', 'Éducateur qui paie déjà Tacticboard : ses deux sources apparaissent',
      'attendu', 'achat, club', 'obtenu', (select string_agg(a.source, ', ' order by a.source) from public.outils_actifs(v_edu) a where a.outil = 'tactique'));
    update public.profiles set modele_outils = false where id = v_club;
    v_res := v_res || jsonb_build_object('ordre', 14, 'cas', 'Éducateur qui paie, club qui arrête : il garde son Tacticboard',
      'attendu', 'true', 'obtenu', public.a_outil(v_edu, 'tactique')::text);
    update public.profiles set modele_outils = true where id = v_club;
    delete from public.outils_comptes where compte_id = v_edu;

    insert into public.outils_club_ouverts (club_id, outil) values (v_club, 'stages');
    v_res := v_res || jsonb_build_object('ordre', 15, 'cas', 'Stages ouvert sans que le club le détienne : règle actuelle gardée, pas d''accès',
      'attendu', 'false', 'obtenu', public.a_outil(v_edu, 'stages')::text);

    -- Écriture directe depuis le navigateur, connecté en tant que club.
    delete from public.outils_club_ouverts where club_id = v_club;
    perform set_config('request.jwt.claim.sub', v_club::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', v_club, 'role', 'authenticated')::text, true);

    update public.profiles set modele_outils = false where id = v_club;
    execute 'set local role authenticated';
    begin
      insert into public.outils_club_ouverts (club_id, outil) values (v_club, 'seances');
      v_res := v_res || jsonb_build_object('ordre', 16, 'cas', 'Club de l''ancien modèle tente d''ouvrir Séances : refusé',
        'attendu', 'refusé', 'obtenu', 'accepté');
    exception when insufficient_privilege then
      v_res := v_res || jsonb_build_object('ordre', 16, 'cas', 'Club de l''ancien modèle tente d''ouvrir Séances : refusé',
        'attendu', 'refusé', 'obtenu', 'refusé');
    end;
    execute 'reset role';

    update public.profiles set modele_outils = true where id = v_club;
    execute 'set local role authenticated';
    begin
      insert into public.outils_club_ouverts (club_id, outil) values (v_club, 'seances');
      v_res := v_res || jsonb_build_object('ordre', 17, 'cas', 'Club nouveau modèle au forfait actif ouvre Séances : accepté',
        'attendu', 'accepté', 'obtenu', 'accepté');
    exception when insufficient_privilege then
      v_res := v_res || jsonb_build_object('ordre', 17, 'cas', 'Club nouveau modèle au forfait actif ouvre Séances : accepté',
        'attendu', 'accepté', 'obtenu', 'refusé');
    end;
    execute 'reset role';

    v_res := v_res || jsonb_build_object('ordre', 18, 'cas', 'Tous les cas d''essai ont tourné jusqu''au bout',
      'attendu', 'oui', 'obtenu', 'oui');

    -- Tout annuler : seules les valeurs de v_res survivent.
    raise exception using errcode = 'P0001', message = 'fin_du_controle';
  exception when sqlstate 'P0001' then
    null;
  end;

  insert into controle_offerts (ordre, cas, attendu, obtenu)
  select r.ordre, r.cas, r.attendu, r.obtenu
  from jsonb_to_recordset(v_res) as r(ordre int, cas text, attendu text, obtenu text);
end $$;

-- 19. Les cas d'essai n'ont rien laissé : le club d'essai n'a toujours aucun
--     outil ouvert (au bloc 0, il n'en avait aucun).
insert into controle_offerts
select 19, 'Rien n''est resté en base après les essais (outils ouverts du club d''essai)', '0', count(*)::text
from public.outils_club_ouverts o
join auth.users u on u.id = o.club_id and u.email = 'deabreu.amorim+club@gmail.com';

-- 20. Comptes réels : la nouvelle règle donne exactement les mêmes accès que
--     l'ancienne, sauf outils fournis par un club du nouveau modèle (aucun à
--     ce jour). Comptes différents listés dans la colonne obtenu.
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
    ) as ancienne
  from public.profiles p
  cross join outils o
)
insert into controle_offerts
select 20, 'Comptes réels : accès identiques avant et après (différences)', '0',
  case when count(*) = 0 then '0'
       else count(*)::text || ' : ' || string_agg(left(c.id::text, 8) || ' ' || c.outil, ', ') end
from comparaison c
where c.nouvelle is distinct from c.ancienne;

-- 21. Places : dans chaque club ayant un forfait, le nombre d'éducateurs avec
--     une place = le plus petit entre affiliés acceptés et places du forfait.
with clubs as (
  select c.id, c.quota_equipes, count(distinct ce.educateur_id) as affilies,
    count(distinct ce.educateur_id) filter (where public.educateur_a_place(c.id, ce.educateur_id)) as avec_place
  from public.profiles c
  join public.club_educateurs ce on ce.club_id = c.id and ce.statut = 'accepte' and ce.educateur_id is not null
  where c.plan = 'club'
  group by c.id, c.quota_equipes
)
insert into controle_offerts
select 21, 'Places : chaque club donne une place à min(affiliés, forfait) éducateurs (clubs en erreur)', '0',
  count(*) filter (where avec_place <> least(affilies, coalesce(quota_equipes, 0)))::text
from clubs;

select ordre, cas, attendu, obtenu, attendu = obtenu as ok
from controle_offerts
order by ordre;
