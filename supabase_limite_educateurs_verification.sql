-- Vérification du bloc 2 (limite d'éducateurs par forfait). Lancer après
-- supabase_limite_educateurs.sql, le fichier en entier, d'un seul coup.
--
-- Rien n'est gardé en base : les cas d'essai modifient le club d'essai et
-- créent des affiliations dans une sous-transaction annulée à la fin. Ils
-- empruntent deux autres comptes éducateurs existants, uniquement le temps de
-- l'essai. Le contrôle 11 vérifie que rien n'est resté.
--
-- Résultat : un seul tableau. Chaque ligne doit avoir ok = true.

drop table if exists pg_temp.controle_limite;
create temp table controle_limite (ordre int, cas text, attendu text, obtenu text);

create or replace function pg_temp.essai(p_sql text) returns text
language plpgsql as $$
declare v_n int;
begin
  execute p_sql;
  get diagnostics v_n = row_count;
  return case when v_n = 0 then 'aucune ligne' else 'accepté' end;
exception when sqlstate 'DF001' then
  return 'refusé ' || substring(sqlerrm from 'LIMITE_EDUCATEURS:(\d+)');
end $$;

do $$
declare
  v_club uuid;
  v_edu uuid;
  v_a uuid;
  v_b uuid;
  v_ligne_b uuid;
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

  begin
    -- Départ propre : nouveau modèle, 2 places, testfinal seul affilié accepté,
    -- deux demandes en attente (A et B).
    -- Ne pas toucher à `palier` : le déclencheur sync_quota_equipes (UPDATE OF palier)
    -- recalculerait quota_equipes d'après le palier et annulerait le quota d'essai.
    update public.profiles set modele_outils = true, abonnement_actif = true, quota_equipes = 2 where id = v_club;
    delete from public.club_educateurs where club_id = v_club and educateur_id in (v_a, v_b);
    delete from public.club_educateurs where club_id = v_club and educateur_id is distinct from v_edu;
    insert into public.club_educateurs (club_id, educateur_id, statut, methode) values (v_club, v_a, 'en_attente', 'code');
    insert into public.club_educateurs (club_id, educateur_id, statut, methode) values (v_club, v_b, 'en_attente', 'code');
    select id into v_ligne_b from public.club_educateurs where club_id = v_club and educateur_id = v_b;

    v_res := v_res || jsonb_build_object('ordre', 1, 'cas', '2 places, 1 éducateur accepté : accepter le 2e passe',
      'attendu', 'accepté', 'obtenu', pg_temp.essai(format('update public.club_educateurs set statut = ''accepte'' where club_id = %L and educateur_id = %L', v_club, v_a)));
    v_res := v_res || jsonb_build_object('ordre', 2, 'cas', '2 places, 2 éducateurs acceptés : accepter le 3e est refusé (message avec 2 places)',
      'attendu', 'refusé 2', 'obtenu', pg_temp.essai(format('update public.club_educateurs set statut = ''accepte'' where id = %L', v_ligne_b)));
    v_res := v_res || jsonb_build_object('ordre', 3, 'cas', 'La demande refusée reste en attente, rien n''est enregistré',
      'attendu', 'en_attente', 'obtenu', (select statut from public.club_educateurs where id = v_ligne_b));
    v_res := v_res || jsonb_build_object('ordre', 4, 'cas', 'Ré-invitation d''un éducateur déjà accepté (upsert) : passe',
      'attendu', 'accepté', 'obtenu', pg_temp.essai(format('insert into public.club_educateurs (club_id, educateur_id, statut, methode) values (%L, %L, ''accepte'', ''invite'') on conflict (club_id, educateur_id) do update set statut = ''accepte'', methode = ''invite''', v_club, v_a)));
    v_res := v_res || jsonb_build_object('ordre', 5, 'cas', 'Invitation d''un nouvel éducateur directement acceptée (hors limite) : refusée',
      'attendu', 'refusé 2', 'obtenu', pg_temp.essai(format('insert into public.club_educateurs (club_id, educateur_id, statut, methode) values (%L, %L, ''accepte'', ''invite'') on conflict (club_id, educateur_id) do update set statut = ''accepte'', methode = ''invite''', v_club, v_b)));

    -- Forfait réduit à 1 place alors que 2 éducateurs sont acceptés.
    update public.profiles set quota_equipes = 1 where id = v_club;
    v_res := v_res || jsonb_build_object('ordre', 6, 'cas', 'Forfait réduit sous le nombre d''affiliés : modifier les droits d''un affilié reste possible',
      'attendu', 'accepté', 'obtenu', pg_temp.essai(format('update public.club_educateurs set peut_editer_planification = true where club_id = %L and educateur_id = %L', v_club, v_a)));
    v_res := v_res || jsonb_build_object('ordre', 7, 'cas', 'Forfait réduit : aucune affiliation n''est supprimée',
      'attendu', '2', 'obtenu', (select count(*)::text from public.club_educateurs where club_id = v_club and statut = 'accepte'));
    v_res := v_res || jsonb_build_object('ordre', 8, 'cas', 'Forfait réduit : une nouvelle acceptation est refusée (message avec 1 place)',
      'attendu', 'refusé 1', 'obtenu', pg_temp.essai(format('update public.club_educateurs set statut = ''accepte'' where id = %L', v_ligne_b)));

    -- Ancien modèle et forfait sans quota : aucune limite.
    update public.profiles set modele_outils = false where id = v_club;
    v_res := v_res || jsonb_build_object('ordre', 9, 'cas', 'Club de l''ancien modèle : pas de limite en base',
      'attendu', 'accepté', 'obtenu', pg_temp.essai(format('update public.club_educateurs set statut = ''accepte'' where id = %L', v_ligne_b)));
    update public.club_educateurs set statut = 'en_attente' where id = v_ligne_b;
    update public.profiles set modele_outils = true, quota_equipes = null where id = v_club;
    v_res := v_res || jsonb_build_object('ordre', 10, 'cas', 'Nouveau modèle sans quota renseigné : pas de limite en base',
      'attendu', 'accepté', 'obtenu', pg_temp.essai(format('update public.club_educateurs set statut = ''accepte'' where id = %L', v_ligne_b)));

    -- Chemin réel du navigateur : connecté en tant que club.
    update public.club_educateurs set statut = 'en_attente' where id = v_ligne_b;
    update public.profiles set quota_equipes = 2 where id = v_club;
    perform set_config('request.jwt.claim.sub', v_club::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', v_club, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    v_res := v_res || jsonb_build_object('ordre', 12, 'cas', 'Chemin du navigateur (connecté en tant que club) : accepter le 3e est refusé',
      'attendu', 'refusé 2', 'obtenu', pg_temp.essai(format('update public.club_educateurs set statut = ''accepte'' where id = %L', v_ligne_b)));
    -- La fonction de pré-contrôle est réservée au serveur.
    begin
      perform public.limite_educateurs_atteinte(v_club, v_b);
      v_res := v_res || jsonb_build_object('ordre', 15, 'cas', 'Le pré-contrôle des invitations est fermé au navigateur',
        'attendu', 'refusé', 'obtenu', 'accepté');
    exception when insufficient_privilege then
      v_res := v_res || jsonb_build_object('ordre', 15, 'cas', 'Le pré-contrôle des invitations est fermé au navigateur',
        'attendu', 'refusé', 'obtenu', 'refusé');
    end;
    execute 'reset role';

    -- Pré-contrôle côté serveur : club plein à 2 places (testfinal + A acceptés).
    update public.club_educateurs set statut = 'accepte' where club_id = v_club and educateur_id = v_a;
    v_res := v_res || jsonb_build_object('ordre', 16, 'cas', 'Pré-contrôle : club plein, nouvel éducateur : renvoie le nombre de places',
      'attendu', '2', 'obtenu', coalesce(public.limite_educateurs_atteinte(v_club, v_b)::text, 'null'));
    v_res := v_res || jsonb_build_object('ordre', 17, 'cas', 'Pré-contrôle : club plein, éducateur déjà accepté : pas de blocage',
      'attendu', 'null', 'obtenu', coalesce(public.limite_educateurs_atteinte(v_club, v_a)::text, 'null'));
    update public.club_educateurs set statut = 'en_attente' where club_id = v_club and educateur_id = v_a;
    v_res := v_res || jsonb_build_object('ordre', 18, 'cas', 'Pré-contrôle : une place libre : pas de blocage',
      'attendu', 'null', 'obtenu', coalesce(public.limite_educateurs_atteinte(v_club, v_b)::text, 'null'));

    v_res := v_res || jsonb_build_object('ordre', 13, 'cas', 'Tous les cas d''essai ont tourné jusqu''au bout',
      'attendu', 'oui', 'obtenu', 'oui');

    -- Tout annuler : seules les valeurs de v_res survivent.
    raise exception using errcode = 'P0001', message = 'fin_du_controle';
  exception when sqlstate 'P0001' then
    null;
  end;

  insert into controle_limite (ordre, cas, attendu, obtenu)
  select r.ordre, r.cas, r.attendu, r.obtenu
  from jsonb_to_recordset(v_res) as r(ordre int, cas text, attendu text, obtenu text);
end $$;

-- 11. Rien n'est resté : le club d'essai n'a que ses affiliations d'origine.
insert into controle_limite
select 11, 'Rien n''est resté en base (affiliations du club d''essai hors testfinal)', '0', count(*)::text
from public.club_educateurs ce
join auth.users u on u.id = ce.club_id and u.email = 'deabreu.amorim+club@gmail.com'
where ce.educateur_id::text not like '75df7fba%' and ce.statut = 'accepte';

-- 14. Le garde-fou est en place sur la table.
insert into controle_limite
select 14, 'Le garde-fou existe sur club_educateurs', '1', count(*)::text
from pg_trigger where tgname = 'limiter_educateurs_du_club' and not tgisinternal;

select ordre, cas, attendu, obtenu, attendu = obtenu as ok
from controle_limite
order by ordre;
