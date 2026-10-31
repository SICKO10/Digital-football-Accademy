-- Index de performance — deux requêtes du dashboard club qui dépassent le
-- statement timeout pour un club avec plusieurs équipes (ex. AS Cannes).
-- Analyse en lecture seule du code (src/pages/DashboardClub.jsx), AUCUNE
-- vérification directe en base n'a été faite dans cette session (pas d'accès
-- Supabase) — à confirmer avant exécution, cf. bloc DIAGNOSTIC plus bas.
--
-- NE PAS EXÉCUTER SANS VALIDATION EXPLICITE.

-- ════════════════════════════════════════════════════════════════════════
-- DIAGNOSTIC (lecture seule, sûr à tout moment) — confirme les colonnes et
-- l'absence d'index avant de créer quoi que ce soit ci-dessous.
-- ════════════════════════════════════════════════════════════════════════
select tablename, indexname, indexdef from pg_indexes
where tablename in ('projets_club','projet_etapes','etape_missions','mission_actions',
                     'projet_budget','seances_uploadees','evaluations_seance')
order by tablename, indexname;

-- ════════════════════════════════════════════════════════════════════════
-- 1. chargerProjets() — DashboardClub.jsx:2326-2331
--    .from('projets_club').select('*, projet_etapes(*, etape_missions(*,
--      mission_actions(*))), projet_budget(*)').eq('club_id', uid)
--    Chaque niveau de l'imbrication (projets_club → projet_etapes →
--    etape_missions → mission_actions, + projet_budget) est un JOIN généré
--    par PostgREST. Sans index sur les clés étrangères, chaque jointure fait
--    un scan séquentiel complet de la table fille pour chaque ligne du
--    niveau parent — le coût croît multiplicativement avec le nombre de
--    projets/étapes/missions. Vérifié dans le code (ProjetDetail.jsx) :
--    aucune colonne de ces 4 tables n'est indexée dans ce dépôt (aucun
--    CREATE INDEX committé) — risque élevé qu'aucun index n'existe non plus
--    en base, au-delà de la clé primaire implicite.
--
--    Ce problème EST un problème d'index (la requête reste légitime), mais
--    un index seul ne retire pas le fan-out : même indexée, cette requête
--    ramène TOUTES les étapes/missions/actions de TOUS les projets d'un
--    club d'un coup, à chaque chargement du dashboard (appelée dans le
--    Promise.all initial, ligne 1519 — avant même que l'utilisateur ouvre
--    l'onglet Projets). Les deux corrections sont complémentaires, pas
--    alternatives : l'index réduit le coût PAR requête, le chargement à la
--    demande réduit le NOMBRE de requêtes exécutées inutilement.
create index concurrently if not exists idx_projets_club_club_id
  on public.projets_club (club_id);

create index concurrently if not exists idx_projet_etapes_projet_id
  on public.projet_etapes (projet_id);

create index concurrently if not exists idx_etape_missions_etape_id
  on public.etape_missions (etape_id);

create index concurrently if not exists idx_mission_actions_mission_id
  on public.mission_actions (mission_id);

create index concurrently if not exists idx_projet_budget_projet_id
  on public.projet_budget (projet_id);

-- ════════════════════════════════════════════════════════════════════════
-- 2. chargerSeancesRecues() — DashboardClub.jsx:2498-2505
--    .from('seances_uploadees').select('*, educateur:profiles_public!...(*),
--      evaluation:evaluations_seance(*)').eq('club_id', uid)
--    Même constat sur les index (club_id, educateur_id, et la FK de
--    evaluations_seance vers seances_uploadees ne semblent indexés nulle
--    part). MAIS il y a un 2e problème, indépendant des index : `select('*')`
--    ramène aussi `fiche_seance` (JSON complet de la séance — plan détaillé,
--    potentiellement volumineux) pour CHAQUE séance jamais uploadée par le
--    club, alors que la liste affichée (DashboardClub.jsx:4098-4124) ne lit
--    que theme/date_seance/statut/saison/video_url + le nom de l'éducateur
--    et la note d'évaluation — jamais fiche_seance. Chaque ligne paie le
--    coût de lecture d'un gros champ JSONB (stocké en TOAST, donc une lecture
--    disque supplémentaire par ligne) pour une donnée jamais utilisée par
--    cet écran.
create index concurrently if not exists idx_seances_uploadees_club_id
  on public.seances_uploadees (club_id);

create index concurrently if not exists idx_seances_uploadees_educateur_id
  on public.seances_uploadees (educateur_id);

create index concurrently if not exists idx_evaluations_seance_seance_id
  on public.evaluations_seance (seance_id);

-- ════════════════════════════════════════════════════════════════════════
-- CHANGEMENT DE CODE COMPLÉMENTAIRE (JS, pas SQL — PAS appliqué, proposé
-- pour validation séparée) : src/pages/DashboardClub.jsx
-- ════════════════════════════════════════════════════════════════════════
--
-- A. chargerSeancesRecues (ligne 2498-2505) — retirer fiche_seance de la
--    liste (jamais lu par l'écran liste), ajouter une limite de sécurité :
--
--    AVANT :
--      .select('*, educateur:profiles_public!seances_uploadees_educateur_id_fkey(prenom, nom), evaluation:evaluations_seance(*)')
--      .eq('club_id', uid).order('created_at', { ascending: false })
--
--    APRÈS (colonnes explicites, fiche_seance exclue ; fichier_url/statut/
--    theme/date_seance/saison/video_url suffisent à la liste et aux actions
--    visibles — "Voir" ouvre déjà video_url, pas fiche_seance) :
--      .select('id, theme, date_seance, statut, saison, video_url, created_at, educateur_id, club_id, educateur:profiles_public!seances_uploadees_educateur_id_fkey(prenom, nom), evaluation:evaluations_seance(*)')
--      .eq('club_id', uid).order('created_at', { ascending: false }).limit(200)
--    Vérifié par grep exhaustif sur tout DashboardClub.jsx : aucune lecture
--    de `fiche_seance` nulle part dans ce fichier (ni dans ouvrirGrilleEvaluation,
--    ni dans ModalGrilleSeance côté affichage) — rien ne dépend de sa présence
--    ici, exclusion sûre.
--
-- B. Chargement à la demande (ligne 1519) — chargerProjets et
--    chargerSeancesRecues retirés du Promise.all initial (qui bloque
--    l'affichage du dashboard entier tant qu'ils n'ont pas répondu), appelés
--    seulement à l'ouverture de l'onglet correspondant (ex. dans un
--    useEffect déclenché par activeSection === 'projets' / 'seances_recues',
--    avec un drapeau "déjà chargé" pour ne pas refetcher à chaque clic
--    d'onglet). Nécessite de vérifier qu'aucun autre endroit du dashboard
--    (ex. un compteur affiché ailleurs) ne dépend de projetsClub/
--    seancesRecues avant que ces onglets soient ouverts — à faire avant
--    d'appliquer ce point.
--
-- Rien de ce qui précède ne modifie une donnée existante : uniquement des
-- index (structure, pas de données) et une proposition de diff JS non
-- appliquée.
