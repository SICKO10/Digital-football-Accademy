-- Simulation du bloc 5 (PLAN-outils-offerts-suite.md) : résiliation, nouvelle
-- date, reprise et fin réelle du forfait du club d'essai, sans Stripe. Lancer
-- après supabase_fin_programmee_club.sql et sa vérification, le fichier en
-- entier, d'un seul coup.
--
-- Rien n'est gardé en base : tout se passe dans une sous-transaction annulée à
-- la fin. Le club d'essai passe le temps de l'essai à 2 places (palier c0) et
-- emprunte deux autres comptes éducateurs existants (A et B) : testfinal a la
-- place 1, A la place 2, B n'a pas de place. Les changements d'abonnement
-- passent par la vraie fonction du webhook (outils_synchroniser_abonnement).
-- Les contrôles 14 à 16 vérifient que rien n'est resté.
--
-- Résultat : un seul tableau. Chaque ligne doit avoir ok = true.
-- « a/b/c » = avis reçus par testfinal / A / B.

drop table if exists pg_temp.controle_fin_prog;
create temp table controle_fin_prog (ordre int, cas text, attendu text, obtenu text);

drop table if exists pg_temp.avant_fin_prog;
create temp table avant_fin_prog as
select
  (select count(*) from public.notifications
   where type in ('outils_club_fin', 'outils_club_fin_prochaine', 'outils_club_continue')) as notifs,
  (select count(*) from public.club_fin_programmee) as fins,
  (select row(p.abonnement_actif, p.palier, p.quota_equipes, p.modele_outils, p.abonnement_cycle)::text
   from public.profiles p join auth.users u on u.id = p.id
   where u.email = 'deabreu.amorim+club@gmail.com') as club;

drop table if exists pg_temp.essai_fin_prog;
create temp table essai_fin_prog (ordre int, id uuid);

-- Avis d'un type reçus par testfinal / A / B, dans cet ordre.
create or replace function pg_temp.avis(p_type text) returns text
language sql as $$
  select string_agg((
    select count(*) from public.notifications n where n.user_id = i.id and n.type = p_type
  )::text, '/' order by i.ordre)
  from pg_temp.essai_fin_prog i
$$;

do $$
declare
  v_club uuid;
  v_edu uuid;
  v_a uuid;
  v_b uuid;
  v_fin timestamptz := date_trunc('day', now()) + interval '30 days 12 hours';
  v_fin2 timestamptz := date_trunc('day', now()) + interval '37 days 12 hours';
  v_id text;
  v_res jsonb := '[]'::jsonb;
  v_retour text;
  v_n integer;
begin
  select u.id into v_club from auth.users u where u.email = 'deabreu.amorim+club@gmail.com';
  select ce.educateur_id into v_edu from public.club_educateurs ce
  where ce.club_id = v_club and ce.statut = 'accepte' and ce.educateur_id::text like '75df7fba%'
  limit 1;
  if v_club is null or v_edu is null then
    raise exception 'Club d''essai ou testfinal introuvable (ou testfinal plus affilié au club)';
  end if;
  if not public.club_offre_outils(v_club) then
    raise exception 'Le club d''essai n''a pas de forfait actif au nouveau modèle : rien à simuler';
  end if;
  if exists (select 1 from public.club_fin_programmee where club_id = v_club) then
    raise exception 'Le club d''essai a déjà une résiliation programmée : simulation impossible, préviens Claude';
  end if;
  select p.id into v_a from public.profiles p
  where p.plan = 'educateur' and p.id <> v_edu
    and not exists (select 1 from public.club_educateurs ce where ce.club_id = v_club and ce.educateur_id = p.id)
  order by p.id limit 1;
  select p.id into v_b from public.profiles p
  where p.plan = 'educateur' and p.id not in (v_edu, v_a)
    and not exists (select 1 from public.club_educateurs ce where ce.club_id = v_club and ce.educateur_id = p.id)
  order by p.id limit 1;
  if v_a is null or v_b is null then
    raise exception 'Il faut deux autres comptes éducateurs pour l''essai';
  end if;
  insert into pg_temp.essai_fin_prog values (1, v_edu), (2, v_a), (3, v_b);

  begin
    -- Mise en place : A et B affiliés après testfinal tant que le club a toutes
    -- ses places (la limite d'affiliation refuse au-delà), puis 2 places et un
    -- outil fourni à tous. L'avis « plus de place » de B est effacé plus bas.
    if not exists (
      select 1 from public.outils_club_ouverts o
      where o.club_id = v_club and public.outil_offert_par_club(o.outil)
    ) then
      insert into public.outils_club_ouverts (club_id, outil) values (v_club, 'tactique');
    end if;
    update public.profiles set modele_outils = true where id in (v_a, v_b);
    delete from public.club_places_choisies where club_id = v_club;
    insert into public.club_educateurs (club_id, educateur_id, statut, created_at)
    values (v_club, v_a, 'accepte', now() + interval '1 minute'),
           (v_club, v_b, 'accepte', now() + interval '2 minutes');
    update public.profiles set palier = 'c0' where id = v_club;
    if (select quota_equipes from public.profiles where id = v_club) <> 2 then
      raise exception 'Le palier c0 ne donne pas 2 places : simulation à revoir avec Claude';
    end if;
    delete from public.notifications where user_id in (v_edu, v_a, v_b)
      and type in ('outils_club_fin', 'outils_club_fin_prochaine', 'outils_club_continue');

    -- 0. Stages, Projet sportif, CFF4 détenus par le club : reçus par tous ses
    -- éducateurs, avec ou sans place, donc B serait prévenu lui aussi. Ces
    -- outils sont ensuite fermés le temps de l'essai pour tester les places.
    if exists (
      select 1 from public.outils_club_ouverts o
      join public.outils_comptes oc on oc.compte_id = o.club_id and oc.outil = o.outil
        and (oc.fin_le is null or oc.fin_le > now())
      where o.club_id = v_club and not public.outil_offert_par_club(o.outil)
    ) then
      v_res := v_res || jsonb_build_object('ordre', 0, 'cas', 'Outil détenu par le club (Stages, Projet sportif, CFF4) : B prévenu aussi',
        'attendu', '3', 'obtenu', (select count(*)::text from public.educateurs_prevenus_fin_club(v_club)));
      delete from public.outils_club_ouverts where club_id = v_club and not public.outil_offert_par_club(outil);
    end if;

    -- 1. Le club voit combien d'éducateurs seront prévenus s'il résilie.
    perform set_config('request.jwt.claim.sub', v_club::text, true);
    v_res := v_res || jsonb_build_object('ordre', 1, 'cas', 'Avant de résilier, le club voit le nombre d''éducateurs prévenus',
      'attendu', '2', 'obtenu', coalesce(public.club_nb_educateurs_prevenus(v_club)::text, 'rien'));
    perform set_config('request.jwt.claim.sub', v_b::text, true);
    v_res := v_res || jsonb_build_object('ordre', 2, 'cas', 'Un autre compte ne voit pas ce nombre',
      'attendu', 'rien', 'obtenu', coalesce(public.club_nb_educateurs_prevenus(v_club)::text, 'rien'));
    perform set_config('request.jwt.claim.sub', '', true);

    -- 3. Résiliation (webhook) : testfinal et A prévenus, B (sans place) non.
    v_retour := public.outils_synchroniser_abonnement('evt_simulation_bloc5_1', 'customer.subscription.updated', v_club,
      'sub_simulation_bloc5', '[]'::jsonb, 0, 'c0', 'mensuel', v_fin, true, false);
    v_res := v_res || jsonb_build_object('ordre', 3, 'cas', 'Résiliation : un avis pour testfinal et A, rien pour B',
      'attendu', 'ok 1/1/0', 'obtenu', v_retour || ' ' || pg_temp.avis('outils_club_fin_prochaine'));

    -- 4. L'avis donne la date de fin, et la base la garde.
    select n.id::text into v_id from public.notifications n
    where n.user_id = v_edu and n.type = 'outils_club_fin_prochaine';
    v_res := v_res || jsonb_build_object('ordre', 4, 'cas', 'Avis et fin programmée portent la date de fin',
      'attendu', 'oui oui', 'obtenu',
      (select case when n.titre like '%' || public.date_fin_texte(v_fin) and n.contenu like '%' || public.date_fin_texte(v_fin) || '%'
         then 'oui' else 'non : ' || n.titre end
       from public.notifications n where n.id::text = v_id) || ' ' ||
      (select case when count(*) = 1 then 'oui' else 'non' end from public.club_fin_programmee
       where club_id = v_club and fin_le = v_fin));

    -- 5. Le même événement relivré, puis un autre avec la même date : rien de plus.
    update public.notifications set lu = true where id::text = v_id;
    v_retour := public.outils_synchroniser_abonnement('evt_simulation_bloc5_1', 'customer.subscription.updated', v_club,
      'sub_simulation_bloc5', '[]'::jsonb, 0, 'c0', 'mensuel', v_fin, true, false);
    perform public.outils_synchroniser_abonnement('evt_simulation_bloc5_2', 'customer.subscription.updated', v_club,
      'sub_simulation_bloc5', '[]'::jsonb, 0, 'c0', 'mensuel', v_fin, true, false);
    v_res := v_res || jsonb_build_object('ordre', 5, 'cas', 'Événement relivré puis même date : pas de doublon, avis lu reste lu',
      'attendu', 'deja_traite 1/1/0 lu', 'obtenu', v_retour || ' ' || pg_temp.avis('outils_club_fin_prochaine') || ' ' ||
      (select case when lu then 'lu' else 'non lu' end from public.notifications where id::text = v_id));

    -- 6. Nouvelle date : le même avis est corrigé et redevient non lu.
    perform public.outils_synchroniser_abonnement('evt_simulation_bloc5_3', 'customer.subscription.updated', v_club,
      'sub_simulation_bloc5', '[]'::jsonb, 0, 'c0', 'mensuel', v_fin2, true, false);
    v_res := v_res || jsonb_build_object('ordre', 6, 'cas', 'Nouvelle date : même avis corrigé, non lu, sans doublon',
      'attendu', '1/1/0 oui', 'obtenu', pg_temp.avis('outils_club_fin_prochaine') || ' ' ||
      coalesce((select case when n.lu is not true and n.contenu like '%' || public.date_fin_texte(v_fin2) || '%'
         then 'oui' else 'non' end
       from public.notifications n where n.id::text = v_id), 'avis disparu'));

    -- 7. Reprise : testfinal (avis lu) apprend que son club continue, A (non lu) n'a plus rien.
    update public.notifications set lu = true where id::text = v_id;
    perform public.outils_synchroniser_abonnement('evt_simulation_bloc5_4', 'customer.subscription.updated', v_club,
      'sub_simulation_bloc5', '[]'::jsonb, 0, 'c0', 'mensuel', v_fin2, false, false);
    v_res := v_res || jsonb_build_object('ordre', 7, 'cas', 'Reprise : avis retirés, « ton club continue » pour testfinal seul',
      'attendu', '0/0/0 1/0/0', 'obtenu',
      pg_temp.avis('outils_club_fin_prochaine') || ' ' || pg_temp.avis('outils_club_continue'));
    v_res := v_res || jsonb_build_object('ordre', 8, 'cas', 'Reprise : plus de fin programmée, forfait toujours actif',
      'attendu', '0 true', 'obtenu',
      (select count(*)::text from public.club_fin_programmee where club_id = v_club) || ' ' ||
      (select abonnement_actif::text from public.profiles where id = v_club));

    -- 9. Nouvelle résiliation puis fin réelle : l'avis « après la fin » remplace l'avis préalable.
    delete from public.notifications where user_id in (v_edu, v_a, v_b) and type = 'outils_club_continue';
    perform public.outils_synchroniser_abonnement('evt_simulation_bloc5_5', 'customer.subscription.updated', v_club,
      'sub_simulation_bloc5', '[]'::jsonb, 0, 'c0', 'mensuel', v_fin, true, false);
    v_n := (select count(*) from public.notifications where user_id in (v_edu, v_a) and type = 'outils_club_fin_prochaine');
    perform public.outils_synchroniser_abonnement('evt_simulation_bloc5_6', 'customer.subscription.deleted', v_club,
      'sub_simulation_bloc5', '[]'::jsonb, 0, null, null, now(), false, true);
    v_res := v_res || jsonb_build_object('ordre', 9, 'cas', 'Fin réelle : avis préalables (2) remplacés par l''avis « après la fin »',
      'attendu', '2 0/0/0 1/1/0', 'obtenu', v_n::text || ' ' ||
      pg_temp.avis('outils_club_fin_prochaine') || ' ' || pg_temp.avis('outils_club_fin'));
    v_res := v_res || jsonb_build_object('ordre', 10, 'cas', 'Fin réelle : plus de fin programmée, forfait arrêté',
      'attendu', '0 false 0', 'obtenu',
      (select count(*)::text from public.club_fin_programmee where club_id = v_club) || ' ' ||
      (select abonnement_actif::text from public.profiles where id = v_club) || ' ' ||
      (select count(*)::text from public.club_fin_avis where club_id = v_club));

    -- 11. Une panne des avis ne bloque jamais le paiement.
    delete from public.notifications where user_id in (v_edu, v_a, v_b) and type = 'outils_club_fin';
    perform public.outils_synchroniser_abonnement('evt_simulation_bloc5_7', 'customer.subscription.updated', v_club,
      'sub_simulation_bloc5', '[]'::jsonb, 0, 'c0', 'mensuel', v_fin, false, false);
    alter table public.notifications add constraint controle_bloc5_panne check (type <> 'outils_club_fin_prochaine') not valid;
    v_retour := public.outils_synchroniser_abonnement('evt_simulation_bloc5_8', 'customer.subscription.updated', v_club,
      'sub_simulation_bloc5', '[]'::jsonb, 0, 'c0', 'mensuel', v_fin, true, false);
    v_res := v_res || jsonb_build_object('ordre', 11, 'cas', 'Avis impossible : la résiliation est quand même enregistrée',
      'attendu', 'ok true 1 0/0/0', 'obtenu', v_retour || ' ' ||
      (select abonnement_actif::text from public.profiles where id = v_club) || ' ' ||
      (select count(*)::text from public.club_fin_programmee where club_id = v_club) || ' ' ||
      pg_temp.avis('outils_club_fin_prochaine'));
    alter table public.notifications drop constraint controle_bloc5_panne;

    -- 12. Club sorti du nouveau modèle : sa fin programmée disparaît, personne
    -- ne reçoit d'avis préalable.
    delete from public.club_fin_programmee where club_id = v_club;
    update public.profiles set modele_outils = false where id = v_club;
    insert into public.club_fin_programmee (club_id, fin_le, abonnement_id) values (v_club, v_fin, 'sub_simulation_bloc5');
    v_res := v_res || jsonb_build_object('ordre', 12, 'cas', 'Club de l''ancien modèle : aucun avis préalable',
      'attendu', '0/0/0', 'obtenu', pg_temp.avis('outils_club_fin_prochaine'));

    raise exception using errcode = 'P0001', message = 'fin_de_la_simulation';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'fin_de_la_simulation' then
      raise;
    end if;
  end;

  insert into controle_fin_prog (ordre, cas, attendu, obtenu)
  select r.ordre, r.cas, r.attendu, r.obtenu
  from jsonb_to_recordset(v_res) as r(ordre int, cas text, attendu text, obtenu text);
end $$;

-- 13. La panne simulée est bien retirée.
insert into controle_fin_prog
select 13, 'Contrainte d''essai retirée de notifications', '0', count(*)::text
from pg_constraint where conname = 'controle_bloc5_panne';

-- 14 à 16. Rien n'est resté en base.
insert into controle_fin_prog
select 14, 'Rien n''est resté : avis de fin, avis préalables, « continue »', (select notifs::text from avant_fin_prog), count(*)::text
from public.notifications
where type in ('outils_club_fin', 'outils_club_fin_prochaine', 'outils_club_continue');

insert into controle_fin_prog
select 15, 'Rien n''est resté : fins programmées', (select fins::text from avant_fin_prog), count(*)::text
from public.club_fin_programmee;

insert into controle_fin_prog
select 16, 'Club d''essai inchangé (forfait, palier, places, modèle, cycle)', (select club from avant_fin_prog),
  (select row(p.abonnement_actif, p.palier, p.quota_equipes, p.modele_outils, p.abonnement_cycle)::text
   from public.profiles p join auth.users u on u.id = p.id
   where u.email = 'deabreu.amorim+club@gmail.com');

select ordre, cas, attendu, obtenu, attendu = obtenu as ok
from controle_fin_prog
order by ordre;
