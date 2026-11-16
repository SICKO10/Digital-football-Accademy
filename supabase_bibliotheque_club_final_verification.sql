-- ============================================================================
-- Bibliothèque du club, bloc 11 : CONTRÔLE CROISÉ FINAL (lecture seule)
-- Lancé par Claude :
--   supabase db query --linked -f supabase_bibliotheque_club_final_verification.sql --output-format json
-- Ne modifie aucune donnée (table temporaire seulement). Pour CHAQUE compte connu
-- (comptes club, staff, éducateurs affiliés, profils sans lien avec un club) et
-- CHAQUE club, compare le droit réel de la base (lecture, écriture, lecture
-- éducateur) à la règle du brief calculée séparément à partir des tables.
-- Aucun réglage de rôle n'existe en production (contrôlé ligne 1) : les valeurs
-- par défaut s'appliquent partout.
-- Chaque ligne doit afficher ok = true.
-- ============================================================================

create temp table verif (ordre int, controle text, attendu text, obtenu text);
grant insert, select on verif to authenticated;
create temp table paires (uid uuid, club uuid, lecture boolean, ecriture boolean, edu boolean);
grant insert, select on paires to authenticated;

insert into verif
select 1, 'aucun réglage de rôle « bibliotheque » en production', '0',
       (select count(*)::text from public.role_permissions where section = 'bibliotheque');

insert into verif
select 2, 'règles de la table = fonctions du bloc 1, rien d''autre',
       'bcp_ajout:t/bcp_lecture:t/bcp_modification:t/bcp_suppression:t',
       (select string_agg(policyname || ':' || ((coalesce(qual,'') || coalesce(with_check,'')) like '%a_permission_bibliotheque%')::text::text, '/' order by policyname)
          from (select policyname, qual, with_check from pg_policies
                 where schemaname = 'public' and tablename = 'bibliotheque_club_procedes') p)
;
update verif set obtenu = replace(replace(obtenu, ':true', ':t'), ':false', ':f') where ordre = 2;

-- --- Comptes testés -----------------------------------------------------------
create temp table comptes as
  select id as uid from public.profiles where plan = 'club'
  union select user_id from public.staff_club where user_id is not null
  union select educateur_id from public.club_educateurs
  union (select id from public.profiles where plan is distinct from 'club'
          and id not in (select user_id from public.staff_club where user_id is not null)
          and id not in (select educateur_id from public.club_educateurs)
          order by id limit 40);
create temp table clubs_t as select id as club from public.profiles where plan = 'club';
grant select on comptes, clubs_t to authenticated;

do $$
declare c record;
begin
  for c in select uid, club from comptes cross join clubs_t loop
    perform set_config('request.jwt.claim.sub', c.uid::text, true);
    execute 'set local role authenticated';
    insert into paires values (c.uid, c.club,
      public.a_permission_bibliotheque(c.club, false),
      public.a_permission_bibliotheque(c.club, true),
      public.secu_educateur_accepte_club(c.club));
    execute 'reset role';
  end loop;
end $$;

insert into verif
select 3, 'nombre de paires compte x club testées', 'plus de 100',
       case when count(*) > 100 then 'plus de 100' else count(*)::text end from paires;

-- Règle du brief, recalculée sans passer par les fonctions :
--  lecture  = compte du club, OU membre du staff (tout rôle présent dans staff_club)
--  écriture = compte du club, OU président, OU directeur sportif
--  éducateur = éducateur accepté du club
create temp table attendu as
select p.uid, p.club,
  (p.uid = p.club
   or exists (select 1 from public.staff_club s where s.club_id = p.club and s.user_id = p.uid and s.role is not null)) as lecture,
  (p.uid = p.club
   or exists (select 1 from public.staff_club s where s.club_id = p.club and s.user_id = p.uid and s.role in ('president','directeur_sportif'))) as ecriture,
  exists (select 1 from public.club_educateurs e where e.club_id = p.club and e.educateur_id = p.uid and e.statut = 'accepte') as edu
from paires p;

insert into verif
select 4, 'lecture staff/club : écarts avec la règle du brief', '0',
       (select count(*)::text from paires p join attendu a using (uid, club) where p.lecture <> a.lecture);
insert into verif
select 5, 'écriture : écarts avec la règle du brief (président, directeur sportif seulement)', '0',
       (select count(*)::text from paires p join attendu a using (uid, club) where p.ecriture <> a.ecriture);
insert into verif
select 6, 'lecture éducateur accepté : écarts', '0',
       (select count(*)::text from paires p join attendu a using (uid, club) where p.edu <> a.edu);

-- Isolation entre clubs : un compte n'a jamais de droit sur un club où il n'a aucun lien.
insert into verif
select 7, 'droits sur un club sans aucun lien avec le compte', '0',
       (select count(*)::text from paires p
         where (p.lecture or p.ecriture or p.edu)
           and p.uid <> p.club
           and not exists (select 1 from public.staff_club s where s.club_id = p.club and s.user_id = p.uid)
           and not exists (select 1 from public.club_educateurs e where e.club_id = p.club and e.educateur_id = p.uid and e.statut = 'accepte'));

-- Un éducateur affilié ne peut jamais écrire (sauf s'il est aussi directeur sportif ou président).
insert into verif
select 8, 'éducateur accepté sans rôle de direction qui peut écrire', '0',
       (select count(*)::text from paires p join attendu a using (uid, club)
         where a.edu and p.ecriture and not exists (
           select 1 from public.staff_club s where s.club_id = p.club and s.user_id = p.uid and s.role in ('president','directeur_sportif'))
           and p.uid <> p.club);

-- Profils sans lien avec un club (éducateurs non affiliés, joueurs...) : aucun droit.
insert into verif
select 9, 'profils sans lien avec un club : droits obtenus', '0',
       (select count(*)::text from paires p
         where p.uid not in (select user_id from public.staff_club where user_id is not null)
           and p.uid not in (select educateur_id from public.club_educateurs)
           and p.uid not in (select club from clubs_t)
           and (p.lecture or p.ecriture or p.edu));
insert into verif
select 10, 'nombre de profils sans lien testés', 'plus de 0',
       case when count(distinct uid) > 0 then 'plus de 0' else '0' end
  from paires
 where uid not in (select user_id from public.staff_club where user_id is not null)
   and uid not in (select educateur_id from public.club_educateurs)
   and uid not in (select club from clubs_t);

-- Personne de connecté.
do $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  execute 'set local role authenticated';
  insert into verif select 11, 'personne de connecté (lecture/écriture/éducateur)', 'false/false/false',
    public.a_permission_bibliotheque((select club from clubs_t limit 1), false)::text || '/' ||
    public.a_permission_bibliotheque((select club from clubs_t limit 1), true)::text || '/' ||
    public.secu_educateur_accepte_club((select club from clubs_t limit 1))::text;
  execute 'reset role';
end $$;

select ordre, controle, attendu, obtenu, (attendu = obtenu) as ok from verif order by ordre;
