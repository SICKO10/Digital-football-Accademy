-- Idempotence du webhook Stripe — demande de validation du 2026-10-10.
--
-- PROBLÈME CONFIRMÉ (le mien, pas seulement une crainte théorique) : mon
-- diff précédent ("déplacer enregistrerPaiement avant crediterAnalyses")
-- protégeait contre un double crédit SÉQUENTIEL mais pas contre :
--   - un événement réclamé (ligne paiements insérée) puis dont le traitement
--     échoue avant la fin → la ligne reste, bloquant tout retry futur alors
--     que RIEN n'a été réellement crédité/activé ;
--   - deux livraisons vraiment simultanées du même événement (deux requêtes
--     JS indépendantes, pas de verrou entre elles).
--
-- SOLUTION : remplacer la séquence actuelle (plusieurs appels séparés depuis
-- le code TypeScript du webhook : enregistrerPaiement() puis crediterAnalyses()
-- puis update profiles, chacun un aller-retour réseau distinct, donc jamais
-- atomique entre eux) par UNE SEULE fonction Postgres par type d'événement,
-- appelée une fois via RPC. Un appel RPC = une transaction Postgres complète
-- côté serveur : soit TOUT le corps de la fonction réussit et est commité,
-- soit une exception survient n'importe où dedans et TOUT est annulé
-- automatiquement — y compris la ligne de réclamation insérée en tout début
-- de fonction. C'est Postgres lui-même qui garantit l'atomicité, pas une
-- synchronisation applicative reconstruite à la main.
--
-- Garanties obtenues, dans l'ordre de la demande :
--
--  1. Aucun double crédit pour un même événement : la réclamation (insert
--     dans `paiements` avec `on conflict (stripe_event_id) do nothing
--     returning id`) est la PREMIÈRE chose que fait chaque fonction. Si
--     aucune ligne n'est retournée (id = null), c'est qu'une exécution
--     PASSÉE a déjà réussi à committer cet événement — la fonction s'arrête
--     immédiatement, aucun crédit n'est retenté.
--
--  2. Aucun renouvellement comptabilisé deux fois : même mécanisme —
--     abonnement_mois_payes n'est incrémenté que si la réclamation réussit.
--
--  3. Reprise après échec intermédiaire : si une exception survient APRÈS la
--     réclamation (ex. increment_analyses échoue parce que le profil a été
--     supprimé entre temps), toute la transaction — réclamation INCLUSE —
--     est annulée par Postgres. La ligne paiements n'existe donc PAS après
--     l'échec. Un retry de Stripe (même stripe_event_id) repart de zéro
--     exactement comme si rien n'avait été tenté.
--
--  4. Deux webhooks simultanés pour le même événement : la contrainte
--     UNIQUE(stripe_event_id) sur `paiements` fait que si deux transactions
--     tentent le insert en même temps, Postgres sérialise : la 2e bloque
--     jusqu'à ce que la 1re committe ou annule. Si la 1re committe, la 2e
--     voit le conflit et renvoie id=null → elle s'arrête proprement, aucun
--     double traitement. Si la 1re échoue et annule, la 2e récupère la place
--     et traite l'événement normalement. Aucune fenêtre de course possible :
--     c'est une garantie du moteur de verrouillage de Postgres sur l'index
--     unique, pas une logique applicative qui pourrait avoir un trou.
--
--  5. Tests : section dédiée en bas de ce fichier (doublon séquentiel, échec
--     intermédiaire + reprise, et guide pour tester la vraie concurrence —
--     qu'un script SQL séquentiel ne peut pas simuler lui-même, cf. notes).
--
-- NE PAS EXÉCUTER SANS VALIDATION EXPLICITE. Nécessite ensuite un diff de
-- supabase/functions/stripe-webhook/index.ts (fourni plus bas, PAS appliqué)
-- et un redéploiement de cette Edge Function — aucune des deux actions n'est
-- faite ici.

begin;

-- ──────────────────────────────────────────────────────────────────────────
-- Fonction 1 — analyse vidéo à l'unité (checkout.session.completed,
-- mode='payment'). Remplace l'appel séquentiel crediterAnalyses() PUIS
-- enregistrerPaiement() du code actuel (qui créditait même AVANT
-- d'enregistrer l'événement — aucune protection du tout sur ce chemin).
create or replace function public.stripe_crediter_analyse_unite(
  p_stripe_event_id text,
  p_profile_id uuid,
  p_montant integer
)
returns boolean -- true = événement nouveau traité ; false = doublon ignoré
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id_paiement uuid;
begin
  insert into public.paiements (profile_id, montant, type_utilisateur, cycle, stripe_event_id)
  values (p_profile_id, p_montant, 'joueur', 'unite', p_stripe_event_id)
  on conflict (stripe_event_id) do nothing
  returning id into v_id_paiement;

  if v_id_paiement is null then
    return false;
  end if;

  -- increment_analyses (déjà SECURITY DEFINER, cf. supabase_fix_profiles_
  -- trigger_signup.sql) voit auth.role()='service_role' ici — le rôle vu par
  -- auth.role() reflète le JWT de L'APPELANT INITIAL (le webhook, appelé via
  -- supabaseAdmin = clé service_role), pas le propriétaire de CETTE fonction
  -- — donc elle prend la branche service_role (pas de vérification admin/
  -- parrainage), exactement comme avant. Ses propres bornes (delta 1-5) et
  -- son GET DIAGNOSTICS final restent actifs.
  perform public.increment_analyses(p_profile_id, 1);

  return true;
end;
$function$;

revoke execute on function public.stripe_crediter_analyse_unite(text, uuid, integer) from public, anon, authenticated;
grant execute on function public.stripe_crediter_analyse_unite(text, uuid, integer) to service_role;

-- ──────────────────────────────────────────────────────────────────────────
-- Fonction 2 — échéance payée (invoice.paid, couvre le 1er paiement d'un
-- abonnement ET tous les renouvellements). Remplace enregistrerPaiement()
-- + le branchement annuel/mensuel actuellement fait en TypeScript avec 2-3
-- allers-retours réseau séparés et non atomiques entre eux.
create or replace function public.stripe_traiter_echeance(
  p_stripe_event_id text,
  p_profile_id uuid,
  p_montant integer,
  p_type_utilisateur text,
  p_cycle text, -- 'mensuel' | 'annuel'
  p_stripe_subscription_id text
)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id_paiement uuid;
  v_mois_payes integer;
begin
  insert into public.paiements (profile_id, montant, type_utilisateur, cycle, stripe_event_id)
  values (p_profile_id, p_montant, p_type_utilisateur, p_cycle, p_stripe_event_id)
  on conflict (stripe_event_id) do nothing
  returning id into v_id_paiement;

  if v_id_paiement is null then
    return false;
  end if;

  if p_cycle = 'annuel' then
    perform public.increment_analyses(p_profile_id, 3);
    -- increment_analyses() vient déjà de vérifier que ce profil existe (son
    -- propre GET DIAGNOSTICS aurait levé une exception sinon, cf.
    -- supabase_fix_profiles_trigger_signup.sql) — mais on ne s'appuie pas
    -- implicitement sur cet effet de bord : vérification explicite et
    -- indépendante ici aussi, par cohérence avec la branche mensuelle
    -- ci-dessous et pour rester correct même si increment_analyses changeait
    -- de comportement un jour.
    update public.profiles
    set abonnement_actif = true,
        stripe_subscription_id = coalesce(p_stripe_subscription_id, stripe_subscription_id)
    where id = p_profile_id;
    if not found then
      raise exception 'Profil introuvable pour mise à jour abonnement (id=%)', p_profile_id;
    end if;
  else
    update public.profiles
    set abonnement_mois_payes = coalesce(abonnement_mois_payes, 0) + 1,
        abonnement_actif = true,
        stripe_subscription_id = coalesce(p_stripe_subscription_id, stripe_subscription_id)
    where id = p_profile_id
    returning abonnement_mois_payes into v_mois_payes;

    if v_mois_payes is null then
      raise exception 'Profil introuvable pour mise à jour abonnement (id=%)', p_profile_id;
    end if;

    if v_mois_payes % 6 = 0 then
      perform public.increment_analyses(p_profile_id, 1);
    end if;
  end if;

  return true;
end;
$function$;

revoke execute on function public.stripe_traiter_echeance(text, uuid, integer, text, text, text) from public, anon, authenticated;
grant execute on function public.stripe_traiter_echeance(text, uuid, integer, text, text, text) to service_role;

-- ──────────────────────────────────────────────────────────────────────────
-- PAS de fonction 3 pour checkout.session.completed / mode='subscription'
-- (1re activation d'un abonnement) : vérifié que cette branche ne journalise
-- RIEN dans `paiements` aujourd'hui (le commentaire du code dit explicitement
-- que invoice.paid s'en charge, y compris pour ce 1er paiement — les deux
-- événements Stripe arrivent pour la même transaction). Son UPDATE profiles
-- (plan, abonnement_actif=true, cycle, mois_payes=0, stripe_customer_id,
-- palier) est déjà naturellement idempotent : réexécuté avec les mêmes
-- valeurs, il produit le même état final, sans compteur incrémenté ni crédit
-- appliqué. Aucune protection supplémentaire nécessaire — laissé tel quel.

commit;

-- ──────────────────────────────────────────────────────────────────────────
-- VÉRIFICATION DE "READINESS" (demande de validation du 2026-10-10, avant
-- tout déploiement) :
--
-- 1. EXECUTE exclusif à service_role : confirmé pour les 2 nouvelles
--    fonctions — `revoke ... from public, anon, authenticated` puis
--    `grant ... to service_role` uniquement, rien d'autre.
--
-- 2. Vérification de signature AVANT tout appel RPC : confirmé en relisant
--    le fichier — `stripe.webhooks.constructEventAsync(...)` s'exécute et
--    peut retourner 400 AVANT le `switch (event.type)` qui contient tous les
--    appels RPC (L.199-219 du fichier actuel). Aucun chemin ne peut
--    atteindre une RPC sans signature valide au préalable — c'était déjà
--    comme ça avant mon diff, non modifié, juste confirmé.
--
-- 3. ROW_COUNT sur les mises à jour indispensables : trou trouvé et corrigé
--    ci-dessus — la branche "annuel" de stripe_traiter_echeance ne
--    vérifiait PAS explicitement le UPDATE profiles final (elle s'appuyait
--    implicitement sur le fait qu'increment_analyses() aurait déjà échoué
--    juste avant si le profil n'existait pas — correct en pratique, mais
--    fragile comme raisonnement). Ajouté un `if not found then raise
--    exception` indépendant, par cohérence avec la branche mensuelle qui
--    l'avait déjà.
--
-- 4. Absence de double avantage checkout.session.completed / invoice.paid
--    pour un même achat : confirmé par relecture — la branche subscription
--    de checkout.session.completed ne crédite JAMAIS analyses_restantes
--    (seul le profil est mis à jour : plan/actif/cycle/mois_payes=0/
--    customer_id/palier). Tout le crédit vit exclusivement dans
--    stripe_traiter_echeance (invoice.paid). Vérifié aussi que
--    abonnement_mois_payes ne se chevauche pas : checkout.session.completed
--    le met à 0, invoice.paid l'incrémente ensuite à 1 pour ce même 1er
--    paiement — résultat correct (1 mois payé), pas un double comptage.
--
-- 5. Idempotence entre deux ÉVÉNEMENTS DIFFÉRENTS représentant la même
--    opération commerciale : vérifié que seuls 3 types d'événements sont
--    gérés (checkout.session.completed, invoice.paid,
--    customer.subscription.deleted) — notamment PAS invoice.payment_succeeded,
--    qui existe aussi côté Stripe et pourrait sinon doubler invoice.paid
--    pour la même facture (tombe dans le `default`, ignoré, confirmé par
--    grep). Au-delà de ça : ma protection clé sur stripe_event_id couvre
--    sans ambiguïté les REDÉLIVRANCES du même événement (Stripe réutilise
--    le même event.id pour un retry, jamais un nouveau). Le cas plus
--    subtil — Stripe émettant un event.id RÉELLEMENT différent pour ce
--    qu'un humain considérerait "la même" opération (ex. deux chemins
--    internes Stripe marquant la même facture payée) — n'est, à ma
--    connaissance du modèle d'événements Stripe, pas un comportement
--    documenté pour invoice.paid dans le flux géré ici (facture unique →
--    un seul event.id réel ; une facture corrigée/réémise aurait un
--    nouvel invoice.id et représenterait un VRAI nouveau paiement, pas un
--    doublon). Je ne suis pas en mesure de garantir ce point à 100% sans
--    consulter la documentation Stripe à jour (recherche web non faite ici) —
--    signalé comme hypothèse raisonnable mais pas vérifiée de façon aussi
--    rigoureuse que les 4 points précédents. Si tu veux une garantie plus
--    forte, la piste serait de clé secondaire sur `invoice.id` (stable,
--    propre à la facture, indépendant de l'event.id) en plus de
--    stripe_event_id — je peux la détailler si tu le souhaites.

-- ──────────────────────────────────────────────────────────────────────────
-- DIFF supabase/functions/stripe-webhook/index.ts — PAS appliqué, PAS
-- déployé. À traiter comme un déploiement d'Edge Function séparé, sans
-- dépendance avec les 6 étapes SQL/JS déjà planifiées pour profiles (aucune
-- des deux ne touche aux mêmes objets).
--
-- Les fonctions crediterAnalyses() (L.67-70) et enregistrerPaiement()
-- (L.90-105) deviennent inutilisées après ce diff — à supprimer (plus aucun
-- appelant une fois les 2 sites ci-dessous migrés).
--
-- Site 1 — checkout.session.completed, analyse à l'unité (L.242-248) :
--   AVANT :
--     await crediterAnalyses(profileId, 1)
--     await enregistrerPaiement({ profileId, montant, typeUtilisateur: 'joueur', cycle: 'unite', stripeEventId: event.id })
--     break
--   APRÈS :
--     const { data: estNouveau, error: rpcErr } = await supabaseAdmin.rpc('stripe_crediter_analyse_unite', {
--       p_stripe_event_id: event.id, p_profile_id: profileId, p_montant: montant,
--     })
--     if (rpcErr) throw rpcErr  // remonte au catch global → réponse 500 → Stripe retente
--     if (!estNouveau) console.log('[stripe-webhook] analyse unité: événement déjà traité, ignoré')
--     break
--
-- Site 2 — invoice.paid (L.343-369), remplace enregistrerPaiement() + tout
-- le bloc if/else annuel/mensuel :
--   AVANT :
--     await enregistrerPaiement({ profileId, montant, typeUtilisateur: estClub ? 'club' : familyFromPlan(profil?.plan), cycle, stripeEventId: event.id })
--     if (cycle === 'annuel') {
--       await crediterAnalyses(profileId, 3)
--       const { error } = await supabaseAdmin.from('profiles').update({ abonnement_actif: true, ...(stripeSubscriptionId ? { stripe_subscription_id: stripeSubscriptionId } : {}) }).eq('id', profileId)
--       if (error) console.error('[stripe-webhook] erreur update abonnement_actif (invoice.paid annuel)', error)
--     } else {
--       const nouveauCompte = (profil?.abonnement_mois_payes ?? 0) + 1
--       const { error } = await supabaseAdmin.from('profiles').update({ abonnement_mois_payes: nouveauCompte, abonnement_actif: true, ...(stripeSubscriptionId ? { stripe_subscription_id: stripeSubscriptionId } : {}) }).eq('id', profileId)
--       if (error) console.error('[stripe-webhook] erreur update abonnement_mois_payes (invoice.paid mensuel)', error)
--       if (nouveauCompte % 6 === 0) await crediterAnalyses(profileId, 1)
--     }
--   APRÈS :
--     const { data: estNouveau, error: rpcErr } = await supabaseAdmin.rpc('stripe_traiter_echeance', {
--       p_stripe_event_id: event.id,
--       p_profile_id: profileId,
--       p_montant: montant,
--       p_type_utilisateur: estClub ? 'club' : familyFromPlan(profil?.plan),
--       p_cycle: cycle,
--       p_stripe_subscription_id: stripeSubscriptionId,
--     })
--     if (rpcErr) throw rpcErr
--     if (!estNouveau) console.log('[stripe-webhook] invoice.paid: événement déjà traité, ignoré')
--
-- Site 3 — checkout.session.completed, mode='subscription' (L.293-308) :
--   NON modifié (déjà idempotent par construction, cf. note ci-dessus).
--
-- Changement de comportement à noter côté erreurs : AVANT, une erreur sur
-- enregistrerPaiement/crediterAnalyses/l'update profils était juste
-- console.error'ée — la fonction continuait et répondait 200 à Stripe, qui
-- ne retentait donc JAMAIS un échec réel. APRÈS, `if (rpcErr) throw rpcErr`
-- fait remonter l'erreur au catch global existant (déjà présent dans le
-- fichier, répond 500) — Stripe reçoit un vrai signal d'échec et retente
-- selon son propre calendrier de retry. C'est un changement voulu,
-- nécessaire pour que le point 3 de la demande ("reprendre un événement
-- dont le traitement a échoué") soit réellement possible — sans ça, un échec
-- silencieux ne serait jamais retenté par Stripe, peu importe la robustesse
-- de la fonction Postgres en dessous.

-- ──────────────────────────────────────────────────────────────────────────
-- TESTS (point 5 de la demande). 100% lecture + transactions annulées par
-- ROLLBACK pour les parties qui écrivent — sans effet persistant. Remplacer
-- l'id de profil par un vrai id de test si besoin (ici : un id quelconque
-- existant en base, sans précondition particulière).

-- T-A. Doublon séquentiel : 2e appel avec le MÊME stripe_event_id doit
--      renvoyer false et ne rien créditer/incrémenter une 2e fois.
begin;
  set local role service_role;
  -- 1er appel : doit renvoyer true.
  select public.stripe_traiter_echeance(
    'evt_test_doublon_001',
    (select id from public.profiles limit 1),
    1000, 'joueur', 'mensuel', null
  );
  -- 2e appel, même stripe_event_id : doit renvoyer false.
  select public.stripe_traiter_echeance(
    'evt_test_doublon_001',
    (select id from public.profiles limit 1),
    1000, 'joueur', 'mensuel', null
  );
  -- Vérifie qu'une seule ligne paiements existe pour cet event_id, et que
  -- abonnement_mois_payes n'a augmenté qu'UNE fois.
  select count(*) from public.paiements where stripe_event_id = 'evt_test_doublon_001';
  -- Résultat attendu : 1 (pas 2).
rollback;

-- T-B. Échec intermédiaire + reprise : un profil inexistant doit faire
--      échouer TOUTE la transaction, y compris la réclamation — la preuve
--      étant qu'aucune ligne paiements ne subsiste après l'échec, et qu'un
--      retry avec un vrai profil et le MÊME event_id réussit normalement.
begin;
  set local role service_role;
  -- Doit lever une exception (profil inexistant → le UPDATE mensuel renvoie
  -- 0 ligne → v_mois_payes reste null → raise exception explicite).
  select public.stripe_traiter_echeance(
    'evt_test_echec_002',
    '00000000-0000-0000-0000-000000000099',
    1000, 'joueur', 'mensuel', null
  );
rollback; -- confirme qu'AUCUNE trace ne persiste (le rollback l'aurait fait
          -- de toute façon même sans l'exception, mais l'exception elle-même
          -- est la preuve que Postgres annule tout dès qu'un maillon échoue
          -- — pas besoin d'attendre ce rollback explicite en production,
          -- Postgres l'aurait fait automatiquement en fin de requête RPC).

begin;
  set local role service_role;
  -- Retry avec le MÊME event_id mais un vrai profil cette fois : doit
  -- réussir normalement (true), preuve que l'échec précédent n'a rien
  -- laissé derrière lui qui bloquerait ce nouvel essai.
  select public.stripe_traiter_echeance(
    'evt_test_echec_002',
    (select id from public.profiles limit 1),
    1000, 'joueur', 'mensuel', null
  );
  -- Résultat attendu : true (et non false — la preuve que ce n'est PAS
  -- considéré comme un doublon, puisque la tentative précédente n'a jamais
  -- vraiment committé).
rollback;

-- T-C. Concurrence réelle — NE PEUT PAS être simulée fidèlement par un
--      script SQL séquentiel comme celui-ci (begin/rollback s'exécutent l'un
--      après l'autre dans la même session, jamais en parallèle). La garantie
--      vient de la contrainte UNIQUE(stripe_event_id) + du verrouillage de
--      ligne standard de Postgres sur un INSERT concurrent en conflit —
--      propriété du moteur, pas quelque chose qu'un test applicatif doit
--      redémontrer. Pour une vérification en conditions réelles (optionnel,
--      à faire après déploiement, pas avant) : ouvrir 2 connexions séparées
--      (2 onglets SQL Editor, ou 2 `psql`) et lancer EXACTEMENT la même
--      requête `select stripe_traiter_echeance('evt_test_concurrence_003', ...)`
--      dans les deux au même instant — une seule doit renvoyer true, l'autre
--      false, jamais les deux true, jamais un double crédit observable sur
--      analyses_restantes ensuite.
