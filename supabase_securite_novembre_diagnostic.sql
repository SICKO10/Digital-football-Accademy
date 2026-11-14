-- Bloc 0 (chantier sécurité novembre) : diagnostic en LECTURE SEULE.
-- Ne modifie rien dans la base : une seule lecture (select), aucune écriture.
--
-- À lancer en entier dans Supabase (SQL Editor), d'un seul coup. Résultat :
-- un seul tableau. Bouton « Download CSV », puis enregistrer le fichier dans
-- ~/digital-football sous le nom diagnostic-securite-novembre.csv (à ne pas
-- committer : il contient des adresses des comptes de test et des noms de clubs).
--
-- Tables visées : role_categories_access, staff_club, convocation_joueurs,
-- entrainements.
--
-- Colonnes : ordre (tri), partie, objet, detail.
--   ordre 10 : RLS activée ou non sur les 4 tables
--   ordre 11 : règles d'accès réelles (pg_policies) des 4 tables
--   ordre 12 : règles d'AUTRES tables qui lisent une des 4 tables (elles
--              peuvent casser quand on fermera la table lue)
--   ordre 13 : droits accordés à anon, authenticated et PUBLIC
--   ordre 14 : colonnes
--   ordre 15 : déclencheurs (triggers) posés sur les 4 tables
--   ordre 16 : fonctions qui citent une des 4 tables (SECURITY DEFINER ou non,
--              exécutables par anon ou non)
--   ordre 17 : vues qui citent une des 4 tables
--   ordre 18 : liens (clés étrangères) qui partent des 4 tables ou y arrivent
--   ordre 20 : nombre de lignes, total et par club
--   ordre 30 : comptes rattachés au club test (deabreu.amorim+club@gmail.com)
--   ordre 40 : identifiants utiles d'AS CANNES (sans adresse email)

with
cibles(t) as (
  values ('role_categories_access'), ('staff_club'), ('convocation_joueurs'), ('entrainements')
),
motif as (
  select '(role_categories_access|staff_club|convocation_joueurs|entrainements)' as re
),
club_test as (
  select u.id, u.email
  from auth.users u
  where lower(u.email) = 'deabreu.amorim+club@gmail.com'
),
cannes as (
  select p.id, p.club
  from profiles p
  where p.plan = 'club' and upper(coalesce(p.club, '')) like '%CANNES%'
),
noms_clubs as (
  select p.id, coalesce(nullif(trim(p.club), ''), p.id::text) as nom
  from profiles p
  where p.plan = 'club'
),
-- Équipes et éducateurs d'un club (pour rattacher les lignes à un club)
equipes as (
  select cc.id, cc.club_id, cc.nom, cc.equipe, cc.educateur_id from club_categories cc
),
educs_test as (
  select ce.educateur_id, ce.statut from club_educateurs ce where ce.club_id in (select id from club_test)
),
joueurs_test as (
  select distinct a.joueur_id, a.educateur_id, a.statut
  from affiliations a
  where a.educateur_id in (select educateur_id from educs_test)
),
lignes as (

  -- 10 : RLS activée ?
  select 10 as ordre, 'RLS' as partie, c.relname::text as objet,
         'activée=' || c.relrowsecurity || ' · forcée=' || c.relforcerowsecurity as detail
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname in (select t from cibles)

  union all
  select 10, 'RLS', t, 'TABLE ABSENTE de public' from cibles
  where t not in (select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public')

  -- 11 : règles réelles des 4 tables
  union all
  select 11, 'Règle', p.tablename || ' · ' || p.policyname,
         p.permissive || ' · ' || p.cmd || ' · rôles=' || array_to_string(p.roles, ',')
         || ' · USING=' || coalesce(p.qual, '(aucun)')
         || ' · WITH CHECK=' || coalesce(p.with_check, '(aucun)')
  from pg_policies p
  where p.schemaname = 'public' and p.tablename in (select t from cibles)

  -- 12 : règles d'autres tables qui lisent une des 4 tables
  union all
  select 12, 'Règle ailleurs', p.schemaname || '.' || p.tablename || ' · ' || p.policyname,
         p.cmd || ' · rôles=' || array_to_string(p.roles, ',')
         || ' · USING=' || coalesce(p.qual, '(aucun)')
         || ' · WITH CHECK=' || coalesce(p.with_check, '(aucun)')
  from pg_policies p, motif m
  where p.tablename not in (select t from cibles)
    and (coalesce(p.qual, '') ~* m.re or coalesce(p.with_check, '') ~* m.re)

  -- 13 : droits accordés
  union all
  select 13, 'Droits', g.table_name::text,
         g.grantee || ' : ' || string_agg(g.privilege_type, ', ' order by g.privilege_type)
  from information_schema.role_table_grants g
  where g.table_schema = 'public' and g.table_name in (select t from cibles)
    and g.grantee in ('anon', 'authenticated', 'PUBLIC')
  group by g.table_name, g.grantee

  -- 14 : colonnes
  union all
  select 14, 'Colonnes', c.table_name::text,
         string_agg(c.column_name || ' ' || c.data_type
                    || case when c.is_nullable = 'NO' then ' (obligatoire)' else '' end,
                    ', ' order by c.ordinal_position)
  from information_schema.columns c
  where c.table_schema = 'public' and c.table_name in (select t from cibles)
  group by c.table_name

  -- 15 : déclencheurs
  union all
  select 15, 'Déclencheur', c.relname || ' · ' || tg.tgname,
         'fonction=' || pn.nspname || '.' || pr.proname
         || ' · SECURITY DEFINER=' || pr.prosecdef
         || ' · actif=' || (tg.tgenabled <> 'D')
         || ' · ' || pg_get_triggerdef(tg.oid)
  from pg_trigger tg
  join pg_class c on c.oid = tg.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  join pg_proc pr on pr.oid = tg.tgfoid
  join pg_namespace pn on pn.oid = pr.pronamespace
  where not tg.tgisinternal and n.nspname = 'public' and c.relname in (select t from cibles)

  -- 16 : fonctions qui citent une des 4 tables
  union all
  select 16, 'Fonction', pn.nspname || '.' || pr.proname || '(' || pg_get_function_identity_arguments(pr.oid) || ')',
         'SECURITY DEFINER=' || pr.prosecdef
         || ' · anon peut exécuter=' || has_function_privilege('anon', pr.oid, 'EXECUTE')
         || ' · authenticated peut exécuter=' || has_function_privilege('authenticated', pr.oid, 'EXECUTE')
         || ' · search_path=' || coalesce(array_to_string(pr.proconfig, ' '), '(non fixé)')
         || ' · tables citées=' || (
              select string_agg(distinct x[1], ',')
              from regexp_matches(pr.prosrc, m.re, 'gi') as x)
  from pg_proc pr
  join pg_namespace pn on pn.oid = pr.pronamespace, motif m
  where pn.nspname in ('public', 'auth') and pr.prosrc ~* m.re

  -- 17 : vues
  union all
  select 17, 'Vue', v.schemaname || '.' || v.viewname,
         'tables citées=' || (select string_agg(distinct x[1], ',') from regexp_matches(v.definition, m.re, 'gi') as x)
         || ' · security_invoker=' || coalesce((
              select array_to_string(c.reloptions, ' ') from pg_class c join pg_namespace n on n.oid = c.relnamespace
              where n.nspname = v.schemaname and c.relname = v.viewname), '(défaut : droits du propriétaire)')
  from pg_views v, motif m
  where v.schemaname = 'public' and v.definition ~* m.re

  -- 18 : clés étrangères
  union all
  select 18, 'Lien', con.conrelid::regclass::text || ' → ' || con.confrelid::regclass::text,
         con.conname || ' · ' || pg_get_constraintdef(con.oid)
  from pg_constraint con
  where con.contype = 'f'
    and (con.conrelid::regclass::text in (select t from cibles) or con.confrelid::regclass::text in (select t from cibles))

  -- 20 : nombre de lignes
  union all
  select 20, 'Lignes', 'role_categories_access', 'total=' || count(*) || ' · clubs=' || count(distinct club_id) from role_categories_access
  union all
  select 20, 'Lignes', 'staff_club', 'total=' || count(*) || ' · clubs=' || count(distinct club_id) || ' · rôles=' || coalesce((select string_agg(role || ':' || n, ', ') from (select role, count(*) n from staff_club group by role) r), '') from staff_club
  union all
  select 20, 'Lignes', 'convocation_joueurs', 'total=' || count(*) from convocation_joueurs
  union all
  select 20, 'Lignes', 'entrainements',
         'total=' || count(*)
         || ' · sans équipe (club_categorie_id vide)=' || count(*) filter (where e.club_categorie_id is null)
         || ' · équipe introuvable=' || count(*) filter (where e.club_categorie_id is not null and eq.id is null)
         || ' · éducateur ≠ éducateur de l''équipe=' || count(*) filter (where eq.id is not null and eq.educateur_id is distinct from e.educateur_id)
  from entrainements e left join equipes eq on eq.id = e.club_categorie_id

  union all
  select 21, 'Lignes par club', nc.nom,
         'role_categories_access=' || (select count(*) from role_categories_access r where r.club_id = nc.id)
         || ' · staff_club=' || (select count(*) from staff_club s where s.club_id = nc.id)
         || ' · entrainements (par équipe)=' || (select count(*) from entrainements e join equipes eq on eq.id = e.club_categorie_id where eq.club_id = nc.id)
         || ' · convocation_joueurs (par match d''équipe)=' || (
              select count(*) from convocation_joueurs cj
              join convocations cv on cv.id = cj.convocation_id
              join matchs_equipe me on me.id = cv.match_id
              join equipes eq on eq.id = me.club_categorie_id
              where eq.club_id = nc.id)
  from noms_clubs nc
  where exists (select 1 from staff_club s where s.club_id = nc.id)
     or exists (select 1 from role_categories_access r where r.club_id = nc.id)
     or exists (select 1 from equipes eq where eq.club_id = nc.id)

  -- 30 : comptes rattachés au club test
  union all
  select 30, 'Club test', 'club', coalesce((select id::text || ' · ' || email from club_test), 'INTROUVABLE : aucun compte deabreu.amorim+club@gmail.com')
  union all
  select 31, 'Club test', 'staff · ' || s.role, s.user_id || ' · ' || coalesce(u.email, '?') || ' · ligne staff_club ' || s.id
  from staff_club s left join auth.users u on u.id = s.user_id
  where s.club_id in (select id from club_test)
  union all
  select 32, 'Club test', 'éducateur · ' || et.statut, et.educateur_id || ' · ' || coalesce(u.email, '?')
  from educs_test et left join auth.users u on u.id = et.educateur_id
  union all
  select 33, 'Club test', 'équipe', eq.id || ' · ' || coalesce(eq.nom, '') || ' ' || coalesce(eq.equipe, '') || ' · éducateur ' || coalesce(eq.educateur_id::text, '(aucun)')
  from equipes eq where eq.club_id in (select id from club_test)
  union all
  select 34, 'Club test', 'joueur affilié · ' || jt.statut, jt.joueur_id || ' · ' || coalesce(u.email, '?') || ' · éducateur ' || jt.educateur_id
  from joueurs_test jt left join auth.users u on u.id = jt.joueur_id
  union all
  select 35, 'Club test', 'parent · ' || pa.statut, pa.parent_id || ' · ' || coalesce(u.email, '?') || ' · enfant ' || pa.joueur_id
  from parents_acces pa left join auth.users u on u.id = pa.parent_id
  where pa.joueur_id in (select joueur_id from joueurs_test)
  union all
  select 36, 'Club test', 'dirigeant · ' || da.statut, da.dirigeant_id || ' · ' || coalesce(u.email, '?') || ' · éducateur ' || da.educateur_id
  from dirigeant_acces da left join auth.users u on u.id = da.dirigeant_id
  where da.educateur_id in (select educateur_id from educs_test)
  union all
  select 37, 'Club test', 'comptes +educ/+joueur/+parent/+staff existants', coalesce(string_agg(u.email || ' (' || u.id || ')', ' · ' order by u.email), 'aucun')
  from auth.users u
  where lower(u.email) like 'deabreu.amorim+%@gmail.com' and lower(u.email) <> 'deabreu.amorim+club@gmail.com'
  union all
  select 38, 'Club test', 'lignes du club test',
         'role_categories_access=' || (select count(*) from role_categories_access r where r.club_id in (select id from club_test))
         || ' · entrainements=' || (select count(*) from entrainements e join equipes eq on eq.id = e.club_categorie_id where eq.club_id in (select id from club_test))
         || ' · entrainements des éducateurs du club=' || (select count(*) from entrainements e where e.educateur_id in (select educateur_id from educs_test))

  -- 40 : AS CANNES (identifiants seulement, pas d'email)
  union all
  select 40, 'AS CANNES', 'club', coalesce((select string_agg(id || ' · ' || club, ' / ') from cannes), 'INTROUVABLE : aucun club dont le nom contient CANNES')
  union all
  select 41, 'AS CANNES', 'staff_club', coalesce(string_agg(s.id || ' (rôle ' || s.role || ', compte ' || s.user_id || ')', ' · '), 'aucune ligne')
  from staff_club s where s.club_id in (select id from cannes)
  union all
  select 42, 'AS CANNES', 'role_categories_access', coalesce(string_agg(r.role || ' (acces_complet=' || coalesce(r.acces_complet::text, '?') || ')', ' · '), 'aucune ligne')
  from role_categories_access r where r.club_id in (select id from cannes)
  union all
  select 43, 'AS CANNES', 'exemple entrainement', coalesce((
    select e.id || ' · équipe ' || e.club_categorie_id || ' · éducateur ' || e.educateur_id
    from entrainements e join equipes eq on eq.id = e.club_categorie_id
    where eq.club_id in (select id from cannes) order by e.date desc limit 1), 'aucun')
  union all
  select 44, 'AS CANNES', 'exemple convocation_joueurs', coalesce((
    select cj.convocation_id || ' · joueur ' || cj.joueur_id
    from convocation_joueurs cj
    join convocations cv on cv.id = cj.convocation_id
    join matchs_equipe me on me.id = cv.match_id
    join equipes eq on eq.id = me.club_categorie_id
    where eq.club_id in (select id from cannes) limit 1), 'aucune')
)
select ordre, partie, objet, detail
from lignes
order by ordre, partie, objet, detail;
