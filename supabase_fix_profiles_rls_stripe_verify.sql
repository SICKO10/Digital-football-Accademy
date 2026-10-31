-- Script de vérification v3 — à exécuter AVANT (état initial) puis APRÈS
-- (confirmation du correctif) supabase_fix_profiles_rls_stripe.sql +
-- supabase_fix_profiles_trigger_signup.sql + supabase_fix_profiles_public_view.sql.
-- 100% lecture seule, sans risque à exécuter à tout moment.

-- A. RLS doit être active après correctif (false → true)
select relrowsecurity, relforcerowsecurity
from pg_class
where relname = 'profiles' and relnamespace = 'public'::regnamespace;

-- B. Policies attendues après correctif : profiles_insert_own (INSERT),
--    profiles_update_own_or_delegated (UPDATE, 3 clauses OR),
--    profiles_select_own_or_delegated (SELECT, 4 clauses OR — ajoute
--    parents_acces). Les 2 anciennes policies SELECT (profiles_lecture_
--    educateur, "recherche club par code") ne doivent PLUS exister.
select polname, polcmd,
       pg_get_expr(polqual, polrelid) as using_expr,
       pg_get_expr(polwithcheck, polrelid) as check_expr
from pg_policy
where polrelid = 'public.profiles'::regclass
order by polname;

-- B2. Vue profiles_public : doit exister, colonnes sensibles absentes.
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'profiles_public'
order by column_name;
-- Vérifier manuellement : email, stripe_customer_id, stripe_subscription_id,
-- banni, motif_ban, analyses_restantes, parrain_id, code_club ABSENTS de
-- cette liste.

-- B3. anon/authenticated doivent avoir SELECT sur la vue.
select grantee, privilege_type from information_schema.role_table_grants
where table_name = 'profiles_public' and grantee in ('anon','authenticated');
-- Résultat attendu : SELECT pour les deux.

-- B4. Un profil banni ne doit jamais apparaître dans la vue (point 2).
-- (si aucun profil banni n'existe encore en base, cette requête renvoie 0
-- ligne des deux côtés — normal, pas un signe d'échec du test)
select p.id from public.profiles p where p.banni = true
except
select pp.id from public.profiles_public pp;
-- Résultat attendu : autant de lignes que de profils bannis en base (tous
-- "manquants" de la vue = correctement exclus).

-- B5. Index de support créés (performance des sous-requêtes, point 4).
select indexname from pg_indexes
where tablename in ('dirigeant_acces','parents_acces')
  and indexname in ('idx_dirigeant_acces_educateur_dirigeant','idx_parents_acces_joueur_parent');
-- Résultat attendu : les 2 lignes présentes.

-- C. Privilèges table : anon ne doit plus apparaître pour INSERT/UPDATE/
--    DELETE/TRUNCATE ; authenticated ne doit PLUS apparaître pour INSERT/
--    UPDATE/DELETE/TRUNCATE au niveau TABLE (affinés uniquement au niveau
--    colonne désormais — c'est le point 1 du correctif).
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'profiles'
  and grantee in ('anon', 'authenticated')
order by grantee, privilege_type;
-- Résultat attendu : anon → SELECT uniquement. authenticated → SELECT
-- uniquement au niveau table (INSERT/UPDATE existent SEULEMENT au niveau
-- colonne désormais, invisibles dans role_table_grants — voir test D/E).

-- D. Test direct des permissions EFFECTIVES (ce que le reviewer a demandé
--    explicitement : has_column_privilege, pas juste la présence d'un GRANT).
--    Exécuter en se connectant avec le rôle authenticated (ou via
--    `set role authenticated;` en session SQL si les permissions du compte
--    utilisé le permettent), sinon has_column_privilege('authenticated', ...)
--    donne le même résultat en tant qu'objet-cible explicite.

-- D1. Colonnes sensibles → doit retourner FALSE partout pour INSERT et UPDATE
select
  col,
  has_column_privilege('authenticated', 'public.profiles', col, 'insert') as peut_insert,
  has_column_privilege('authenticated', 'public.profiles', col, 'update') as peut_update
from unnest(array[
  'email','plan','plan_detail','abonnement_actif','abonnement_cycle',
  'abonnement_debut','abonnement_mois_payes','palier','quota_equipes',
  'stripe_customer_id','stripe_subscription_id','banni','motif_ban',
  'verified','educateurs_inclus','parrain_id'
]) as col;
-- Résultat attendu : peut_insert = false ET peut_update = false sur TOUTES
-- les lignes.

-- D2. `id` → insert autorisé, update interdit (clé primaire, jamais modifiable)
select
  has_column_privilege('authenticated', 'public.profiles', 'id', 'insert') as peut_insert, -- attendu: true
  has_column_privilege('authenticated', 'public.profiles', 'id', 'update') as peut_update;  -- attendu: false

-- D3. Colonnes sûres (échantillon) → doit retourner TRUE pour insert et update
select
  col,
  has_column_privilege('authenticated', 'public.profiles', col, 'insert') as peut_insert,
  has_column_privilege('authenticated', 'public.profiles', col, 'update') as peut_update
from unnest(array[
  'prenom','nom','avatar_url','club','region','description','poste',
  'analyses_restantes','code_club','couleur_principale'
]) as col;
-- Résultat attendu : true partout.

-- D4. Même tests pour `anon` → tout doit être FALSE (aucun privilège d'écriture)
select
  has_table_privilege('anon', 'public.profiles', 'insert') as peut_insert_table,
  has_table_privilege('anon', 'public.profiles', 'update') as peut_update_table,
  has_table_privilege('anon', 'public.profiles', 'delete') as peut_delete_table,
  has_table_privilege('anon', 'public.profiles', 'truncate') as peut_truncate_table,
  has_table_privilege('anon', 'public.profiles', 'select') as peut_select_table;
-- Résultat attendu : tout false SAUF peut_select_table = true (nécessaire
-- pour ClubPublic.jsx et la recherche club par code, toutes deux accessibles
-- sans compte).

-- E. service_role doit rester intact (sinon le webhook Stripe casse).
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'profiles' and grantee = 'service_role'
order by privilege_type;
-- Résultat attendu : identique à avant (7 lignes, DELETE/INSERT/REFERENCES/
-- SELECT/TRIGGER/TRUNCATE/UPDATE) — service_role ignore RLS et les GRANT/
-- REVOKE de ce correctif ne le ciblent jamais.

-- F. Vérifie que handle_new_user() a bien été mis à jour (si
--    supabase_fix_profiles_trigger_signup.sql a aussi été exécuté).
select prosecdef, pg_get_functiondef(oid) as def
from pg_proc where proname = 'handle_new_user';
-- Vérifier manuellement que la définition contient bien
-- "v_plans_valides", "v_plans_gratuits" et "parrain_id".

-- F2. Vérifie increment_analyses : doit être SECURITY DEFINER (prosecdef =
--     true) ET contenir la vérification d'autorisation interne.
select prosecdef, proconfig, pg_get_functiondef(oid) as def
from pg_proc where proname = 'increment_analyses';
-- Vérifier manuellement : prosecdef = true, proconfig contient
-- "search_path=public", et la définition contient bien "admins_coach",
-- "parrainage_recompenses" et la borne "delta > 5".

-- F3. EXECUTE sur increment_analyses — anon et PUBLIC ne doivent PLUS
--     apparaître, authenticated et service_role doivent rester.
select grantee, privilege_type
from information_schema.role_routine_grants
where routine_name = 'increment_analyses'
order by grantee;
-- Résultat attendu : uniquement authenticated et service_role (postgres,
-- propriétaire de la fonction, peut aussi apparaître — normal).

-- F4. admins_coach : doit contenir exactement les 2 admins actuels, RLS
--     active, aucun privilège pour anon/authenticated.
select user_id from public.admins_coach order by user_id;
select relrowsecurity from pg_class where relname = 'admins_coach';
select grantee, privilege_type
from information_schema.role_table_grants
where table_name = 'admins_coach' and grantee in ('anon', 'authenticated');
-- Résultat attendu : la 1ère renvoie 2 lignes (les UUID de legacyattitude@
-- et januariojimmy@), la 2ème true, la 3ème AUCUNE ligne.

-- F5. Tests comportementaux directs (point 5 de la demande de validation) —
--     simule un VRAI appel authentifié non-admin via l'astuce standard
--     Supabase (set role + request.jwt.claims, dans une transaction annulée
--     par ROLLBACK donc sans aucun effet persistant même si le test échoue
--     à détecter un problème). À exécuter depuis une connexion disposant du
--     privilège de changer de rôle (ex. SQL Editor du dashboard Supabase ou
--     un compte postgres direct — la CLI `supabase db query --linked` peut
--     ne pas avoir ce privilège selon la connexion utilisée, à vérifier).

begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","email":"non-admin-test@example.com","role":"authenticated"}';

  -- F5a. Un compte authentifié quelconque (pas dans admins_coach, pas
  --      service_role) tentant de créditer N'IMPORTE QUEL profil doit
  --      échouer avec "Non autorisé".
  select public.increment_analyses(
    (select id from public.profiles limit 1),
    2
  );
  -- Résultat attendu : ERREUR "Non autorisé" (la requête ci-dessus ne doit
  -- jamais atteindre le UPDATE).
rollback;

begin;
  -- F5b. Même un admin (reconnu par admins_coach) tentant de créditer un
  --      profil qui n'a AUCUNE récompense palier 3 enregistrée doit échouer.
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"dcbdeaef-a2cb-4869-918f-c2282475c5ea","email":"legacyattitude@gmail.com","role":"authenticated"}';
  select public.increment_analyses(
    (select id from public.profiles where id not in (select parrain_id from public.parrainage_recompenses where palier = 3) limit 1),
    2
  );
  -- Résultat attendu : ERREUR "Aucune récompense de parrainage palier 3
  -- enregistrée pour ce profil".
rollback;

begin;
  -- F5c. Même un admin légitime créditant un vrai bénéficiaire palier 3 doit
  --      échouer si delta sort des bornes [1,5].
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"dcbdeaef-a2cb-4869-918f-c2282475c5ea","email":"legacyattitude@gmail.com","role":"authenticated"}';
  select public.increment_analyses(
    (select parrain_id from public.parrainage_recompenses where palier = 3 limit 1),
    999
  );
  -- Résultat attendu : ERREUR "Montant de crédit invalide". Si aucune ligne
  -- parrainage_recompenses palier=3 n'existe encore en base, ce test n'a
  -- rien à cibler — remplacer le sous-select par un id de test si besoin.
rollback;

-- F5d. Point 2 de la demande du 2026-10-10 — profile_id inexistant : même en
--      service_role (donc en contournant la vérification admin/parrainage),
--      le crédit doit échouer proprement plutôt que réussir silencieusement
--      sans rien avoir modifié.
begin;
  set local role service_role;
  select public.increment_analyses('00000000-0000-0000-0000-000000000099', 2);
  -- Résultat attendu : ERREUR "Profil introuvable, crédit non appliqué".
rollback;

-- F6. Complément navigateur (après déploiement, pas avant) : se connecter
--     dans l'app avec un compte non-admin, ouvrir la console et exécuter
--     `await supabase.rpc('increment_analyses', { profile_id: '<un id
--     quelconque>', delta: 2 })` → doit renvoyer une erreur, jamais un
--     succès silencieux.

-- F7. Double-crédit (priorité 2) : un 2e appel pour le MÊME bénéficiaire déjà
--     crédité doit échouer, même en appel séquentiel (le vrai test de
--     concurrence — deux appels strictement simultanés — nécessite deux
--     connexions séparées exécutées en parallèle, pas simulable proprement
--     dans un seul script séquentiel ; ce test couvre au moins la séquence
--     a→b, le cas concurrent étant protégé par le verrou de ligne Postgres
--     sur l'UPDATE ... WHERE analyses_creditees = false, cf. commentaire
--     dans supabase_fix_profiles_trigger_signup.sql).
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"dcbdeaef-a2cb-4869-918f-c2282475c5ea","email":"legacyattitude@gmail.com","role":"authenticated"}';
  -- 1er appel sur un bénéficiaire réel palier 3 : doit réussir.
  select public.increment_analyses(
    (select parrain_id from public.parrainage_recompenses where palier = 3 and analyses_creditees = false limit 1),
    2
  );
  -- 2e appel, même bénéficiaire : doit échouer "en attente de crédit".
  select public.increment_analyses(
    (select parrain_id from public.parrainage_recompenses where palier = 3 limit 1),
    2
  );
rollback;

-- F8. Point 8 de la demande — manipulation DIRECTE de parrainage_recompenses
--     (hors increment_analyses) par un compte non-admin : doit échouer à
--     chaque opération, RLS déjà en place sur cette table (policy
--     coach_parrainage_recompenses, vérifiée restreinte aux 2 emails admin).
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000003","email":"non-admin@example.com","role":"authenticated"}';
  -- F8a. INSERT direct d'une fausse récompense : doit affecter 0 ligne
  -- (RLS filtre silencieusement, pas d'erreur SQL — à vérifier via le count
  -- avant/après plutôt qu'une erreur attendue).
  insert into public.parrainage_recompenses (parrain_id, palier, accorde_par)
  values ('00000000-0000-0000-0000-000000000003', 3, '00000000-0000-0000-0000-000000000003');
  select count(*) from public.parrainage_recompenses where parrain_id = '00000000-0000-0000-0000-000000000003';
  -- Résultat attendu : 0 (l'insert n'a rien inséré de visible/persisté pour
  -- ce rôle — RLS bloque le WITH CHECK implicite de la policy ALL).
rollback;

begin;
  -- F8b. UPDATE direct de analyses_creditees (contournement potentiel du
  --      claim atomique en passant par la table plutôt que la fonction) :
  --      doit affecter 0 ligne pour un non-admin.
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000003","email":"non-admin@example.com","role":"authenticated"}';
  update public.parrainage_recompenses set analyses_creditees = false where palier = 3;
  -- Résultat attendu : "UPDATE 0" (aucune ligne affectée).
rollback;

-- NOTE — bug pré-existant trouvé en auditant parrainage_recompenses, sans
-- rapport avec ce correctif mais à connaître : la CHECK constraint
-- parrainage_recompenses_palier_check n'autorise que palier IN (3, 6, 9),
-- alors que Referrals.jsx (accorder()) insère palier = 1, 2 ou 3 (les clés
-- de PALIER_SEUIL, pas les seuils eux-mêmes). En l'état, cliquer "Accorder
-- palier 1" ou "Accorder palier 2" échoue aujourd'hui avec une violation de
-- contrainte (jamais déclenché en pratique : 0 ligne en base, aucun parrain
-- n'a encore atteint un seuil). Seul palier 3 fonctionne. Hors périmètre de
-- ce correctif sécurité — signalé pour action séparée si souhaité.

-- ──────────────────────────────────────────────────────────────────────────
-- TESTS DE NON-RÉGRESSION (point 7) — relations réelles trouvées en base au
-- 2026-10-10, à adapter si elles ont changé d'ici l'exécution. Chaque bloc
-- dans sa propre transaction annulée par ROLLBACK, aucun effet persistant.

-- T1. Profil PUBLIC (vue) : un visiteur quelconque doit voir les joueurs pro
--     actifs, sans email ni stripe_customer_id (colonnes absentes de la vue,
--     pas juste vides).
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","email":"visiteur@example.com","role":"authenticated"}';
  select count(*) from public.profiles_public where plan = 'joueur_pro' and abonnement_actif = true;
  -- Résultat attendu : >= 0, aucune erreur (confirme l'accès à la vue).
rollback;

-- T2. Profil PRIVÉ (table de base) : ce même visiteur quelconque ne doit
--     RIEN voir sur un profil qui n'est pas le sien.
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","email":"visiteur@example.com","role":"authenticated"}';
  select count(*) from public.profiles where id = '9f30757b-0125-4206-8218-22d8743d9029';
  -- Résultat attendu : 0 (l'éducateur 9f30757b n'est ni le visiteur, ni lié
  -- à lui par staff_club/dirigeant_acces/parents_acces).
rollback;

-- T3. Accès STAFF club : staff_club réel (user_id=9f30757b...) doit voir le
--     profil complet du club (club_id=af8db5d3...), lui NON délégué.
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"9f30757b-0125-4206-8218-22d8743d9029","email":"staff-test@example.com","role":"authenticated"}';
  select count(*) from public.profiles where id = 'af8db5d3-ea32-4d9b-b5bf-fb6062505826';
  -- Résultat attendu : 1.
rollback;

-- T4. Accès DIRIGEANT délégué : dirigeant_id=c2cc6512... (statut accepte)
--     doit voir le profil complet de l'éducateur délégant (9f30757b...).
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"c2cc6512-a1ad-4389-bf87-c4468a43b932","email":"dirigeant-test@example.com","role":"authenticated"}';
  select count(*) from public.profiles where id = '9f30757b-0125-4206-8218-22d8743d9029';
  -- Résultat attendu : 1.
rollback;

-- T5. Accès PARENT délégué : parent_id=d248324b... (statut accepte) doit
--     voir le profil complet du joueur délégant (147846d3...).
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"d248324b-5d04-4fec-abf2-e3c71936aa07","email":"parent-test@example.com","role":"authenticated"}';
  select count(*) from public.profiles where id = '147846d3-71e6-4c35-a84e-21084a9ea20a';
  -- Résultat attendu : 1.
rollback;

-- T6. RECRUTEUR : doit lire son propre profil complet via la table de base,
--     et parcourir les joueurs pro via la vue — jamais l'inverse.
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000002","email":"recruteur-test@example.com","role":"authenticated"}';
  -- Techniquement ce visiteur de test n'a pas de ligne profiles réelle, donc
  -- 0 est attendu ici aussi — à rejouer avec un vrai id de compte recruteur
  -- pour une vérification complète en conditions réelles.
  select count(*) from public.profiles where id = '00000000-0000-0000-0000-000000000002';
rollback;

-- T7. CLUB : doit lire son propre profil complet (déjà couvert par T3, côté
--     club lui-même plutôt que staff — remplacer l'id par un vrai compte
--     club pour test complet).

-- G. Checklist fonctionnelle à tester manuellement dans l'app après
--    correctif (aucune requête SQL ne peut le garantir à 100%) :
--    1. Inscription joueur_starter (gratuit) → abonnement_actif doit être
--       true IMMÉDIATEMENT après inscription (sans paiement)
--    2. Inscription joueur_pro/éducateur/recruteur/club (payant) →
--       abonnement_actif doit rester false jusqu'au paiement Stripe
--    2bis. Point 3 de la demande du 2026-10-10 — tentative explicite de
--       contournement via metadata forgées (hors UI, appel direct à l'API
--       Auth) :
--         curl -X POST 'https://ogxladkyvcnhwctyiknu.supabase.co/auth/v1/signup' \
--           -H "apikey: <clé anon publique>" -H "Content-Type: application/json" \
--           -d '{"email":"test-fraude@example.com","password":"motdepasse123","data":{"plan":"club"}}'
--       Puis vérifier en base : `select plan, abonnement_actif from profiles
--       where email = 'test-fraude@example.com';` → attendu : plan='club'
--       (valeur acceptée, dans v_plans_valides) MAIS abonnement_actif=false
--       (pas dans v_plans_gratuits). Confirmé par ailleurs dans le code que
--       les 4 dashboards gatent TOUS sur abonnement_actif (jamais sur plan
--       seul) — DashboardClub.jsx, DashboardEducateur.jsx,
--       DashboardRecruteur.jsx : `if (!x?.abonnement_actif)`, DashboardJoueur.jsx :
--       `isPro = profil?.plan === 'joueur_pro' && !!profil?.abonnement_actif`
--       — donc même avec plan='club' forgé, aucun accès premium réel.
--    3. Inscription avec un lien de parrainage (?ref=...) → parrain_id doit
--       être correctement enregistré (si le changement JS #1 a été appliqué)
--    4. Connexion + modification du profil (nom, prénom, avatar) — compte
--       standard ET compte payant déjà actif (vérifie que le blocage
--       plan/abonnement_actif ne gêne pas une simple édition de profil)
--    5. Club : édition du profil club par le compte club lui-même, PUIS par
--       un membre staff_club (2ème compte) — les deux doivent fonctionner
--    6. Éducateur : édition du profil éducateur délégué par un dirigeant
--       (dirigeant_acces.statut = 'accepte')
--    7. Acceptation d'invitation via lien magique (3 cas : staff club,
--       dirigeant, joueur) — src/pages/AcceptInvite.jsx chemin A
--    8. Acceptation d'invitation via /accept-invite?code=... — chemin B
--    9. Paiement Stripe test → abonnement_actif doit bien passer à true
--       (webhook, service_role)
--    10. Bouton "Résilier mon abonnement" (joueur/éducateur/club/recruteur)
--    11. Upload clip vidéo (analyses_restantes, volontairement non protégé
--        ce tour-ci)
--    12. Panneau coach/admin (/coach, compte COACH_ADMIN_EMAILS) → onglet
--        Parrainage → créditer manuellement un parrain (increment_analyses)
--    13. Vérifier qu'un compte authentifié NON admin ne peut PAS appeler
--        increment_analyses directement (ex. console navigateur :
--        supabase.rpc('increment_analyses', { profile_id: '<un autre id>',
--        delta: 999 })) → doit renvoyer une erreur "Non autorisé"
