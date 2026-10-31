-- Script B — sécurisation de public.staff_club et public.club_educateurs.
-- Demande de validation du 2026-10-14, ordre A → C → B (ce fichier est B,
-- le dernier des trois, après supabase_fix_profiles_trigger_signup.sql (A)
-- et supabase_fix_profiles_public_view.sql + supabase_fix_profiles_rls_stripe.sql (C)).
--
-- ⚠ LIMITE HONNÊTE, À LIRE AVANT TOUTE AUTRE CHOSE : contrairement à profiles/
-- messages/demandes (entièrement recréées dans ce repo au fil des correctifs
-- précédents), staff_club et club_educateurs ont été créées DIRECTEMENT dans
-- Supabase — leur CREATE TABLE et la plupart de leurs policies ne sont commités
-- nulle part dans ce dépôt. Je connais seulement :
--   - club_educateurs : RLS activée + 2 policies SELECT (club_educateurs_select_
--     club_own, club_educateurs_select_educateur_own) via
--     supabase_club_educateurs_rls.sql, déjà committé. AUCUNE policy INSERT/
--     UPDATE/DELETE n'a jamais été committée pour cette table.
--   - staff_club : au moins 2 policies existantes mentionnées en commentaire
--     dans supabase_staff_club_delegation.sql (club_manage_staff, club_voit_
--     son_staff), jamais committées elles-mêmes — je n'ai vu que leur nom et
--     leur intention résumée, pas leur définition exacte (USING/WITH CHECK).
--
-- Je ne peux donc PAS garantir que les requêtes DIAGNOSTIC ci-dessous décrivent
-- exactement l'état actuel sans que tu les exécutes et compares. Exécute
-- D'ABORD la section DIAGNOSTIC (100% lecture seule, zéro risque), compare le
-- résultat à ce qui est supposé ci-dessus, PUIS seulement decide d'exécuter le
-- reste. Les policies ajoutées plus bas sont écrites pour être additives
-- (nommées explicitement, combinées en OR avec l'existant, cf. principe déjà
-- utilisé pour club_educateurs_select_educateur_own) — elles ne retirent rien
-- à ce qui fonctionne déjà, quel que soit l'état réel trouvé.
--
-- NE PAS EXÉCUTER SANS VALIDATION EXPLICITE.

-- ════════════════════════════════════════════════════════════════════════
-- DIAGNOSTIC — 100% lecture seule, exécutable à tout moment sans risque.
-- Fournis-moi le résultat avant que j'affine quoi que ce soit ci-dessous.
-- ════════════════════════════════════════════════════════════════════════

select relname, relrowsecurity, relforcerowsecurity
from pg_class
where relname in ('staff_club', 'club_educateurs') and relnamespace = 'public'::regnamespace;

select tablename, policyname, cmd,
       pg_get_expr(qual, (schemaname || '.' || tablename)::regclass) as using_expr,
       pg_get_expr(with_check, (schemaname || '.' || tablename)::regclass) as check_expr
from pg_policies
where tablename in ('staff_club', 'club_educateurs')
order by tablename, policyname;

select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name in ('staff_club', 'club_educateurs')
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

-- ════════════════════════════════════════════════════════════════════════
-- ANALYSE DES PARCOURS APPLICATIFS (point 1/2 de la demande) — vérifié par
-- grep exhaustif sur src/, résumé ici pour référence pendant la revue.
-- ════════════════════════════════════════════════════════════════════════
--
-- club_educateurs — ÉCRITURES réelles (4 sites, tous dans DashboardClub.jsx
-- sauf le 1er) :
--   1. DashboardEducateur.jsx:2666 — l'éducateur s'auto-insère en 'en_attente'
--      après avoir saisi un code club (educateur_id = auth.uid()).
--   2. DashboardClub.jsx:2997 — le club invite un éducateur existant par
--      recherche (club_id = auth.uid(), statut='en_attente', methode='invite').
--   3. DashboardClub.jsx:3074 — le club accepte une demande (statut→'accepte').
--   4. DashboardClub.jsx:3061 — le club retire une affiliation (delete).
--   5. DashboardClub.jsx:1973 — le club modifie les droits délégués
--      (peut_editer_projet_sportif, peut_editer_planification).
-- Aucun autre site n'écrit dans cette table (grep exhaustif .insert/.update/
-- .delete/.upsert sur 'club_educateurs' dans tout src/).
--
-- club_educateurs — LECTURES au-delà de club_own/educateur_own (point
-- important pour NE PAS casser en touchant SELECT, raison pour laquelle ce
-- script n'y touche pas) : App.jsx (soi-même, couvert), PlanningTerrains.jsx,
-- TournoiClub.jsx, Newsletter.jsx (roster complet d'un club, scope club_id),
-- ClubPublic.jsx (soi-même, couvert), DashboardJoueur.jsx:1128 (un joueur
-- résout le club_id de SON éducateur — ni club_id ni educateur_id de cette
-- ligne n'est le joueur lui-même), coach/Viewers.jsx (panneau admin coach).
-- Ces 2 derniers cas ne peuvent PAS fonctionner avec seulement les 2 policies
-- SELECT committées (club_own OR educateur_own) — soit une policy SELECT
-- supplémentaire existe déjà en base sans être committée, soit RLS n'est pas
-- strictement active aujourd'hui. Je ne touche donc PAS à SELECT dans ce
-- script : le risque de casser un de ces parcours en le remplaçant sans
-- connaître l'état réel est trop élevé. Si le DIAGNOSTIC plus haut montre
-- qu'aucune autre policy SELECT n'existe, dis-le-moi : il faudra une policy
-- supplémentaire (ex. lecture des lignes statut='accepte' par tout
-- utilisateur authentifié, données non sensibles) avant de resserrer quoi
-- que ce soit côté lecture — hors périmètre de ce fichier tel qu'il est.
--
-- staff_club — écritures réelles (4 sites) :
--   1. AcceptInvite.jsx:172 — l'invité s'auto-insère après avoir accepté un
--      lien magique (user_id = auth.uid(), club_id/role tirés de
--      user.user_metadata).
--   2. DashboardClub.jsx:2520 — le club ajoute directement un membre
--      existant (sans invitation — recherche par nom/email).
--   3. DashboardClub.jsx:2545 — modification du rôle d'un membre.
--   4. DashboardClub.jsx:2551 — retrait d'un membre.
--
-- ────────────────────────────────────────────────────────────────────────
-- ⚠ DÉCOUVERTE SÉRIEUSE, HORS PÉRIMÈTRE DE CE SCRIPT — à décider séparément.
-- ────────────────────────────────────────────────────────────────────────
-- AcceptInvite.jsx:172 fait confiance à `session.user.user_metadata.club_id`
-- et `.role_invite` pour décider dans QUEL club et avec QUEL rôle insérer
-- l'utilisateur. Or `user_metadata` (par opposition à `app_metadata`) est
-- modifiable par le client lui-même via `supabase.auth.updateUser({data:{...}})`
-- — exactement le même type de donnée que `raw_user_meta_data.plan`, déjà
-- jugée non fiable et corrigée côté trigger profiles dans
-- supabase_fix_profiles_trigger_signup.sql. Vérifié : inviter-staff
-- (supabase/functions/inviter-staff/index.ts:46-48) écrit club_id/role_invite
-- via `data:` (= user_metadata) dans inviteUserByEmail(), jamais via
-- app_metadata. Donc, EN THÉORIE, un utilisateur authentifié quelconque
-- pourrait forger `club_id`/`role_invite` dans ses propres metadata avant
-- d'accepter N'IMPORTE QUEL lien magique (même un lien déjà consommé
-- légitimement pour autre chose) et se faire insérer dans staff_club pour un
-- club et un rôle arbitraires — SI la policy INSERT réelle de staff_club se
-- contente de `user_id = auth.uid()` sans vérifier qu'une invitation réelle
-- existe. Je ne peux pas confirmer si c'est le cas en base aujourd'hui (policy
-- non committée), et je n'ajoute donc AUCUNE policy INSERT touchant ce
-- parcours dans ce script — l'ajouter avec seulement `user_id = auth.uid()`
-- formaliserait potentiellement ce trou plutôt que de le fermer.
-- Remédiation correcte (à valider séparément, hors ce script) :
--   1. Modifier inviter-staff pour écrire club_id/role_invite dans
--      app_metadata (non modifiable côté client) plutôt que user_metadata —
--      nécessite `supabaseAdmin.auth.admin.updateUserById(userId, { app_metadata: {...} })`
--      après l'invite, l'API inviteUserByEmail ne prenant que `data` (user_metadata)
--      en une seule étape.
--   2. Adapter AcceptInvite.jsx pour lire `session.user.app_metadata` au lieu
--      de `user_metadata` pour club_id/role_invite.
--   3. Alors seulement, une policy INSERT `user_id = auth.uid()` devient sûre
--      (app_metadata, injecté dans le JWT, n'est jamais falsifiable côté client).
-- Signalé maintenant pour que tu ne l'apprennes pas par accident — à traiter
-- comme une décision séparée, pas bloquante pour le reste de ce script.

-- ════════════════════════════════════════════════════════════════════════
-- SCRIPT — CLUB_EDUCATEURS (sûr : policies additives + colonnes nouvelles
-- uniquement, SELECT non touché)
-- ════════════════════════════════════════════════════════════════════════

begin;

-- INSERT 1/2 — l'éducateur crée SA PROPRE demande, toujours à l'état neutre
-- 'en_attente' (jamais pré-acceptée), jamais les droits délégués (absents du
-- WITH CHECK de toute façon car non couverts par le GRANT colonne ci-dessous).
drop policy if exists "club_educateurs_insert_educateur_own" on public.club_educateurs;
create policy "club_educateurs_insert_educateur_own" on public.club_educateurs
  for insert to authenticated
  with check (educateur_id = auth.uid() and statut = 'en_attente');

-- INSERT 2/2 — le club crée une ligne d'invitation pour SON PROPRE club_id
-- uniquement (jamais au nom d'un autre club), état neutre également.
drop policy if exists "club_educateurs_insert_club_own" on public.club_educateurs;
create policy "club_educateurs_insert_club_own" on public.club_educateurs
  for insert to authenticated
  with check (club_id = auth.uid() and statut = 'en_attente');

-- UPDATE — réservé au club propriétaire de l'affiliation. Couvre à la fois
-- l'acceptation (statut→'accepte') et la modification des droits délégués :
-- aucun autre acteur (educateur_id) n'a de parcours UPDATE légitime
-- aujourd'hui (vérifié par grep, 0 appel .update() hors DashboardClub.jsx).
drop policy if exists "club_educateurs_update_club_own" on public.club_educateurs;
create policy "club_educateurs_update_club_own" on public.club_educateurs
  for update to authenticated
  using (club_id = auth.uid())
  with check (club_id = auth.uid());

-- DELETE — réservé au club propriétaire (retrait d'affiliation).
drop policy if exists "club_educateurs_delete_club_own" on public.club_educateurs;
create policy "club_educateurs_delete_club_own" on public.club_educateurs
  for delete to authenticated
  using (club_id = auth.uid());

-- GRANT colonne — même logique de défense en profondeur que profiles/demandes :
-- même si une policy était un jour mal écrite, impossible d'écrire club_id/
-- educateur_id/methode après création, ou les droits délégués autrement que
-- via l'UPDATE club (jamais à l'insertion).
revoke insert, update on public.club_educateurs from authenticated;
grant insert (club_id, educateur_id, statut, methode) on public.club_educateurs to authenticated;
grant update (statut, peut_editer_projet_sportif, peut_editer_planification) on public.club_educateurs to authenticated;

-- anon : aucun cas d'usage légitime trouvé (grep exhaustif) — écriture et
-- lecture retirées explicitement (la lecture publique de ClubPublic.jsx ne
-- lit que SA PROPRE ligne via un utilisateur authentifié, jamais anon).
revoke all on public.club_educateurs from anon;

-- Personne n'a de cas d'usage légitime de TRUNCATE.
revoke truncate on public.club_educateurs from authenticated;

commit;

-- ════════════════════════════════════════════════════════════════════════
-- SCRIPT — STAFF_CLUB
-- ════════════════════════════════════════════════════════════════════════
--
-- 1. Active la délégation déjà rédigée et revue séparément dans
--    supabase_staff_club_delegation.sql (non répétée ici — exécuter ce
--    fichier séparé dans la même fenêtre si tu valides aussi ce point).
--    Rappel de son effet : un rôle avec can_edit sur la section 'staff' peut
--    gérer staff_club sans être le compte club lui-même.
--
-- 2. Colonne-grant uniquement ici (sûr, indépendant de la découverte
--    ci-dessus) : `role` est la seule colonne jamais écrite après création
--    (modifierRoleStaff) en dehors de l'insert initial (club_id/user_id/role).
--    AUCUNE policy INSERT nouvelle ajoutée pour le parcours self-accept
--    (AcceptInvite.jsx) — cf. découverte ci-dessus, décision séparée requise.
begin;

revoke insert, update on public.staff_club from authenticated;
grant insert (club_id, user_id, role) on public.staff_club to authenticated;
grant update (role) on public.staff_club to authenticated;

revoke truncate on public.staff_club from authenticated;
revoke all on public.staff_club from anon;

commit;

-- ════════════════════════════════════════════════════════════════════════
-- TESTS (point 5 de la demande) — fixtures réelles (mêmes ids déjà vérifiés
-- existants, réutilisés depuis supabase_fix_messages_demandes_rls.sql pour
-- cohérence), chaque bloc dans sa propre transaction annulée.
--   PROFIL_A 9f30757b-0125-4206-8218-22d8743d9029
--   PROFIL_B b35afa2e-1fd7-463a-81ca-fc9a18578a35
--   PROFIL_C 0e05563e-ea20-4d4a-908f-3fe0867d5932
-- ════════════════════════════════════════════════════════════════════════

-- T1. Un éducateur peut créer sa propre demande 'en_attente', pas une demande
--     pré-acceptée, pas pour un autre educateur_id.
begin;
  do $$
  declare v_err text;
  begin
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', '{"sub":"9f30757b-0125-4206-8218-22d8743d9029","role":"authenticated"}', true);

    insert into public.club_educateurs (club_id, educateur_id, statut, methode)
    values ('b35afa2e-1fd7-463a-81ca-fc9a18578a35', '9f30757b-0125-4206-8218-22d8743d9029', 'en_attente', 'code');
    if (select count(*) from public.club_educateurs where educateur_id = '9f30757b-0125-4206-8218-22d8743d9029' and methode = 'code') <> 1 then
      raise exception 'ECHEC T1a : insertion légitime refusée';
    end if;

    begin
      insert into public.club_educateurs (club_id, educateur_id, statut, methode)
      values ('0e05563e-ea20-4d4a-908f-3fe0867d5932', '9f30757b-0125-4206-8218-22d8743d9029', 'accepte', 'code');
      raise exception 'ECHEC T1b : auto-acceptation à la création aurait dû être refusée';
    exception when others then
      v_err := sqlerrm;
      if v_err !~* 'row-level security|policy' then raise exception 'ECHEC T1b : erreur inattendue (%)', v_err; end if;
    end;
    raise notice 'T1 OK';
  end;
  $$;
rollback;

-- T2. Le club ne peut insérer que pour SON PROPRE club_id, jamais pour un autre.
begin;
  do $$
  declare v_err text;
  begin
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', '{"sub":"b35afa2e-1fd7-463a-81ca-fc9a18578a35","role":"authenticated"}', true);

    insert into public.club_educateurs (club_id, educateur_id, statut, methode)
    values ('b35afa2e-1fd7-463a-81ca-fc9a18578a35', '9f30757b-0125-4206-8218-22d8743d9029', 'en_attente', 'invite');
    if (select count(*) from public.club_educateurs where club_id = 'b35afa2e-1fd7-463a-81ca-fc9a18578a35' and methode = 'invite') <> 1 then
      raise exception 'ECHEC T2a : insertion club légitime refusée';
    end if;

    begin
      insert into public.club_educateurs (club_id, educateur_id, statut, methode)
      values ('0e05563e-ea20-4d4a-908f-3fe0867d5932', '9f30757b-0125-4206-8218-22d8743d9029', 'en_attente', 'invite');
      raise exception 'ECHEC T2b : insertion au nom d''un autre club aurait dû être refusée';
    exception when others then
      v_err := sqlerrm;
      if v_err !~* 'row-level security|policy' then raise exception 'ECHEC T2b : erreur inattendue (%)', v_err; end if;
    end;
    raise notice 'T2 OK';
  end;
  $$;
rollback;

-- T3. Seul le club propriétaire peut UPDATE/DELETE sa ligne ; un tiers non
--     plus.
begin;
  set local role service_role;
  insert into public.club_educateurs (id, club_id, educateur_id, statut, methode)
  values ('00000000-0000-0000-0000-0000000000b1', 'b35afa2e-1fd7-463a-81ca-fc9a18578a35', '9f30757b-0125-4206-8218-22d8743d9029', 'en_attente', 'invite');

  do $$
  begin
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', '{"sub":"0e05563e-ea20-4d4a-908f-3fe0867d5932","role":"authenticated"}', true);
    update public.club_educateurs set statut = 'accepte' where id = '00000000-0000-0000-0000-0000000000b1';
    if (select statut from public.club_educateurs where id = '00000000-0000-0000-0000-0000000000b1') <> 'en_attente' then
      raise exception 'ECHEC T3a : un tiers a pu modifier une affiliation qui ne lui appartient pas';
    end if;
  end;
  $$;

  do $$
  begin
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', '{"sub":"b35afa2e-1fd7-463a-81ca-fc9a18578a35","role":"authenticated"}', true);
    update public.club_educateurs set statut = 'accepte' where id = '00000000-0000-0000-0000-0000000000b1';
    if (select statut from public.club_educateurs where id = '00000000-0000-0000-0000-0000000000b1') <> 'accepte' then
      raise exception 'ECHEC T3b : le club propriétaire n''a pas pu accepter sa propre affiliation';
    end if;
    raise notice 'T3 OK';
  end;
  $$;
rollback;

-- T4. GRANT colonne : impossible d'écrire peut_editer_* à la création, même
--     pour le club (seul l'UPDATE l'autorise).
do $$
declare v_bad text[] := array[]::text[];
begin
  if has_column_privilege('authenticated', 'public.club_educateurs', 'peut_editer_projet_sportif', 'insert') then
    v_bad := array_append(v_bad, 'peut_editer_projet_sportif insérable');
  end if;
  if has_column_privilege('authenticated', 'public.club_educateurs', 'club_id', 'update') then
    v_bad := array_append(v_bad, 'club_id modifiable après création');
  end if;
  if not has_column_privilege('authenticated', 'public.club_educateurs', 'peut_editer_projet_sportif', 'update') then
    v_bad := array_append(v_bad, 'peut_editer_projet_sportif non modifiable (devrait l''être)');
  end if;
  if array_length(v_bad, 1) > 0 then raise exception 'ECHEC T4 : %', array_to_string(v_bad, ', '); end if;
  raise notice 'T4 OK';
end;
$$;

-- T5. anon : zéro privilège sur les deux tables.
do $$
declare v_bad text[] := array[]::text[];
begin
  if has_table_privilege('anon','public.club_educateurs','select') then v_bad := array_append(v_bad, 'club_educateurs.select'); end if;
  if has_table_privilege('anon','public.staff_club','select') then v_bad := array_append(v_bad, 'staff_club.select'); end if;
  if array_length(v_bad, 1) > 0 then raise exception 'ECHEC T5 : anon détient encore : %', array_to_string(v_bad, ', '); end if;
  raise notice 'T5 OK';
end;
$$;

-- ════════════════════════════════════════════════════════════════════════
-- ROLLBACK (point 5 de la demande)
-- ════════════════════════════════════════════════════════════════════════
-- begin;
--   drop policy if exists "club_educateurs_insert_educateur_own" on public.club_educateurs;
--   drop policy if exists "club_educateurs_insert_club_own" on public.club_educateurs;
--   drop policy if exists "club_educateurs_update_club_own" on public.club_educateurs;
--   drop policy if exists "club_educateurs_delete_club_own" on public.club_educateurs;
--   grant insert, update, delete, truncate on public.club_educateurs to authenticated;
--   grant select, insert, update, delete, truncate on public.club_educateurs to anon;
--   grant insert, update, delete, truncate on public.staff_club to authenticated;
--   grant select, insert, update, delete, truncate on public.staff_club to anon;
-- commit;
-- Ce rollback restaure des GRANT larges plutôt que l'état exact pré-script
-- (inconnu avec certitude, cf. limite en tête de fichier) — ne réouvre donc
-- PAS une faille qui n'existait pas avant (il élargit vers l'état le plus
-- permissif possible, jamais plus restrictif que ce qui existait), mais peut
-- être plus large que l'état réel d'avant si des GRANT colonne plus fins
-- existaient déjà. À n'utiliser qu'en cas de régression bloquante, le temps
-- de diagnostiquer, jamais comme retour à "l'état normal".
