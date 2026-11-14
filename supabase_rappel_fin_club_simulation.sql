-- Simulation du bloc 7 (PLAN-outils-offerts-suite.md) : le rappel avant la fin du
-- forfait du club d'essai, sans Stripe et sans attendre 7 jours. Lancer après
-- supabase_rappel_fin_club.sql et sa vérification, le fichier en entier, d'un
-- seul coup.
--
-- Rien n'est gardé en base : tout se passe dans une sous-transaction annulée à
-- la fin. Le club d'essai passe le temps de l'essai à 2 places (palier c0) et
-- emprunte deux autres comptes éducateurs existants (A et B) : testfinal a la
-- place 1, A la place 2, B n'a pas de place. La fin programmée est écrite
-- directement (comme le fait le webhook) ; la fonction du rappel est celle que
-- la tâche quotidienne appelle. Les contrôles 12 à 15 vérifient que rien n'est resté.
--
-- Résultat : un seul tableau. Chaque ligne doit avoir ok = true.
-- « a/b/c » = avis reçus par testfinal / A / B.

drop table if exists pg_temp.controle_rappel;
create temp table controle_rappel (ordre int, cas text, attendu text, obtenu text);

drop table if exists pg_temp.avant_rappel;
create temp table avant_rappel as
select
  (select count(*) from public.notifications
   where type in ('outils_club_fin', 'outils_club_fin_prochaine', 'outils_club_continue')) as notifs,
  (select count(*) from public.club_fin_programmee) as fins,
  (select count(*) from public.club_fin_rappel) as rappels,
  (select row(p.abonnement_actif, p.palier, p.quota_equipes, p.modele_outils, p.abonnement_cycle)::text
   from public.profiles p join auth.users u on u.id = p.id
   where u.email = 'deabreu.amorim+club@gmail.com') as club;

drop table if exists pg_temp.essai_rappel;
create temp table essai_rappel (ordre int, id uuid);

-- Avis d'un type reçus par testfinal / A / B, dans cet ordre.
create or replace function pg_temp.avis(p_type text) returns text
language sql as $$
  select string_agg((
    select count(*) from public.notifications n where n.user_id = i.id and n.type = p_type
  )::text, '/' order by i.ordre)
  from pg_temp.essai_rappel i
$$;

-- Rappels (titre « Rappel : ... ») reçus par testfinal / A / B.
create or replace function pg_temp.rappels() returns text
language sql as $$
  select string_agg((
    select count(*) from public.notifications n
    where n.user_id = i.id and n.type = 'outils_club_fin_prochaine' and n.titre like 'Rappel%'
  )::text, '/' order by i.ordre)
  from pg_temp.essai_rappel i
$$;

do $$
declare
  v_club uuid;
  v_edu uuid;
  v_a uuid;
  v_b uuid;
  v_fin30 timestamptz := date_trunc('day', now()) + interval '30 days 12 hours';
  v_fin5 timestamptz := date_trunc('day', now()) + interval '5 days 12 hours';
  v_fin6 timestamptz := date_trunc('day', now()) + interval '6 days 12 hours';
  v_res jsonb := '[]'::jsonb;
  v_id text;
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
  insert into pg_temp.essai_rappel values (1, v_edu), (2, v_a), (3, v_b);

  begin
    -- Mise en place (comme la simulation du bloc 5) : A et B affiliés après
    -- testfinal, 2 places, un outil fourni à tous, outils détenus par le club
    -- fermés le temps de l'essai pour que B n'ait vraiment rien.
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
    delete from public.outils_club_ouverts where club_id = v_club and not public.outil_offert_par_club(outil);
    delete from public.notifications where user_id in (v_edu, v_a, v_b)
      and type in ('outils_club_fin', 'outils_club_fin_prochaine', 'outils_club_continue');
    -- DEBUT DES CAS

    -- 1. Fin dans 30 jours : l'avis du bloc 5 part, mais pas de rappel.
    insert into public.club_fin_programmee (club_id, fin_le, abonnement_id)
    values (v_club, v_fin30, 'sub_simulation_bloc7');
    perform public.rappeler_fin_programmee_clubs();
    v_res := v_res || jsonb_build_object('ordre', 1, 'cas', 'Fin dans 30 jours : avis du bloc 5, pas de rappel',
      'attendu', '1/1/0 0/0/0 0', 'obtenu', pg_temp.avis('outils_club_fin_prochaine') || ' ' || pg_temp.rappels() || ' ' ||
      (select count(*)::text from public.club_fin_rappel where club_id = v_club));

    -- 2. Fin dans 5 jours, résiliation faite il y a 20 jours, avis déjà lus : le
    -- rappel réécrit l'avis de testfinal et de A (non lu), rien pour B.
    update public.club_fin_programmee set fin_le = v_fin5, programme_le = now() - interval '20 days'
    where club_id = v_club;
    update public.notifications set lu = true
    where user_id in (v_edu, v_a, v_b) and type = 'outils_club_fin_prochaine';
    perform public.rappeler_fin_programmee_clubs();
    v_res := v_res || jsonb_build_object('ordre', 2, 'cas', 'Fin dans 5 jours : rappel pour testfinal et A, un seul avis chacun, non lu',
      'attendu', '1/1/0 1/1/0 0 lus', 'obtenu', pg_temp.avis('outils_club_fin_prochaine') || ' ' || pg_temp.rappels() || ' ' ||
      (select count(*)::text from public.notifications where user_id in (v_edu, v_a, v_b)
        and type = 'outils_club_fin_prochaine' and lu is true) || ' lus');
    select n.id::text into v_id from public.notifications n
    where n.user_id = v_edu and n.type = 'outils_club_fin_prochaine';
    v_res := v_res || jsonb_build_object('ordre', 3, 'cas', 'Le rappel donne la date de fin et le marqueur compte 2 avis',
      'attendu', 'oui 2', 'obtenu',
      (select case when n.contenu like '%' || public.date_fin_texte(v_fin5) || '%'
         and n.titre like '%' || public.date_fin_texte(v_fin5) then 'oui' else 'non : ' || n.titre end
       from public.notifications n where n.id::text = v_id) || ' ' ||
      coalesce((select r.nb_avis::text from public.club_fin_rappel r where r.club_id = v_club), 'pas de marqueur'));

    -- 4. Deuxième passage (le lendemain) : rien de plus, l'avis lu reste lu.
    update public.notifications set lu = true
    where user_id in (v_edu, v_a, v_b) and type = 'outils_club_fin_prochaine';
    perform public.rappeler_fin_programmee_clubs();
    v_res := v_res || jsonb_build_object('ordre', 4, 'cas', 'Lendemain : jamais deux fois, avis lus restent lus',
      'attendu', '1/1/0 1/1/0 2 lus', 'obtenu', pg_temp.avis('outils_club_fin_prochaine') || ' ' || pg_temp.rappels() || ' ' ||
      (select count(*)::text from public.notifications where user_id in (v_edu, v_a, v_b)
        and type = 'outils_club_fin_prochaine' and lu is true) || ' lus');

    -- 5. Nouvelle date (le club change sa date de fin) : l'avis du bloc 5 est
    -- corrigé, puis le rappel repart pour la nouvelle date, toujours sans doublon.
    update public.club_fin_programmee set fin_le = v_fin6 where club_id = v_club;
    v_res := v_res || jsonb_build_object('ordre', 5, 'cas', 'Nouvelle date : avis corrigé par le bloc 5 (plus un rappel)',
      'attendu', '1/1/0 0/0/0', 'obtenu', pg_temp.avis('outils_club_fin_prochaine') || ' ' || pg_temp.rappels());
    perform public.rappeler_fin_programmee_clubs();
    v_res := v_res || jsonb_build_object('ordre', 6, 'cas', 'Nouvelle date : rappel renvoyé pour la nouvelle date, sans doublon',
      'attendu', '1/1/0 1/1/0 oui', 'obtenu', pg_temp.avis('outils_club_fin_prochaine') || ' ' || pg_temp.rappels() || ' ' ||
      (select case when r.fin_le = v_fin6 then 'oui' else 'non' end from public.club_fin_rappel r where r.club_id = v_club));

    -- 7. Un éducateur qui a effacé son avis le retrouve avec le rappel.
    delete from public.notifications where user_id = v_a and type = 'outils_club_fin_prochaine';
    delete from public.club_fin_rappel where club_id = v_club;
    perform public.rappeler_fin_programmee_clubs();
    v_res := v_res || jsonb_build_object('ordre', 7, 'cas', 'Avis effacé : A le retrouve avec le rappel, un seul, bien suivi',
      'attendu', '1/1/0 1/1/0 1', 'obtenu', pg_temp.avis('outils_club_fin_prochaine') || ' ' || pg_temp.rappels() || ' ' ||
      (select count(*)::text from public.club_fin_avis a
       join public.notifications n on n.id::text = a.notification_id and n.user_id = a.educateur_id
       where a.club_id = v_club and a.educateur_id = v_a));

    -- 8. Reprise du forfait : plus d'avis, plus de marqueur.
    delete from public.club_fin_programmee where club_id = v_club;
    v_res := v_res || jsonb_build_object('ordre', 8, 'cas', 'Reprise : avis préalables et marqueur effacés',
      'attendu', '0/0/0 0', 'obtenu', pg_temp.avis('outils_club_fin_prochaine') || ' ' ||
      (select count(*)::text from public.club_fin_rappel where club_id = v_club));

    -- 9. Résiliation faite il y a moins de 7 jours : l'avis du bloc 5 suffit.
    delete from public.notifications where user_id in (v_edu, v_a, v_b) and type = 'outils_club_continue';
    insert into public.club_fin_programmee (club_id, fin_le, abonnement_id)
    values (v_club, v_fin5, 'sub_simulation_bloc7');
    perform public.rappeler_fin_programmee_clubs();
    v_res := v_res || jsonb_build_object('ordre', 9, 'cas', 'Résiliation récente (fin dans 5 jours) : avis du bloc 5 seul, pas de rappel',
      'attendu', '1/1/0 0/0/0 0', 'obtenu', pg_temp.avis('outils_club_fin_prochaine') || ' ' || pg_temp.rappels() || ' ' ||
      coalesce((select r.nb_avis::text from public.club_fin_rappel r where r.club_id = v_club), 'pas de marqueur'));
    delete from public.club_fin_programmee where club_id = v_club;

    -- 10. Une panne des avis ne casse rien : la fonction répond, rien n'est à moitié fait.
    insert into public.club_fin_programmee (club_id, fin_le, abonnement_id, programme_le)
    values (v_club, v_fin5, 'sub_simulation_bloc7', now() - interval '20 days');
    alter table public.notifications add constraint controle_bloc7_panne check (type <> 'outils_club_fin_prochaine') not valid;
    perform public.rappeler_fin_programmee_clubs();
    v_res := v_res || jsonb_build_object('ordre', 10, 'cas', 'Avis impossible : la fonction répond, ni rappel ni marqueur, retenté demain',
      'attendu', '1/1/0 0/0/0 0', 'obtenu', pg_temp.avis('outils_club_fin_prochaine') || ' ' || pg_temp.rappels() || ' ' ||
      (select count(*)::text from public.club_fin_rappel where club_id = v_club));
    alter table public.notifications drop constraint controle_bloc7_panne;
    delete from public.club_fin_programmee where club_id = v_club;

    -- 11. Club de l'ancien modèle : aucun rappel.
    update public.profiles set modele_outils = false where id = v_club;
    insert into public.club_fin_programmee (club_id, fin_le, abonnement_id, programme_le)
    values (v_club, v_fin5, 'sub_simulation_bloc7', now() - interval '20 days');
    perform public.rappeler_fin_programmee_clubs();
    v_res := v_res || jsonb_build_object('ordre', 11, 'cas', 'Club de l''ancien modèle : aucun avis ni rappel',
      'attendu', '0/0/0 0/0/0', 'obtenu', pg_temp.avis('outils_club_fin_prochaine') || ' ' || pg_temp.rappels());
    -- FIN DES CAS

    raise exception using errcode = 'P0001', message = 'fin_de_la_simulation';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'fin_de_la_simulation' then
      raise;
    end if;
  end;

  insert into controle_rappel (ordre, cas, attendu, obtenu)
  select r.ordre, r.cas, r.attendu, r.obtenu
  from jsonb_to_recordset(v_res) as r(ordre int, cas text, attendu text, obtenu text);
end $$;

-- 12. La panne simulée est bien retirée.
insert into controle_rappel
select 12, 'Contrainte d''essai retirée de notifications', '0', count(*)::text
from pg_constraint where conname = 'controle_bloc7_panne';

-- 13 à 15. Rien n'est resté en base.
insert into controle_rappel
select 13, 'Rien n''est resté : avis de fin, avis préalables, « continue »', (select notifs::text from avant_rappel), count(*)::text
from public.notifications
where type in ('outils_club_fin', 'outils_club_fin_prochaine', 'outils_club_continue');

insert into controle_rappel
select 14, 'Rien n''est resté : fins programmées et marqueurs de rappel',
  (select fins::text || ' ' || rappels::text from avant_rappel),
  (select count(*)::text from public.club_fin_programmee) || ' ' || (select count(*)::text from public.club_fin_rappel);

insert into controle_rappel
select 15, 'Club d''essai inchangé (forfait, palier, places, modèle, cycle)', (select club from avant_rappel),
  (select row(p.abonnement_actif, p.palier, p.quota_equipes, p.modele_outils, p.abonnement_cycle)::text
   from public.profiles p join auth.users u on u.id = p.id
   where u.email = 'deabreu.amorim+club@gmail.com');

select ordre, cas, attendu, obtenu, attendu = obtenu as ok
from controle_rappel
order by ordre;
