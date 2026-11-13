-- Vérification du bloc 6 (prévenir l'éducateur qui perd ses outils). Lancer
-- après supabase_fin_outils_club.sql, le fichier en entier, d'un seul coup.
--
-- Rien n'est gardé en base : les cas d'essai modifient le club d'essai,
-- créent des affiliations et des notifications dans une sous-transaction
-- annulée à la fin. Ils empruntent deux autres comptes éducateurs existants
-- (A et B), uniquement le temps de l'essai. La fin du forfait passe par la
-- vraie fonction du webhook Stripe (outils_synchroniser_abonnement), sans
-- Stripe. Les contrôles 20 et 21 vérifient que rien n'est resté.
--
-- Résultat : un seul tableau. Chaque ligne doit avoir ok = true.
-- Colonne « obtenu » des cas : notifications reçues par testfinal / A / B.

drop table if exists pg_temp.controle_fin;
create temp table controle_fin (ordre int, cas text, attendu text, obtenu text);

drop table if exists pg_temp.club_avant;
create temp table club_avant as
select p.abonnement_actif, p.palier, p.quota_equipes, p.modele_outils, p.abonnement_cycle
from public.profiles p join auth.users u on u.id = p.id
where u.email = 'deabreu.amorim+club@gmail.com';

drop table if exists pg_temp.notifs_avant;
create temp table notifs_avant as
select count(*) as n from public.notifications where type = 'outils_club_fin';

drop table if exists pg_temp.essai_ids;
create temp table essai_ids (role text, ordre int, id uuid);

-- Notifications de fin reçues par testfinal / A / B, dans cet ordre.
create or replace function pg_temp.compte() returns text
language sql as $$
  select string_agg((
    select count(*) from public.notifications n where n.user_id = i.id and n.type = 'outils_club_fin'
  )::text, '/' order by i.ordre)
  from pg_temp.essai_ids i
  where i.role <> 'club'
$$;

do $$
declare
  v_club uuid;
  v_edu uuid;
  v_a uuid;
  v_b uuid;
  v_date text := to_char(now() at time zone 'Europe/Paris', 'DD/MM');
  v_ok text;
  v_res jsonb := '[]'::jsonb;
begin
  select u.id into v_club from auth.users u where u.email = 'deabreu.amorim+club@gmail.com';
  select ce.educateur_id into v_edu from public.club_educateurs ce
  where ce.club_id = v_club and ce.statut = 'accepte' and ce.educateur_id::text like '75df7fba%'
  limit 1;
  if v_club is null or v_edu is null then
    raise exception 'Club d''essai ou testfinal introuvable (ou testfinal plus affilié au club)';
  end if;
  select id into v_a from public.profiles where id not in (v_club, v_edu) and plan = 'educateur' order by id limit 1;
  select id into v_b from public.profiles where id not in (v_club, v_edu, v_a) and plan = 'educateur' order by id limit 1;
  if v_a is null or v_b is null then
    raise exception 'Il faut deux autres comptes éducateurs pour l''essai';
  end if;

  insert into pg_temp.essai_ids values ('edu', 1, v_edu), ('a', 2, v_a), ('b', 3, v_b), ('club', 0, v_club);

  begin
    -- Départ : club au nouveau modèle, forfait actif, 3 places ; testfinal
    -- (rang 1), A (rang 2) et B (rang 3) acceptés ; Tacticboard fourni.
    -- Ne pas toucher à `palier` ici : le déclencheur sync_quota_equipes le
    -- recalculerait. Le palier n'est changé que par la fonction du webhook.
    delete from public.club_educateurs where club_id = v_club and educateur_id is distinct from v_edu;
    update public.profiles set modele_outils = true, abonnement_actif = true, quota_equipes = 3 where id = v_club;
    update public.profiles set modele_outils = true where id in (v_edu, v_a, v_b);
    insert into public.club_educateurs (club_id, educateur_id, statut, methode) values (v_club, v_a, 'accepte', 'code');
    insert into public.club_educateurs (club_id, educateur_id, statut, methode) values (v_club, v_b, 'accepte', 'code');
    delete from public.outils_club_ouverts where club_id = v_club;
    insert into public.outils_club_ouverts (club_id, outil) values (v_club, 'tactique');
    delete from public.notifications where user_id in (v_edu, v_a, v_b) and type = 'outils_club_fin';

    v_res := v_res || jsonb_build_object('ordre', 1, 'cas', 'Départ : places de testfinal, A, B',
      'attendu', 't/t/t', 'obtenu', format('%s/%s/%s',
        public.educateur_a_place(v_club, v_edu), public.educateur_a_place(v_club, v_a), public.educateur_a_place(v_club, v_b)));

    -- 2. Changement sans perte (même valeur réécrite).
    update public.profiles set abonnement_actif = true, quota_equipes = 3 where id = v_club;
    v_res := v_res || jsonb_build_object('ordre', 2, 'cas', 'Forfait réécrit à l''identique : personne n''est prévenu',
      'attendu', '0/0/0', 'obtenu', pg_temp.compte());

    -- 3. Forfait plus petit : B (rang 3) perd sa place.
    update public.profiles set quota_equipes = 2 where id = v_club;
    v_res := v_res || jsonb_build_object('ordre', 3, 'cas', '3 places -> 2 : seul B est prévenu',
      'attendu', '0/0/1', 'obtenu', pg_temp.compte());
    select case when count(*) = 1 then 'oui' else 'non' end into v_ok
    from public.notifications
    where user_id = v_b and type = 'outils_club_fin' and lu = false and lien = '/educateur'
      and titre = 'Ton club ne fournit plus tes outils'
      and contenu like '%plus de place pour toi depuis le ' || v_date || '%' and contenu like '%données sont conservées%';
    v_res := v_res || jsonb_build_object('ordre', 4, 'cas', 'Message de B : place perdue, date du jour, données conservées, non lu',
      'attendu', 'oui', 'obtenu', v_ok);

    -- 5. Remonter ne prévient personne ; redescendre sans avoir lu : pas de doublon.
    update public.profiles set quota_equipes = 3 where id = v_club;
    update public.profiles set quota_equipes = 2 where id = v_club;
    v_res := v_res || jsonb_build_object('ordre', 5, 'cas', '2 -> 3 -> 2 dans l''heure, sans lecture : B toujours 1 notification',
      'attendu', '0/0/1', 'obtenu', pg_temp.compte());

    -- 6. Fin du forfait par la vraie fonction du webhook. A n'est plus au
    -- nouveau modèle : il ne voit pas les outils, il n'est pas prévenu.
    update public.profiles set quota_equipes = 3 where id = v_club;
    update public.profiles set modele_outils = false where id = v_a;
    delete from public.notifications where user_id in (v_edu, v_a, v_b) and type = 'outils_club_fin';
    perform public.outils_synchroniser_abonnement('evt_controle_bloc6_1', 'customer.subscription.deleted', v_club,
      'sub_controle_bloc6', '[]'::jsonb, 0, null, null, now(), false, true);
    v_res := v_res || jsonb_build_object('ordre', 6, 'cas', 'Fin du forfait (webhook) : testfinal et B prévenus, A hors nouveau modèle ignoré',
      'attendu', '1/0/1', 'obtenu', pg_temp.compte());
    select case when count(*) = 2 then 'oui' else 'non' end into v_ok
    from public.notifications
    where user_id in (v_edu, v_b) and type = 'outils_club_fin'
      and contenu like 'Ton club ne fournit plus tes outils depuis le ' || v_date || '.%' and contenu like '%propres offres%';
    v_res := v_res || jsonb_build_object('ordre', 7, 'cas', 'Message de fin : date du jour et lien vers ses offres',
      'attendu', 'oui', 'obtenu', v_ok);
    v_res := v_res || jsonb_build_object('ordre', 8, 'cas', 'Le club n''a plus de forfait actif',
      'attendu', 'false', 'obtenu', (select abonnement_actif::text from public.profiles where id = v_club));

    -- 9. Événement suivant, même état : rien de plus.
    update public.notifications set lu = true where user_id in (v_edu, v_a, v_b) and type = 'outils_club_fin';
    perform public.outils_synchroniser_abonnement('evt_controle_bloc6_2', 'customer.subscription.deleted', v_club,
      'sub_controle_bloc6', '[]'::jsonb, 0, null, null, now(), false, true);
    v_res := v_res || jsonb_build_object('ordre', 9, 'cas', 'Deuxième événement de fin : pas de nouvelle notification',
      'attendu', '1/0/1', 'obtenu', pg_temp.compte());

    -- 10. Reprise d'un forfait (webhook) : personne n'est prévenu.
    update public.profiles set modele_outils = true where id = v_a;
    delete from public.notifications where user_id in (v_edu, v_a, v_b) and type = 'outils_club_fin';
    perform public.outils_synchroniser_abonnement('evt_controle_bloc6_3', 'customer.subscription.created', v_club,
      'sub_controle_bloc6', '[]'::jsonb, 0, 'c200', 'mensuel', now() + interval '30 days', false, false);
    v_res := v_res || jsonb_build_object('ordre', 10, 'cas', 'Reprise du forfait c200 (webhook) : personne n''est prévenu',
      'attendu', '0/0/0', 'obtenu', pg_temp.compte());

    -- 11. Passage à un plus petit palier par le webhook (c200 = 7 places -> c0 = 2 places).
    perform public.outils_synchroniser_abonnement('evt_controle_bloc6_4', 'customer.subscription.updated', v_club,
      'sub_controle_bloc6', '[]'::jsonb, 0, 'c0', 'mensuel', now() + interval '30 days', false, false);
    v_res := v_res || jsonb_build_object('ordre', 11, 'cas', 'Palier c200 -> c0 (webhook) : seul B est prévenu',
      'attendu', '0/0/1', 'obtenu', pg_temp.compte());

    -- 12. Aucun outil fourni ouvert : rien à perdre, personne n'est prévenu.
    update public.profiles set quota_equipes = 3 where id = v_club;
    delete from public.outils_club_ouverts where club_id = v_club;
    delete from public.notifications where user_id in (v_edu, v_a, v_b) and type = 'outils_club_fin';
    update public.profiles set quota_equipes = 1 where id = v_club;
    update public.profiles set abonnement_actif = false where id = v_club;
    v_res := v_res || jsonb_build_object('ordre', 12, 'cas', 'Aucun outil ouvert par le club : forfait réduit puis arrêté, personne n''est prévenu',
      'attendu', '0/0/0', 'obtenu', pg_temp.compte());

    -- 13. Club sorti du nouveau modèle : tous ceux qui avaient une place sont prévenus.
    update public.profiles set abonnement_actif = true, quota_equipes = 3 where id = v_club;
    insert into public.outils_club_ouverts (club_id, outil) values (v_club, 'tactique');
    update public.profiles set modele_outils = false where id = v_club;
    v_res := v_res || jsonb_build_object('ordre', 13, 'cas', 'Club sorti du nouveau modèle : les trois sont prévenus',
      'attendu', '1/1/1', 'obtenu', pg_temp.compte());

    -- 14. Club de l'ancien modèle : le déclencheur ne fait rien.
    delete from public.notifications where user_id in (v_edu, v_a, v_b) and type = 'outils_club_fin';
    update public.profiles set abonnement_actif = false where id = v_club;
    v_res := v_res || jsonb_build_object('ordre', 14, 'cas', 'Club de l''ancien modèle qui perd son forfait : rien',
      'attendu', '0/0/0', 'obtenu', pg_temp.compte());

    -- 15. Éducateur sans place avant : il n'avait rien, il n'est pas prévenu.
    update public.profiles set modele_outils = true, abonnement_actif = true, quota_equipes = 2 where id = v_club;
    delete from public.notifications where user_id in (v_edu, v_a, v_b) and type = 'outils_club_fin';
    update public.profiles set quota_equipes = 1 where id = v_club;
    v_res := v_res || jsonb_build_object('ordre', 15, 'cas', '2 places -> 1 : A prévenu, B (déjà sans place) non',
      'attendu', '0/1/0', 'obtenu', pg_temp.compte());

    -- 16. Une panne d'écriture de la notification ne bloque jamais le forfait.
    update public.profiles set quota_equipes = 3 where id = v_club;
    delete from public.notifications where user_id in (v_edu, v_a, v_b) and type = 'outils_club_fin';
    alter table public.notifications add constraint controle_bloc6_panne check (type <> 'outils_club_fin') not valid;
    perform public.outils_synchroniser_abonnement('evt_controle_bloc6_5', 'customer.subscription.deleted', v_club,
      'sub_controle_bloc6', '[]'::jsonb, 0, null, null, now(), false, true);
    v_res := v_res || jsonb_build_object('ordre', 16, 'cas', 'Notification impossible : la fin du forfait passe quand même',
      'attendu', 'false 0/0/0', 'obtenu',
      (select abonnement_actif::text from public.profiles where id = v_club) || ' ' || pg_temp.compte());

    raise exception using errcode = 'P0001', message = 'fin_du_controle';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'fin_du_controle' then
      raise;
    end if;
  end;

  insert into controle_fin (ordre, cas, attendu, obtenu)
  select r.ordre, r.cas, r.attendu, r.obtenu
  from jsonb_to_recordset(v_res) as r(ordre int, cas text, attendu text, obtenu text);
end $$;

-- 17. Le déclencheur est en place et actif.
insert into controle_fin
select 17, 'Le déclencheur existe et est actif sur profiles', '1', count(*)::text
from pg_trigger where tgname = 'trigger_prevenir_fin_outils_club' and not tgisinternal and tgenabled = 'O';

-- 18. Personne d'autre que le serveur ne peut appeler la fonction.
insert into controle_fin
select 18, 'Fonction fermée aux comptes connectés', 'false',
  coalesce(has_function_privilege('authenticated', to_regprocedure('public.prevenir_fin_outils_club()'), 'execute')::text, 'absente');

-- 19. La fenêtre d'essai est bien fermée (panne simulée retirée).
insert into controle_fin
select 19, 'Contrainte d''essai retirée de notifications', '0', count(*)::text
from pg_constraint where conname = 'controle_bloc6_panne';

-- 20. Rien n'est resté : aucune notification de fin en plus.
insert into controle_fin
select 20, 'Rien n''est resté en base (notifications de fin)', (select n::text from notifs_avant), count(*)::text
from public.notifications where type = 'outils_club_fin';

-- 21. Rien n'est resté : le club d'essai est dans son état d'origine.
insert into controle_fin
select 21, 'Club d''essai inchangé (forfait, palier, places, modèle)', 'oui',
  case when exists (
    select 1 from public.profiles p join auth.users u on u.id = p.id, club_avant a
    where u.email = 'deabreu.amorim+club@gmail.com'
      and p.abonnement_actif is not distinct from a.abonnement_actif and p.palier is not distinct from a.palier
      and p.quota_equipes is not distinct from a.quota_equipes and p.modele_outils is not distinct from a.modele_outils
      and p.abonnement_cycle is not distinct from a.abonnement_cycle
  ) then 'oui' else 'non' end;

select ordre, cas, attendu, obtenu, attendu = obtenu as ok
from controle_fin
order by ordre;
