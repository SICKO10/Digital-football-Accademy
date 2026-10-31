-- Sécurisation de public.messages et public.demandes — demande de
-- validation du 2026-10-10 (audit ciblé suite à la découverte RLS
-- désactivée faite en corrigeant les 11 jointures profiles).
--
-- Comme pour `profiles` à l'origine : des policies existent déjà en base
-- pour ces deux tables, mais RLS n'a jamais été activée dessus — elles sont
-- dormantes. Ce fichier active RLS et corrige UNE policy existante
-- dangereuse (UPDATE sans WITH CHECK sur messages), le reste des policies
-- dormantes étant déjà correctes et simplement réactivées.
--
-- Round 4 (2026-10-10) : tests rendus réellement exécutables dans Supabase
-- SQL Editor (fixtures réelles, capture d'exception en PL/pgSQL, droits
-- colonne par colonne, garde-fou sur la contrainte statut) — voir la
-- section EXIGENCE 6 en fin de fichier pour le détail des corrections.
--
-- Round 5 (2026-10-10), Point 3 — ORDRE DE DÉPLOIEMENT, vérifié directement
-- en base avant d'écrire cette phrase : public.admins_coach N'EXISTE PAS
-- ENCORE aujourd'hui (to_regclass('public.admins_coach') renvoie NULL) —
-- cette table est créée par supabase_fix_profiles_trigger_signup.sql, pas
-- par ce fichier. Les policies admin_coach_lit_demandes et
-- admin_coach_gere_demandes ci-dessous la référencent : exécuter ce fichier
-- AVANT que admins_coach existe ferait échouer le CREATE POLICY avec
-- "relation admins_coach does not exist" et annulerait toute la transaction
-- DDL (aucune corruption de données possible — juste un échec), mais de
-- façon moins lisible qu'un message dédié. Garde-fou explicite ci-dessous
-- plutôt que de compter uniquement sur l'ordre documenté dans les autres
-- fichiers. est_parent_accepte_de(uuid), utilisée par 2 policies, existe
-- déjà en base aujourd'hui (vérifié : to_regprocedure la trouve) — aucune
-- dépendance supplémentaire de ce côté.
--
-- NE PAS EXÉCUTER SANS VALIDATION EXPLICITE.

begin;

do $$
begin
  if to_regclass('public.admins_coach') is null then
    raise exception 'DÉPENDANCE MANQUANTE : public.admins_coach n''existe pas encore. Exécuter d''abord supabase_fix_profiles_trigger_signup.sql (section admins_coach) avant ce fichier.';
  end if;
  if to_regprocedure('public.est_parent_accepte_de(uuid)') is null then
    raise exception 'DÉPENDANCE MANQUANTE : public.est_parent_accepte_de(uuid) n''existe pas. Ce fichier suppose qu''elle existe déjà en base.';
  end if;
end;
$$;

-- ════════════════════════════════════════════════════════════════════════
-- MESSAGES
-- ════════════════════════════════════════════════════════════════════════

alter table public.messages enable row level security;

-- Les 3 policies suivantes existaient déjà, correctement écrites, et
-- restent valables telles quelles (recréées ici pour que ce fichier soit
-- autoportant et explicite, pas parce qu'elles avaient besoin d'être
-- changées) :
drop policy if exists "Voir ses messages" on public.messages;
create policy "Voir ses messages" on public.messages
  for select to authenticated
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists "parent_lit_messages_enfant" on public.messages;
create policy "parent_lit_messages_enfant" on public.messages
  for select to authenticated
  using (est_parent_accepte_de(sender_id) or est_parent_accepte_de(receiver_id));

drop policy if exists "Envoyer un message" on public.messages;
create policy "Envoyer un message" on public.messages
  for insert to authenticated
  with check (auth.uid() = sender_id);

-- Policy dangereuse supprimée définitivement (pas juste rendue inatteignable
-- par les GRANT ci-dessous) : `USING (sender_id OR receiver_id = auth.uid())`
-- SANS WITH CHECK permettait à n'importe quel participant d'une conversation
-- de réécrire n'importe quelle colonne de n'importe lequel de ses messages,
-- y compris sender_id/receiver_id (falsification d'attribution) et content
-- (réécriture a posteriori). Aucun code client ne l'utilise aujourd'hui
-- (vérifié par grep exhaustif : 0 appel .update()/.delete() sur messages
-- nulle part dans le projet) — supprimée plutôt que corrigée, exigence 1.
drop policy if exists "Mise a jour messages" on public.messages;

-- Exigence 1 : anon aucun accès, authenticated limité à SELECT (filtré par
-- les policies ci-dessus) + INSERT colonne-limité. Aucun UPDATE/DELETE/
-- TRUNCATE pour personne côté client (seul service_role, inchangé, garde
-- tout — aucune Edge Function n'écrit dans messages aujourd'hui, vérifié,
-- mais pas de raison de le restreindre côté service_role qui bypass RLS de
-- toute façon).
revoke all on public.messages from anon;
revoke update, delete, truncate on public.messages from authenticated;
revoke insert, update on public.messages from authenticated; -- reset avant regrant colonne
grant insert (sender_id, receiver_id, content, created_at) on public.messages to authenticated;
-- `created_at` inclus : les 13 sites d'insert le passent explicitement
-- (new Date().toISOString() côté client plutôt que le DEFAULT serveur) —
-- comportement existant préservé, pas une nouvelle exposition (un horodatage
-- n'est pas une donnée sensible). `read` volontairement PAS accordé : aucun
-- insert ne le fixe (DEFAULT false suffit), et l'absence de UPDATE empêche
-- de toute façon de le faire passer à true plus tard — cf. note ci-dessous
-- pour une future fonctionnalité "marquer comme lu".

-- Si une fonctionnalité "marquer comme lu" est ajoutée un jour, NE PAS
-- réintroduire la policy UPDATE large d'avant. Le faire ainsi à la place :
--   create policy "marquer comme lu" on public.messages for update to authenticated
--     using (auth.uid() = receiver_id) with check (auth.uid() = receiver_id);
--   grant update (read) on public.messages to authenticated;
-- Le GRANT colonne-seule (read) empêche structurellement de toucher
-- sender_id/receiver_id/content même si le WITH CHECK était mal écrit —
-- exactement la défense en profondeur demandée dans ce chantier.

create index if not exists idx_messages_sender_id on public.messages (sender_id);
create index if not exists idx_messages_receiver_id on public.messages (receiver_id);

-- ════════════════════════════════════════════════════════════════════════
-- DEMANDES
-- ════════════════════════════════════════════════════════════════════════

alter table public.demandes enable row level security;

-- Policy existante, conservée telle quelle.
drop policy if exists "parent_lit_donnees_enfant" on public.demandes;
create policy "parent_lit_donnees_enfant" on public.demandes
  for select to authenticated
  using (est_parent_accepte_de(joueur_id));

-- Nouvelle — le joueur lit ses propres demandes (absent avant : la seule
-- policy existante ne couvrait QUE le parent délégué, pas le joueur
-- lui-même — l'activer sans ceci aurait cassé DashboardJoueur.jsx:847).
create policy "joueur_lit_ses_demandes" on public.demandes
  for select to authenticated
  using (auth.uid() = joueur_id);

-- Correctif critique (demande de validation du 2026-10-10, round 6) :
-- `EXISTS (SELECT 1 FROM admins_coach WHERE ...)` ne peut PAS être inséré
-- directement dans une policy RLS de demandes. admins_coach a RLS activée
-- SANS AUCUNE policy et REVOKE ALL FROM anon, authenticated (deny-by-
-- default, intentionnel, cf. supabase_fix_profiles_trigger_signup.sql).
-- Postgres vérifie les privilèges de table sur TOUT ce qui est référencé
-- dans la requête réécrite par RLS, y compris dans une AUTRE policy
-- PERMISSIVE combinée en OR, AVANT toute évaluation ligne par ligne.
-- Vérifié empiriquement (bac à sable isolé, tables temporaires, tout
-- annulé) : un simple joueur lisant SA PROPRE ligne via
-- joueur_lit_ses_demandes se serait vu opposer "permission denied for
-- table admins_coach" à cause de la seule PRÉSENCE de
-- admin_coach_lit_demandes comme policy candidate — alors même que cette
-- policy n'aurait jamais eu besoin d'être vraie pour lui. Aurait cassé
-- TOUTE lecture et TOUTE mise à jour de demandes pour TOUT LE MONDE,
-- joueurs et admins compris (admin_coach_gere_demandes, seule policy
-- UPDATE, a le même problème, deux fois : USING et WITH CHECK).
--
-- get_demandes_admin() (fichier séparé, non appliqué) n'a PAS ce problème :
-- elle est elle-même SECURITY DEFINER, donc son accès interne à
-- admins_coach s'exécute avec les privilèges du PROPRIÉTAIRE de la
-- fonction (postgres — confirmé propriétaire de toutes les tables de ce
-- projet, y compris celle qui sera créée par ce fichier, puisque c'est le
-- même rôle de connexion qui exécute toutes ces migrations), qui a un
-- accès implicite à ses propres objets quels que soient les REVOKE visant
-- d'autres rôles — et RLS ne s'applique jamais au propriétaire d'une table
-- sans FORCE ROW LEVEL SECURITY (non activé sur admins_coach). Une policy
-- RLS brute n'a PAS cet avantage : elle s'exécute avec les privilèges du
-- rôle appelant réel (authenticated), jamais élevés.
--
-- Correctif minimal, validé : exactement le même pattern déjà utilisé pour
-- est_parent_accepte_de()/est_dirigeant_accepte_de() — une fonction
-- SECURITY DEFINER dédiée qui encapsule la lecture d'admins_coach sans
-- jamais accorder SELECT directement sur la table à authenticated/anon.
-- Revérifié dans le même bac à sable après ajout de la fonction : joueur
-- non-admin lisant sa ligne → succès (1 ligne, sans erreur) ; admin → toutes
-- les lignes (sans erreur) ; tiers → 0 ligne (sans erreur).
create or replace function public.est_admin_coach()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (select 1 from public.admins_coach where user_id = auth.uid());
$function$;
-- `search_path = ''` (vide) plutôt que `'public'` (demande de validation du
-- 2026-10-10, round 7, point 1) : toutes les références du corps sont déjà
-- qualifiées (`public.admins_coach`, `auth.uid()`), donc rien n'a besoin
-- d'un schéma implicite — un search_path vide élimine complètement la
-- résolution de nom ambiguë plutôt que de la limiter à `public`, ce qui
-- reste la protection la plus stricte possible même si `public` devenait
-- un jour un schéma où des rôles moins privilégiés peuvent créer des
-- objets. `pg_catalog` (types de base comme `boolean`, opérateurs,
-- `exists`) reste implicitement résolu quel que soit search_path — ce
-- n'est jamais désactivable, donc aucune régression possible sur ces
-- éléments.

revoke execute on function public.est_admin_coach() from public, anon;
grant execute on function public.est_admin_coach() to authenticated;
-- EXECUTE à authenticated uniquement, jamais anon : un visiteur non
-- connecté n'a aucune raison de pouvoir même tenter cet appel (même si
-- auth.uid() NULL ferait renvoyer false de toute façon, pas de raison
-- d'ouvrir l'EXECUTE au-delà du nécessaire). Ni public ni anon ni
-- authenticated ne sont jamais mentionnés dans un REVOKE visant
-- service_role ou le propriétaire (postgres) : ce REVOKE ne cible que les
-- deux rôles nommés, service_role et postgres gardent leurs droits
-- habituels sans qu'aucune commande ne les touche ici — postgres (le
-- propriétaire, confirmé par le rôle de connexion utilisé pour exécuter ce
-- fichier) a de toute façon un EXECUTE implicite sur ses propres fonctions,
-- GRANT ou pas.

-- Nouvelle — admin coach lit tout (filet de sécurité : la lecture réelle
-- passe par get_demandes_admin(), SECURITY DEFINER, qui bypass RLS de toute
-- façon — cette policy ne sert qu'à la cohérence/défense en profondeur si
-- un futur code lisait `demandes` directement en tant qu'admin).
create policy "admin_coach_lit_demandes" on public.demandes
  for select to authenticated
  using (public.est_admin_coach());

-- Exigence 2 : INSERT joueur uniquement, joueur_id = auth.uid() ET
-- statut = 'en_attente' — empêche un joueur de créer une demande déjà
-- marquée 'analyse' ou pour quelqu'un d'autre.
create policy "joueur_cree_sa_demande" on public.demandes
  for insert to authenticated
  with check (auth.uid() = joueur_id and statut = 'en_attente');

-- ────────────────────────────────────────────────────────────────────────
-- Round 8 (2026-10-10) — crédit analyses_restantes : contrôle serveur
-- atomique, demandé après que l'audit de la fonction decrementer_analyse_
-- restante() proposée au round précédent se soit révélée insuffisante.
-- Rappel du problème trouvé : analyses_restantes n'était vérifié QUE côté
-- client (Upload.jsx), jamais côté serveur, et la policy
-- joueur_cree_sa_demande ci-dessus ne référence ce crédit nulle part — un
-- appel direct à l'API (hors interface) pouvait créer des demandes
-- illimitées quel que soit le solde, et deux soumissions quasi simultanées
-- pouvaient consommer 2 services pour 1 seul crédit (lecture-puis-écriture
-- non atomique côté client).
--
-- Vérifié en base avant d'écrire ce trigger : analyses_restantes est
-- integer, NULLABLE, sans DEFAULT ni CHECK — 35 profils sur 118 valent
-- NULL aujourd'hui (aucun négatif). Le `coalesce(..., 0) > 0` ci-dessous
-- traite NULL comme "aucun crédit", cohérent avec le contrôle client
-- existant (`!profil.analyses_restantes`, faux pour 0 ET null).
--
-- Pas de bypass service_role ici (contrairement à
-- verifier_prise_en_charge_demande()) : vérifié qu'aucune fonction,
-- aucune Edge Function, nulle part, n'insère dans demandes aujourd'hui —
-- aucune opération légitime n'en dépendrait. Par principe de moindre
-- privilège, pas de porte dormante : si un besoin réel apparaît un jour,
-- elle devra être ajoutée délibérément, avec sa propre revue.
create or replace function public.decrementer_credit_demande()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_rows int;
begin
  update public.profiles
  set analyses_restantes = coalesce(analyses_restantes, 0) - 1
  where id = new.joueur_id and coalesce(analyses_restantes, 0) > 0;
  get diagnostics v_rows = row_count;

  if v_rows = 0 then
    raise exception 'Aucune analyse restante ce mois-ci';
  end if;

  return new;
end;
$function$;

-- Vérifié empiriquement (bac à sable isolé) : une fonction attachée comme
-- TRIGGER n'a besoin d'AUCUN privilège EXECUTE accordé au rôle qui
-- déclenche le DML — contrairement à une fonction appelée depuis une
-- expression de policy (comme est_admin_coach(), qui doit elle rester
-- exécutable par authenticated). Testé : EXECUTE révoqué à
-- public/anon/authenticated, puis un INSERT réussi en tant
-- qu'authenticated déclenche quand même le trigger normalement —
-- verrouillage total possible, sans exception, sans rien casser.
revoke execute on function public.decrementer_credit_demande() from public, anon, authenticated;

drop trigger if exists trg_decrementer_credit_demande on public.demandes;
create trigger trg_decrementer_credit_demande
  before insert on public.demandes
  for each row
  execute function public.decrementer_credit_demande();
-- BEFORE INSERT : s'exécute avant l'évaluation du WITH CHECK de
-- joueur_cree_sa_demande ci-dessus. Si le crédit est insuffisant,
-- l'exception part avant même que la policy soit évaluée. Si le crédit est
-- décrémenté avec succès mais que le WITH CHECK échoue ensuite (tentative
-- pour un tiers, mauvais statut), tout est annulé ensemble — vérifié
-- empiriquement (bac à sable : contrainte CHECK simulée échouant après le
-- trigger, le décrément est bien annulé avec le reste de l'instruction,
-- aucune perte de crédit possible dans ce cas).
--
-- IMPORTANT — dépendance croisée avec supabase_fix_profiles_rls_stripe.sql
-- (fichier séparé) : ce trigger empêche la création d'une demande sans
-- crédit, mais n'empêche PAS à lui seul un utilisateur de gonfler son
-- propre solde par UPDATE direct sur profiles.analyses_restantes — cette
-- fermeture-là se fait en retirant analyses_restantes des GRANT INSERT et
-- UPDATE de authenticated dans l'AUTRE fichier. Les deux correctifs sont
-- indépendants (chacun fonctionne seul) mais doivent être déployés dans la
-- même fenêtre pour fermer les trois failles identifiées à la fois.

-- Exigence 3 (révisée suite à la demande de validation du 2026-10-10,
-- round 2) : UPDATE réservé aux admins coach. La contrainte sur
-- pris_en_charge_par ne peut PAS être exprimée dans le WITH CHECK d'une
-- policy — WITH CHECK ne voit que la ligne finale, jamais l'ancienne
-- valeur, donc impossible de distinguer "cette colonne change" de "cette
-- colonne est juste reportée telle quelle". Un UPDATE qui complète une
-- analyse (statut/loom_url/rapport_pdf_url) SANS toucher
-- pris_en_charge_par reporte sa valeur existante dans la ligne finale —
-- un WITH CHECK du type `pris_en_charge_par = auth.uid()` la bloquerait
-- dès que ce n'est pas la même personne qui complète, cassant le vrai
-- fonctionnement (confirmé dans PlayerAnalysis.jsx : "Envoyer l'analyse"
-- s'affiche pour TOUTE demande en_attente, sans condition sur qui l'a
-- prise en charge — claim et complétion sont deux actions indépendantes).
--
-- Solution : policy RLS simple (juste la vérification admins_coach) + un
-- TRIGGER séparé, seul mécanisme Postgres ayant accès à OLD et NEW
-- simultanément, qui n'applique la règle QUE quand pris_en_charge_par
-- change réellement.
create policy "admin_coach_gere_demandes" on public.demandes
  for update to authenticated
  using (public.est_admin_coach())
  with check (public.est_admin_coach());

-- Règles exactes (demande de validation, round 2) :
--   - pris_en_charge_par NON modifié (complétion d'analyse) → aucune
--     contrainte, n'importe quel admin peut terminer n'importe quelle
--     demande en_attente sans toucher l'attribution — comportement actuel
--     préservé à l'identique, confirmé qu'aucun diff JS n'est nécessaire.
--   - passe de NULL à une valeur (réclamation d'une demande LIBRE) →
--     autorisé UNIQUEMENT si cette valeur = auth.uid() (impossible de
--     réclamer au nom d'un tiers).
--   - passe d'une valeur à une AUTRE valeur non-NULL (tentative de
--     remplacer directement l'admin qui l'a déjà prise en charge) →
--     TOUJOURS refusé, même si la nouvelle valeur = auth.uid() de
--     l'appelant — il faut d'abord que l'admin en place la libère (passage
--     à NULL), jamais un remplacement direct. C'est le point 1 de la
--     demande de validation.
--   - passe à NULL (libération) → toujours autorisé, par n'importe quel
--     admin, quel que soit qui l'avait prise en charge — comportement
--     actuel préservé à l'identique (déjà non restreint en base
--     aujourd'hui, seulement caché côté UI).
--   - service_role (point 2 de la demande de validation) : contourne cette
--     vérification entièrement, de façon EXPLICITE plutôt que de laisser
--     `new.pris_en_charge_par <> auth.uid()` évaluer silencieusement à NULL
--     (donc jamais vrai, donc jamais bloquant) faire ce travail par
--     accident — une comparaison avec NULL ne lève jamais d'exception en
--     plpgsql (IF sur une condition NULL = IF sur false), ce qui aurait
--     laissé passer une réclamation "au nom de personne" sans erreur si
--     cette protection explicite n'existait pas. Aucune Edge Function
--     n'écrit dans demandes aujourd'hui (vérifié) — bypass documenté pour
--     une éventuelle évolution future, cohérent avec le fait que
--     service_role contourne déjà RLS partout ailleurs dans ce projet.
create or replace function public.verifier_prise_en_charge_demande()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if new.pris_en_charge_par is distinct from old.pris_en_charge_par then
    if new.pris_en_charge_par is not null then
      if old.pris_en_charge_par is not null then
        raise exception 'Cette demande est déjà prise en charge par un autre coach';
      end if;
      if new.pris_en_charge_par is distinct from auth.uid() then
        raise exception 'pris_en_charge_par doit correspondre à votre propre compte';
      end if;
    end if;
    -- else : new.pris_en_charge_par est NULL → libération, toujours autorisée.
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_verifier_prise_en_charge on public.demandes;
create trigger trg_verifier_prise_en_charge
  before update on public.demandes
  for each row
  execute function public.verifier_prise_en_charge_demande();

revoke all on public.demandes from anon;
revoke insert, update, delete, truncate on public.demandes from authenticated;

grant insert (joueur_id, titre, poste, description, video_url, statut) on public.demandes to authenticated;
-- Jamais pris_en_charge_par/pris_en_charge_at/loom_url/commentaire/
-- rapport_pdf_url en insert — champs exclusivement coach, vérifié qu'aucun
-- insert client ne les fixe aujourd'hui.

grant update (pris_en_charge_par, pris_en_charge_at, statut, loom_url, rapport_pdf_url, commentaire) on public.demandes to authenticated;
-- Jamais joueur_id/titre/poste/description/video_url en update, MÊME pour
-- un admin — exactement la mise en garde de ta demande : être autorisé à
-- modifier LA LIGNE (via la policy) ne veut pas dire pouvoir modifier
-- N'IMPORTE QUEL CHAMP. Le contenu soumis par le joueur reste immuable une
-- fois créé, quel que soit qui a le droit d'updater la ligne.

create index if not exists idx_demandes_joueur_id on public.demandes (joueur_id);

-- Exigence 2 (suite) — durcissement additionnel non strictement demandé
-- mais découlant directement de "vérifie les contraintes existantes" :
-- aucune CHECK constraint n'existait sur demandes.statut avant ce fichier
-- (seules 3 contraintes existaient sur cette table, toutes des FK/PK).
-- Point 6 de la demande de validation du 2026-10-10 (round 4) : vérifié
-- directement en base avant d'écrire cette phrase —
-- `select statut, count(*) from demandes group by statut` renvoie
-- EXACTEMENT 2 valeurs aujourd'hui : 'analyse' (4 lignes) et 'en_attente'
-- (2 lignes). Aucune autre valeur n'existe — la contrainte ci-dessous est
-- compatible avec les données actuelles et ne bloquera pas le déploiement
-- tel que vérifié aujourd'hui. Garde-fou supplémentaire pour la fenêtre
-- entre cette vérification et l'exécution réelle (si une donnée imprévue
-- apparaît entre-temps) : échec explicite et lisible plutôt que l'erreur
-- générique de violation de contrainte.
do $$
begin
  if exists (
    select 1 from public.demandes
    where statut is distinct from 'en_attente' and statut is distinct from 'analyse'
  ) then
    raise exception 'demandes_statut_check bloquerait le déploiement : une valeur de statut imprévue existe déjà en base. Vérifier (select distinct statut from demandes) avant de continuer.';
  end if;
end;
$$;

alter table public.demandes
  add constraint demandes_statut_check
  check (statut in ('en_attente', 'analyse'));

commit;

-- ════════════════════════════════════════════════════════════════════════
-- EXIGENCE 4 — admins_coach et fonctions SECURITY DEFINER : vérification
-- d'absence d'élévation de privilèges (analyse, pas de SQL à exécuter)
-- ════════════════════════════════════════════════════════════════════════
--
-- admins_coach : RLS active, AUCUNE policy pour anon/authenticated (deny-
-- by-default), REVOKE ALL explicite. Aucun chemin client (RPC ou direct)
-- ne permet d'y INSERT — seul un accès SQL direct (Kevin) peut y ajouter un
-- admin. Confirmé : aucune fonction existante n'expose d'écriture dessus.
-- Zéro vecteur d'auto-promotion en admin.
--
-- est_parent_accepte_de(uuid) / est_dirigeant_accepte_de(uuid) : relues
-- intégralement. Toutes deux SECURITY DEFINER + search_path fixé (anti
-- détournement de search_path), paramètre uuid typé (pas d'injection SQL
-- possible via concaténation de chaîne — ce ne sont pas des fonctions à SQL
-- dynamique), et vérifient bien `auth.uid()` côté "autre partie" de la
-- relation (le demandeur), jamais une valeur passée en paramètre côté
-- identité de l'appelant — un appelant ne peut pas se faire passer pour un
-- parent/dirigeant en forgeant juste l'uuid en paramètre, seul son vrai
-- auth.uid() (dérivé du JWT signé, non falsifiable côté client) compte.
-- Aucune élévation de privilèges possible via ces deux fonctions.

-- ────────────────────────────────────────────────────────────────────────
-- ROUND 4, POINT 5 — comportement du trigger selon le contexte serveur
-- (service_role, fonctions SECURITY DEFINER) : vérifié directement en
-- base, aucun changement de code nécessaire.
-- ────────────────────────────────────────────────────────────────────────
--
-- Vérifié en base (pg_proc.prosrc) : AUCUNE fonction du schéma public,
-- SECURITY DEFINER ou non, n'exécute d'UPDATE/INSERT/DELETE sur
-- public.demandes aujourd'hui. La seule correspondance textuelle sur le mot
-- "demandes" est bilan_medical_detail(), qui lit demandes_bilan_medical —
-- une table complètement différente, sans rapport.
--
-- Si une telle fonction était ajoutée un jour, le trigger resterait
-- protecteur, pour deux raisons indépendantes :
--   1. Un trigger BEFORE UPDATE se déclenche sur CHAQUE ligne réellement
--      modifiée, quel que soit le rôle Postgres exécutant la commande —
--      y compris le propriétaire de la table ou un superutilisateur. Le
--      bypass RLS natif (rolbypassrls, ou "le rôle exécutant est le
--      propriétaire de la table") dispense des POLICIES, jamais des
--      TRIGGERS. La seule façon de désactiver un trigger est
--      `ALTER TABLE ... DISABLE TRIGGER` (changement de schéma explicite)
--      ou `session_replication_role = replica` (réservé aux
--      superutilisateurs, utilisé pour la réplication logique — jamais
--      positionné nulle part dans ce projet, vérifié par grep).
--   2. Une fonction SECURITY DEFINER change le rôle Postgres utilisé pour
--      les vérifications de PRIVILÈGES (GRANT/RLS), mais PAS la valeur des
--      GUC request.jwt.claims / request.jwt.claim.* dont dépendent
--      auth.uid() et auth.role() — vérifié directement via
--      pg_get_functiondef(auth.uid()) et pg_get_functiondef(auth.role()) :
--      les deux ne lisent QUE ces GUC, jamais current_user/session_user.
--      Le contexte d'appel réel (l'utilisateur authentifié via PostgREST)
--      reste donc visible du trigger même depuis l'intérieur d'une
--      fonction SECURITY DEFINER — pas de bypass accidentel possible par ce
--      biais.
-- Le seul bypass volontaire reste le `if auth.role() = 'service_role'`
-- explicite du trigger, qui ne s'active que si request.jwt.claims porte
-- réellement "role":"service_role" — jamais en simple conséquence d'un
-- changement de rôle Postgres côté connexion (cf. T16 en fin de fichier,
-- qui vérifie précisément cette distinction après l'avoir vue produire une
-- fausse hypothèse lors de la vérification de ce point).

-- ════════════════════════════════════════════════════════════════════════
-- EXIGENCE 5 — droits hérités / privilèges effectifs
-- ════════════════════════════════════════════════════════════════════════
--
-- Vérifié avant correctif : aucun GRANT à PUBLIC sur messages ni demandes
-- (contrairement à increment_analyses avant son propre correctif). Vérifié
-- aussi qu'aucun rôle n'hérite d'un autre (anon/authenticated/service_role
-- strictement indépendants, confirmé via pg_auth_members — 0 ligne). Pas de
-- privilège "effectif" caché au-delà des GRANT explicites de ce fichier.
--
-- Vérifié également (round 4) : AVANT ce fichier, anon ET authenticated
-- détiennent aujourd'hui, en base réelle, TOUS les privilèges de table sur
-- messages et demandes (SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/
-- TRIGGER pour les deux rôles, sur les deux tables) — confirmé via
-- information_schema.table_privileges. C'est précisément ce que ce fichier
-- corrige ; T1/T2/T2bis en fin de fichier vérifient l'état attendu APRÈS
-- l'exécution de ce fichier, pas l'état actuel.

-- ════════════════════════════════════════════════════════════════════════
-- EXIGENCE 7 — Realtime Supabase
-- ════════════════════════════════════════════════════════════════════════
--
-- Vérifié par grep exhaustif de tout le code client (`.channel(`,
-- `postgres_changes`, `table: 'messages'`) : AUCUNE fonctionnalité
-- n'utilise Realtime sur la table `messages` aujourd'hui — la messagerie
-- (ScoutCenter, DashboardRecruteur, DashboardEducateur, DashboardJoueur,
-- ClubPublic, DashboardCoach) est entièrement en fetch à la demande, pas en
-- abonnement live. Seule `messages_equipe` (chat d'équipe, TABLE DIFFÉRENTE,
-- hors périmètre) utilise Realtime. Conséquence : activer RLS sur
-- `messages` n'a aucun impact sur une fonctionnalité Realtime existante,
-- puisqu'aucune n'existe pour cette table. Note pour l'avenir : si une
-- messagerie live était ajoutée un jour via Realtime, `postgres_changes`
-- respecte nativement les policies RLS déjà en place ici (quand la
-- réplication Realtime est configurée en mode sécurisé, le défaut
-- recommandé) — aucune configuration supplémentaire ne serait nécessaire
-- au-delà de ce qui est fait dans ce fichier.

-- ────────────────────────────────────────────────────────────────────────
-- ROUND 4, POINT 4 — pris_en_charge_at : analyse seule, AUCUN changement
-- appliqué (règle métier non modifiée sans validation explicite).
-- ────────────────────────────────────────────────────────────────────────
--
-- Vérifié par grep exhaustif (`grep -rn "pris_en_charge" src/`) : les deux
-- SEULS endroits du code qui écrivent pris_en_charge_par ou
-- pris_en_charge_at sont DashboardCoach.jsx:160 (libération — les deux
-- colonnes mises à NULL ensemble) et DashboardCoach.jsx:162 (réclamation —
-- les deux colonnes renseignées ensemble). Aucun code ne modifie l'une sans
-- l'autre.
--
-- Ce fichier, tel qu'il est écrit, AUTORISE techniquement un admin à
-- modifier pris_en_charge_at seul (le GRANT UPDATE colonne l'inclut, et le
-- trigger ne contraint que pris_en_charge_par) — par exemple changer
-- l'horodatage sans toucher l'attribution, ou le remettre à NULL en
-- laissant pris_en_charge_par renseigné, ce qui créerait un état "prise en
-- charge sans horodatage" jamais produit par l'application actuelle. Ce
-- n'est PAS une faille de sécurité (un admin légitime ne peut que modifier
-- une métadonnée qui lui appartient déjà), mais c'est une incohérence de
-- données possible qui n'existe pas aujourd'hui dans les faits.
--
-- Pas de changement appliqué ici. Si tu veux que pris_en_charge_at soit
-- verrouillé sur exactement la même règle que pris_en_charge_par (changer
-- l'un implique changer l'autre, dans le même sens), je peux l'ajouter au
-- trigger — dis-le-moi explicitement et je présenterai le diff séparément
-- avant toute inclusion dans le script.

-- ════════════════════════════════════════════════════════════════════════
-- AUCUN CHANGEMENT JS REQUIS — confirmé suite à la demande de validation du
-- 2026-10-10 (round 2). Le diff précédemment prévu ici (ajouter
-- pris_en_charge_par: coachId à l'update de complétion de
-- DashboardCoach.jsx) est retiré : il aurait réattribué silencieusement la
-- demande à qui la complète, changeant un comportement métier non demandé.
-- Le trigger ci-dessus rend cet ajout inutile — la complétion fonctionne
-- sans toucher pris_en_charge_par, exactement comme aujourd'hui.

-- ════════════════════════════════════════════════════════════════════════
-- EXIGENCE 6 — TESTS (round 4, réécriture complète)
-- ════════════════════════════════════════════════════════════════════════
--
-- Trois défauts corrigés par rapport à la version précédente (demande de
-- validation du 2026-10-10, round 4) :
--
--   1. Les tests d'erreur attendue (ex-T5, T7b, T8, T9, T11, T15)
--      utilisaient soit `begin;...rollback;` seul (l'erreur attendue
--      annule TOUT le bloc avant la vérification d'état), soit un
--      SAVEPOINT en SQL brut. Le SAVEPOINT brut fonctionne
--      statement-par-statement (psql, CLI), mais PAS quand tout le fichier
--      est collé et exécuté en un seul envoi dans Supabase SQL Editor —
--      vérifié empiriquement (une requête de diagnostic provoquant
--      volontairement une erreur a confirmé qu'un `rollback;` placé juste
--      après n'était pas exécuté dans ce mode ; aucune trace n'a été
--      laissée en base, la transaction ayant été annulée implicitement à
--      la fermeture de connexion — vérifié par un SELECT COUNT(*) avant et
--      après). Chaque test d'erreur attendue est donc maintenant un bloc
--      `do $$ ... $$;` avec un `begin...exception when others...end`
--      interne : l'exception est interceptée À L'INTÉRIEUR d'une seule
--      instruction PL/pgSQL, donc invisible du protocole — l'exécution du
--      reste du fichier continue normalement quel que soit l'outil utilisé
--      pour lancer le script.
--
--   2. Les tests qui ne faisaient que lire des données réelles (ex-T3, T4)
--      ou qui dépendaient d'une ligne "si elle existe" (ex-T7, T8, T9,
--      et les anciens T10-T16) pouvaient réussir sans rien prouver,
--      simplement parce qu'aucune ligne ne correspondait — ou, pire,
--      réussir/échouer pour la MAUVAISE raison (ex-T5 et ex-T7 utilisaient
--      des uuid inventés comme sender_id/joueur_id, qui violent la
--      contrainte de clé étrangère vers profiles(id) indépendamment de
--      toute policy RLS, ce qui aurait rendu ces deux tests valides pour
--      une mauvaise raison). Chaque test crée maintenant sa propre fixture
--      explicite avec des identifiants de profils RÉELS et vérifiés
--      existants, insérée en service_role au début du test, toujours dans
--      une transaction annulée. T6 (parent lisant les messages de son
--      enfant), qui n'était qu'un scénario décrit en commentaire, est
--      maintenant un test exécutable complet.
--
--   3. Chaque test se termine par une vérification explicite de l'état
--      final des données modifiées (ou non modifiées), via RAISE EXCEPTION
--      si le résultat ne correspond pas à ce qui est attendu — un test qui
--      s'exécute sans erreur affichée prouve maintenant réellement ce qu'il
--      prétend prouver, plutôt que de nécessiter une relecture manuelle du
--      commentaire "résultat attendu".
--
-- Identifiants réels utilisés comme fixtures (tous vérifiés existants en
-- base — profiles ET auth.users — avant d'écrire ce fichier, aucun uuid
-- inventé) :
--   ADMIN_A  dcbdeaef-a2cb-4869-918f-c2282475c5ea  (legacyattitude@, admins_coach)
--   ADMIN_B  6bb9ff95-23a6-4e12-84db-f84d26a24172  (januariojimmy@, admins_coach)
--   PROFIL_A 9f30757b-0125-4206-8218-22d8743d9029  (profil réel quelconque)
--   PROFIL_B b35afa2e-1fd7-463a-81ca-fc9a18578a35  (profil réel quelconque, distinct de A)
--   PROFIL_C 0e05563e-ea20-4d4a-908f-3fe0867d5932  (profil réel quelconque, distinct de A et B)
-- PROFIL_A/B/C n'ont aucune signification métier particulière — seule leur
-- existence réelle (contrainte FK) compte pour ces tests.
--
-- IMPORTANT — limite honnête sur ce qui a pu être vérifié avant exécution :
-- les mécanismes génériques utilisés ici (set_config('role',...),
-- set_config('request.jwt.claims',...), lecture de auth.uid()/auth.role()
-- en résultant, y compris depuis l'intérieur d'un bloc `do $$ ... $$`) ont
-- été vérifiés directement contre la base réelle, en lecture seule,
-- transaction annulée — ils fonctionnent. En revanche, les tests T2bis et
-- T3-T16, qui dépendent des GRANT colonne, des nouvelles policies et du
-- trigger verifier_prise_en_charge_demande(), NE PEUVENT PAS être exécutés
-- avec succès contre la base actuelle tant que le bloc DDL ci-dessus n'est
-- pas appliqué (vérifié : une tentative de ce type a échoué exactement
-- comme attendu, puisque rien de tout cela n'existe encore en base — sans
-- laisser de trace, cf. point 1 ci-dessus). Toute la section EXIGENCE 6 est
-- conçue pour être exécutée immédiatement APRÈS le bloc DDL, dans le même
-- script, pas contre l'état actuel de la base.

-- T1. anon : zéro privilège, sur toutes les opérations, sur les deux tables.
--     Auto-vérifiant (Point 1 de la demande de validation round 5) : ce
--     bloc lève une exception listant précisément les privilèges en trop
--     s'il en reste un seul — il ne se contente plus d'afficher des
--     booléens à relire.
do $$
declare
  v_bad text[] := array[]::text[];
begin
  if has_table_privilege('anon','public.messages','select')   then v_bad := array_append(v_bad, 'messages.select'); end if;
  if has_table_privilege('anon','public.messages','insert')   then v_bad := array_append(v_bad, 'messages.insert'); end if;
  if has_table_privilege('anon','public.messages','update')   then v_bad := array_append(v_bad, 'messages.update'); end if;
  if has_table_privilege('anon','public.messages','delete')   then v_bad := array_append(v_bad, 'messages.delete'); end if;
  if has_table_privilege('anon','public.messages','truncate') then v_bad := array_append(v_bad, 'messages.truncate'); end if;
  if has_table_privilege('anon','public.demandes','select')   then v_bad := array_append(v_bad, 'demandes.select'); end if;
  if has_table_privilege('anon','public.demandes','insert')   then v_bad := array_append(v_bad, 'demandes.insert'); end if;
  if has_table_privilege('anon','public.demandes','update')   then v_bad := array_append(v_bad, 'demandes.update'); end if;
  if has_table_privilege('anon','public.demandes','delete')   then v_bad := array_append(v_bad, 'demandes.delete'); end if;
  if has_table_privilege('anon','public.demandes','truncate') then v_bad := array_append(v_bad, 'demandes.truncate'); end if;
  if array_length(v_bad, 1) > 0 then
    raise exception 'ECHEC T1 : anon détient encore ces privilèges : %', array_to_string(v_bad, ', ');
  end if;
  raise notice 'T1 OK';
end;
$$;

-- T2. authenticated : privilèges de TABLE qui doivent rester absents, et
--     ceux qui doivent être présents (Point 3 de la demande : droits
--     SELECT nécessaires après migration). Auto-vérifiant, même principe
--     que T1.
--     Correction (demande de validation du 2026-10-11) : l'affirmation
--     précédente ici était fausse, vérifiée empiriquement — has_table_
--     privilege(...,'insert'/'update') ne reflète QUE un privilège accordé
--     au niveau de la table entière ; il renvoie false même quand une ou
--     plusieurs colonnes ont un GRANT, exactement le comportement attendu
--     et confirmé pour messages/demandes. C'est has_any_column_privilege()
--     qui renvoie true dès qu'UNE SEULE colonne est accordée — une fonction
--     différente, non utilisée ici. Le détail exact colonne par colonne
--     reste vérifié ci-dessous (T2bis) via has_column_privilege(), pas
--     affecté par cette distinction.
do $$
declare
  v_bad text[] := array[]::text[];
begin
  if not has_table_privilege('authenticated','public.messages','select') then v_bad := array_append(v_bad, 'messages.select manquant'); end if;
  if has_table_privilege('authenticated','public.messages','update')     then v_bad := array_append(v_bad, 'messages.update présent'); end if;
  if has_table_privilege('authenticated','public.messages','delete')     then v_bad := array_append(v_bad, 'messages.delete présent'); end if;
  if has_table_privilege('authenticated','public.messages','truncate')   then v_bad := array_append(v_bad, 'messages.truncate présent'); end if;
  if not has_table_privilege('authenticated','public.demandes','select') then v_bad := array_append(v_bad, 'demandes.select manquant'); end if;
  if has_table_privilege('authenticated','public.demandes','delete')     then v_bad := array_append(v_bad, 'demandes.delete présent'); end if;
  if has_table_privilege('authenticated','public.demandes','truncate')   then v_bad := array_append(v_bad, 'demandes.truncate présent'); end if;
  if array_length(v_bad, 1) > 0 then
    raise exception 'ECHEC T2 : %', array_to_string(v_bad, ', ');
  end if;
  raise notice 'T2 OK';
end;
$$;

-- T2bis. Droits effectifs COLONNE PAR COLONNE après migration (Point 3 de
--        la demande de validation) — authenticated uniquement, anon étant
--        déjà à zéro partout (T1). Auto-vérifiant : chaque ligne du
--        tableau ci-dessous est comparée au droit réel ; tout écart est
--        listé dans l'exception plutôt que laissé à une relecture visuelle
--        de colonnes "attendu: true/false" en commentaire.
do $$
declare
  r record;
  v_actual boolean;
  v_bad text[] := array[]::text[];
  v_checked int := 0;
begin
  for r in
    select * from (values
      ('public.messages', 'sender_id',           'insert', true),
      ('public.messages', 'receiver_id',          'insert', true),
      ('public.messages', 'content',              'insert', true),
      ('public.messages', 'created_at',           'insert', true),
      ('public.messages', 'read',                 'insert', false),
      ('public.messages', 'id',                   'insert', false),
      ('public.demandes', 'joueur_id',            'insert', true),
      ('public.demandes', 'titre',                'insert', true),
      ('public.demandes', 'poste',                'insert', true),
      ('public.demandes', 'description',          'insert', true),
      ('public.demandes', 'video_url',            'insert', true),
      ('public.demandes', 'statut',               'insert', true),
      ('public.demandes', 'pris_en_charge_par',   'insert', false),
      ('public.demandes', 'pris_en_charge_at',    'insert', false),
      ('public.demandes', 'loom_url',             'insert', false),
      ('public.demandes', 'commentaire',          'insert', false),
      ('public.demandes', 'rapport_pdf_url',      'insert', false),
      ('public.demandes', 'id',                   'insert', false),
      ('public.demandes', 'pris_en_charge_par',   'update', true),
      ('public.demandes', 'pris_en_charge_at',    'update', true),
      ('public.demandes', 'statut',               'update', true),
      ('public.demandes', 'loom_url',             'update', true),
      ('public.demandes', 'rapport_pdf_url',      'update', true),
      ('public.demandes', 'commentaire',          'update', true),
      ('public.demandes', 'joueur_id',            'update', false),
      ('public.demandes', 'titre',                'update', false),
      ('public.demandes', 'poste',                'update', false),
      ('public.demandes', 'description',          'update', false),
      ('public.demandes', 'video_url',            'update', false)
    ) as t(tbl, col, priv, expected)
  loop
    v_actual := has_column_privilege('authenticated', r.tbl, r.col, r.priv);
    v_checked := v_checked + 1;
    if v_actual is distinct from r.expected then
      v_bad := v_bad || format('%s.%s[%s]=%s (attendu %s)', r.tbl, r.col, r.priv, v_actual, r.expected);
    end if;
  end loop;
  if array_length(v_bad, 1) > 0 then
    raise exception 'ECHEC T2bis (% colonnes vérifiées) : %', v_checked, array_to_string(v_bad, ' | ');
  end if;
  raise notice 'T2bis OK (% colonnes vérifiées)', v_checked;
end;
$$;

-- T2ter. Privilèges EXECUTE effectifs sur public.est_admin_coach() (Point 5
--        de la demande de validation round 6) — auto-vérifiant.
do $$
declare
  v_bad text[] := array[]::text[];
begin
  if has_function_privilege('public', 'public.est_admin_coach()', 'execute') then
    v_bad := array_append(v_bad, 'public peut exécuter est_admin_coach (devrait être false)');
  end if;
  if has_function_privilege('anon', 'public.est_admin_coach()', 'execute') then
    v_bad := array_append(v_bad, 'anon peut exécuter est_admin_coach (devrait être false)');
  end if;
  if not has_function_privilege('authenticated', 'public.est_admin_coach()', 'execute') then
    v_bad := array_append(v_bad, 'authenticated NE PEUT PAS exécuter est_admin_coach (devrait être true)');
  end if;
  if array_length(v_bad, 1) > 0 then
    raise exception 'ECHEC T2ter : %', array_to_string(v_bad, ', ');
  end if;
  raise notice 'T2ter OK';
end;
$$;

-- T3. Joueur : voit ses propres messages (fixture réelle), pas ceux d'une
--     conversation à laquelle il n'appartient pas.
begin;
  set local role service_role;
  insert into public.messages (sender_id, receiver_id, content)
  values ('9f30757b-0125-4206-8218-22d8743d9029', 'b35afa2e-1fd7-463a-81ca-fc9a18578a35', 'FIXTURE_T3_PROPRE');
  insert into public.messages (sender_id, receiver_id, content)
  values ('b35afa2e-1fd7-463a-81ca-fc9a18578a35', '0e05563e-ea20-4d4a-908f-3fe0867d5932', 'FIXTURE_T3_ETRANGERE');

  do $$
  declare
    v_propre int;
    v_etrangere int;
  begin
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', '{"sub":"9f30757b-0125-4206-8218-22d8743d9029","role":"authenticated"}', true);

    select count(*) into v_propre from public.messages where content = 'FIXTURE_T3_PROPRE';
    select count(*) into v_etrangere from public.messages where content = 'FIXTURE_T3_ETRANGERE';

    if v_propre <> 1 then
      raise exception 'ECHEC T3 : le message propre devrait être visible (compte=%)', v_propre;
    end if;
    if v_etrangere <> 0 then
      raise exception 'ECHEC T3 : un message d''une conversation étrangère est visible (compte=%)', v_etrangere;
    end if;
    raise notice 'T3 OK';
  end;
  $$;
rollback;

-- T4. Utilisateur tiers (ne participant à aucun des deux messages) : ne
--     doit voir NI l'un ni l'autre — test de fuite, fixture réelle.
begin;
  set local role service_role;
  insert into public.messages (sender_id, receiver_id, content)
  values ('9f30757b-0125-4206-8218-22d8743d9029', 'b35afa2e-1fd7-463a-81ca-fc9a18578a35', 'FIXTURE_T4_AB');

  do $$
  declare
    v_count int;
  begin
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', '{"sub":"0e05563e-ea20-4d4a-908f-3fe0867d5932","role":"authenticated"}', true);

    select count(*) into v_count from public.messages where content = 'FIXTURE_T4_AB';
    if v_count <> 0 then
      raise exception 'ECHEC T4 : un tiers voit une conversation à laquelle il n''appartient pas (compte=%)', v_count;
    end if;
    raise notice 'T4 OK';
  end;
  $$;
rollback;

-- T5. Tentative d'INSERT avec sender_id falsifié — usurpation de l'identité
--     d'un AUTRE profil réel, pour isoler le test de la policy WITH CHECK
--     d'une violation de FK accidentelle (l'ancienne version utilisait un
--     uuid inventé, qui aurait échoué pour la mauvaise raison). Doit
--     échouer, et ne laisser aucune trace même sous service_role.
begin;
  do $$
  declare
    v_err text;
  begin
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', '{"sub":"9f30757b-0125-4206-8218-22d8743d9029","role":"authenticated"}', true);

    begin
      insert into public.messages (sender_id, receiver_id, content)
      values ('b35afa2e-1fd7-463a-81ca-fc9a18578a35', '0e05563e-ea20-4d4a-908f-3fe0867d5932', 'FIXTURE_T5_USURPATION');
      raise exception 'ECHEC T5 : l''insertion avec un sender_id falsifié a réussi';
    exception when others then
      v_err := sqlerrm;
      if v_err !~* 'row-level security|policy' then
        raise exception 'ECHEC T5 : erreur inattendue (%)', v_err;
      end if;
    end;

    perform set_config('role', 'service_role', true);
    if exists (select 1 from public.messages where content = 'FIXTURE_T5_USURPATION') then
      raise exception 'ECHEC T5 : la ligne falsifiée existe malgré l''échec attendu';
    end if;
    raise notice 'T5 OK (%)', v_err;
  end;
  $$;
rollback;

-- T6. Parent accepté (fixture réelle dans parents_acces) : lit les messages
--     de l'enfant délégué, même sans en être l'expéditeur ni le
--     destinataire. Scénario décrit seulement en commentaire auparavant —
--     maintenant un test exécutable complet (Point 2 de la demande).
begin;
  set local role service_role;
  insert into public.parents_acces (joueur_id, parent_id, email_invite, statut)
  values ('b35afa2e-1fd7-463a-81ca-fc9a18578a35', '9f30757b-0125-4206-8218-22d8743d9029', 'parent-test-t6@example.com', 'accepte');
  insert into public.messages (sender_id, receiver_id, content)
  values ('b35afa2e-1fd7-463a-81ca-fc9a18578a35', '0e05563e-ea20-4d4a-908f-3fe0867d5932', 'FIXTURE_T6_ENFANT');

  do $$
  declare
    v_count int;
  begin
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', '{"sub":"9f30757b-0125-4206-8218-22d8743d9029","role":"authenticated"}', true);

    select count(*) into v_count from public.messages where content = 'FIXTURE_T6_ENFANT';
    if v_count <> 1 then
      raise exception 'ECHEC T6 : le parent accepté ne voit pas le message de l''enfant délégué (compte=%)', v_count;
    end if;
    raise notice 'T6 OK';
  end;
  $$;
rollback;

-- T7. Joueur : création de demande valide doit réussir (fixture réelle,
--     isolée d'une violation de FK) ; statut falsifié à la création doit
--     échouer.
begin;
  do $$
  declare
    v_count int;
  begin
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', '{"sub":"9f30757b-0125-4206-8218-22d8743d9029","role":"authenticated"}', true);

    insert into public.demandes (joueur_id, titre, poste, description, video_url, statut)
    values ('9f30757b-0125-4206-8218-22d8743d9029', 'FIXTURE_T7_VALIDE', 'Attaquant', 'desc', 'https://example.com/v.mp4', 'en_attente');

    select count(*) into v_count from public.demandes where titre = 'FIXTURE_T7_VALIDE';
    if v_count <> 1 then
      raise exception 'ECHEC T7a : la création valide n''a pas abouti (compte=%)', v_count;
    end if;
    raise notice 'T7a OK';
  end;
  $$;
rollback;

begin;
  do $$
  declare
    v_err text;
  begin
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', '{"sub":"9f30757b-0125-4206-8218-22d8743d9029","role":"authenticated"}', true);

    begin
      insert into public.demandes (joueur_id, titre, poste, description, video_url, statut)
      values ('9f30757b-0125-4206-8218-22d8743d9029', 'FIXTURE_T7_INVALIDE', 'Attaquant', 'desc', 'https://example.com/v.mp4', 'analyse');
      raise exception 'ECHEC T7b : la création avec statut falsifié a réussi';
    exception when others then
      v_err := sqlerrm;
      if v_err !~* 'row-level security|policy' then
        raise exception 'ECHEC T7b : erreur inattendue (%)', v_err;
      end if;
    end;

    perform set_config('role', 'service_role', true);
    if exists (select 1 from public.demandes where titre = 'FIXTURE_T7_INVALIDE') then
      raise exception 'ECHEC T7b : la ligne falsifiée existe malgré l''échec attendu';
    end if;
    raise notice 'T7b OK (%)', v_err;
  end;
  $$;
rollback;

-- T8. Admin coach — privilège colonne (porté par le GRANT, inchangé par le
--     trigger) : interdiction de modifier le contenu soumis par le joueur,
--     même pour un admin légitime sur une ligne qu'il a le droit de
--     modifier par ailleurs. Cœur de la mise en garde initiale de la
--     demande ("une policy ne suffit pas si les colonnes ne sont pas
--     protégées séparément").
begin;
  set local role service_role;
  insert into public.demandes (id, joueur_id, titre, poste, description, video_url, statut)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '0e05563e-ea20-4d4a-908f-3fe0867d5932', 'FIXTURE_T8', 'Attaquant', 'desc', 'https://example.com/v.mp4', 'en_attente');

  do $$
  declare
    v_err text;
  begin
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', '{"sub":"dcbdeaef-a2cb-4869-918f-c2282475c5ea","role":"authenticated"}', true);

    begin
      update public.demandes set titre = 'Titre modifié par admin'
      where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
      raise exception 'ECHEC T8 : la modification de titre par un admin a réussi';
    exception when others then
      v_err := sqlerrm;
      if v_err !~* 'permission denied for column' then
        raise exception 'ECHEC T8 : erreur inattendue, pas une erreur de privilège colonne (%)', v_err;
      end if;
    end;

    perform set_config('role', 'service_role', true);
    if (select titre from public.demandes where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') <> 'FIXTURE_T8' then
      raise exception 'ECHEC T8 : le titre a été modifié malgré l''échec attendu';
    end if;
    raise notice 'T8 OK (%)', v_err;
  end;
  $$;
rollback;

-- T9. Coach non-admin (authenticated quelconque, absent de admins_coach) :
--     toute tentative d'UPDATE sur demandes doit échouer intégralement —
--     soit par une erreur, soit par 0 ligne affectée (la policy USING
--     exclut ce rôle sans lever d'exception sur UPDATE), les deux comptant
--     comme un succès du test tant que le nombre de lignes réellement
--     modifiées est 0.
--
-- Bug trouvé et corrigé ici (Point 1 de la demande de validation round 5,
-- confirmé par un contrôle négatif réel contre la base actuelle, qui n'a
-- pas encore la policy admin) : une première version faisait, à l'intérieur
-- d'un même bloc begin/exception, l'UPDATE PUIS un `raise exception` basé
-- sur v_rows en cas d'échec — mais capturer cette exception dans le
-- `exception when others` qui suit annule, via le savepoint implicite de
-- PL/pgSQL, TOUT ce que ce bloc a fait depuis son début, y compris l'UPDATE
-- lui-même. Le contrôle final relisait donc toujours 'en_attente', que la
-- protection existe ou non — le test "réussissait" silencieusement même
-- contre la base actuelle, sans protection. Corrigé en sortant la décision
-- (raise exception si v_rows <> 0) du bloc try/catch : v_rows est une
-- variable simple, visible après le bloc, non affectée par un rollback de
-- savepoint qui ne s'est jamais produit dans le chemin "succès".
begin;
  set local role service_role;
  insert into public.demandes (id, joueur_id, titre, poste, description, video_url, statut)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '0e05563e-ea20-4d4a-908f-3fe0867d5932', 'FIXTURE_T9', 'Attaquant', 'desc', 'https://example.com/v.mp4', 'en_attente');

  do $$
  declare
    v_rows int;
    v_blocked_by_error boolean := false;
    v_err text;
  begin
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', '{"sub":"b35afa2e-1fd7-463a-81ca-fc9a18578a35","role":"authenticated"}', true);

    begin
      update public.demandes set statut = 'analyse' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
      get diagnostics v_rows = row_count;
    exception when others then
      v_blocked_by_error := true;
      v_err := sqlerrm;
    end;

    if v_blocked_by_error then
      raise notice 'T9 OK (bloqué par une erreur : %)', v_err;
    elsif v_rows = 0 then
      raise notice 'T9 OK (0 ligne affectée)';
    else
      raise exception 'ECHEC T9 : un non-admin a modifié % ligne(s)', v_rows;
    end if;
  end;
  $$;
rollback;

-- ──────────────────────────────────────────────────────────────────────────
-- T10-T16 — trigger verifier_prise_en_charge_demande(). Fixtures réelles,
-- capture d'exception en PL/pgSQL conforme au Point 1 de la demande de
-- validation round 4 (cf. intro de section ci-dessus pour le détail des
-- défauts corrigés par rapport à la version round 3).

-- T10. Réclamation d'une demande LIBRE (pris_en_charge_par IS NULL) : doit
--      réussir, et l'état final doit refléter l'admin qui a réclamé.
begin;
  set local role service_role;
  insert into public.demandes (id, joueur_id, titre, poste, description, video_url, statut)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '0e05563e-ea20-4d4a-908f-3fe0867d5932', 'FIXTURE_T10', 'Attaquant', 'desc', 'https://example.com/v.mp4', 'en_attente');

  do $$
  declare
    v_par uuid;
    v_at timestamptz;
  begin
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', '{"sub":"dcbdeaef-a2cb-4869-918f-c2282475c5ea","role":"authenticated"}', true);

    update public.demandes set pris_en_charge_par = 'dcbdeaef-a2cb-4869-918f-c2282475c5ea', pris_en_charge_at = now()
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

    select pris_en_charge_par, pris_en_charge_at into v_par, v_at
    from public.demandes where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

    if v_par is distinct from 'dcbdeaef-a2cb-4869-918f-c2282475c5ea'::uuid or v_at is null then
      raise exception 'ECHEC T10 : réclamation libre non reflétée en état final (par=%, at=%)', v_par, v_at;
    end if;
    raise notice 'T10 OK';
  end;
  $$;
rollback;

-- T11. Tentative de réclamation d'une demande DÉJÀ attribuée à un autre
--      admin, sans libération préalable : doit échouer ET laisser l'état
--      inchangé (toujours attribuée à l'admin A). Point 1 de la demande de
--      validation round 2.
begin;
  set local role service_role;
  insert into public.demandes (id, joueur_id, titre, poste, description, video_url, statut)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '0e05563e-ea20-4d4a-908f-3fe0867d5932', 'FIXTURE_T11', 'Attaquant', 'desc', 'https://example.com/v.mp4', 'en_attente');

  do $$
  declare
    v_err text;
    v_par uuid;
  begin
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', '{"sub":"dcbdeaef-a2cb-4869-918f-c2282475c5ea","role":"authenticated"}', true);
    update public.demandes set pris_en_charge_par = 'dcbdeaef-a2cb-4869-918f-c2282475c5ea', pris_en_charge_at = now()
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

    perform set_config('request.jwt.claims', '{"sub":"6bb9ff95-23a6-4e12-84db-f84d26a24172","role":"authenticated"}', true);
    begin
      update public.demandes set pris_en_charge_par = '6bb9ff95-23a6-4e12-84db-f84d26a24172', pris_en_charge_at = now()
      where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
      raise exception 'ECHEC T11 : admin B a pu réclamer une demande déjà prise par admin A';
    exception when others then
      v_err := sqlerrm;
      if v_err !~* 'déjà prise en charge' then
        raise exception 'ECHEC T11 : erreur inattendue (%)', v_err;
      end if;
    end;

    select pris_en_charge_par into v_par from public.demandes where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    if v_par is distinct from 'dcbdeaef-a2cb-4869-918f-c2282475c5ea'::uuid then
      raise exception 'ECHEC T11 : l''attribution a changé malgré l''échec attendu (par=%)', v_par;
    end if;
    raise notice 'T11 OK (%)', v_err;
  end;
  $$;
rollback;

-- T12. Libération par son propriétaire : doit réussir, état final NULL.
begin;
  set local role service_role;
  insert into public.demandes (id, joueur_id, titre, poste, description, video_url, statut)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '0e05563e-ea20-4d4a-908f-3fe0867d5932', 'FIXTURE_T12', 'Attaquant', 'desc', 'https://example.com/v.mp4', 'en_attente');

  do $$
  declare
    v_par uuid;
    v_at timestamptz;
  begin
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', '{"sub":"dcbdeaef-a2cb-4869-918f-c2282475c5ea","role":"authenticated"}', true);

    update public.demandes set pris_en_charge_par = 'dcbdeaef-a2cb-4869-918f-c2282475c5ea', pris_en_charge_at = now()
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    update public.demandes set pris_en_charge_par = null, pris_en_charge_at = null
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

    select pris_en_charge_par, pris_en_charge_at into v_par, v_at
    from public.demandes where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    if v_par is not null or v_at is not null then
      raise exception 'ECHEC T12 : la libération par le propriétaire n''a pas abouti (par=%, at=%)', v_par, v_at;
    end if;
    raise notice 'T12 OK';
  end;
  $$;
rollback;

-- T13. Libération par un AUTRE admin que celui qui avait pris en charge :
--      doit réussir — comportement métier actuel préservé à l'identique
--      (déjà non restreint en base aujourd'hui).
begin;
  set local role service_role;
  insert into public.demandes (id, joueur_id, titre, poste, description, video_url, statut)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '0e05563e-ea20-4d4a-908f-3fe0867d5932', 'FIXTURE_T13', 'Attaquant', 'desc', 'https://example.com/v.mp4', 'en_attente');

  do $$
  declare
    v_par uuid;
    v_at timestamptz;
  begin
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', '{"sub":"dcbdeaef-a2cb-4869-918f-c2282475c5ea","role":"authenticated"}', true);
    update public.demandes set pris_en_charge_par = 'dcbdeaef-a2cb-4869-918f-c2282475c5ea', pris_en_charge_at = now()
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

    perform set_config('request.jwt.claims', '{"sub":"6bb9ff95-23a6-4e12-84db-f84d26a24172","role":"authenticated"}', true);
    update public.demandes set pris_en_charge_par = null, pris_en_charge_at = null
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

    select pris_en_charge_par, pris_en_charge_at into v_par, v_at
    from public.demandes where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    if v_par is not null or v_at is not null then
      raise exception 'ECHEC T13 : la libération par un autre admin n''a pas abouti (par=%, at=%)', v_par, v_at;
    end if;
    raise notice 'T13 OK';
  end;
  $$;
rollback;

-- T14. Complétion par un AUTRE admin que celui qui a pris en charge, SANS
--      toucher pris_en_charge_par : doit réussir sans modifier
--      l'attribution — exigence centrale de la révision round 2.
begin;
  set local role service_role;
  insert into public.demandes (id, joueur_id, titre, poste, description, video_url, statut)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '0e05563e-ea20-4d4a-908f-3fe0867d5932', 'FIXTURE_T14', 'Attaquant', 'desc', 'https://example.com/v.mp4', 'en_attente');

  do $$
  declare
    v_par uuid;
    v_statut text;
    v_loom text;
  begin
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', '{"sub":"dcbdeaef-a2cb-4869-918f-c2282475c5ea","role":"authenticated"}', true);
    update public.demandes set pris_en_charge_par = 'dcbdeaef-a2cb-4869-918f-c2282475c5ea', pris_en_charge_at = now()
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

    perform set_config('request.jwt.claims', '{"sub":"6bb9ff95-23a6-4e12-84db-f84d26a24172","role":"authenticated"}', true);
    update public.demandes set statut = 'analyse', loom_url = 'https://loom.com/test'
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

    select pris_en_charge_par, statut, loom_url into v_par, v_statut, v_loom
    from public.demandes where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

    if v_statut <> 'analyse' or v_loom is null then
      raise exception 'ECHEC T14 : la complétion n''a pas abouti (statut=%, loom=%)', v_statut, v_loom;
    end if;
    if v_par is distinct from 'dcbdeaef-a2cb-4869-918f-c2282475c5ea'::uuid then
      raise exception 'ECHEC T14 : réattribution silencieuse détectée (par=%)', v_par;
    end if;
    raise notice 'T14 OK';
  end;
  $$;
rollback;

-- T15. Tentative de réclamation AU NOM D'UN TIERS (pas soi-même, demande
--      libre) : doit échouer ET laisser l'état inchangé.
begin;
  set local role service_role;
  insert into public.demandes (id, joueur_id, titre, poste, description, video_url, statut)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '0e05563e-ea20-4d4a-908f-3fe0867d5932', 'FIXTURE_T15', 'Attaquant', 'desc', 'https://example.com/v.mp4', 'en_attente');

  do $$
  declare
    v_err text;
    v_par uuid;
  begin
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', '{"sub":"dcbdeaef-a2cb-4869-918f-c2282475c5ea","role":"authenticated"}', true);

    begin
      update public.demandes set pris_en_charge_par = '6bb9ff95-23a6-4e12-84db-f84d26a24172', pris_en_charge_at = now()
      where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
      raise exception 'ECHEC T15 : admin A a pu attribuer la demande à admin B';
    exception when others then
      v_err := sqlerrm;
      if v_err !~* 'doit correspondre à votre propre compte' then
        raise exception 'ECHEC T15 : erreur inattendue (%)', v_err;
      end if;
    end;

    select pris_en_charge_par into v_par from public.demandes where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    if v_par is not null then
      raise exception 'ECHEC T15 : la demande a été attribuée malgré l''échec attendu (par=%)', v_par;
    end if;
    raise notice 'T15 OK (%)', v_err;
  end;
  $$;
rollback;

-- T16. Exécution serveur via service_role EXACTEMENT comme PostgREST le
--      fait en réalité : le rôle Postgres `service_role` ET la GUC
--      request.jwt.claims portant "role":"service_role", les deux
--      ensemble (PostgREST les définit toujours ensemble pour un vrai
--      appel service_role — l'un sans l'autre ne suffit pas, cf. l'analyse
--      du Point 5 plus haut dans ce fichier, trouvée justement en essayant
--      de valider ce test). pris_en_charge_par est fixé à un profil RÉEL
--      (PROFIL_A) et non à un uuid inventé — demandes.pris_en_charge_par a
--      une contrainte de clé étrangère vers profiles(id), un uuid inventé
--      aurait fait échouer le test pour une mauvaise raison (violation de
--      FK) plutôt que de prouver quoi que ce soit sur le trigger.
begin;
  set local role service_role;
  insert into public.demandes (id, joueur_id, titre, poste, description, video_url, statut)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '0e05563e-ea20-4d4a-908f-3fe0867d5932', 'FIXTURE_T16', 'Attaquant', 'desc', 'https://example.com/v.mp4', 'en_attente');

  do $$
  declare
    v_par uuid;
  begin
    perform set_config('role', 'service_role', true);
    perform set_config('request.jwt.claims', '{"role":"service_role"}', true);

    update public.demandes set pris_en_charge_par = '9f30757b-0125-4206-8218-22d8743d9029', pris_en_charge_at = now()
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

    select pris_en_charge_par into v_par from public.demandes where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    if v_par is distinct from '9f30757b-0125-4206-8218-22d8743d9029'::uuid then
      raise exception 'ECHEC T16 : le bypass service_role n''a pas fonctionné (par=%)', v_par;
    end if;
    raise notice 'T16 OK';
  end;
  $$;
rollback;

-- T17. Matrice d'accès SELECT sur demandes pour les 4 catégories de
--      lecteurs (Point 5 de la demande de validation round 6, sur la
--      policy admin_coach_lit_demandes corrigée via est_admin_coach()) :
--      joueur propriétaire, parent accepté, admin coach, utilisateur
--      tiers. C'est le test qui aurait révélé le bug "permission denied
--      for table admins_coach" si la policy n'avait pas été corrigée —
--      le cas joueur, en particulier, échouait avant le correctif.
begin;
  set local role service_role;
  insert into public.demandes (id, joueur_id, titre, poste, description, video_url, statut)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'b35afa2e-1fd7-463a-81ca-fc9a18578a35', 'FIXTURE_T17', 'Attaquant', 'desc', 'https://example.com/v.mp4', 'en_attente');
  insert into public.parents_acces (joueur_id, parent_id, email_invite, statut)
  values ('b35afa2e-1fd7-463a-81ca-fc9a18578a35', '9f30757b-0125-4206-8218-22d8743d9029', 'parent-test-t17@example.com', 'accepte');

  do $$
  declare
    v_count int;
  begin
    -- Joueur propriétaire (PROFIL_B) : doit voir sa propre demande.
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', '{"sub":"b35afa2e-1fd7-463a-81ca-fc9a18578a35","role":"authenticated"}', true);
    select count(*) into v_count from public.demandes where titre = 'FIXTURE_T17';
    if v_count <> 1 then
      raise exception 'ECHEC T17 (joueur) : compte=%', v_count;
    end if;

    -- Parent accepté (PROFIL_A) : doit voir la demande de son enfant délégué.
    perform set_config('request.jwt.claims', '{"sub":"9f30757b-0125-4206-8218-22d8743d9029","role":"authenticated"}', true);
    select count(*) into v_count from public.demandes where titre = 'FIXTURE_T17';
    if v_count <> 1 then
      raise exception 'ECHEC T17 (parent) : compte=%', v_count;
    end if;

    -- Admin coach (ADMIN_A) : doit voir la demande, quel que soit joueur_id.
    perform set_config('request.jwt.claims', '{"sub":"dcbdeaef-a2cb-4869-918f-c2282475c5ea","role":"authenticated"}', true);
    select count(*) into v_count from public.demandes where titre = 'FIXTURE_T17';
    if v_count <> 1 then
      raise exception 'ECHEC T17 (admin) : compte=%', v_count;
    end if;

    -- Tiers (PROFIL_C) : ni joueur, ni parent, ni admin — doit voir 0.
    perform set_config('request.jwt.claims', '{"sub":"0e05563e-ea20-4d4a-908f-3fe0867d5932","role":"authenticated"}', true);
    select count(*) into v_count from public.demandes where titre = 'FIXTURE_T17';
    if v_count <> 0 then
      raise exception 'ECHEC T17 (tiers) : compte=%', v_count;
    end if;

    raise notice 'T17 OK';
  end;
  $$;
rollback;

-- ──────────────────────────────────────────────────────────────────────────
-- T18-T23 — trigger decrementer_credit_demande() (round 8, crédit
-- analyses_restantes). Même méthode que T10-T17 : fixtures réelles,
-- capture d'exception en PL/pgSQL, vérification explicite de l'état final.
-- PROFIL_B (b35afa2e-1fd7-463a-81ca-fc9a18578a35) est utilisé comme le
-- "joueur" de ces tests ; sa valeur analyses_restantes réelle est modifiée
-- puis annulée par le rollback de chaque transaction — jamais de
-- persistance.

-- T18. Crédit disponible (2) : doit réussir, décrément exact à 1.
begin;
  set local role service_role;
  update public.profiles set analyses_restantes = 2 where id = 'b35afa2e-1fd7-463a-81ca-fc9a18578a35';

  do $$
  declare
    v_credit int;
  begin
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', '{"sub":"b35afa2e-1fd7-463a-81ca-fc9a18578a35","role":"authenticated"}', true);

    insert into public.demandes (joueur_id, titre, poste, description, video_url, statut)
    values ('b35afa2e-1fd7-463a-81ca-fc9a18578a35', 'FIXTURE_T18', 'Attaquant', 'desc', 'https://example.com/v.mp4', 'en_attente');

    perform set_config('role', 'service_role', true);
    select analyses_restantes into v_credit from public.profiles where id = 'b35afa2e-1fd7-463a-81ca-fc9a18578a35';
    if v_credit <> 1 then
      raise exception 'ECHEC T18 : credit=% (attendu 1)', v_credit;
    end if;
    raise notice 'T18 OK';
  end;
  $$;
rollback;

-- T19. Crédit nul (0) : doit échouer, aucune demande créée, crédit reste 0.
begin;
  set local role service_role;
  update public.profiles set analyses_restantes = 0 where id = 'b35afa2e-1fd7-463a-81ca-fc9a18578a35';

  do $$
  declare
    v_err text;
    v_credit int;
    v_count int;
  begin
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', '{"sub":"b35afa2e-1fd7-463a-81ca-fc9a18578a35","role":"authenticated"}', true);

    begin
      insert into public.demandes (joueur_id, titre, poste, description, video_url, statut)
      values ('b35afa2e-1fd7-463a-81ca-fc9a18578a35', 'FIXTURE_T19', 'Attaquant', 'desc', 'https://example.com/v.mp4', 'en_attente');
      raise exception 'ECHEC T19 : insert a réussi malgré credit=0';
    exception when others then
      v_err := sqlerrm;
      if v_err !~ 'Aucune analyse restante' then
        raise exception 'ECHEC T19 : erreur inattendue (%)', v_err;
      end if;
    end;

    perform set_config('role', 'service_role', true);
    select analyses_restantes into v_credit from public.profiles where id = 'b35afa2e-1fd7-463a-81ca-fc9a18578a35';
    select count(*) into v_count from public.demandes where titre = 'FIXTURE_T19';
    if v_credit <> 0 or v_count <> 0 then
      raise exception 'ECHEC T19 : credit=%, demandes=% (attendu 0, 0)', v_credit, v_count;
    end if;
    raise notice 'T19 OK (%)', v_err;
  end;
  $$;
rollback;

-- T20. Crédit NULL : doit échouer, rester NULL (jamais -1).
begin;
  set local role service_role;
  update public.profiles set analyses_restantes = null where id = 'b35afa2e-1fd7-463a-81ca-fc9a18578a35';

  do $$
  declare
    v_err text;
    v_credit int;
  begin
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', '{"sub":"b35afa2e-1fd7-463a-81ca-fc9a18578a35","role":"authenticated"}', true);

    begin
      insert into public.demandes (joueur_id, titre, poste, description, video_url, statut)
      values ('b35afa2e-1fd7-463a-81ca-fc9a18578a35', 'FIXTURE_T20', 'Attaquant', 'desc', 'https://example.com/v.mp4', 'en_attente');
      raise exception 'ECHEC T20 : insert a réussi malgré credit=NULL';
    exception when others then
      v_err := sqlerrm;
      if v_err !~ 'Aucune analyse restante' then
        raise exception 'ECHEC T20 : erreur inattendue (%)', v_err;
      end if;
    end;

    perform set_config('role', 'service_role', true);
    select analyses_restantes into v_credit from public.profiles where id = 'b35afa2e-1fd7-463a-81ca-fc9a18578a35';
    if v_credit is not null then
      raise exception 'ECHEC T20 : credit=% (attendu NULL, pas -1)', v_credit;
    end if;
    raise notice 'T20 OK (%)', v_err;
  end;
  $$;
rollback;

-- T21. Concurrence : crédit=1, deux tentatives de création pour le même
--      joueur. Proxy séquentiel de la concurrence réelle — même limite
--      honnête déjà posée pour T11 : un script SQL mono-session ne peut pas
--      représenter deux connexions réellement simultanées. La garantie de
--      non-double-consommation repose sur le verrouillage de ligne Postgres
--      standard sur l'UPDATE du trigger (même mécanisme déjà vérifié pour
--      pris_en_charge_par) : la seconde transaction concurrente attend que
--      la première ait validé, puis relit la valeur réellement commitée —
--      jamais les deux ne peuvent lire "1 crédit disponible" simultanément
--      sur la même ligne.
begin;
  set local role service_role;
  update public.profiles set analyses_restantes = 1 where id = 'b35afa2e-1fd7-463a-81ca-fc9a18578a35';

  do $$
  declare
    v_err text;
    v_credit int;
    v_count int;
  begin
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', '{"sub":"b35afa2e-1fd7-463a-81ca-fc9a18578a35","role":"authenticated"}', true);

    insert into public.demandes (joueur_id, titre, poste, description, video_url, statut)
    values ('b35afa2e-1fd7-463a-81ca-fc9a18578a35', 'FIXTURE_T21_A', 'Attaquant', 'desc', 'https://example.com/v.mp4', 'en_attente');

    begin
      insert into public.demandes (joueur_id, titre, poste, description, video_url, statut)
      values ('b35afa2e-1fd7-463a-81ca-fc9a18578a35', 'FIXTURE_T21_B', 'Attaquant', 'desc', 'https://example.com/v.mp4', 'en_attente');
      raise exception 'ECHEC T21 : la 2e insertion a réussi avec un seul crédit';
    exception when others then
      v_err := sqlerrm;
      if v_err !~ 'Aucune analyse restante' then
        raise exception 'ECHEC T21 : erreur inattendue (%)', v_err;
      end if;
    end;

    perform set_config('role', 'service_role', true);
    select analyses_restantes into v_credit from public.profiles where id = 'b35afa2e-1fd7-463a-81ca-fc9a18578a35';
    select count(*) into v_count from public.demandes where titre like 'FIXTURE_T21_%';
    if v_credit <> 0 or v_count <> 1 then
      raise exception 'ECHEC T21 : credit=%, demandes creees=% (attendu 0, 1)', v_credit, v_count;
    end if;
    raise notice 'T21 OK (%)', v_err;
  end;
  $$;
rollback;

-- T22. Le trigger décrémente, PUIS l'INSERT échoue pour une raison
--      indépendante (tentative de création pour un tiers, WITH CHECK de
--      joueur_cree_sa_demande) : le décrément doit être annulé avec le
--      reste de l'instruction — PROFIL_A connecté, joueur_id=PROFIL_B.
begin;
  set local role service_role;
  update public.profiles set analyses_restantes = 1 where id = 'b35afa2e-1fd7-463a-81ca-fc9a18578a35';

  do $$
  declare
    v_err text;
    v_credit int;
  begin
    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', '{"sub":"9f30757b-0125-4206-8218-22d8743d9029","role":"authenticated"}', true);

    begin
      insert into public.demandes (joueur_id, titre, poste, description, video_url, statut)
      values ('b35afa2e-1fd7-463a-81ca-fc9a18578a35', 'FIXTURE_T22', 'Attaquant', 'desc', 'https://example.com/v.mp4', 'en_attente');
      raise exception 'ECHEC T22 : création pour un tiers a réussi';
    exception when others then
      v_err := sqlerrm;
      if v_err !~* 'row-level security|policy' then
        raise exception 'ECHEC T22 : erreur inattendue (%)', v_err;
      end if;
    end;

    perform set_config('role', 'service_role', true);
    select analyses_restantes into v_credit from public.profiles where id = 'b35afa2e-1fd7-463a-81ca-fc9a18578a35';
    if v_credit <> 1 then
      raise exception 'ECHEC T22 : credit=% (attendu 1, décrément du trigger non annulé)', v_credit;
    end if;
    raise notice 'T22 OK (%)', v_err;
  end;
  $$;
rollback;

-- T23. Confirme qu'authenticated ne peut plus modifier analyses_restantes
--      directement — GRANT retiré dans supabase_fix_profiles_rls_stripe.sql
--      (fichier séparé). Ce test ne peut être validé qu'une fois CE fichier
--      également appliqué — même limite honnête que T2bis.
do $$
begin
  if has_column_privilege('authenticated', 'public.profiles', 'analyses_restantes', 'update') then
    raise exception 'ECHEC T23 : authenticated peut encore modifier analyses_restantes directement';
  end if;
  if has_column_privilege('authenticated', 'public.profiles', 'analyses_restantes', 'insert') then
    raise exception 'ECHEC T23 : authenticated peut encore insérer analyses_restantes directement';
  end if;
  raise notice 'T23 OK';
end;
$$;
