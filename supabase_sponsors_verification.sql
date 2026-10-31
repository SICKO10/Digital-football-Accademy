-- Sécurisation module Sponsors — VÉRIFICATIONS (100 % lecture seule).
--
-- Uniquement des SELECT : aucune écriture, aucun DDL, exécutable à tout
-- moment sans risque. À lancer :
--   - AVANT la phase 1 (état de référence, à conserver : c'est la base de
--     toute procédure de retour arrière) ;
--   - entre phase 1 et phase 2 ;
--   - APRÈS la phase 2.

-- V1. RLS sur les tables du module (relkind : r = table, v = vue,
--     m = vue matérialisée). offres_sponsoring / club_valorisation : signalées
--     absentes des tables ordinaires — cette requête montre si elles existent
--     sous une autre forme.
select c.relname, c.relkind, c.relrowsecurity, c.relforcerowsecurity
from pg_class c
where c.relnamespace = 'public'::regnamespace
  and c.relname in ('sponsors', 'niveaux_partenariat', 'prospects_sponsors', 'prospects_echanges',
                    'sponsor_clics_log', 'offres_sponsoring', 'club_valorisation')
order by c.relname;

-- V2. Définition complète des policies.
select tablename, policyname, permissive, roles, cmd, qual as using_expr, with_check as check_expr
from pg_policies
where schemaname = 'public'
  and tablename in ('sponsors', 'niveaux_partenariat', 'prospects_sponsors', 'prospects_echanges', 'sponsor_clics_log')
order by tablename, policyname;

-- V3. Privilèges de table pour anon / authenticated.
select table_name, grantee, string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('sponsors', 'niveaux_partenariat', 'prospects_sponsors', 'prospects_echanges', 'sponsor_clics_log')
  and grantee in ('anon', 'authenticated')
group by table_name, grantee
order by table_name, grantee;

-- V4. Colonnes et types de sponsors (la RPC sponsors_bandeau suppose :
--     id uuid, club_id uuid, saison text, afficher_bandeau boolean,
--     ordre_bandeau integer ; entreprise/logo_url/banniere_url/lien_url
--     convertibles en text).
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'sponsors'
order by ordinal_position;

-- V5. Fonctions du portail partenaire : définition, SECURITY DEFINER,
--     droits d'exécution. get_sponsor_by_token doit rester exécutable par anon.
select p.proname, p.prosecdef as security_definer, p.proacl,
       pg_get_function_identity_arguments(p.oid) as arguments,
       pg_get_function_result(p.oid) as retour,
       pg_get_functiondef(p.oid) as definition
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname in ('get_sponsor_by_token', 'demander_renouvellement_sponsor');

-- V6. Collisions de noms et fonctions SECURITY DEFINER qui touchent sponsors.
--     Avant phase 1 : aucune ligne sponsors_* attendue (sinon, comparer avant
--     d'écraser). Toute autre fonction SECURITY DEFINER exécutable par anon
--     ou authenticated qui lit/écrit sponsors est un contournement possible
--     de la RLS : à examiner.
select p.proname, p.prosecdef as security_definer, p.proacl,
       pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.prokind = 'f'
  and (p.proname like 'sponsors\_%' escape '\'
       or case when p.prosecdef then pg_get_functiondef(p.oid) ilike '%sponsors%' else false end)
order by p.proname;

-- V7. Triggers sur les tables du module.
select event_object_table as table_name, trigger_name, action_timing, event_manipulation
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table in ('sponsors', 'niveaux_partenariat', 'sponsor_clics_log')
order by 1, 2;

-- V8. Impact de la matrice des droits : lignes role_permissions explicites
--     sur la section 'sponsors' (sans ligne => défaut président/marketing/
--     secrétaire) et répartition des rôles staff (rôle NULL = président).
select rp.role, rp.can_view, rp.can_edit, count(*) as nb_clubs
from public.role_permissions rp
where rp.section = 'sponsors'
group by rp.role, rp.can_view, rp.can_edit
order by rp.role;

select coalesce(sc.role, '(null => president)') as role, count(*) as nb
from public.staff_club sc
group by 1
order by 1;

-- V9. Buckets de stockage (documents/proofs signalés publics) — information
--     pour la note de migration, non traités par les phases 1 et 2.
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id in ('documents', 'proofs');

-- V11. Propriétaires et contournement de la RLS (avant phase 1).
--      Les fonctions SECURITY DEFINER s'exécutent avec les droits de leur
--      propriétaire (le rôle qui exécute le script, normalement postgres).
--      Attendu : chaque table appartient à un rôle avec rolbypassrls = true
--      ou au même rôle que celui qui créera les fonctions, ET
--      relforcerowsecurity = false. Sinon, la RLS s'applique AUSSI à
--      l'intérieur des fonctions : le bandeau resterait vide (refus, jamais
--      fuite) — à corriger avant la phase 2.
select current_user as executeur_du_script,
       (select rolbypassrls from pg_roles where rolname = current_user) as executeur_bypass_rls;

select c.relname, pg_get_userbyid(c.relowner) as proprietaire, r.rolbypassrls as proprietaire_bypass_rls,
       c.relrowsecurity, c.relforcerowsecurity
from pg_class c
join pg_roles r on r.oid = c.relowner
where c.relnamespace = 'public'::regnamespace
  and c.relname in ('sponsors', 'sponsor_clics_log', 'profiles', 'staff_club', 'role_permissions',
                    'club_educateurs', 'dirigeant_acces', 'affiliations', 'parents_acces')
order by c.relname;

-- V12. Policies D'ÉCRITURE des tables d'appartenance (risque d'affiliation
--      frauduleuse). Ce qu'il faut vérifier dans le résultat :
--      - staff_club : aucune policy INSERT permettant user_id = auth.uid()
--        sans invitation serveur (AcceptInvite.jsx insère club_id/role lus
--        dans user_metadata, modifiable par l'utilisateur) ;
--      - affiliations : aucune policy INSERT/UPDATE permettant à un joueur
--        d'écrire statut = 'accepte' lui-même (AcceptInvite.jsx:216 insère
--        statut 'accepte' avec un educateur_id lu dans user_metadata) ;
--      - club_educateurs : un éducateur ne peut créer/passer sa ligne en
--        'accepte' ;
--      - dirigeant_acces : la mise à 'accepte' (AcceptInvite.jsx:187) doit
--        être contrainte par l'email du JWT, pas par un filtre côté client ;
--      - parents_acces : la policy joueur FOR ALL laisse le joueur choisir
--        parent_id et statut (impact limité, cf. plan).
select tablename, policyname, permissive, roles, cmd, qual as using_expr, with_check as check_expr
from pg_policies
where schemaname = 'public'
  and tablename in ('staff_club', 'affiliations', 'club_educateurs', 'dirigeant_acces', 'parents_acces', 'role_permissions')
  and cmd in ('INSERT', 'UPDATE', 'ALL')
order by tablename, policyname;

select table_name, grantee, string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('staff_club', 'affiliations', 'club_educateurs', 'dirigeant_acces', 'parents_acces', 'role_permissions')
  and grantee in ('anon', 'authenticated')
group by table_name, grantee
order by table_name, grantee;

-- V13. Valeurs de statut réellement utilisées (les fonctions comparent à
--      'accepte' sans accent). Agrégats uniquement, aucune donnée personnelle.
select 'club_educateurs' as table_name, statut, count(*) from public.club_educateurs group by statut
union all
select 'affiliations', statut, count(*) from public.affiliations group by statut
union all
select 'dirigeant_acces', statut, count(*) from public.dirigeant_acces group by statut
union all
select 'parents_acces', statut, count(*) from public.parents_acces group by statut
order by 1, 2;

-- V14. Rôle staff NULL : nullabilité, contrainte et nombre de lignes
--      concernées (DashboardClub.jsx et api/_droits.js les traitent comme
--      'president' ; sponsors_peut_acceder les refuse).
select column_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'staff_club' and column_name = 'role';

select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.staff_club'::regclass and contype in ('c', 'n');

select count(*) filter (where role is null) as staff_role_null, count(*) as staff_total
from public.staff_club;

-- V15. Après phase 1 : propriétaire, search_path, SECURITY DEFINER et
--      droits EXECUTE des 4 fonctions. Attendu : search_path="" ;
--      proacl sans anon ni PUBLIC (=X/...) ; authenticated=X présent.
select p.proname, pg_get_userbyid(p.proowner) as proprietaire, p.prosecdef as security_definer,
       p.proconfig as parametres, p.proacl, obj_description(p.oid, 'pg_proc') as marqueur
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname in ('sponsors_peut_acceder', 'sponsors_est_membre_club', 'sponsors_bandeau', 'sponsors_clic_autorise')
order by p.proname;

-- V16. Policies encore permissives sur tout le module (à tout moment).
--      Signale : USING/WITH CHECK (true), policies sans condition sur
--      auth.uid() ni sur une fonction de droits, policies TO public/anon.
--      prospects_sponsors / prospects_echanges : traitées par la phase 3b ;
--      avant elle, leurs policies (club + tout staff) apparaissent ici.
select tablename, policyname, cmd, roles, qual as using_expr, with_check as check_expr
from pg_policies
where schemaname = 'public'
  and tablename in ('sponsors', 'niveaux_partenariat', 'sponsor_clics_log', 'prospects_sponsors', 'prospects_echanges')
  and (
    qual = 'true' or with_check = 'true'
    or 'anon' = any(roles)
    or not ((coalesce(qual, '') || coalesce(with_check, '')) ilike any (array['%auth.uid()%', '%sponsors_peut_acceder%', '%sponsors_clic_autorise%']))
  )
order by tablename, policyname;

-- V17. Fonctions du portail (avant la phase 4 : signature réelle de
--      get_sponsor_by_token ; après la phase 4/4b : droits attendus
--      sponsor_portail anon = true, get_sponsor_by_token anon = false).
select p.proname, pg_get_function_identity_arguments(p.oid) as arguments,
       pg_get_function_result(p.oid) as retour, p.prosecdef as security_definer, p.proconfig,
       has_function_privilege('anon', p.oid, 'execute') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated_execute
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname in ('get_sponsor_by_token', 'sponsor_portail', 'demander_renouvellement_sponsor');

-- V10. Après phase 2 uniquement — résumé attendu :
--     anon_* = false partout ; authenticated_select/insert = true ;
--     portail_anon = true ; aucune policy USING (true) sur sponsors.
select
  has_table_privilege('anon', 'public.sponsors', 'select')            as anon_select_sponsors,
  has_table_privilege('anon', 'public.sponsors', 'update')            as anon_update_sponsors,
  has_table_privilege('anon', 'public.sponsor_clics_log', 'insert')   as anon_insert_clics,
  has_table_privilege('authenticated', 'public.sponsors', 'select')   as authenticated_select_sponsors,
  has_table_privilege('authenticated', 'public.sponsor_clics_log', 'insert') as authenticated_insert_clics,
  has_function_privilege('anon', 'public.get_sponsor_by_token(uuid)', 'execute') as portail_anon,
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'sponsors'
     and (qual = 'true' or with_check = 'true')) as policies_true_sur_sponsors;
