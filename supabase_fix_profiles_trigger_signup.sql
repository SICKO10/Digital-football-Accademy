-- Complément à supabase_fix_profiles_rls_stripe.sql — nécessaire pour que les
-- inscriptions gratuites et le parrainage continuent de fonctionner une fois
-- plan/abonnement_actif/email/parrain_id bloqués en écriture côté client.
--
-- handle_new_user() (trigger AFTER INSERT ON auth.users, SECURITY DEFINER —
-- bypass RLS et les GRANT/REVOKE par nature) devient donc la SEULE source de
-- vérité pour ces colonnes à la création du compte.
--
-- Durci suite à la demande de validation du 2026-10-09 (point 1) : le plan
-- n'est plus simplement lu tel quel depuis les metadata (contrôlées par le
-- client, donc falsifiables via un appel direct à l'API Auth en dehors de
-- l'UI) — il est validé contre une liste explicite v_plans_valides, et
-- l'activation gratuite est limitée à une liste explicite SÉPARÉE
-- v_plans_gratuits (aujourd'hui : seulement 'joueur_starter'). Même si un
-- client forge des metadata avec un plan hors liste, ou tente de passer
-- abonnement_actif/stripe_* directement (impossible de toute façon : seul le
-- champ `plan` est lu depuis les metadata, les autres colonnes sensibles ne
-- sont jamais lues depuis raw_user_meta_data), le résultat reste sûr.
--
-- NE PAS EXÉCUTER SANS VALIDATION EXPLICITE.

begin;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_plan text;
  v_parrain_id uuid;
  -- Liste explicite des plans acceptés à l'inscription — identique à la
  -- CHECK constraint de profiles.plan, répétée ici pour que la règle soit
  -- lisible et auditable directement dans ce trigger, sans dépendre
  -- implicitement d'une contrainte définie ailleurs. 'dirigeant' n'est pas
  -- un plan auto-inscriptible en pratique (créé uniquement via
  -- AcceptInvite.jsx, jamais via signUp() public) mais reste listé ici car
  -- la CHECK constraint l'autorise — un éventuel futur flux d'auto-
  -- inscription dirigeant resterait couvert sans y repenser.
  v_plans_valides text[] := array['joueur_starter','joueur_pro','educateur','scout','club','dirigeant'];
  -- Liste explicite, séparée, des plans activés GRATUITEMENT dès
  -- l'inscription (sans paiement Stripe). Aujourd'hui : uniquement
  -- joueur_starter. Toute extension future de cette liste doit être une
  -- décision produit explicite, pas un effet de bord.
  v_plans_gratuits text[] := array['joueur_starter'];
begin
  v_plan := new.raw_user_meta_data->>'plan';
  if v_plan is null or not (v_plan = any(v_plans_valides)) then
    v_plan := 'joueur_starter';
  end if;

  -- parrain_id : valeur libre côté client (metadata de signUp(), donc
  -- falsifiable par un appel direct à l'API Auth) — jamais fait confiance
  -- telle quelle. Un format invalide ferait échouer le cast ::uuid, et un id
  -- bien formé mais inexistant (lien copié puis compte parrain supprimé
  -- depuis) ferait échouer la contrainte FK — dans les deux cas, ça ferait
  -- échouer TOUTE la transaction d'inscription (le trigger tourne dans la
  -- même transaction que la création du compte Auth), pas seulement
  -- l'attribution du parrainage. Neutralisé silencieusement ici plutôt que
  -- de laisser un lien de parrainage mal formé ou périmé bloquer
  -- l'inscription elle-même.
  begin
    v_parrain_id := nullif(new.raw_user_meta_data->>'parrain_id', '')::uuid;
  exception when invalid_text_representation then
    v_parrain_id := null;
  end;
  if v_parrain_id is not null and not exists (select 1 from public.profiles where id = v_parrain_id) then
    v_parrain_id := null;
  end if;

  insert into public.profiles (
    id, email, prenom, nom, plan, club, analyses_restantes,
    abonnement_actif, parrain_id
  )
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'prenom',
    new.raw_user_meta_data->>'nom',
    v_plan,
    new.raw_user_meta_data->>'club',
    0,
    v_plan = any(v_plans_gratuits),
    v_parrain_id
  )
  on conflict (id) do nothing;
  return new;
end;
$function$;

-- Dépendance RPC trouvée en vérifiant les 14 fonctions appelées depuis le
-- client (supabase.rpc(...)) : 13 sont déjà SECURITY DEFINER (bypass RLS et
-- GRANT par nature, inaffectées), 1 référence une fonction inexistante en
-- base (lister_roster_tournoi — déjà cassée aujourd'hui, sans rapport avec ce
-- correctif). La 14e, increment_analyses, est SECURITY INVOKER (tourne avec
-- les droits de l'appelant) et fait `UPDATE profiles SET analyses_restantes
-- = ... WHERE id = profile_id`. Elle est appelée depuis deux endroits :
--   - stripe-webhook/index.ts (service_role) — inaffectée dans tous les cas.
--   - src/pages/coach/Referrals.jsx:74 (panneau admin coach, accès restreint
--     à COACH_ADMIN_EMAILS) : crédite 2 analyses à un PARRAIN après qu'un
--     filleul paie l'offre annuelle. L'appelant (le compte coach/admin)
--     n'est JAMAIS le parrain lui-même, et n'a ni relation staff_club ni
--     dirigeant_acces avec lui — la policy UPDATE de
--     supabase_fix_profiles_rls_stripe.sql filtrerait silencieusement cette
--     ligne (0 ligne affectée, aucune erreur levée, juste plus aucun crédit
--     accordé). Corrigé ici en alignant cette fonction sur le même pattern
--     que les 13 autres. ATTENTION : passer juste en SECURITY DEFINER sans
--     rien d'autre ouvrirait un trou NEUF (pas présent aujourd'hui tel quel,
--     cf. ci-dessous) : n'importe quel utilisateur authentifié pourrait
--     s'auto-créditer un nombre arbitraire d'analyses pour N'IMPORTE QUEL
--     profile_id, pas seulement le sien — un DEFINER bypass RLS pour
--     TOUT appelant, pas seulement l'admin.
--
-- Durci une seconde fois suite à la demande de validation du 2026-10-10,
-- sur 4 axes :
--
--   1. Rôle contrôlé côté serveur plutôt qu'une liste d'emails en dur dans le
--      code de la fonction : nouvelle table public.admins_coach (une ligne
--      par utilisateur admin, par user_id). Ajouter/retirer un admin devient
--      un INSERT/DELETE sur cette table, pas une modification de fonction à
--      redéployer — et ça désynchronise plus difficilement de la vraie liste
--      que la constante JS COACH_ADMIN_EMAILS, qui reste la source pour le
--      ROUTAGE (App.jsx) mais n'est plus dupliquée en dur ici.
--
--   2. EXECUTE sur cette fonction était accordé à PUBLIC par défaut (créé
--      sans REVOKE explicite) — donc littéralement accessible à `anon`, un
--      visiteur non connecté pouvait TENTER l'appel (il aurait échoué sur la
--      vérification d'autorisation, mais l'exposition elle-même n'avait pas
--      lieu d'être). Retiré ci-dessous : seuls authenticated et service_role
--      gardent EXECUTE.
--
--   3. Borne sur `delta` : aucune limite auparavant, un admin (ou un appel
--      malformé) aurait pu passer une valeur négative (débiter quelqu'un) ou
--      absurdement grande. La seule valeur légitime observée dans le code est
--      delta=2 (Referrals.jsx, palier 3) côté admin, et delta=1 ou 2 côté
--      webhook Stripe (crediterAnalyses). Borné à [1,5] — large pour ne
--      jamais bloquer un usage légitime existant ou proche, strict pour tout
--      le reste. Appliqué INCONDITIONNELLEMENT, y compris aux appels
--      service_role (le webhook n'utilise jamais plus de 2 ; coûte rien de
--      le vérifier aussi là, filet de sécurité supplémentaire bon marché).
--
--   4. Légitimité du bénéficiaire : la fonction exige désormais qu'une ligne
--      parrainage_recompenses (parrain_id = profile_id, palier = 3) existe
--      déjà AVANT l'appel — exactement la séquence réelle de accorder() dans
--      Referrals.jsx (insert de la récompense PUIS appel RPC). Un compte
--      admin ne peut donc plus créditer un profil arbitraire même par erreur
--      ou via un appel RPC construit à la main hors de l'UI : il faut qu'une
--      vraie opération de parrainage palier 3 ait été enregistrée pour ce
--      bénéficiaire précis. Non dupliqué : le seuil "9 filleuls payants" lui-
--      même n'est PAS recalculé ici (il vit uniquement dans Referrals.jsx) —
--      un admin humain le vérifie visuellement avant de cliquer "Accorder",
--      cette fonction vérifie seulement qu'il l'a fait, pas le chiffre brut.
create table if not exists public.admins_coach (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins_coach enable row level security;
-- Aucune policy créée = accès refusé par défaut à anon/authenticated une
-- fois RLS active (deny-by-default) ; increment_analyses (SECURITY DEFINER)
-- continue d'y lire sans restriction, RLS ne s'applique jamais au
-- propriétaire d'une fonction DEFINER.
revoke all on public.admins_coach from anon, authenticated;

insert into public.admins_coach (user_id) values
  ('dcbdeaef-a2cb-4869-918f-c2282475c5ea'), -- legacyattitude@gmail.com
  ('6bb9ff95-23a6-4e12-84db-f84d26a24172')   -- januariojimmy@gmail.com
on conflict (user_id) do nothing;

-- La RPC get_coach_contacts() (pour DashboardJoueur.jsx:852, cf. demande de
-- validation du 2026-10-10) vit dans supabase_fix_profiles_public_view.sql,
-- pas ici : elle renvoie `setof public.profiles_public`, qui n'existe qu'une
-- fois ce fichier-ci ET la vue exécutés — cf. ordre de déploiement, elle ne
-- peut être créée qu'APRÈS la vue (étape 2), alors que admins_coach
-- (ci-dessus) est créée à l'étape 1.

-- Audit du 2026-10-10 (priorité 2, parrainage_recompenses) : la vérification
-- "une ligne palier=3 existe" (version précédente de cette fonction) empêche
-- de créditer un bénéficiaire SANS récompense enregistrée, mais n'empêche
-- PAS de créditer DEUX FOIS le MÊME bénéficiaire déjà récompensé — rien
-- n'empêchait d'appeler increment_analyses(X, 2) deux fois de suite (ou deux
-- fois en parallèle) tant que la ligne palier=3 existe toujours. Corrigé en
-- ajoutant une colonne analyses_creditees (claim atomique par UPDATE ...
-- WHERE analyses_creditees = false — pattern standard Postgres, sûr sous
-- concurrence réelle : la 2e transaction concurrente bloque sur le verrou de
-- ligne jusqu'à ce que la 1re commite, puis réévalue son WHERE contre l'état
-- commité — analyses_creditees étant alors déjà true, elle ne trouve plus la
-- ligne et échoue proprement, jamais de double crédit).
alter table public.parrainage_recompenses
  add column if not exists analyses_creditees boolean not null default false;

-- Durci une 3e fois suite à la demande de validation du 2026-10-10 (relecture
-- du script par un tiers) :
--   - point 2 : le dernier UPDATE (crédit effectif sur profiles) n'était pas
--     vérifié — si profile_id ne correspondait à aucune ligne (compte
--     supprimé entre temps, id mal formé transmis par erreur...), la fonction
--     retournait un succès silencieux sans avoir rien crédité. Ajout d'un
--     GET DIAGNOSTICS après ce UPDATE aussi, même principe que le claim
--     atomique sur parrainage_recompenses juste au-dessus.
--   - point 1 (idempotence webhook Stripe) : PAS traité ici, volontairement.
--     La protection analyses_creditees/parrainage_recompenses est spécifique
--     à la récompense de parrainage (palier 3) — elle n'a pas de sens pour
--     la branche service_role, qui crédite le PAYEUR lui-même à chaque
--     échéance Stripe (invoice.paid), un flux métier totalement différent
--     (pas de ligne parrainage_recompenses impliquée du tout). La vraie
--     protection contre un même événement Stripe traité deux fois doit vivre
--     côté webhook (stripe-webhook/index.ts), qui a accès à stripe_event_id
--     — increment_analyses ne le reçoit même pas en paramètre aujourd'hui.
--     Diff proposé séparément plus bas dans ce fichier (section WEBHOOK
--     STRIPE — IDEMPOTENCE), pas un changement SQL.
create or replace function public.increment_analyses(profile_id uuid, delta integer)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_lignes_reclamees integer;
  v_lignes_creditees integer;
begin
  if delta is null or delta < 1 or delta > 5 then
    raise exception 'Montant de crédit invalide';
  end if;

  if auth.role() <> 'service_role' then
    if not exists (select 1 from public.admins_coach where user_id = auth.uid()) then
      raise exception 'Non autorisé';
    end if;

    -- Claim atomique : ne passe à true que si c'était encore false, et le
    -- UPDATE lui-même sert de verrou — deux appels concurrents pour le même
    -- parrain ne peuvent pas tous les deux réussir cette ligne.
    update public.parrainage_recompenses
    set analyses_creditees = true
    where parrain_id = profile_id and palier = 3 and analyses_creditees = false;
    get diagnostics v_lignes_reclamees = row_count;
    if v_lignes_reclamees = 0 then
      raise exception 'Aucune récompense palier 3 en attente de crédit pour ce profil (déjà créditée, ou non enregistrée)';
    end if;
  end if;

  update profiles set analyses_restantes = coalesce(analyses_restantes, 0) + delta where id = profile_id;
  get diagnostics v_lignes_creditees = row_count;
  if v_lignes_creditees = 0 then
    raise exception 'Profil introuvable, crédit non appliqué (id=%)', profile_id;
  end if;
end;
$function$;

revoke execute on function public.increment_analyses(uuid, integer) from public, anon;
grant execute on function public.increment_analyses(uuid, integer) to authenticated, service_role;

commit;

-- ──────────────────────────────────────────────────────────────────────────
-- WEBHOOK STRIPE — IDEMPOTENCE (point 1 de la demande de validation du
-- 2026-10-10). Changement de CODE (supabase/functions/stripe-webhook/index.ts),
-- pas de SQL — nécessite un `supabase functions deploy stripe-webhook`
-- séparé, PAS encore fait. Décrit ici pour revue avant toute action.
--
-- Constat vérifié en relisant le fichier : `enregistrerPaiement()` (L.90-105)
-- est déjà idempotent via `upsert(..., { onConflict: 'stripe_event_id',
-- ignoreDuplicates: true })` — Stripe peut renvoyer le même événement
-- plusieurs fois (garanti "au moins une fois", pas "exactement une fois"),
-- et ça empêche bien de compter un paiement en double dans la table
-- `paiements`. MAIS `crediterAnalyses()` (L.67-70, qui appelle
-- increment_analyses) est appelée en PARALLÈLE de cet upsert, pas
-- CONDITIONNÉE par son résultat : si Stripe redélivre invoice.paid, le
-- paiement n'est pas recompté (upsert ignore le doublon), mais
-- crediterAnalyses(profileId, 3) ou crediterAnalyses(profileId, 1) s'exécute
-- QUAND MÊME une 2e fois, créditant deux fois pour le même événement réel.
-- Même défaut sur checkout.session.completed (L.242-247) pour l'analyse à
-- l'unité — pire : crediterAnalyses y est appelée AVANT enregistrerPaiement,
-- aucun garde-fou du tout avant le crédit.
--
-- Correctif proposé : faire renvoyer à enregistrerPaiement() si l'événement
-- était RÉELLEMENT nouveau (insert effectif) ou un doublon déjà vu (ignoré
-- par le ON CONFLICT), en ajoutant `.select('id')` à l'upsert — un upsert
-- ignoreDuplicates sur un conflit ne RETURNING rien pour la ligne en
-- conflit, donc `data.length > 0` signifie "c'était un nouvel événement".
-- Les crédits ne s'exécutent plus que si c'est le cas.
--
-- AVANT (L.90-105) :
--   async function enregistrerPaiement({ profileId, montant, typeUtilisateur, cycle, stripeEventId }: {
--     profileId: string | null
--     montant: number
--     typeUtilisateur: string | null
--     cycle: 'mensuel' | 'annuel' | 'unite'
--     stripeEventId: string
--   }) {
--     const { error } = await supabaseAdmin.from('paiements').upsert({
--       profile_id: profileId,
--       montant,
--       type_utilisateur: typeUtilisateur,
--       cycle,
--       stripe_event_id: stripeEventId,
--     }, { onConflict: 'stripe_event_id', ignoreDuplicates: true })
--     if (error) console.error('[stripe-webhook] erreur enregistrerPaiement', error)
--   }
--
-- APRÈS — renvoie désormais un booléen (true = événement nouveau, à
-- traiter ; false = doublon déjà traité, ou erreur — les deux cas doivent
-- bloquer tout crédit supplémentaire par prudence) :
--   async function enregistrerPaiement({ profileId, montant, typeUtilisateur, cycle, stripeEventId }: {
--     profileId: string | null
--     montant: number
--     typeUtilisateur: string | null
--     cycle: 'mensuel' | 'annuel' | 'unite'
--     stripeEventId: string
--   }): Promise<boolean> {
--     const { data, error } = await supabaseAdmin.from('paiements').upsert({
--       profile_id: profileId,
--       montant,
--       type_utilisateur: typeUtilisateur,
--       cycle,
--       stripe_event_id: stripeEventId,
--     }, { onConflict: 'stripe_event_id', ignoreDuplicates: true }).select('id')
--     if (error) { console.error('[stripe-webhook] erreur enregistrerPaiement', error); return false }
--     return (data?.length ?? 0) > 0
--   }
--
-- Site d'appel 1 — checkout.session.completed, analyse à l'unité (L.242-247),
-- AVANT :
--   await crediterAnalyses(profileId, 1)
--   await enregistrerPaiement({ profileId, montant, typeUtilisateur: 'joueur', cycle: 'unite', stripeEventId: event.id })
-- APRÈS (inverse l'ordre — enregistrer d'abord, créditer seulement si nouveau) :
--   const estNouveau = await enregistrerPaiement({ profileId, montant, typeUtilisateur: 'joueur', cycle: 'unite', stripeEventId: event.id })
--   if (estNouveau) await crediterAnalyses(profileId, 1)
--
-- Site d'appel 2 — invoice.paid (L.343-368), AVANT :
--   await enregistrerPaiement({ profileId, montant, typeUtilisateur: estClub ? 'club' : familyFromPlan(profil?.plan), cycle, stripeEventId: event.id })
--   if (cycle === 'annuel') {
--     await crediterAnalyses(profileId, 3)
--     ...update abonnement_actif...
--   } else {
--     ...update abonnement_mois_payes...
--     if (nouveauCompte % 6 === 0) await crediterAnalyses(profileId, 1)
--   }
-- APRÈS (tout le bloc devient conditionnel à estNouveau — y compris les
-- mises à jour abonnement_actif/abonnement_mois_payes : un événement
-- redélivré ne doit pas non plus réincrémenter abonnement_mois_payes une
-- 2e fois, même défaut de fond, pas seulement sur le crédit d'analyses) :
--   const estNouveau = await enregistrerPaiement({ profileId, montant, typeUtilisateur: estClub ? 'club' : familyFromPlan(profil?.plan), cycle, stripeEventId: event.id })
--   if (!estNouveau) {
--     console.log('[stripe-webhook] invoice.paid: événement déjà traité (stripe_event_id en doublon), aucune action supplémentaire')
--     break
--   }
--   if (cycle === 'annuel') {
--     await crediterAnalyses(profileId, 3)
--     ...update abonnement_actif... (inchangé)
--   } else {
--     ...update abonnement_mois_payes... (inchangé)
--     if (nouveauCompte % 6 === 0) await crediterAnalyses(profileId, 1)
--   }
--
-- PAS encore appliqué à supabase/functions/stripe-webhook/index.ts, ni
-- déployé. Nécessitera un redéploiement de cette Edge Function séparément
-- des 6 étapes SQL/JS déjà planifiées — peut se faire à n'importe quel
-- moment par rapport à elles (aucune dépendance croisée : ce correctif ne
-- touche ni profiles ni ses policies/grants).
--
-- ──────────────────────────────────────────────────────────────────────────
-- PARCOURS RÉELS vs CODE MORT — vérifié via grep sur tout le repo (aucun lien
-- `href`/`navigate()` ne pointe vers ces routes ailleurs que leur propre
-- fichier) :
--   - src/pages/RegisterChoix.jsx (route /register-choix) : commentaire
--     d'en-tête "Brouillon — page autonome, non liée au funnel d'inscription
--     principal", liens Stripe '#todo-stripe-...' littéraux (un paiement n'y
--     aboutit jamais). Inutilisable en l'état — NON modifié ci-dessous (voir
--     point 4).
--   - src/pages/RegisterRecruteur.jsx (route /register-recruteur) :
--     fonctionnel (vrais liens Stripe, vraie case CGU), mais non lié non plus
--     depuis aucune page réelle — accessible seulement par URL directe/lien
--     externe. Corrigé par cohérence/défense en profondeur (point 3).
--   - Les 2 VRAIS parcours empruntés par un visiteur normal sont tous les
--     deux DANS src/pages/Register.jsx : inscrire() (joueur_starter/
--     joueur_pro/educateur/scout — un seul formulaire, 4 issues) et
--     ClubWizard.creerCompte() (club, wizard 3 étapes séparé).
--
-- Changements JS requis en complément (PAS encore appliqués — à valider) :
--
-- 1. src/pages/Register.jsx — inscrire(), le VRAI parcours joueur/éducateur/
--    recruteur (L.217-236 dans l'état actuel) :
--
--    AVANT :
--      const { data, error } = await supabase.auth.signUp({
--        email, password,
--        options: { data: { prenom: prenom.trim(), nom: nom.trim(), plan } },
--      })
--      ...
--      const { error: profilErr } = await supabase.from('profiles').upsert({
--        id: userId, prenom: prenom.trim(), nom: nom.trim(),
--        email: email.trim().toLowerCase(), plan,
--        abonnement_actif: !!profilChoisi.gratuit,
--        abonnement_debut: profilChoisi.gratuit ? new Date().toISOString() : null,
--        ...(refParrainId ? { parrain_id: refParrainId } : {}),
--      })
--      if (profilErr) console.error(...)
--
--    APRÈS :
--      const { data, error } = await supabase.auth.signUp({
--        email, password,
--        options: { data: {
--          prenom: prenom.trim(), nom: nom.trim(), plan,
--          ...(refParrainId ? { parrain_id: refParrainId } : {}),
--        } },
--      })
--      // L'upsert() qui suivait devient inutile : prenom/nom/plan/
--      // abonnement_actif/parrain_id sont désormais TOUS gérés par le
--      // trigger via les metadata ci-dessus ; email vient déjà de auth.users.
--      // Supprimé entièrement plutôt que laissé comme appel vide.
--
-- 2. src/pages/Register.jsx — ClubWizard.creerCompte() (L.629-641 actuel) :
--
--    AVANT :
--      const { error: profilErr } = await supabase.from('profiles').upsert({
--        id: uid, prenom: prenom.trim(), nom: nom.trim(),
--        email: email.trim().toLowerCase(),
--        plan: 'club', club: nomClub.trim(), abonnement_actif: false,
--      })
--
--    APRÈS (garde `club` — colonne sûre, jamais bloquée — retire email/plan/
--    abonnement_actif désormais gérés par le trigger via plan:'club' déjà
--    présent dans les metadata de signUp() juste au-dessus) :
--      const { error: profilErr } = await supabase.from('profiles').upsert({
--        id: uid, prenom: prenom.trim(), nom: nom.trim(), club: nomClub.trim(),
--      })
--      if (profilErr) console.error('Erreur mise à jour profil club:', profilErr)
--
-- 3. src/pages/RegisterRecruteur.jsx (L.49-58 actuel, page non liée mais
--    accessible par URL directe — corrigée par cohérence) :
--
--    AVANT :
--      const { error: profilErr } = await supabase.from('profiles').upsert({
--        id: data.user.id, email, prenom, nom, poste: typeCompte,
--        plan: typeCompte, analyses_restantes: 0, abonnement_actif: false, club,
--      })
--
--    APRÈS (garde poste/analyses_restantes/club — colonnes sûres ; plan déjà
--    passé en metadata de signUp() juste au-dessus) :
--      const { error: profilErr } = await supabase.from('profiles').upsert({
--        id: data.user.id, prenom, nom, poste: typeCompte,
--        analyses_restantes: 0, club,
--      })
--
-- 4. src/pages/RegisterChoix.jsx : NON modifié — page morte, liens Stripe
--    placeholder, aucun paiement n'y aboutit déjà aujourd'hui. Signalé pour
--    information, pas de changement proposé (à supprimer purement et
--    simplement si tu confirmes qu'elle n'a plus d'utilité).
--
-- Ces changements ne sont PAS inclus dans ce fichier SQL — à traiter comme un
-- commit de code séparé, après validation de l'approche, et à déployer avant
-- le script RLS/grants (cf. ordre d'application ci-dessous).
--
-- ──────────────────────────────────────────────────────────────────────────
-- ORDRE EXACT D'APPLICATION — version complète incluant la priorité 1
-- (lecture publique), pour zéro période où un écran cesse de fonctionner :
--
--   1. Exécuter supabase_fix_profiles_trigger_signup.sql (CE fichier).
--      Sûr isolément : ne modifie que le trigger + increment_analyses +
--      admins_coach + la colonne analyses_creditees — rien de tout ça n'a
--      de dépendance sur un état futur, et ça coexiste sans conflit avec le
--      code JS existant (double-écriture temporaire inoffensive pour
--      plan/abonnement_actif tant que l'étape 4 n'a pas encore retiré ces
--      champs des upsert()).
--
--   2. Exécuter supabase_fix_profiles_public_view.sql. Sûr isolément et
--      purement additif : crée la vue + les 2 index, ne touche à AUCUN
--      privilège ni policy existante. Le comportement de lecture reste
--      identique à avant pour tout le monde tant que l'étape 5 n'a pas
--      remplacé les policies SELECT.
--
--   3. Déployer les changements JS d'inscription (décrits plus haut dans ce
--      fichier, #1-#3). Sûrs isolément : les GRANT/RLS en écriture n'ont pas
--      encore changé à ce stade.
--
--   4. Déployer les changements JS de navigation publique (6 diffs décrits
--      dans supabase_fix_profiles_public_view.sql, point 6) — bascule vers
--      `profiles_public`. Sûr : la vue existe déjà (étape 2), interroger
--      profiles_public au lieu de profiles ne change rien fonctionnellement
--      tant que les anciennes policies SELECT larges sur la table de base
--      sont encore actives (étape 5 pas encore passée) — même données
--      renvoyées, juste via un chemin différent.
--
--   5. Exécuter supabase_fix_profiles_rls_stripe.sql EN DERNIER. C'est le
--      seul script qui change réellement le comportement observable : active
--      RLS, remplace les policies SELECT/INSERT/UPDATE, retire les GRANT
--      larges. À ce stade : le trigger gère déjà l'inscription/le
--      parrainage (1), la vue publique existe déjà (2), le code JS
--      n'envoie plus les champs bloqués (3) et ne lit plus la table de base
--      pour la navigation publique (4) — donc rien ne casse au moment où
--      les nouvelles restrictions prennent effet.
--
-- Risques si l'ordre n'est PAS respecté :
--   - Étape 5 avant étape 3 : une inscription joueur_starter gratuite
--     resterait bloquée sur "Abonnement non actif" (pas un trou de
--     sécurité, juste un compte à débloquer manuellement en attendant).
--   - Étape 5 avant étape 4 : les 5 écrans de navigation (ScoutCenter, Feed,
--     DashboardRecruteur, ClubPublic, contact coach/aperçu recruteur dans
--     DashboardJoueur) ne renverraient brutalement plus AUCUN résultat pour
--     les autres utilisateurs (RLS filtre tout, la table de base n'est plus
--     lisible que pour soi-même/ses délégations) — régression visible
--     immédiatement, à éviter en respectant l'ordre ci-dessus.
--   - Étapes 1/2 dans un ordre différent l'une de l'autre : sans
--     importance, aucune dépendance entre elles.
