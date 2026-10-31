-- Script A, partie 2/2 — restriction des GRANT sur les colonnes sensibles de
-- public.profiles, DÉCOUPLÉE de la réactivation de RLS (qui reste le script C,
-- supabase_fix_profiles_rls_stripe.sql). Extrait de ce dernier fichier (ses
-- points 5/6/7bis-7/8) pour que la protection des champs sensibles entre en
-- vigueur immédiatement, sans attendre que profiles_public + les 9 diffs JS
-- de navigation soient déployés (eux restent un prérequis pour C, pas pour A).
--
-- Pourquoi ce découpage (demande de validation du 2026-10-14, point 1) :
-- supabase_fix_profiles_trigger_signup.sql (A, partie 1/2) sécurise la
-- CRÉATION de compte et increment_analyses, mais ne touche AUCUN privilège
-- GRANT sur profiles — après lui SEUL, un utilisateur authentifié conserve
-- aujourd'hui le privilège UPDATE complet, au niveau TABLE, sur profiles
-- (RLS désactivée, aucun REVOKE), donc peut toujours exécuter directement
-- depuis le navigateur :
--   supabase.from('profiles').update({ plan: 'club', abonnement_actif: true,
--     stripe_customer_id: 'x', banni: false, analyses_restantes: 99999 })
--     .eq('id', <son propre id>)
-- et voir cette écriture réussir. Les GRANT/REVOKE ci-dessous sont
-- INDÉPENDANTS de l'état RLS (ils s'appliquent que RLS soit active ou pas —
-- GRANT est la couche d'autorisation SQL standard, RLS une couche
-- supplémentaire par-dessus) : les exécuter maintenant ferme ce vecteur
-- immédiatement, sans attendre C.
--
-- Rien dans ce fichier ne dépend de profiles_public ni des diffs JS de
-- navigation publique (ceux-là ne concernent QUE la policy SELECT, pas
-- touchée ici). Sûr à exécuter juste après supabase_fix_profiles_trigger_
-- signup.sql, dans la même fenêtre que lui.
--
-- NE PAS EXÉCUTER SANS VALIDATION EXPLICITE.

begin;

-- Retire TOUT privilège INSERT/UPDATE au niveau table (sinon les REVOKE
-- colonne ci-dessous seraient inopérants — les deux ACL sont évaluées en OU
-- en PostgreSQL, cf. notes déjà écrites dans supabase_fix_profiles_rls_stripe.sql).
revoke insert, update on public.profiles from authenticated;

-- Liste blanche explicite — identique à celle déjà revue dans
-- supabase_fix_profiles_rls_stripe.sql (colonnes EXCLUES : email, plan,
-- plan_detail, abonnement_actif, abonnement_cycle, abonnement_debut,
-- abonnement_mois_payes, palier, quota_equipes, stripe_customer_id,
-- stripe_subscription_id, banni, motif_ban, verified, educateurs_inclus,
-- parrain_id, analyses_restantes, created_at, id en update).
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

-- anon n'a aucun cas d'usage légitime d'ÉCRITURE (vérifié : aucun insert/
-- update client ne s'exécute avant authentification). SELECT NON touché ici
-- (dépend de profiles_public, reste dans le périmètre de C).
revoke insert, update, delete, truncate on public.profiles from anon;

-- authenticated n'a aucun cas d'usage légitime de suppression de profils.
revoke delete, truncate on public.profiles from authenticated;

commit;

-- ════════════════════════════════════════════════════════════════════════
-- CE QUI RESTE OUVERT APRÈS A (trigger_signup.sql + CE fichier), AVANT C —
-- réponse explicite au point 1 de la demande de validation.
-- ════════════════════════════════════════════════════════════════════════
-- 1. SELECT sur profiles reste totalement ouvert (anon ET authenticated
--    lisent aujourd'hui l'intégralité de la table, email et identifiants
--    Stripe inclus) — fermé seulement par C (policy SELECT restrictive).
--    Entre A et C, n'importe qui peut encore LIRE email/stripe_customer_id/
--    stripe_subscription_id de n'importe quel profil (pas les modifier : ça,
--    c'est fermé par A).
-- 2. RLS reste désactivée sur profiles jusqu'à C — sans conséquence
--    pratique pour l'écriture (les GRANT colonne de ce fichier protègent déjà
--    les colonnes sensibles indépendamment de RLS), mais signifie qu'un
--    utilisateur authentifié peut encore, en théorie, UPDATE les colonnes
--    SÛRES (prenom, avatar_url, bio...) d'un profil qui n'est PAS le sien
--    (aucune policy de ligne pour l'en empêcher). Pas un vecteur sur les
--    champs sensibles (ceux-là restent bloqués par le GRANT, peu importe la
--    ligne visée), mais une vraie limite : un tiers malveillant pourrait
--    défigurer le profil de quelqu'un d'autre (changer son prénom, son
--    avatar) jusqu'à C.
-- Aucune autre faille connue ne reste ouverte sur les champs "abonnements/
-- crédits/Stripe/bannissement" eux-mêmes après A : ils sont protégés par le
-- GRANT colonne ci-dessus de façon totalement indépendante de RLS/policies.
