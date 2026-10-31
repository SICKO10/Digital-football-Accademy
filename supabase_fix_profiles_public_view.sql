-- Priorité 1 (lecture publique) — partie additive et sûre à exécuter à tout
-- moment, y compris en premier : crée la vue public.profiles_public et les
-- index de support, sans toucher à aucun privilège ni policy existante tant
-- que supabase_fix_profiles_rls_stripe.sql (qui remplace les 2 policies
-- SELECT larges par une restrictive) n'est pas exécuté. Zéro changement de
-- comportement observable tant que ce 2e script n'est pas passé — cf. ordre
-- de déploiement détaillé en bas de ce fichier.
--
-- NE PAS EXÉCUTER SANS VALIDATION EXPLICITE.

begin;

-- ──────────────────────────────────────────────────────────────────────────
-- 1. Vue profiles_public — liste blanche EXPLICITE (jamais SELECT *, conforme
--    au point 1 de la demande). Colonnes incluses : tout ce qui est utilisé
--    par au moins un des 5 écrans de navigation identifiés (ScoutCenter,
--    ClubPublic, Feed, DashboardRecruteur, DashboardJoueur — contact coach +
--    aperçu profil recruteur dans la messagerie), plus les champs de la même
--    famille sémantique (ex. tous les champs de stats joueur, tous les
--    champs de thème club) pour rester cohérent plutôt que de cribler écran
--    par écran. Colonnes EXCLUES (sensibles ou non pertinentes en lecture
--    publique) : email, stripe_customer_id, stripe_subscription_id,
--    plan_detail, abonnement_cycle, abonnement_debut, abonnement_mois_payes,
--    palier, quota_equipes, banni, motif_ban, analyses_restantes,
--    parrain_id, educateurs_inclus, educateurs_editent_projet_sportif,
--    educateurs_editent_planification, code_club, equipe_active_id,
--    planning_semaine_url, planning_semaine_publie_le (vérifié non utilisées
--    par aucun des 5 écrans).
--
--    Point 2 de la demande (comptes bannis) : AUCUN des 5 écrans ne filtre
--    actuellement les profils bannis (vérifié par grep — seul
--    DashboardJoueur.jsx filtre le banni sur SON PROPRE profil, pas dans les
--    listes parcourues). La vue corrige ça à la source : `where not
--    coalesce(banni, false)` — un profil banni n'apparaît plus jamais dans
--    ScoutCenter/Feed/DashboardRecruteur/ClubPublic/recherche de coach, sans
--    avoir à dupliquer ce filtre dans chaque écran.
--
--    RÉVISÉ (demande de validation du 2026-10-10, point 1) : la version
--    précédente incluait des colonnes "par famille sémantique" (thème club,
--    planning, bio/vidéo secondaire) sans vérifier leur usage réel — erreur
--    corrigée ici. Liste reconstruite en grepant les champs RÉELLEMENT lus
--    (`j.xxx` / `educateur.xxx` / `recruteurModal.xxx`) dans le JSX des 5
--    écrans + les 2 besoins DashboardJoueur.jsx (contact coach : seul `id`
--    utilisé ; aperçu profil recruteur dans la messagerie). Colonnes
--    RETIRÉES suite à cet audit, confirmées non lues nulle part dans ces
--    5 écrans : `video_url`, `video_description`, `bio`, `couleur_principale`,
--    `couleur_secondaire`, `image_fond_url`, `image_hero_url`, `slogan`,
--    `planning_heure_ouverture`, `planning_heure_fermeture`, `stades`,
--    `terrain_fond_url` — en plus de celles déjà exclues du 1er passage
--    (email, stripe_*, plan_detail, abonnement_cycle/debut/mois_payes,
--    palier, quota_equipes, banni, motif_ban, analyses_restantes,
--    parrain_id, educateurs_inclus, educateurs_editent_*, code_club,
--    equipe_active_id, planning_semaine_url, planning_semaine_publie_le).
--
--    Confidentialité mineurs / vidéos (vérifié spécifiquement) : `clip_url`
--    est la SEULE colonne vidéo conservée — confirmée activement utilisée
--    par Feed.jsx/ScoutCenter.jsx/DashboardRecruteur.jsx (c'est littéralement
--    la fonction du Feed : parcourir les clips des joueurs pro). `video_url`
--    (colonne distincte, probablement un champ legacy) n'est lue par AUCUN
--    de ces écrans — retirée. Je ne peux pas vérifier au-delà du code qu'un
--    consentement vidéo spécifique existe au-delà de la mention générale des
--    CGU — signalé pour information, pas une garantie que j'apporte.
--
--    Délibérément SANS `security_invoker` (comportement par défaut Postgres,
--    la vue s'exécute avec les droits de son propriétaire — postgres, qui
--    bypass RLS comme toute table lui appartenant) : c'est ce qui permet à
--    la vue de montrer toutes les lignes NON bannies avec un jeu de colonnes
--    réduit, alors que la table de base reste verrouillée aux seuls lecteurs
--    légitimes par la policy restrictive de supabase_fix_profiles_rls_stripe.sql.
--    Ne JAMAIS ajouter `with (security_invoker = true)` à cette vue — ça la
--    ferait hériter de la policy restrictive de la table de base et casserait
--    la navigation publique (plus aucune ligne visible pour anon/authenticated
--    en dehors de leur propre profil).
create or replace view public.profiles_public as
select
  id, prenom, nom, poste, plan, abonnement_actif, club, niveau_equipe,
  categorie, region, ville, pied,
  matchs_officiel, matchs_amical, minutes_jouees, buts_pied_droit,
  buts_pied_gauche, buts_tete, buts_total, passes_decisives, cleansheets,
  clip_url, avatar_url,
  points_forts, a_ameliorer, carte_fifa_url, style_de_jeu,
  type_recruteur, description, recherche_profil,
  (numero_licence is not null) as licencie_fff,
  disponibilite, specialites, services_proposes,
  verified, created_at
from public.profiles
where not coalesce(banni, false);

grant select on public.profiles_public to anon, authenticated;

-- RPC pour DashboardJoueur.jsx:852 (contact coach), demande de validation du
-- 2026-10-10 : évite de coder les 2 UUID admin en dur côté client ET
-- d'exposer leur email (absent de profiles_public de toute façon). Le
-- client appelle juste supabase.rpc('get_coach_contacts') — aucune
-- connaissance préalable d'id ou d'email nécessaire. admins_coach reste
-- intégralement protégée (RLS sans policy pour anon/authenticated, cf.
-- supabase_fix_profiles_trigger_signup.sql) : seule cette fonction, en
-- SECURITY DEFINER, y accède, jamais le client directement. Colonnes
-- renvoyées strictement limitées à celles de profiles_public (`setof`
-- reprend son type ligne) — aucune fuite d'email/stripe possible même si
-- la fonction était un jour mal utilisée.
create or replace function public.get_coach_contacts()
returns setof public.profiles_public
language sql
security definer
stable
set search_path to 'public'
as $function$
  select pp.* from public.profiles_public pp
  join public.admins_coach ac on ac.user_id = pp.id;
$function$;

revoke execute on function public.get_coach_contacts() from public, anon;
grant execute on function public.get_coach_contacts() to authenticated;

-- ──────────────────────────────────────────────────────────────────────────
-- 2. Index de support pour les sous-requêtes EXISTS des policies de
--    délégation (point 4 de la demande — vérification de performance).
--    staff_club avait déjà un index exact (club_id, user_id) — rien à
--    ajouter. dirigeant_acces et parents_acces n'avaient qu'un index sur
--    (x_id, email), pas utile pour le filtre (x_id, moi_id) réellement fait
--    par la policy — ajoutés ici, en partiel (where statut='accepte') pour
--    rester petits et rapides, alignés exactement sur la condition de la
--    policy.
create index if not exists idx_dirigeant_acces_educateur_dirigeant
  on public.dirigeant_acces (educateur_id, dirigeant_id)
  where statut = 'accepte';

create index if not exists idx_parents_acces_joueur_parent
  on public.parents_acces (joueur_id, parent_id)
  where statut = 'accepte';

commit;

-- ──────────────────────────────────────────────────────────────────────────
-- POINT 6 — diffs JS exacts, 5 fichiers / 9 appels (le 6e "écran" du compte
-- initial correspond aux 2 usages distincts dans DashboardJoueur.jsx —
-- contact coach et aperçu profil recruteur dans la messagerie, 2 besoins
-- fonctionnels différents dans le même fichier). PAS encore appliqués.
--
-- Principe commun : remplacer `.from('profiles')` par
-- `.from('profiles_public')` sur CES appels précis uniquement — tous les
-- autres appels `.select('*')` sur `profiles` dans les mêmes fichiers (profil
-- PROPRE de l'utilisateur, ou accès délégué self/staff/dirigeant/parent)
-- restent sur la vraie table, inchangés, couverts par
-- profiles_select_own_or_delegated. `.select('*')` sur la VUE reste sûr et
-- n'a pas besoin de devenir une liste de colonnes explicite côté client :
-- la vue EST la liste blanche, imposée côté base — un `select('*')` dessus
-- ne peut structurellement jamais renvoyer plus que ses colonnes définies.
--
-- 1. src/components/ScoutCenter.jsx L.142-143 :
--      AVANT :
--        supabase.from("profiles").select("*").eq("plan", "joueur_pro").eq("abonnement_actif", true),
--        supabase.from("profiles").select("*").eq("plan", "coach"),
--      APRÈS :
--        supabase.from("profiles_public").select("*").eq("plan", "joueur_pro").eq("abonnement_actif", true),
--        supabase.from("profiles_public").select("*").eq("plan", "coach"),
--      (la 2e ligne ne renverra jamais rien, cf. note existante dans le code
--      — CHECK constraint rejette plan='coach' — migration faite par
--      cohérence, pas pour la "réparer".)
--
-- 2. src/pages/DashboardRecruteur.jsx L.172-173 (PAS L.168, qui lit le
--    profil PROPRE du recruteur — reste sur `profiles`) :
--      AVANT :
--        const { data: joueursData } = await supabase.from("profiles").select("*").eq("plan", "joueur_pro").eq("abonnement_actif", true);
--        const { data: coachData } = await supabase.from("profiles").select("*").eq("plan", "coach");
--      APRÈS :
--        const { data: joueursData } = await supabase.from("profiles_public").select("*").eq("plan", "joueur_pro").eq("abonnement_actif", true);
--        const { data: coachData } = await supabase.from("profiles_public").select("*").eq("plan", "coach");
--
-- 3. src/pages/Feed.jsx L.321 et L.360 (PAS L.314, profil PROPRE) :
--      AVANT (×2, identique aux 2 endroits — init() et refresh()) :
--        const { data } = await supabase.from('profiles').select('*').eq('plan', 'joueur_pro').eq('abonnement_actif', true).order('created_at', { ascending: false })
--      APRÈS :
--        const { data } = await supabase.from('profiles_public').select('*').eq('plan', 'joueur_pro').eq('abonnement_actif', true).order('created_at', { ascending: false })
--
-- 3bis. src/pages/Feed.jsx — 3 usages de numero_licence, retiré de la vue au
--    profit du booléen licencie_fff (audit confidentialité mineurs) :
--      L.179 et L.515 — badge "FFF" (présence seulement, pas la valeur) :
--        AVANT : {j.numero_licence && <span>...🪪 FFF</span>}
--        APRÈS : {j.licencie_fff && <span>...🪪 FFF</span>}
--      L.552 — affichait le NUMÉRO en clair, à ne plus faire :
--        AVANT : {joueurModal.numero_licence && <span>...🪪 Licencié FFF · {joueurModal.numero_licence}</span>}
--        APRÈS : {joueurModal.licencie_fff && <span>...🪪 Licencié FFF</span>}
--        (retire uniquement l'interpolation du numéro, garde le badge
--        "Licencié FFF" — le statut reste visible, plus le numéro.)
--
-- 4. src/pages/ClubPublic.jsx L.93 :
--      AVANT :
--        supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
--      APRÈS :
--        supabase.from('profiles_public').select('*').eq('id', id).maybeSingle(),
--      (page accessible seulement après connexion — vérifié, elle redirige
--      vers /login sinon — mais le club visité n'est presque jamais
--      l'utilisateur connecté lui-même : migration nécessaire quand même.)
--
-- 5. src/pages/DashboardJoueur.jsx L.852 (contact coach — PAS L.846, profil
--    propre/parent délégué, qui reste sur `profiles`) :
--      AVANT :
--        // plan='coach' ne renvoie jamais rien : la contrainte CHECK de profiles.plan
--        // interdit cette valeur (cf. lib/coachAdmin.js) — les comptes coach analyseur
--        // sont identifiés par email. Avec le filtre par plan, cette liste était donc
--        // toujours vide et le joueur ne pouvait jamais démarrer de conversation.
--        const { data: coachData } = await supabase.from('profiles').select('*').in('email', COACH_ADMIN_EMAILS)
--      APRÈS (RPC dédiée — aucun email ni UUID côté client, cf. validation du
--      2026-10-10 : pas d'UUID en dur, admins_coach reste protégée) :
--        // Les comptes coach analyseur sont identifiés côté serveur (table
--        // admins_coach, protégée) — cette RPC renvoie leurs profils publics
--        // sans jamais exposer leur email ni nécessiter que le client les connaisse.
--        const { data: coachData } = await supabase.rpc('get_coach_contacts')
--      (import COACH_ADMIN_EMAILS conservé : encore utilisé ailleurs dans ce
--      fichier, L.1645, `isCoachAnalyseur()` — vérifié, ne pas retirer.)
--
-- 6. src/pages/DashboardJoueur.jsx L.4757 (aperçu profil recruteur dans la
--    messagerie — PAS L.846) :
--      AVANT :
--        const { data } = await supabase.from('profiles').select('*').eq('id', messageActif.otherId).maybeSingle()
--      APRÈS :
--        const { data } = await supabase.from('profiles_public').select('*').eq('id', messageActif.otherId).maybeSingle()
