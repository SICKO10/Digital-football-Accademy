-- Correctif sécurité v2 — public.profiles (RLS désactivée + privilèges complets
-- anon/authenticated sur toutes les colonnes, y compris plan/abonnement_actif/
-- stripe_customer_id/stripe_subscription_id/email).
--
-- Révisé après revue externe du script v1 (2026-10-09), qui a identifié 2 bugs
-- réels corrigés ici (voir commentaires inline) :
--   1. REVOKE colonne sans REVOKE table préalable = inopérant en PostgreSQL
--      (les deux ACL sont évaluées en OU). v1 laissait INSERT/UPDATE au niveau
--      table pour `authenticated`, rendant les REVOKE colonne sans effet.
--   2. La policy UPDATE auth.uid() = id bloquait les cas légitimes de
--      délégation : staff_club éditant le profil du club, dirigeant éditant
--      le profil de l'éducateur délégué (DashboardDirigeant → DashboardEducateur
--      educateurIdOverride). Le cas parent→joueur n'a pas besoin de policy :
--      DashboardJoueur en readOnly neutralise déjà toute écriture côté app.
--
-- Complication supplémentaire découverte en creusant le point 1 : les écrans
-- d'inscription (Register.jsx : inscrire() + ClubWizard, et
-- RegisterRecruteur.jsx — RegisterChoix.jsx est du code mort non lié, cf.
-- supabase_fix_profiles_trigger_signup.sql) font un .upsert() sur profiles
-- juste après auth.signUp(). Le trigger handle_new_user() (SECURITY DEFINER)
-- ayant déjà créé la ligne entre-temps, cet upsert résout en UPDATE, pas en
-- INSERT — il tenterait donc d'écrire plan/abonnement_actif/email via la
-- policy UPDATE, pas INSERT. Une policy conditionnelle ("abonnement_actif
-- autorisé seulement si plan=starter") a été écartée : WITH CHECK évalue la
-- ligne ENTIÈRE après modification, pas seulement les colonnes touchées —
-- elle aurait bloqué tout utilisateur payant déjà actif modifiant un champ
-- sans rapport (avatar, etc.).
--
-- Solution retenue : bloquer plan/abonnement_actif/email/abonnement_debut/
-- parrain_id côté client dans TOUS les cas (insert ET update), et déplacer
-- leur écriture légitime vers handle_new_user() — déjà SECURITY DEFINER, déjà
-- la source de vérité pour ces écrans (ils lui passent déjà prenom/nom/plan/
-- club en metadata). Voir supabase_fix_profiles_trigger_signup.sql (fichier
-- séparé) pour cette partie — NÉCESSITE AUSSI un petit ajustement JS (décrit
-- dans ce même fichier) pour que parrain_id soit transmis en metadata au lieu
-- d'un insert direct. Les upsert() existants continueront de s'exécuter sans
-- erreur bloquante (déjà en try/console.error, non bloquant) : ils perdront
-- juste la capacité d'écrire ces colonnes précises, ce qui est exactement
-- l'effet recherché, SANS perte fonctionnelle une fois le trigger étendu.
--
-- NE PAS EXÉCUTER SANS VALIDATION EXPLICITE.

begin;

-- 1. Active RLS (jusqu'ici désactivée : toutes les policies ci-dessous étaient inertes)
alter table public.profiles enable row level security;

-- 2. Policy INSERT — un utilisateur ne peut créer QUE sa propre ligne. En
--    pratique quasi jamais déclenchée (le trigger handle_new_user crée déjà
--    la ligne avant que ce chemin ne s'exécute), mais nécessaire pour
--    AcceptInvite.jsx (chemin legacy lien magique) dans les cas où le
--    trigger n'a pas encore tourné.
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (auth.uid() = id);

-- 3. Policy UPDATE — étendue aux 2 cas de délégation légitimes identifiés :
--    - auth.uid() = id : profil propre
--    - staff_club : un membre du staff édite le profil DU CLUB (pas le sien)
--    - dirigeant_acces : un dirigeant délégué édite le profil DE
--      L'ÉDUCATEUR qui l'a invité (pas le sien), statut déjà accepté
drop policy if exists "joueur_update_own_profile" on public.profiles;
create policy "profiles_update_own_or_delegated" on public.profiles
  for update to authenticated
  using (
    auth.uid() = id
    or exists (
      select 1 from public.staff_club
      where staff_club.club_id = profiles.id and staff_club.user_id = auth.uid()
    )
    or exists (
      select 1 from public.dirigeant_acces
      where dirigeant_acces.educateur_id = profiles.id
        and dirigeant_acces.dirigeant_id = auth.uid()
        and dirigeant_acces.statut = 'accepte'
    )
  )
  with check (
    auth.uid() = id
    or exists (
      select 1 from public.staff_club
      where staff_club.club_id = profiles.id and staff_club.user_id = auth.uid()
    )
    or exists (
      select 1 from public.dirigeant_acces
      where dirigeant_acces.educateur_id = profiles.id
        and dirigeant_acces.dirigeant_id = auth.uid()
        and dirigeant_acces.statut = 'accepte'
    )
  );

-- 4. Policy SELECT restrictive — remplace les 2 anciennes (profiles_lecture_
--    educateur, "recherche club par code"), toutes deux USING (true) donc
--    lisibles intégralement par QUICONQUE (y compris anon), email et
--    identifiants Stripe inclus. "recherche club par code" s'est révélée
--    orpheline (aucune requête nulle part dans le code ne filtre par
--    code_club) — supprimée sans remplacement fonctionnel.
--
--    Même 3 délégations que la policy UPDATE, PLUS une 4e : parents_acces
--    (lecture seule — un parent n'édite jamais le profil du joueur, cf.
--    DashboardJoueur en readOnly, mais doit pouvoir le LIRE intégralement
--    pour afficher son dashboard délégué).
--
--    Les écrans qui doivent lire le profil de quelqu'un d'AUTRE sans lien de
--    délégation (recherche de joueurs, feed public, page club visitée,
--    contact coach) passent désormais par la vue public.profiles_public
--    (colonnes limitées, sans email/Stripe) — cf.
--    supabase_fix_profiles_public_view.sql, à exécuter AVANT ce script, et
--    les changements JS correspondants, à déployer avant ce script aussi
--    (cf. ordre exact en bas de ce fichier).
drop policy if exists "profiles_lecture_educateur" on public.profiles;
drop policy if exists "recherche club par code" on public.profiles;
create policy "profiles_select_own_or_delegated" on public.profiles
  for select to authenticated
  using (
    auth.uid() = id
    or exists (
      select 1 from public.staff_club
      where staff_club.club_id = profiles.id and staff_club.user_id = auth.uid()
    )
    or exists (
      select 1 from public.dirigeant_acces
      where dirigeant_acces.educateur_id = profiles.id
        and dirigeant_acces.dirigeant_id = auth.uid()
        and dirigeant_acces.statut = 'accepte'
    )
    or exists (
      select 1 from public.parents_acces
      where parents_acces.joueur_id = profiles.id
        and parents_acces.parent_id = auth.uid()
        and parents_acces.statut = 'accepte'
    )
  );

-- 5. Retire TOUT privilège INSERT/UPDATE au niveau table pour authenticated
--    (c'est ça qui manquait en v1 et rendait les REVOKE colonne inopérants).
revoke insert, update on public.profiles from authenticated;

-- 6. Regrant explicite par liste blanche de colonnes sûres — tout ce qui
--    N'EST PAS dans cette liste reste non écrivable par authenticated, quelle
--    que soit la policy RLS (ceinture-et-bretelles : même si une policy RLS
--    était mal écrite plus tard, ces colonnes resteraient verrouillées).
--    Colonnes volontairement EXCLUES (ni insert ni update) :
--      email, plan, plan_detail, abonnement_actif, abonnement_cycle,
--      abonnement_debut, abonnement_mois_payes, palier, quota_equipes,
--      stripe_customer_id, stripe_subscription_id, banni, motif_ban,
--      verified, educateurs_inclus, parrain_id, created_at, id (update only)
--    analyses_restantes est désormais EXCLU lui aussi (round 8, 2026-10-10,
--    traitement séparé annoncé au point 149 d'origine, maintenant fait) :
--    le vrai contrôle du crédit vit dans le trigger
--    decrementer_credit_demande() sur public.demandes (SECURITY DEFINER,
--    cf. supabase_fix_messages_demandes_rls.sql) — authenticated n'a plus
--    aucun chemin direct pour modifier son propre solde, ni à la hausse ni
--    à la baisse. Dépendance croisée : ce fichier et celui des triggers
--    demandes doivent être déployés dans la même fenêtre (cf. note dans
--    l'autre fichier) pour fermer la faille complètement.
grant insert (
  id, prenom, nom, poste, club, niveau_equipe, categorie, region, pied,
  matchs_officiel, matchs_amical, minutes_jouees, buts_pied_droit,
  buts_pied_gauche, buts_tete, buts_total, passes_decisives, cleansheets,
  clip_url, video_url, video_description, bio, avatar_url, points_forts,
  a_ameliorer, carte_fifa_url, style_de_jeu, type_recruteur, description,
  recherche_profil, numero_licence, code_club, planning_semaine_url,
  planning_semaine_publie_le, ville, couleur_principale, couleur_secondaire,
  image_fond_url, image_hero_url, slogan, planning_heure_ouverture,
  planning_heure_fermeture, disponibilite, specialites, services_proposes,
  stades, educateurs_editent_projet_sportif, educateurs_editent_planification,
  terrain_fond_url, equipe_active_id
) on public.profiles to authenticated;

grant update (
  prenom, nom, poste, club, niveau_equipe, categorie, region, pied,
  matchs_officiel, matchs_amical, minutes_jouees, buts_pied_droit,
  buts_pied_gauche, buts_tete, buts_total, passes_decisives, cleansheets,
  clip_url, video_url, video_description, bio, avatar_url, points_forts,
  a_ameliorer, carte_fifa_url, style_de_jeu, type_recruteur, description,
  recherche_profil, numero_licence, code_club, planning_semaine_url,
  planning_semaine_publie_le, ville, couleur_principale, couleur_secondaire,
  image_fond_url, image_hero_url, slogan, planning_heure_ouverture,
  planning_heure_fermeture, disponibilite, specialites, services_proposes,
  stades, educateurs_editent_projet_sportif, educateurs_editent_planification,
  terrain_fond_url, equipe_active_id
) on public.profiles to authenticated;

-- 7. `anon` n'a aucun cas d'usage légitime d'écriture sur profiles (vérifié :
--    aucun insert/update client ne s'exécute avant authentification).
revoke insert, update, delete, truncate on public.profiles from anon;

-- 7bis. La policy SELECT ci-dessus est scopée `to authenticated` — `anon` n'a
--    plus aucun chemin de lecture légitime sur la table de base (tous les
--    écrans accessibles sans compte, dont ClubPublic.jsx, exigent en réalité
--    déjà une connexion — vérifié ; la vraie lecture publique passe par
--    profiles_public). Retire aussi le SELECT niveau table pour `anon`, par
--    cohérence : sans ça, `anon` garderait un privilège SELECT "actif" au
--    sens du GRANT même si RLS le filtre déjà à zéro ligne — defense in
--    depth, pas une faille en soi (RLS suffit), mais plus honnête sur ce que
--    anon peut réellement faire.
revoke select on public.profiles from anon;

-- 8. `authenticated` n'a aucun cas d'usage légitime de suppression de profils.
revoke delete, truncate on public.profiles from authenticated;

commit;
