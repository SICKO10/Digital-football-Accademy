-- ═════════════════════════════════════════════════════════════════════════
-- Sécurisation module Sponsors — PHASE 2 : PROCÉDURES DE SECOURS (R0 à R7)
-- ═════════════════════════════════════════════════════════════════════════
--
-- Statut : PRÉPARATION UNIQUEMENT. Aucune correction n'est appliquée sans
-- validation explicite.
--
-- MODE D'EMPLOI
--   1. Exécuter ce fichier tel quel n'exécute QUE la section D0 : des SELECT
--      en lecture seule, sans paramètre (état des policies, droits, fonctions).
--   2. Les diagnostics paramétrés (DIAG-…) et toutes les corrections (CORR-…)
--      sont dans des blocs de commentaires « /* … */ » : ils ne s'exécutent
--      JAMAIS à l'ouverture ni à l'exécution complète du fichier.
--   3. Pour appliquer une correction : copier UNIQUEMENT le contenu du bloc
--      voulu (entre les lignes « DÉBUT » et « FIN »), puis remplacer la
--      valeur de confirmation 'A_REMPLACER' par le code de l'incident (ex.
--      'R1'). Sans ce remplacement, la correction s'arrête avant toute
--      modification.
--   4. Chaque correction est une transaction : garde-fous (préconditions)
--      → changement minimal → contrôles. Tout échec annule l'ensemble.
--
-- RÈGLES ABSOLUES (aucune procédure ci-dessous ne les enfreint)
--   - ne jamais recréer "sponsors_all" ni "sponsors_bandeau_select" ;
--   - ne jamais désactiver la RLS ;
--   - ne jamais accorder de droit direct sur public.sponsors à anon ni à
--     PUBLIC, même temporairement ;
--   - ne jamais élargir les accès du staff ni des utilisateurs au-delà de
--     l'état de référence ci-dessous ;
--   - aucun token partenaire réel dans ce fichier ni dans les résultats :
--     les diagnostics du portail lisent le token d'un sponsor de test en
--     interne, sans jamais l'afficher.
--
-- ÉTAT DE RÉFÉRENCE (production, diagnostic du 2026-10-18, reconfirmé)
--   public.sponsors :
--     "Club manages sponsors"  ALL / public
--        USING ((club_id = auth.uid()) OR (EXISTS (SELECT 1 FROM staff_club
--               WHERE staff_club.club_id = sponsors.club_id
--                 AND staff_club.user_id = auth.uid())))   — pas de WITH CHECK
--     "sponsors_all"           ALL / public, USING (true)          [supprimée par la phase 2]
--     "sponsors_bandeau_select" SELECT / authenticated             [supprimée par la phase 2]
--   public.sponsor_clics_log :
--     "sponsor_clics_log_insert" INSERT / authenticated,
--        WITH CHECK (auth.uid() IS NOT NULL)                       [remplacée par la phase 2]
--     "sponsor_clics_log_select" SELECT / authenticated
--        USING ((club_id = auth.uid()) OR (EXISTS (SELECT 1 FROM staff_club sc
--               WHERE sc.club_id = sponsor_clics_log.club_id
--                 AND sc.user_id = auth.uid())))
--   Après la phase 2 (attendu) : sponsors = "Club manages sponsors" seule ;
--   sponsor_clics_log = "sponsor_clics_log_insert_membre" (WITH CHECK
--   sponsors_clic_autorise(sponsor_id, club_id)) + "sponsor_clics_log_select" ;
--   anon et PUBLIC : aucun droit sur les deux tables ; authenticated :
--   SELECT/INSERT/UPDATE/DELETE sur sponsors, SELECT/INSERT sur les clics.
--   Fonctions du portail (SECURITY DEFINER, propriétaire postgres) :
--   get_sponsor_by_token(uuid) et demander_renouvellement_sponsor(uuid),
--   EXECUTE pour anon et authenticated.
--
-- INCIDENTS COUVERTS
--   R0  le script de phase 2 s'arrête (garde-fou ou contrôle final)
--   R1  portail : droit EXECUTE perdu sur les fonctions du portail
--   R2  portail en panne alors que EXECUTE est en place
--   R3  clics légitimes refusés
--   R4  club ou staff ne voit / ne modifie plus ses sponsors
--   R5  statistiques de clics illisibles
--   R6  bandeau vide
--   R7  outil externe inconnu (clé anon) qui ne fonctionne plus
-- ═════════════════════════════════════════════════════════════════════════


-- ═════════════════════════════════════════════════════════════════════════
-- D0. DIAGNOSTIC GÉNÉRAL — lecture seule, sans paramètre (seule partie
--     exécutable du fichier). À lancer avant toute correction.
-- ═════════════════════════════════════════════════════════════════════════

-- D0.1 Policies des deux tables.
select tablename, policyname, permissive, roles, cmd, qual as using_expr, with_check as check_expr
from pg_policies
where schemaname = 'public' and tablename in ('sponsors', 'sponsor_clics_log')
order by tablename, policyname;

-- D0.2 Droits de table (anon, authenticated, PUBLIC).
select table_name, grantee, string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public' and table_name in ('sponsors', 'sponsor_clics_log')
  and grantee in ('anon', 'authenticated', 'PUBLIC')
group by table_name, grantee
order by table_name, grantee;

-- D0.3 RLS active, non forcée, propriétaire.
select c.relname, c.relrowsecurity, c.relforcerowsecurity, pg_get_userbyid(c.relowner) as proprietaire
from pg_class c
where c.relnamespace = 'public'::regnamespace and c.relname in ('sponsors', 'sponsor_clics_log');

-- D0.4 Fonctions du module : SECURITY DEFINER, search_path, droits EXECUTE.
select p.oid::regprocedure as fonction, p.prosecdef as security_definer, p.proconfig,
       pg_get_userbyid(p.proowner) as proprietaire,
       has_function_privilege('anon', p.oid, 'execute') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated_execute
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname in ('get_sponsor_by_token', 'demander_renouvellement_sponsor', 'sponsors_bandeau',
                    'sponsors_est_membre_club', 'sponsors_clic_autorise', 'sponsors_peut_acceder',
                    'sponsor_portail')
order by p.proname;

-- D0.5 Résumé de sécurité. Attendu après la phase 2 : anon_* et public_* = false ;
--      policies_true = 0 ; portail_anon = true ; authenticated_* = true.
select
  has_table_privilege('anon', 'public.sponsors', 'select')               as anon_select_sponsors,
  has_table_privilege('anon', 'public.sponsors', 'update')               as anon_update_sponsors,
  has_table_privilege('public', 'public.sponsors', 'select')             as public_select_sponsors,
  has_table_privilege('anon', 'public.sponsor_clics_log', 'insert')      as anon_insert_clics,
  has_table_privilege('authenticated', 'public.sponsors', 'select')      as authenticated_select_sponsors,
  has_table_privilege('authenticated', 'public.sponsors', 'insert')      as authenticated_insert_sponsors,
  has_table_privilege('authenticated', 'public.sponsors', 'update')      as authenticated_update_sponsors,
  has_table_privilege('authenticated', 'public.sponsors', 'delete')      as authenticated_delete_sponsors,
  has_table_privilege('authenticated', 'public.sponsor_clics_log', 'insert') as authenticated_insert_clics,
  has_table_privilege('authenticated', 'public.sponsor_clics_log', 'select') as authenticated_select_clics,
  has_function_privilege('anon', 'public.get_sponsor_by_token(uuid)', 'execute') as portail_anon,
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'sponsors'
     and (qual = 'true' or with_check = 'true'))                         as policies_true;


-- ═════════════════════════════════════════════════════════════════════════
-- R0. LE SCRIPT DE PHASE 2 S'ARRÊTE
-- ═════════════════════════════════════════════════════════════════════════
-- Cause possible : un garde-fou (fonction de phase 1 absente ou non conforme,
--   policy inattendue, "Club manages sponsors" absente ou trop large) ou un
--   contrôle final (droit restant à anon/PUBLIC, droit manquant à
--   authenticated, portail non exécutable par anon).
-- Effet : la transaction est entièrement annulée — RIEN n'a été modifié.
-- Vérifications : lire le message « ARRÊT » / « ÉCHEC » ; lancer D0 ;
--   comparer à l'état de référence (en tête de fichier).
-- Correction : AUCUNE. Ne pas relancer la phase 2 et ne pas contourner un
--   garde-fou. Transmettre le message et le résultat de D0 pour analyse.


-- ═════════════════════════════════════════════════════════════════════════
-- R1. PORTAIL : DROIT EXECUTE PERDU SUR LES FONCTIONS DU PORTAIL
-- ═════════════════════════════════════════════════════════════════════════
-- Symptôme : le lien partenaire affiche « Lien invalide ou expiré » pour un
--   lien valide ; D0.4 montre anon_execute = false pour
--   get_sponsor_by_token ou demander_renouvellement_sponsor.
-- Cause possible : droit EXECUTE retiré (improbable : la phase 2 contrôle
--   ce droit avant de valider).
-- Vérifications préalables : D0.4 ; les deux fonctions existent avec la
--   signature (uuid), sont SECURITY DEFINER et n'ont pas été modifiées.
-- Correction : redonner UNIQUEMENT le droit EXECUTE de ces deux fonctions
--   à anon et authenticated (état de référence). Aucun droit sur la table.
-- Effets : le portail retrouve son fonctionnement d'avant la phase 2.
-- Risques : get_sponsor_by_token renvoie toutes les colonnes de la fiche au
--   détenteur du token (situation déjà existante, non aggravée ; traitée par
--   la phase 4).
-- Contrôles après : D0.4 (anon_execute = true), D0.5 (aucun droit anon sur
--   sponsors), test du portail en navigation privée.

/* ────────────── DÉBUT CORR-R1 (copier à partir de la ligne suivante) ──────────────
begin;
select set_config('secours.incident', 'A_REMPLACER', true);

do $$
declare
  v_oid regprocedure;
begin
  if current_setting('secours.incident', true) is distinct from 'R1' then
    raise exception 'CORR-R1 non confirmée : remplacer A_REMPLACER par R1. Rien n''a été modifié.';
  end if;
  foreach v_oid in array array['public.get_sponsor_by_token(uuid)'::regprocedure,
                               'public.demander_renouvellement_sponsor(uuid)'::regprocedure] loop
    if not (select prosecdef from pg_proc where oid = v_oid) then
      raise exception 'CORR-R1 : % n''est pas SECURITY DEFINER — état inattendu, ne pas corriger. Rien n''a été modifié.', v_oid;
    end if;
  end loop;
  if (select prosrc from pg_proc where oid = 'public.get_sponsor_by_token(uuid)'::regprocedure) not ilike '%acces_token = p_token%' then
    raise exception 'CORR-R1 : définition de get_sponsor_by_token différente de la référence — examiner avant toute correction. Rien n''a été modifié.';
  end if;
end;
$$;

grant execute on function public.get_sponsor_by_token(uuid) to anon, authenticated;
grant execute on function public.demander_renouvellement_sponsor(uuid) to anon, authenticated;

do $$
begin
  if not has_function_privilege('anon', 'public.get_sponsor_by_token(uuid)', 'execute')
     or not has_function_privilege('anon', 'public.demander_renouvellement_sponsor(uuid)', 'execute') then
    raise exception 'CORR-R1 : droit EXECUTE toujours absent. Transaction annulée.';
  end if;
  if has_table_privilege('anon', 'public.sponsors', 'select') or has_table_privilege('public', 'public.sponsors', 'select') then
    raise exception 'CORR-R1 : anon/PUBLIC a un droit sur sponsors — état anormal. Transaction annulée.';
  end if;
  raise notice 'CORR-R1 appliquée : EXECUTE rétabli sur les fonctions du portail, aucun droit sur la table.';
end;
$$;

commit;
────────────── FIN CORR-R1 ────────────── */


-- ═════════════════════════════════════════════════════════════════════════
-- R2. PORTAIL EN PANNE ALORS QUE EXECUTE EST EN PLACE
-- ═════════════════════════════════════════════════════════════════════════
-- Symptôme : lien valide refusé, alors que D0.4 montre anon_execute = true.
-- Causes possibles, par ordre de probabilité :
--   a) cache de schéma de l'API (PostgREST) désynchronisé ;
--   b) fonction modifiée ou remplacée (définition, propriétaire, search_path) ;
--   c) cas imprévu où la base exigerait un droit sur la table (hypothèse
--      considérée comme très improbable : fonction SECURITY DEFINER,
--      propriétaire postgres qui contourne la RLS) ;
--   d) problème hors base : mauvaise URL (ex. lien copié depuis localhost),
--      version du frontend déployée appelant une autre fonction.
-- Vérifications préalables :
--   - vérifier l'URL : https://digitalfootball.academy/partenaire/<token> ;
--   - vérifier que le frontend en production appelle get_sponsor_by_token
--     (et non sponsor_portail, absente tant que la phase 4 n'est pas faite) ;
--   - D0.4 (propriétaire postgres, SECURITY DEFINER, search_path=public) ;
--   - DIAG-R2 ci-dessous : simulation anon en base, sans rien modifier.
-- Correction autorisée :
--   - pour a) seulement : CORR-R2a (demande de rechargement du schéma de
--     l'API ; ne modifie aucun droit ni aucune donnée).
-- Pas de correction SQL préparée pour b) et c) :
--   - b) arrêt et analyse : comparer la définition avec l'état de référence
--     (diagnostic V5) avant toute action ;
--   - c) NE PAS ouvrir la table. Correction définitive = PHASE 4 déjà préparée
--     (supabase_sponsors_phase4_portail.sql, fonction sponsor_portail limitée
--     aux champs affichés, puis déploiement de la version locale de
--     src/pages/PartenairePublic.jsx qui l'appelle). Ne PAS exécuter la
--     phase 4b à ce moment. Le portail reste indisponible le temps de
--     valider et appliquer la phase 4 : indisponibilité acceptée plutôt que
--     réouverture.

/* ────────────── DÉBUT DIAG-R2 (lecture seule, annulée en fin de bloc) ──────────────
-- Paramètre : identifiant (id, PAS le token) d'un SPONSOR DE TEST.
-- Le token est lu en interne et n'est jamais affiché.
begin;
do $$
declare
  v_sponsor uuid := '00000000-0000-0000-0000-000000000000';  -- id du sponsor de test
  v_token uuid;
  v_nb integer;
begin
  if v_sponsor = '00000000-0000-0000-0000-000000000000' then
    raise exception 'DIAG-R2 : renseigner l''id du sponsor de test.';
  end if;
  select acces_token into v_token from public.sponsors where id = v_sponsor;
  if v_token is null then
    raise exception 'DIAG-R2 : sponsor de test introuvable.';
  end if;

  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
  begin
    select count(*) into v_nb from public.get_sponsor_by_token(v_token);
    raise notice 'DIAG-R2 : en tant qu''anon, get_sponsor_by_token renvoie % ligne(s) (1 attendue).', v_nb;
  exception when others then
    raise notice 'DIAG-R2 : en tant qu''anon, get_sponsor_by_token échoue : % (SQLSTATE %)', sqlerrm, sqlstate;
  end;
  begin
    perform count(*) from public.sponsors;
    raise notice 'DIAG-R2 : ANOMALIE — anon lit directement public.sponsors.';
  exception when insufficient_privilege then
    raise notice 'DIAG-R2 : lecture directe de sponsors refusée à anon (attendu).';
  end;
end;
$$;
rollback;
────────────── FIN DIAG-R2 ────────────── */

/* ────────────── DÉBUT CORR-R2a (copier à partir de la ligne suivante) ──────────────
-- Uniquement si DIAG-R2 renvoie 1 ligne (la base fonctionne) mais que le
-- portail échoue : demande à l'API de recharger son cache de schéma.
-- Ne modifie aucun droit, aucune policy, aucune donnée.
-- Transaction : NOTIFY n'est émis qu'au COMMIT, donc jamais si la
-- confirmation manque.
begin;
select set_config('secours.incident', 'A_REMPLACER', true);
do $$
begin
  if current_setting('secours.incident', true) is distinct from 'R2a' then
    raise exception 'CORR-R2a non confirmée : remplacer A_REMPLACER par R2a. Rien n''a été émis.';
  end if;
end;
$$;
notify pgrst, 'reload schema';
commit;
-- Contrôle après : test du portail en navigation privée (1 à 2 minutes).
────────────── FIN CORR-R2a ────────────── */


-- ═════════════════════════════════════════════════════════════════════════
-- R3. CLICS LÉGITIMES REFUSÉS
-- ═════════════════════════════════════════════════════════════════════════
-- Symptôme : un clic sur une bannière n'incrémente plus le compteur.
-- Causes possibles : utilisateur non reconnu comme membre par
--   sponsors_est_membre_club (affiliation non acceptée, chemin
--   d'appartenance non couvert) ; sponsor plus affiché en bandeau ;
--   droit INSERT perdu par authenticated.
-- Vérifications préalables : D0.1 (policy sponsor_clics_log_insert_membre
--   présente), D0.5 (authenticated_insert_clics = true), DIAG-R3 pour le
--   compte concerné.
-- Correction : CORR-R3 remplace la policy d'insertion par l'ancienne,
--   À L'IDENTIQUE (TO authenticated, WITH CHECK (auth.uid() IS NOT NULL)).
-- Effets : les clics sont de nouveau acceptés pour tout compte connecté.
-- Risques : statistiques de nouveau falsifiables (retour à l'état d'avant
--   la phase 2) ; aucune donnée exposée, aucun droit de lecture ajouté.
--   Mesure temporaire : corriger ensuite sponsors_clic_autorise et
--   rétablir la policy de la phase 2.
-- Contrôles après : D0.1, D0.5, un clic de test (compteur N → N+1).

/* ────────────── DÉBUT DIAG-R3 (lecture seule, annulée en fin de bloc) ──────────────
begin;
do $$
declare
  v_user uuid    := '00000000-0000-0000-0000-000000000000';  -- compte dont le clic est refusé
  v_club uuid    := '00000000-0000-0000-0000-000000000000';  -- club du bandeau
  v_sponsor uuid := '00000000-0000-0000-0000-000000000000';  -- sponsor cliqué
  v_affiche boolean;
  v_club_sponsor uuid;
begin
  if v_user = '00000000-0000-0000-0000-000000000000' or v_club = '00000000-0000-0000-0000-000000000000'
     or v_sponsor = '00000000-0000-0000-0000-000000000000' then
    raise exception 'DIAG-R3 : renseigner les trois identifiants.';
  end if;
  select afficher_bandeau, club_id into v_affiche, v_club_sponsor from public.sponsors where id = v_sponsor;
  raise notice 'DIAG-R3 : sponsor du club attendu = %, affiché en bandeau = %', v_club_sponsor = v_club, v_affiche;

  perform set_config('request.jwt.claims', json_build_object('sub', v_user, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  raise notice 'DIAG-R3 : membre du club = %, clic autorisé = %',
    public.sponsors_est_membre_club(v_club), public.sponsors_clic_autorise(v_sponsor, v_club);
end;
$$;
rollback;
────────────── FIN DIAG-R3 ────────────── */

/* ────────────── DÉBUT CORR-R3 (copier à partir de la ligne suivante) ──────────────
begin;
select set_config('secours.incident', 'A_REMPLACER', true);

do $$
begin
  if current_setting('secours.incident', true) is distinct from 'R3' then
    raise exception 'CORR-R3 non confirmée : remplacer A_REMPLACER par R3. Rien n''a été modifié.';
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sponsor_clics_log'
                 and policyname = 'sponsor_clics_log_insert_membre') then
    raise exception 'CORR-R3 : policy de la phase 2 absente — état inattendu, analyser. Rien n''a été modifié.';
  end if;
end;
$$;

drop policy if exists "sponsor_clics_log_insert_membre" on public.sponsor_clics_log;
drop policy if exists "sponsor_clics_log_insert" on public.sponsor_clics_log;
create policy "sponsor_clics_log_insert" on public.sponsor_clics_log
  for insert to authenticated
  with check (auth.uid() is not null);
grant insert on public.sponsor_clics_log to authenticated;

do $$
begin
  if has_table_privilege('anon', 'public.sponsor_clics_log', 'insert')
     or has_table_privilege('public', 'public.sponsor_clics_log', 'insert') then
    raise exception 'CORR-R3 : anon/PUBLIC peut insérer des clics — état anormal. Transaction annulée.';
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sponsor_clics_log'
             and cmd = 'INSERT' and policyname <> 'sponsor_clics_log_insert') then
    raise exception 'CORR-R3 : policy d''insertion inattendue. Transaction annulée.';
  end if;
  raise notice 'CORR-R3 appliquée : policy d''insertion des clics rétablie à l''identique (temporaire).';
end;
$$;

commit;
────────────── FIN CORR-R3 ────────────── */


-- ═════════════════════════════════════════════════════════════════════════
-- R4. CLUB OU STAFF NE VOIT / NE MODIFIE PLUS SES SPONSORS
-- ═════════════════════════════════════════════════════════════════════════
-- Symptôme : section Sponsors vide ou erreur d'enregistrement pour le
--   compte club ou un membre du staff.
-- Causes possibles (improbables : la phase 2 ne touche pas « Club manages
--   sponsors » et vérifie les droits d'authenticated) :
--   a) droit SELECT/INSERT/UPDATE/DELETE perdu par authenticated ;
--   b) policy « Club manages sponsors » absente ;
--   c) compte non rattaché au club (staff_club) — hors phase 2.
-- Vérifications préalables : D0.1, D0.5, DIAG-R4 pour le compte concerné.
-- Corrections :
--   - a) CORR-R4a : rétablir SELECT/INSERT/UPDATE/DELETE pour authenticated
--     SEULEMENT (état de référence ; la RLS reste seule juge des lignes) ;
--   - b) CORR-R4b : recréer « Club manages sponsors » À L'IDENTIQUE, si et
--     seulement si elle est absente ;
--   - c) pas de correction SQL : vérifier le rattachement du compte avec le
--     club (ne jamais créer de ligne staff_club depuis ce fichier).
-- Risques : aucun élargissement — retour exact à l'état de référence pour
--   le club et son staff.
-- Contrôles après : D0.1, D0.5, test de la section Sponsors avec le compte.

/* ────────────── DÉBUT DIAG-R4 (lecture seule, annulée en fin de bloc) ──────────────
begin;
do $$
declare
  v_user uuid := '00000000-0000-0000-0000-000000000000';  -- compte club ou staff concerné
  v_club uuid := '00000000-0000-0000-0000-000000000000';  -- club concerné
  v_staff boolean;
  v_nb integer;
begin
  if v_user = '00000000-0000-0000-0000-000000000000' or v_club = '00000000-0000-0000-0000-000000000000' then
    raise exception 'DIAG-R4 : renseigner les deux identifiants.';
  end if;
  select exists (select 1 from public.staff_club where club_id = v_club and user_id = v_user) into v_staff;
  raise notice 'DIAG-R4 : compte club = %, rattaché au staff = %', v_user = v_club, v_staff;

  perform set_config('request.jwt.claims', json_build_object('sub', v_user, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  select count(*) into v_nb from public.sponsors where club_id = v_club;
  raise notice 'DIAG-R4 : sponsors du club visibles par ce compte = %', v_nb;
end;
$$;
rollback;
────────────── FIN DIAG-R4 ────────────── */

/* ────────────── DÉBUT CORR-R4a (copier à partir de la ligne suivante) ──────────────
begin;
select set_config('secours.incident', 'A_REMPLACER', true);

do $$
begin
  if current_setting('secours.incident', true) is distinct from 'R4a' then
    raise exception 'CORR-R4a non confirmée : remplacer A_REMPLACER par R4a. Rien n''a été modifié.';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.sponsors'::regclass) then
    raise exception 'CORR-R4a : RLS désactivée sur sponsors — ne pas accorder de droits. Rien n''a été modifié.';
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sponsors'
             and (qual = 'true' or with_check = 'true'
                  or policyname in ('sponsors_all', 'sponsors_bandeau_select'))) then
    raise exception 'CORR-R4a : policy large présente sur sponsors — analyser. Rien n''a été modifié.';
  end if;
end;
$$;

grant select, insert, update, delete on public.sponsors to authenticated;

do $$
begin
  if has_table_privilege('anon', 'public.sponsors', 'select') or has_table_privilege('public', 'public.sponsors', 'select') then
    raise exception 'CORR-R4a : anon/PUBLIC a un droit sur sponsors. Transaction annulée.';
  end if;
  raise notice 'CORR-R4a appliquée : droits d''authenticated rétablis (lignes filtrées par la RLS).';
end;
$$;

commit;
────────────── FIN CORR-R4a ────────────── */

/* ────────────── DÉBUT CORR-R4b (copier à partir de la ligne suivante) ──────────────
begin;
select set_config('secours.incident', 'A_REMPLACER', true);

do $$
begin
  if current_setting('secours.incident', true) is distinct from 'R4b' then
    raise exception 'CORR-R4b non confirmée : remplacer A_REMPLACER par R4b. Rien n''a été modifié.';
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sponsors'
             and policyname = 'Club manages sponsors') then
    raise exception 'CORR-R4b : la policy existe déjà — la cause est ailleurs (voir DIAG-R4). Rien n''a été modifié.';
  end if;
end;
$$;

-- Définition identique à l'état de référence (diagnostic du 2026-10-18).
create policy "Club manages sponsors" on public.sponsors
  for all to public
  using (
    (club_id = auth.uid())
    or exists (
      select 1 from public.staff_club
      where staff_club.club_id = sponsors.club_id and staff_club.user_id = auth.uid()
    )
  );

do $$
begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sponsors'
             and (qual = 'true' or with_check = 'true')) then
    raise exception 'CORR-R4b : policy (true) détectée. Transaction annulée.';
  end if;
  raise notice 'CORR-R4b appliquée : « Club manages sponsors » recréée à l''identique.';
end;
$$;

commit;
────────────── FIN CORR-R4b ────────────── */


-- ═════════════════════════════════════════════════════════════════════════
-- R5. STATISTIQUES DE CLICS ILLISIBLES
-- ═════════════════════════════════════════════════════════════════════════
-- Symptôme : onglet Statistiques vide ou en erreur pour le club.
-- Causes possibles (improbables : la phase 2 ne touche pas la lecture) :
--   a) droit SELECT perdu par authenticated sur sponsor_clics_log ;
--   b) policy « sponsor_clics_log_select » absente.
-- Vérifications préalables : D0.1, D0.5.
-- Corrections : CORR-R5a (SELECT pour authenticated seulement) ;
--   CORR-R5b (policy recréée à l'identique, si absente).
-- Risques : aucun élargissement.
-- Contrôles après : D0.1, D0.5, onglet Statistiques du club.

/* ────────────── DÉBUT CORR-R5a (copier à partir de la ligne suivante) ──────────────
begin;
select set_config('secours.incident', 'A_REMPLACER', true);
do $$
begin
  if current_setting('secours.incident', true) is distinct from 'R5a' then
    raise exception 'CORR-R5a non confirmée : remplacer A_REMPLACER par R5a. Rien n''a été modifié.';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.sponsor_clics_log'::regclass) then
    raise exception 'CORR-R5a : RLS désactivée sur sponsor_clics_log. Rien n''a été modifié.';
  end if;
end;
$$;
grant select on public.sponsor_clics_log to authenticated;
do $$
begin
  if has_table_privilege('anon', 'public.sponsor_clics_log', 'select') then
    raise exception 'CORR-R5a : anon lit les clics. Transaction annulée.';
  end if;
  raise notice 'CORR-R5a appliquée.';
end;
$$;
commit;
────────────── FIN CORR-R5a ────────────── */

/* ────────────── DÉBUT CORR-R5b (copier à partir de la ligne suivante) ──────────────
begin;
select set_config('secours.incident', 'A_REMPLACER', true);
do $$
begin
  if current_setting('secours.incident', true) is distinct from 'R5b' then
    raise exception 'CORR-R5b non confirmée : remplacer A_REMPLACER par R5b. Rien n''a été modifié.';
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sponsor_clics_log'
             and policyname = 'sponsor_clics_log_select') then
    raise exception 'CORR-R5b : la policy existe déjà — la cause est ailleurs. Rien n''a été modifié.';
  end if;
end;
$$;
-- Définition identique à l'état de référence (diagnostic du 2026-10-18).
create policy "sponsor_clics_log_select" on public.sponsor_clics_log
  for select to authenticated
  using (
    (club_id = auth.uid())
    or exists (
      select 1 from public.staff_club sc
      where sc.club_id = sponsor_clics_log.club_id and sc.user_id = auth.uid()
    )
  );
do $$
begin
  raise notice 'CORR-R5b appliquée : « sponsor_clics_log_select » recréée à l''identique.';
end;
$$;
commit;
────────────── FIN CORR-R5b ────────────── */


-- ═════════════════════════════════════════════════════════════════════════
-- R6. BANDEAU VIDE
-- ═════════════════════════════════════════════════════════════════════════
-- Symptôme : le bandeau « Nos partenaires » n'apparaît plus sur un dashboard
--   où il apparaissait avant.
-- Causes possibles : la phase 2 ne modifie ni la RPC sponsors_bandeau ni
--   ses droits ; un bandeau vide viendrait d'un droit EXECUTE perdu, d'un
--   cache de schéma de l'API, d'un compte non reconnu comme membre, ou d'une
--   saison / d'un réglage afficher_bandeau du sponsor.
-- Vérifications préalables : D0.4 (authenticated_execute = true pour
--   sponsors_bandeau et sponsors_est_membre_club), DIAG-R6.
-- Corrections :
--   - droit perdu : CORR-R6 (EXECUTE pour authenticated SEULEMENT, jamais
--     pour anon) ;
--   - cache de schéma : CORR-R2a ;
--   - compte non membre ou réglage du sponsor : pas de correction SQL —
--     vérifier l'affiliation et le réglage dans l'interface du club.
-- Risques : aucun (le bandeau ne renvoie que 6 champs publics aux membres).
-- Contrôles après : D0.4, bandeau sur le dashboard concerné.

/* ────────────── DÉBUT DIAG-R6 (lecture seule, annulée en fin de bloc) ──────────────
begin;
do $$
declare
  v_user uuid := '00000000-0000-0000-0000-000000000000';  -- compte qui ne voit plus le bandeau
  v_club uuid := '00000000-0000-0000-0000-000000000000';  -- club du bandeau
  v_saison text := '2026-2027';                           -- saison affichée (saisonActuelle())
  v_nb integer;
begin
  if v_user = '00000000-0000-0000-0000-000000000000' or v_club = '00000000-0000-0000-0000-000000000000' then
    raise exception 'DIAG-R6 : renseigner les identifiants.';
  end if;
  select count(*) into v_nb from public.sponsors where club_id = v_club and saison = v_saison and afficher_bandeau;
  raise notice 'DIAG-R6 : sponsors du club affichés en bandeau pour la saison = %', v_nb;

  perform set_config('request.jwt.claims', json_build_object('sub', v_user, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  select count(*) into v_nb from public.sponsors_bandeau(v_club, v_saison);
  raise notice 'DIAG-R6 : membre = %, lignes renvoyées par la RPC = %', public.sponsors_est_membre_club(v_club), v_nb;
end;
$$;
rollback;
────────────── FIN DIAG-R6 ────────────── */

/* ────────────── DÉBUT CORR-R6 (copier à partir de la ligne suivante) ──────────────
begin;
select set_config('secours.incident', 'A_REMPLACER', true);
do $$
begin
  if current_setting('secours.incident', true) is distinct from 'R6' then
    raise exception 'CORR-R6 non confirmée : remplacer A_REMPLACER par R6. Rien n''a été modifié.';
  end if;
  if coalesce(obj_description('public.sponsors_bandeau(uuid, text)'::regprocedure, 'pg_proc'), '')
       not like 'digital-football:sponsors-phase1%' then
    raise exception 'CORR-R6 : sponsors_bandeau n''est pas la version de la phase 1 — analyser. Rien n''a été modifié.';
  end if;
end;
$$;
grant execute on function public.sponsors_bandeau(uuid, text) to authenticated;
grant execute on function public.sponsors_est_membre_club(uuid) to authenticated;
do $$
begin
  if has_function_privilege('anon', 'public.sponsors_bandeau(uuid, text)', 'execute') then
    raise exception 'CORR-R6 : anon peut exécuter sponsors_bandeau. Transaction annulée.';
  end if;
  raise notice 'CORR-R6 appliquée : EXECUTE rétabli pour authenticated.';
end;
$$;
commit;
────────────── FIN CORR-R6 ────────────── */


-- ═════════════════════════════════════════════════════════════════════════
-- R7. OUTIL EXTERNE INCONNU (CLÉ ANON) QUI NE FONCTIONNE PLUS
-- ═════════════════════════════════════════════════════════════════════════
-- Symptôme : un script, une intégration ou un outil hors de l'application
--   (absent du dépôt) cesse de lire ou d'écrire public.sponsors.
-- Cause : il utilisait l'accès anonyme ouvert par "sponsors_all", que la
--   phase 2 supprime volontairement.
-- Vérifications : journaux de l'API dans le tableau de bord Supabase
--   (requêtes anonymes sur /rest/v1/sponsors) ; identifier l'outil et son
--   propriétaire.
-- Correction : AUCUNE correction SQL. Ne pas rouvrir la table. Procédure :
--   1. identifier le besoin exact (champs, lecture ou écriture) ;
--   2. si le besoin est légitime, prévoir une fonction dédiée limitée aux
--      champs nécessaires, ou un traitement côté serveur (clé service),
--      après relecture de sécurité ;
--   3. en attendant, l'outil reste arrêté.
-- ═════════════════════════════════════════════════════════════════════════
