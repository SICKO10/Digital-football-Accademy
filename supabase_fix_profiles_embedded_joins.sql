-- Correction des 11 jointures PostgREST imbriquées (`profiles!fk(...)`)
-- découvertes le 2026-10-10, suite à la demande de validation du même jour.
--
-- NE PAS EXÉCUTER SANS VALIDATION EXPLICITE. Contient des diffs JS (non
-- appliqués) en plus du SQL.

-- ──────────────────────────────────────────────────────────────────────────
-- ⚠ DÉCOUVERTE HORS PÉRIMÈTRE, SÉRIEUSE — en vérifiant les RLS des tables
-- sources (point 5 de la demande), trouvé que `messages` ET `demandes` ont
-- RLS **désactivée**, avec `anon` ayant SELECT/INSERT/UPDATE/DELETE/TRUNCATE
-- complets dessus — exactement le même type de faille que celle corrigée sur
-- `profiles` au début de cette session, mais jamais encore traitée pour ces
-- deux tables. `messages` contient les conversations privées de TOUS les
-- utilisateurs (joueurs, éducateurs, recruteurs, coach) ; `demandes` contient
-- des demandes d'analyse vidéo. N'importe qui avec la clé anon (publique par
-- nature) peut aujourd'hui lire/modifier/supprimer l'intégralité de ces deux
-- tables, sans compte. Confirmé par requête directe, pas une supposition :
--   select relrowsecurity from pg_class where relname in ('messages','demandes');
--   → false, false
-- Ce n'est PAS corrigé dans ce fichier — ça mérite son propre audit complet
-- (policies, grants colonne, cas d'usage légitimes) avec la même rigueur que
-- `profiles`, pas un ajout précipité ici. Recommandé comme prochaine
-- priorité une fois ce chantier-ci terminé. Signalé maintenant pour que tu
-- ne l'apprennes pas plus tard par accident.
--
-- ──────────────────────────────────────────────────────────────────────────
-- Correction d'une erreur dans mon audit précédent (tableau des 11
-- jointures) : j'avais affirmé que `email` n'était "jamais affiché" dans
-- DashboardJoueur.jsx:1627 — FAUX, vérifié plus précisément maintenant.
-- `other?.email` / `msg.sender?.email` alimentent `isCoachAnalyseur(email)`
-- (L.1645), qui sépare les conversations "coach" des conversations
-- "recruteurs" dans l'UI. Retirer `email` sans rien d'autre aurait cassé
-- cette distinction. Corrigé ci-dessous en basculant la détection sur les
-- ID déjà exposés par `get_coach_contacts()` (table admins_coach) au lieu
-- de comparer des emails — plus robuste au passage, pas juste un
-- contournement. `COACH_ADMIN_EMAILS` devient alors réellement inutilisé
-- dans ce fichier (corrige aussi mon autre affirmation précédente comme quoi
-- il fallait le garder).
--
-- ──────────────────────────────────────────────────────────────────────────
-- Point 6 (recherche d'autres accès indirects) — résultat : AUCUNE nouvelle
-- catégorie de casse trouvée au-delà des 11 jointures déjà identifiées.
--   - 9 fonctions SQL référencent `profiles` dans leur corps (bilan_medical_
--     resume, club_modifier_educateur, count_filleuls_annuels, handle_new_
--     user, increment_analyses, liberer_creneau, liberer_creneau_date,
--     reclamer_creneau_date ×2) — TOUTES SECURITY DEFINER (increment_analyses
--     le devient avec le correctif déjà préparé) → bypass RLS par nature,
--     aucune affectée.
--   - 0 vue pré-existante ne référence `profiles` (seule profiles_public,
--     créée par ce chantier).
--   - 6 Edge Functions référencent `profiles` côté client Supabase — les 6
--     utilisent le client service_role (vérifié individuellement, dont
--     send-newsletter/index.ts, pas vérifié avant) → bypass RLS, aucune
--     affectée.
--
-- ──────────────────────────────────────────────────────────────────────────
-- SQL — une seule nouvelle fonction nécessaire (administration coach,
-- point 4). AUCUNE des 10 autres jointures ne nécessite de modifier la
-- policy SELECT de supabase_fix_profiles_rls_stripe.sql : vérifié que
-- toutes les colonnes qu'elles utilisent sont déjà dans profiles_public
-- (restructuration en 2 requêtes suffit, pas de délégation nouvelle) — y
-- compris pour les affiliations (point 2 : GestionPrepPhysique.jsx ne lit
-- que id/nom/prenom, déjà dans la vue, pas besoin d'une délégation complète
-- comme je l'avais envisagé avant ta réserve).
--
-- Point 4 (admin coach) : PAS de nouvelle branche sur la policy SELECT de
-- profiles non plus. Plutôt qu'accorder un accès complet à TOUTE la table
-- pour tout compte admins_coach (large, et autoriserait aussi la lecture de
-- stripe_customer_id/stripe_subscription_id que l'écran n'affiche jamais),
-- une RPC dédiée SECURITY DEFINER fait exactement la jointure dont
-- DashboardCoach.jsx a besoin (id/prenom/nom/email/plan du joueur + nom du
-- coach qui traite la demande), avec sa propre vérification admins_coach À
-- L'INTÉRIEUR — l'accès "complet à profiles" n'est donc jamais réellement
-- accordé, ni au niveau RLS ni au niveau colonne : seuls les champs demandés
-- transitent, rien de plus. Confirme ta question : non, l'accès complet
-- n'est pas nécessaire, seulement ces 5 champs précis.
begin;

create or replace function public.get_demandes_admin()
returns table (
  id uuid,
  joueur_id uuid,
  joueur_prenom text,
  joueur_nom text,
  joueur_email text,
  joueur_plan text,
  statut text,
  pris_en_charge_par uuid,
  coach_prenom text,
  coach_nom text,
  created_at timestamptz
)
language sql
security definer
stable
set search_path to 'public'
as $function$
  select
    d.id, d.joueur_id,
    j.prenom as joueur_prenom, j.nom as joueur_nom, j.email as joueur_email, j.plan as joueur_plan,
    d.statut, d.pris_en_charge_par,
    c.prenom as coach_prenom, c.nom as coach_nom,
    d.created_at
  from public.demandes d
  left join public.profiles j on j.id = d.joueur_id
  left join public.profiles c on c.id = d.pris_en_charge_par
  where exists (select 1 from public.admins_coach where user_id = auth.uid());
  -- Le WHERE EXISTS porte sur TOUTE la requête (pas de filtre par ligne) :
  -- soit l'appelant est admin et voit tout, soit la condition est fausse et
  -- aucune ligne n'est renvoyée — équivalent fonctionnel à une vérification
  -- d'autorisation en début de fonction, exprimé en SQL pur puisque LANGUAGE
  -- SQL ne permet pas de IF/RAISE comme plpgsql.
$function$;

revoke execute on function public.get_demandes_admin() from public, anon, authenticated;
grant execute on function public.get_demandes_admin() to authenticated;
-- `authenticated` et non `service_role` : cette RPC est appelée depuis le
-- navigateur du compte coach connecté (DashboardCoach.jsx), jamais depuis
-- une Edge Function. La vérification admins_coach À L'INTÉRIEUR de la
-- fonction est ce qui protège réellement — n'importe quel authenticated
-- peut TENTER l'appel, mais seul un admin reçoit des lignes.

commit;

-- ──────────────────────────────────────────────────────────────────────────
-- DIFFS JS — PAS appliqués. Pattern commun aux 10 restructurations
-- "2 requêtes" : la requête d'origine (messages/comments/demandes_bilan_
-- medical/profil_recrutement) perd son embed `profiles!fk(...)`, une 2e
-- requête séparée va chercher les profils concernés dans `profiles_public`
-- par lot (`.in('id', [...])`), puis une jointure CÔTÉ CLIENT (map JS)
-- reconstruit la même forme de données que l'embed produisait avant.
--
-- Comportement sur résultats vides/profils absents (point 5) : un
-- `.in('id', [])` avec un tableau vide ne doit JAMAIS être exécuté tel quel
-- (Supabase/PostgREST le traite comme "aucun filtre", donc renverrait TOUT
-- profiles_public au lieu de rien) — chaque diff ci-dessous garde donc le
-- garde-fou `ids.length ? ... : { data: [] }` déjà present dans le reste du
-- code existant (même pattern que celui déjà utilisé ailleurs dans ce projet,
-- ex. DashboardClub.jsx chargerAffiliations). Si un profil a été banni
-- (exclu de profiles_public) ou supprimé entre temps, `profilesById[id]`
-- vaut `undefined` → `other`/`c.author`/`d.recruteur` devient `null`,
-- exactement le même comportement que PostgREST renvoie déjà aujourd'hui
-- pour une ligne liée inaccessible (l'embed existant renvoie aussi `null`
-- dans ce cas, pas une erreur) — aucune régression de robustesse, le JSX
-- existant gère déjà `?.` partout sur ces champs (vérifié).
--
-- ═══ 1. Messagerie (point 1) — 4 fichiers ═══
--
-- 1a. src/components/ScoutCenter.jsx — chargerConversations() (L.310-324) :
--
--   AVANT :
--     const { data } = await supabase
--       .from("messages")
--       .select("*, sender:profiles!messages_sender_id_fkey(prenom, nom, plan), receiver:profiles!messages_receiver_id_fkey(prenom, nom, plan)")
--       .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
--       .order("created_at", { ascending: false });
--     if (!data) return;
--     const map = {};
--     data.forEach(msg => {
--       const otherId = msg.sender_id === uid ? msg.receiver_id : msg.sender_id;
--       const other = msg.sender_id === uid ? msg.receiver : msg.sender;
--       if (!map[otherId]) map[otherId] = { otherId, other, msgs: [], allMsgs: data };
--       map[otherId].msgs.push(msg);
--     });
--     setConversations(Object.values(map));
--
--   APRÈS :
--     const { data } = await supabase
--       .from("messages")
--       .select("*")
--       .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
--       .order("created_at", { ascending: false });
--     if (!data) return;
--     const otherIds = [...new Set(data.map(m => m.sender_id === uid ? m.receiver_id : m.sender_id))];
--     const { data: profilesData } = otherIds.length
--       ? await supabase.from('profiles_public').select('id, prenom, nom, plan').in('id', otherIds)
--       : { data: [] };
--     const profilesById = Object.fromEntries((profilesData || []).map(p => [p.id, p]));
--     const map = {};
--     data.forEach(msg => {
--       const otherId = msg.sender_id === uid ? msg.receiver_id : msg.sender_id;
--       const other = profilesById[otherId] || null;
--       if (!map[otherId]) map[otherId] = { otherId, other, msgs: [], allMsgs: data };
--       map[otherId].msgs.push(msg);
--     });
--     setConversations(Object.values(map));
--
-- 1b. src/pages/DashboardRecruteur.jsx — chargerConversations() (L.347-361) :
--     Diff STRICTEMENT IDENTIQUE à 1a (code dupliqué entre les 2 fichiers,
--     même structure exacte).
--
-- 1c. src/pages/DashboardEducateur.jsx — chargerMessagesExplorer() +
--     conversationsExplorer() (L.5305-5320), structure en 2 fonctions
--     séparées (fetch, puis regroupement depuis un state) :
--
--   AVANT :
--     const chargerMessagesExplorer = async () => {
--       const { data } = await supabase
--         .from('messages')
--         .select('*, sender:profiles!messages_sender_id_fkey(prenom, nom, avatar_url), receiver:profiles!messages_receiver_id_fkey(prenom, nom, avatar_url)')
--         .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
--         .order('created_at', { ascending: true })
--       setExplorerMessages(data || [])
--     }
--     const conversationsExplorer = () => {
--       const map = {}
--       explorerMessages.forEach(msg => {
--         const otherId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id
--         const other = msg.sender_id === userId ? msg.receiver : msg.sender
--         if (!map[otherId]) map[otherId] = { id: otherId, ...other, msgs: [] }
--         map[otherId].msgs.push(msg)
--       ...
--
--   APRÈS (nouveau state explorerProfilesById, rempli au moment du fetch) :
--     const [explorerProfilesById, setExplorerProfilesById] = useState({})
--     const chargerMessagesExplorer = async () => {
--       const { data } = await supabase
--         .from('messages')
--         .select('*')
--         .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
--         .order('created_at', { ascending: true })
--       setExplorerMessages(data || [])
--       const otherIds = [...new Set((data || []).map(m => m.sender_id === userId ? m.receiver_id : m.sender_id))]
--       const { data: profilesData } = otherIds.length
--         ? await supabase.from('profiles_public').select('id, prenom, nom, avatar_url').in('id', otherIds)
--         : { data: [] }
--       setExplorerProfilesById(Object.fromEntries((profilesData || []).map(p => [p.id, p])))
--     }
--     const conversationsExplorer = () => {
--       const map = {}
--       explorerMessages.forEach(msg => {
--         const otherId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id
--         const other = explorerProfilesById[otherId] || null
--         if (!map[otherId]) map[otherId] = { id: otherId, ...other, msgs: [] }
--         map[otherId].msgs.push(msg)
--       ...
--
-- 1d. src/pages/DashboardJoueur.jsx — chargerConversations() (L.1624-1655),
--     RECTIFIÉ par rapport à mon tableau précédent (email réellement
--     utilisé, cf. note en tête de fichier) :
--
--   AVANT :
--     const { data } = await supabase
--       .from('messages')
--       .select('*, sender:profiles!messages_sender_id_fkey(prenom, nom, plan, email), receiver:profiles!messages_receiver_id_fkey(prenom, nom, plan, email)')
--       .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
--       .order('created_at', { ascending: false })
--     if (!data) return
--     setMessages(data)
--     const map = {}
--     data.forEach(msg => {
--       const otherId = msg.sender_id === uid ? msg.receiver_id : msg.sender_id
--       const other = msg.sender_id === uid ? msg.receiver : msg.sender
--       if (!map[otherId]) map[otherId] = { otherId, other, msgs: [] }
--       map[otherId].msgs.push(msg)
--     })
--     const allConvs = Object.values(map)
--     const isCoachAnalyseur = (email) => COACH_ADMIN_EMAILS.includes(email)
--     setConversations(allConvs.filter(c => !isCoachAnalyseur(c.other?.email)))
--     setConvCoach(allConvs.filter(c => isCoachAnalyseur(c.other?.email)))
--     const lastRead = localStorage.getItem(`coach_read_${uid}`) || '1970-01-01'
--     const nonLus = data.filter(msg =>
--       isCoachAnalyseur(msg.sender?.email) &&
--       msg.receiver_id === uid &&
--       new Date(msg.created_at) > new Date(lastRead)
--     )
--     setCoachUnread(nonLus.length)
--
--   APRÈS (email remplacé par une comparaison d'ID via get_coach_contacts(),
--   plus robuste — email devient inutile dans TOUT le fichier, import
--   COACH_ADMIN_EMAILS à retirer, cf. diff du site #852 plus bas) :
--     const { data: rawMessages } = await supabase
--       .from('messages')
--       .select('*')
--       .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
--       .order('created_at', { ascending: false })
--     if (!rawMessages) return
--     setMessages(rawMessages)
--     const otherIds = [...new Set(rawMessages.map(m => m.sender_id === uid ? m.receiver_id : m.sender_id))]
--     const [{ data: profilesData }, { data: coachContacts }] = await Promise.all([
--       otherIds.length ? supabase.from('profiles_public').select('id, prenom, nom, plan').in('id', otherIds) : Promise.resolve({ data: [] }),
--       supabase.rpc('get_coach_contacts'),
--     ])
--     const profilesById = Object.fromEntries((profilesData || []).map(p => [p.id, p]))
--     const coachIds = new Set((coachContacts || []).map(c => c.id))
--     const map = {}
--     rawMessages.forEach(msg => {
--       const otherId = msg.sender_id === uid ? msg.receiver_id : msg.sender_id
--       const other = profilesById[otherId] || null
--       if (!map[otherId]) map[otherId] = { otherId, other, msgs: [] }
--       map[otherId].msgs.push(msg)
--     })
--     const allConvs = Object.values(map)
--     const isCoachAnalyseur = (id) => coachIds.has(id)
--     setConversations(allConvs.filter(c => !isCoachAnalyseur(c.otherId)))
--     setConvCoach(allConvs.filter(c => isCoachAnalyseur(c.otherId)))
--     const lastRead = localStorage.getItem(`coach_read_${uid}`) || '1970-01-01'
--     const nonLus = rawMessages.filter(msg =>
--       isCoachAnalyseur(msg.sender_id) &&
--       msg.receiver_id === uid &&
--       new Date(msg.created_at) > new Date(lastRead)
--     )
--     setCoachUnread(nonLus.length)
--
-- ═══ 2. Affiliations — GestionPrepPhysique.jsx (point 2) ═══
--
-- 2a. loadJoueurs() (L.332-349) :
--   AVANT :
--     const { data } = await supabase
--       .from('affiliations')
--       .select('equipe_joueur_id, profiles!affiliations_joueur_id_fkey(id, nom, prenom)')
--       .eq('educateur_id', educateurId)
--       .eq('statut', 'accepte')
--     let afData = data || []
--     ...
--     setJoueurs(afData.map(a => a.profiles).filter(Boolean))
--
--   APRÈS :
--     const { data } = await supabase
--       .from('affiliations')
--       .select('equipe_joueur_id, joueur_id')
--       .eq('educateur_id', educateurId)
--       .eq('statut', 'accepte')
--     let afData = data || []
--     ...
--     const joueurIds = [...new Set(afData.map(a => a.joueur_id).filter(Boolean))]
--     const { data: profilesData } = joueurIds.length
--       ? await supabase.from('profiles_public').select('id, nom, prenom').in('id', joueurIds)
--       : { data: [] }
--     const profilesById = Object.fromEntries((profilesData || []).map(p => [p.id, p]))
--     setJoueurs(afData.map(a => profilesById[a.joueur_id]).filter(Boolean))
--   (nécessite que `affiliations.joueur_id` soit bien sélectionné — à
--   vérifier que cette colonne existe sur la table, elle est utilisée par
--   ailleurs dans ce même fichier a priori — sinon adapter le nom exact.)
--
-- 2b. loadTests() (L.359-364) :
--   AVANT :
--     const { data } = await supabase.from('tests_physiques').select('*, joueur:profiles!joueur_id(id, nom, prenom)').eq('educateur_id', educateurId).order('date_test', { ascending: false })
--   APRÈS :
--     const { data: rawTests } = await supabase.from('tests_physiques').select('*').eq('educateur_id', educateurId).order('date_test', { ascending: false })
--     const joueurIds = [...new Set((rawTests || []).map(t => t.joueur_id).filter(Boolean))]
--     const { data: profilesData } = joueurIds.length
--       ? await supabase.from('profiles_public').select('id, nom, prenom').in('id', joueurIds)
--       : { data: [] }
--     const profilesById = Object.fromEntries((profilesData || []).map(p => [p.id, p]))
--     const data = (rawTests || []).map(t => ({ ...t, joueur: profilesById[t.joueur_id] || null }))
--   (suppose que tests_physiques a une colonne joueur_id — à confirmer,
--   déduit du nom de la contrainte `profiles!joueur_id` dans l'embed
--   d'origine, qui référence généralement une colonne du même nom.)
--
-- ═══ 3. Bilan médical, commentaires, moteur de recrutement (point 3) ═══
--
-- 3a. src/pages/DashboardJoueur.jsx — chargerDemandesBilanMedical() (L.1009-1012) :
--   AVANT :
--     const { data } = await supabase.from('demandes_bilan_medical').select('*, recruteur:profiles!demandes_bilan_medical_recruteur_id_fkey(prenom, nom, club)')
--       .eq('joueur_id', uid).order('created_at', { ascending: false })
--     setDemandesBilanMedical(data || [])
--   APRÈS :
--     const { data: rawDemandes } = await supabase.from('demandes_bilan_medical').select('*')
--       .eq('joueur_id', uid).order('created_at', { ascending: false })
--     const recruteurIds = [...new Set((rawDemandes || []).map(d => d.recruteur_id).filter(Boolean))]
--     const { data: profilesData } = recruteurIds.length
--       ? await supabase.from('profiles_public').select('id, prenom, nom, club').in('id', recruteurIds)
--       : { data: [] }
--     const profilesById = Object.fromEntries((profilesData || []).map(p => [p.id, p]))
--     setDemandesBilanMedical((rawDemandes || []).map(d => ({ ...d, recruteur: profilesById[d.recruteur_id] || null })))
--
-- 3b. src/pages/Jogabonito.jsx — chargerInteractions() (L.76-79) :
--   AVANT (4e requête du Promise.all) :
--     supabase.from('comments').select('*, author:profiles!comments_user_id_fkey(prenom, nom, avatar_url)').eq('joueur_id', reel.joueur_id).order('created_at', { ascending: false }).limit(20),
--   APRÈS : extraire cette requête du Promise.all (elle doit maintenant
--   déclencher une 2e requête dépendante, ne peut plus être un simple
--   élément parallèle) :
--     const { data: rawComments } = await supabase.from('comments').select('*').eq('joueur_id', reel.joueur_id).order('created_at', { ascending: false }).limit(20)
--     const authorIds = [...new Set((rawComments || []).map(c => c.user_id).filter(Boolean))]
--     const { data: authorsData } = authorIds.length
--       ? await supabase.from('profiles_public').select('id, prenom, nom, avatar_url').in('id', authorIds)
--       : { data: [] }
--     const authorsById = Object.fromEntries((authorsData || []).map(p => [p.id, p]))
--     const cm = (rawComments || []).map(c => ({ ...c, author: authorsById[c.user_id] || null }))
--   (les 3 autres requêtes du Promise.all — likes/video_favoris/reposts —
--   restent en parallèle entre elles et avec cette nouvelle paire ; seule la
--   requête comments elle-même se scinde en 2 étapes séquentielles.)
--
-- 3c. src/pages/Feed.jsx — chargerInteractions() (L.343) : même diff que 3b,
--     adapté à la forme locale de ce fichier (déjà dans un Promise.all avec
--     likes/comments/myLikes/myFavoris — même principe d'extraction).
--
-- 3d. src/pages/MoteurRecrutement.jsx — rechercher() (L.108-114) :
--   AVANT :
--     let query = supabase
--       .from('profil_recrutement')
--       .select('*, profiles!inner(id, prenom, nom, poste, categorie, club, region, niveau_equipe, pied, avatar_url)')
--       .eq('visible_recruteurs', true)
--       .gt('nb_matchs', 2)
--   APRÈS (profiles!inner excluait déjà les lignes sans profil correspondant
--   — reproduit ci-dessous via un filtre post-jointure côté client) :
--     let query = supabase
--       .from('profil_recrutement')
--       .select('*')
--       .eq('visible_recruteurs', true)
--       .gt('nb_matchs', 2)
--     // ... (reste des filtres existants sur `query` inchangé) ...
--     const { data: rawResultats } = await query
--     const joueurIds = [...new Set((rawResultats || []).map(r => r.joueur_id).filter(Boolean))]
--     const { data: profilesData } = joueurIds.length
--       ? await supabase.from('profiles_public').select('id, prenom, nom, poste, categorie, club, region, niveau_equipe, pied, avatar_url').in('id', joueurIds)
--       : { data: [] }
--     const profilesById = Object.fromEntries((profilesData || []).map(p => [p.id, p]))
--     const data = (rawResultats || [])
--       .map(r => ({ ...r, profiles: profilesById[r.joueur_id] || null }))
--       .filter(r => r.profiles) // reproduit le comportement "!inner" (exclut les lignes sans profil)
--   (suppose profil_recrutement.joueur_id comme clé de jointure — à
--   confirmer, cohérent avec le nom de la contrainte FK affiliations_joueur_
--   id_fkey vue ailleurs dans le projet pour le même genre de relation.)
--
-- ═══ 4. Administration coach — DashboardCoach.jsx (point 4) ═══
--
-- src/pages/DashboardCoach.jsx — getDemandes() (L.168-175) :
--   AVANT :
--     const { data, error } = await supabase
--       .from('demandes')
--       .select('*, profiles!demandes_joueur_id_fkey(id, prenom, nom, email, plan), coach:profiles!demandes_pris_en_charge_par_fkey(prenom, nom)')
--       .order('created_at', { ascending: false })
--     if (error) console.error('Erreur getDemandes:', error)
--     if (!error) setDemandes(data)
--   APRÈS (RPC dédiée, cf. partie SQL ci-dessus — remplace entièrement la
--   requête directe sur `demandes`) :
--     const { data, error } = await supabase.rpc('get_demandes_admin')
--     if (error) console.error('Erreur getDemandes:', error)
--     if (!error) setDemandes(data)
--   ATTENTION — la forme des données change légèrement : AVANT, les champs
--   du joueur étaient imbriqués dans `d.profiles.prenom` etc. et ceux du
--   coach dans `d.coach.prenom` ; APRÈS (fonction SQL à colonnes plates),
--   ce sont `d.joueur_prenom`, `d.coach_prenom`, etc. — le code
--   d'affichage de DashboardCoach.jsx qui consomme `demandes` devra être
--   adapté en conséquence (pas détaillé ligne par ligne ici, dépend du
--   rendu exact plus loin dans le fichier — à vérifier au moment d'écrire
--   le diff définitif).
--
-- ═══ 5. Site #852 (DashboardJoueur.jsx) — déjà dans le plan précédent,
--      rappelé ici car son diff change suite à la correction ci-dessus ═══
--
--   AVANT :
--     const { data: coachData } = await supabase.from('profiles').select('*').in('email', COACH_ADMIN_EMAILS)
--   APRÈS :
--     const { data: coachData } = await supabase.rpc('get_coach_contacts')
--   Et retirer l'import devenu réellement inutile :
--     import { COACH_ADMIN_EMAILS } from '../lib/coachAdmin' ← à supprimer
--     (plus aucun usage dans ce fichier après le diff 1d ci-dessus)

-- ──────────────────────────────────────────────────────────────────────────
-- TESTS DE NON-RÉGRESSION (point 5) — SQL, lecture seule ou transactions
-- annulées. Les diffs JS eux-mêmes nécessitent des tests manuels dans
-- l'app (listés en G ci-dessous), aucun test SQL ne peut couvrir le rendu
-- React.

-- Vérifie que get_demandes_admin() renvoie bien 0 ligne pour un non-admin,
-- et des lignes pour un admin — même technique que les tests précédents.
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","email":"non-admin@example.com","role":"authenticated"}';
  select count(*) from public.get_demandes_admin();
  -- Résultat attendu : 0 (le WHERE EXISTS interne élimine tout).
rollback;

begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"dcbdeaef-a2cb-4869-918f-c2282475c5ea","email":"legacyattitude@gmail.com","role":"authenticated"}';
  select count(*) from public.get_demandes_admin();
  -- Résultat attendu : nombre réel de lignes dans `demandes` (admin voit tout).
rollback;

-- Vérifie que EXECUTE est bien restreint comme pour les autres fonctions
-- admin — anon ne doit même pas pouvoir tenter l'appel.
select
  has_function_privilege('anon', 'public.get_demandes_admin()', 'execute') as anon_peut,          -- attendu: false
  has_function_privilege('authenticated', 'public.get_demandes_admin()', 'execute') as auth_peut; -- attendu: true

-- G. Checklist fonctionnelle (manuel, après déploiement) :
--    1. Messagerie : ouvrir une conversation existante dans ScoutCenter,
--       DashboardRecruteur, DashboardEducateur (Explorer) et DashboardJoueur
--       — noms des interlocuteurs toujours affichés correctement
--    2. DashboardJoueur : vérifier que les conversations avec le coach
--       analyseur tombent toujours dans le bon onglet (pas mélangées avec
--       les recruteurs), et que le compteur de messages non lus du coach
--       reste correct
--    3. GestionPrepPhysique : liste des joueurs du roster toujours peuplée,
--       tests physiques toujours associés au bon joueur
--    4. DashboardJoueur : section bilan médical affiche toujours le nom du
--       recruteur demandeur
--    5. Jogabonito + Feed : noms/avatars des auteurs de commentaires
--       toujours affichés
--    6. MoteurRecrutement : résultats de recherche toujours peuplés avec
--       nom/poste/club/avatar des joueurs
--    7. DashboardCoach : liste des demandes toujours peuplée avec infos
--       joueur + coach assigné, pour un compte admin ; vide/erreur gérée
--       proprement pour un compte non-admin (ne devrait de toute façon
--       jamais atteindre cet écran, gatée par COACH_ADMIN_EMAILS côté
--       routage — la RPC est une 2e barrière, pas la seule)
--    8. Cas limite à tester spécifiquement : une conversation/un
--       commentaire dont l'auteur a été banni entre temps → doit afficher
--       un fallback (nom vide/"Utilisateur" ou équivalent déjà prévu par le
--       JSX existant via `?.`), pas une erreur JS
