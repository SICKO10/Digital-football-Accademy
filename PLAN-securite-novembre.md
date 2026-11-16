# PLAN : fermeture des failles d'accès de novembre
Date : 2026-11-14 · Brief : BRIEF-securite-novembre.md

Objectif : refermer les quatre tables ouvertes à tout compte connecté (`role_categories_access`, `staff_club`, `convocation_joueurs`, `entrainements`) pour que chaque club ne voie et ne modifie que ce qui est à lui.
Critère de réussite principal : rien ne change à l'écran pour les éducateurs, joueurs, parents, dirigeants et clubs.

## Démarrage conditionné
- **Ne pas lancer le bloc 0 avant la fin vérifiée de la sécurité sponsors** (phases 2, 3, 3b, 4b). État au 2026-11-14 : phases 2 et 3 arrêtées par les garde-fous, base inchangée.
- Le SQL du bloc 3 de PLAN-categories.md n'est pas appliqué avant le bloc 9 de ce plan.

## Règles techniques pour tous les blocs
- Seules les règles lues dans `pg_policies` font foi, jamais les fichiers SQL du dépôt.
- Jamais de RLS désactivée, jamais de `USING (true)`, jamais de droit à `anon` ou `PUBLIC` sur ces tables.
- Fonctions de droits : SECURITY DEFINER, `SET search_path = ''`, `REVOKE ... FROM PUBLIC, anon`, `GRANT EXECUTE ... TO authenticated`, marqueur de version en commentaire. Réutiliser `sponsors_peut_acceder` et `sponsors_est_membre_club` quand elles conviennent.
- Chaque script de fermeture : garde-fous en tête (« ARRÊT : … Rien n'a été modifié » si la base diffère de l'état attendu), contrôles finaux dans la même transaction, une seule table par script.
- Kevin lance tout bloc SQL qu'il voit : dans un message, seuls les scripts à exécuter sont en bloc de code ; résultats attendus en texte. Le secours est dans un fichier séparé `..._SECOURS_NE_PAS_EXECUTER.sql` dont la première ligne bloque l'exécution, jamais collé dans le message. Un secours ne rouvre jamais une table au public : au pire il rétablit une règle limitée au club.
- Avant chaque script qui modifie la base : Kevin lance `zsh ~/Sauvegardes-DigitalFootball/sauvegarder.sh`.
- Tests SQL dans `supabase_securite_novembre_tests.sql`, chaque cas dans une transaction annulée (`BEGIN ... ROLLBACK`), avec les vrais identifiants : **club A = club test** (`deabreu.amorim+club@gmail.com`), **club B = AS CANNES en lecture seule**. Chaque cas vérifie « A voit A » et « A ne voit pas B ».
- À l'écran : écritures uniquement avec les comptes du club test. Jamais de connexion à un vrai compte pour écrire.
- `DashboardEducateur.jsx`, `DashboardClub.jsx`, `DashboardJoueur.jsx` : ne jamais les lire en entier, chercher l'endroit précis.
- Commits : sélectifs (d'autres chantiers ont des fichiers modifiés en cours), un commit dédié par correction de code, jamais mélangé, après accord de Kevin. Déploiement (Vercel ou fonction Supabase) : version de test d'abord, production seulement avec le « ok » de Kevin.

## Ce que je dois fournir
| Élément | Pourquoi | Où le trouver | Nécessaire avant |
|---|---|---|---|
| Résultat du diagnostic (`supabase_securite_novembre_diagnostic.sql`) | Connaître les règles réelles, triggers, fonctions et vues qui touchent les 4 tables | SQL Editor Supabase, enregistrer en `diagnostic-securite-novembre.txt` à la racine | bloc 1 |
| Validation de la matrice des droits | Aucune ligne de SQL de fermeture sans elle | Section « Matrice » de ce fichier, rédigée au bloc 1 | bloc 2 |
| Comptes de test manquants du club test : `deabreu.amorim+educ@`, `+joueur`, `+parent`, `+staff` (selon la liste du bloc 0) | Tester chaque acteur, en lecture et en écriture | Inscription sur le site, puis rattachement au club test (invitation du club) | bloc 2 |
| Accès aux mots de passe de ces comptes | Tests à l'écran | Ton gestionnaire de mots de passe | bloc 3 |

## Manipulations à faire moi-même
1. Avant le bloc 0 : terminer et vérifier la sécurité sponsors.
2. Bloc 0 (en cours) : lancer le diagnostic en lecture seule, enregistrer le résultat dans `diagnostic-securite-novembre.txt`.
3. Entre le bloc 0 et le bloc 2 : créer les comptes de test manquants et les rattacher au club test (liste exacte donnée au bloc 0).
4. Bloc 1 : relire et valider (ou corriger) la matrice des droits.
5. Blocs 2, 3, 5, 6, 7 : sauvegarde, puis lancer le script montré, puis le fichier de tests SQL, recoller les résultats.
6. Blocs 3, 5, 6, 8 : tests à l'écran avec la liste précise donnée par le bloc.
7. Bloc 4 : donner le « ok » pour déployer la fonction serveur et le site (version de test, puis production) avant la fermeture de `staff_club`.

## Répartition suggérée
Je ne vois pas ta barre « 5h » d'ici : à ajuster selon son niveau. Tous les blocs sauf le 9 sont en Opus, donc au plus deux blocs par fenêtre de 5 h.
- Jour 1 (après la fin des sponsors) : blocs 0 et 1. Entre les deux, tu lances le diagnostic et tu crées les comptes de test.
- Jour 2 : blocs 2 et 3 (`role_categories_access` fermée).
- Jour 3 : blocs 4 et 5 (`staff_club` et invitation).
- Jour 4 : bloc 6 (convocations).
- Jour 5 : bloc 7, puis bloc 8 le lendemain si la fenêtre est entamée (`entrainements`).
- Jour 6 : bloc 9.
Rappel : `/clear` et une session neuve par bloc.

## Blocs

### Bloc 0 : mise en place et diagnostic en lecture seule
- Statut : fait côté code (2026-11-14), en attente des résultats du diagnostic lancés par Kevin
- Objectif : savoir exactement ce qui lit et écrit les 4 tables, côté base et côté code, avant de décider quoi que ce soit.
- Résultat testable : `supabase_securite_novembre_diagnostic.sql` prêt à lancer ; section « Inventaire » en bas de ce fichier remplie côté code ; liste des comptes de test à créer.
- Modèle : opus · Effort : medium · Coût estimé : moyen
- Pourquoi ce modèle : un oubli dans l'inventaire se paie plus tard par un écran cassé sans message.
- Lancement : `/clear`, puis `/model opus`, puis `/effort medium`, puis `/bloc 0 PLAN-securite-novembre.md`
- Dépend de : sécurité sponsors terminée
- Prérequis : aucun
- Étapes :
  - Noter `git status` (fichiers d'autres chantiers à ne pas embarquer) ; aucun commit.
  - Écrire `supabase_securite_novembre_diagnostic.sql` (SELECT uniquement) : règles `pg_policies`, colonnes, triggers, fonctions et vues qui citent les 4 tables (avec SECURITY DEFINER ou non), droits `anon`/`authenticated`, nombre de lignes par club, comptes rattachés au club test (club, staff avec rôle, éducateurs, joueurs affiliés, parents, dirigeants), identifiants utiles d'AS CANNES.
  - Écrire `supabase_controle_ouvertures.sql` [IDÉE retenue] : un seul SELECT qui liste toute règle `USING true`/`WITH CHECK true` ou ouverte à `anon`/`PUBLIC` dans toute la base. Il sert aussi d'état de départ.
  - Recenser le code (grep, sans lire les gros fichiers en entier) : chaque lecture et écriture des 4 tables par fichier, colonnes utilisées, acteur concerné ; écrans parent, dirigeant, pages publiques, `api/`, `supabase/functions/` ; écrans qui affichent les emails ou téléphones des collègues du staff.
  - Remplir l'Inventaire (côté code) et la liste des comptes de test à créer.
- Ce que je teste pour valider : je lance le diagnostic et le contrôle des ouvertures, j'enregistre le résultat dans `diagnostic-securite-novembre.txt`, je relis la liste des comptes à créer.
- Reste à finir :
  - Fait le 2026-11-14 : les deux scripts lancés par Claude via `supabase db query --linked` (lecture seule) ; CSV complets à la racine (175 et 59 lignes), ajoutés au `.gitignore`.
  - Relancer le contrôle des ouvertures une fois la sécurité sponsors finie : c'est ce second passage qui sert d'état de départ du bloc 9.
  - Créer les comptes de test listés dans l'Inventaire (section « Comptes de test ») avant le bloc 2.
- Journal :
  - 2026-11-14 · Opus 5.5 · lancé avant la fin de la sécurité sponsors, sur décision de Kevin (bloc en lecture seule). Diagnostic livré en `.csv` (un seul tableau, comme `supabase_categories_diagnostic.sql`) au lieu de `.txt`. Les deux scripts ont été exécutés sans erreur sur une base Postgres locale jetable qui imite les tables (pas sur la vraie base). Aucun commit.
  - Fichiers d'autres chantiers modifiés au départ, à ne pas embarquer : `DashboardClub.jsx`, `DashboardEducateur.jsx`, `supabase_sponsors_*` (4 fichiers), tout le chantier catégories (non suivis).
  - 2026-11-14 · Opus 5.5 · résultats collés dans la conversation (pas encore en fichiers). Diagnostic coupé après l'ordre 12 : manquent droits, colonnes, déclencheurs, fonctions, vues, liens, nombres de lignes, comptes du club test, AS CANNES. Constats : `convocation_joueurs` « lecture convocation joueurs » est `USING true` pour `public`, donc lisible **sans compte** (pire que prévu). `staff_club` a déjà `staff_accepte_invitation` (insertion limitée par `invitation_staff_valide(club_id, role)`) et `staff_lit_sa_ligne` ; reste ouverte `staff_read_all`. `convocation_joueurs` a aussi `categories_commun_lecture` et `parent_lit_donnees_enfant`. Beaucoup d'autres règles (ordre 12) lisent `staff_club` sans filtre de rôle : la fermeture ne doit pas les casser. Contrôle des ouvertures : 45 règles « 1 GRAVE » hors chantier (dont `conversations`, `messages_chat`, `conversation_participants`, `clubs`, `budget_depenses`, `budget_recettes`, `tournois_*`, `notifications` en écriture), non traitées ici : nouveau brief.

### Bloc 1 : matrice des droits cible
- Statut : fait et validé (2026-11-14) : les 3 points tranchés selon la recommandation
- Objectif : écrire en français, table par table et acteur par acteur, qui peut lire, créer, modifier, supprimer.
- Résultat testable : section « Matrice » de ce fichier, avec pour chaque case l'écran qui en a besoin (ou « personne n'en a besoin »).
- Modèle : opus · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : c'est la décision qui conditionne tout le SQL ; une case fausse = un écran cassé ou une fuite.
- Lancement : `/clear`, puis `/model opus`, puis `/effort high`, puis `/bloc 1 PLAN-securite-novembre.md`
- Dépend de : bloc 0
- Prérequis : `diagnostic-securite-novembre.csv` à la racine (présent)
- Étapes :
  - Croiser le diagnostic et l'Inventaire code : compléter l'Inventaire côté base (règles réelles, fonctions SECURITY DEFINER qui échappent aux règles, fonctions normales qui les subissent, triggers).
  - Matrice pour les 9 acteurs du brief (club, staff selon rôle, éducateur du club, éducateur d'un autre club, joueur affilié, parent, dirigeant délégué, compte sans lien, visiteur sans compte) × 4 tables × lecture/création/modification/suppression.
  - `staff_club` : confirmer la piste du masquage (table lisible en entier par le compte club, le président et la personne elle-même ; fonction « annuaire » qui ne rend que nom, prénom, rôle, catégories aux collègues). Décider où passe l'ajout au staff : `inviter-staff` (prévu par le brief) ou `accepter-invitation` (fonction serveur qui gère déjà les invitations avec le service role), selon le code.
  - Lister les fonctions de droits à créer et celles réutilisées (`sponsors_peut_acceder`, `sponsors_est_membre_club`).
- Ce que je teste pour valider : je lis la matrice et je réponds « ok » ou je corrige des cases.
- Reste à finir :
  - ~~Validation de Kevin~~ : faite le 2026-11-14 (recommandations retenues sur les 3 points).
  - Comptes de test toujours absents (diagnostic ligne 37 : aucun) : à créer avant le bloc 2. [IDÉE] le club test a déjà un éducateur accepté, `testfinal@gmail.com`, avec 3 équipes (U20 A, U13 C, U13 A) : s'il a son mot de passe, Kevin peut l'utiliser au lieu de créer `+educ`.
  - Hors chantier, à noter pour plus tard : les boutons de l'onglet Staff visibles par un délégué n'enregistrent rien (refus silencieux, aucun message d'erreur) ; `DashboardClub.jsx:1245` traite un membre du staff sans rôle comme président à l'écran (aucun cas en base aujourd'hui) ; 9 fonctions ouvertes à `anon` (Inventaire côté base) pour le nouveau brief.
- Journal :
  - 2026-11-14 · Opus 5.5 · diagnostic CSV croisé avec le code ; lectures en base supplémentaires (SELECT seuls, via `supabase db query --linked`) : définitions des fonctions de droits, règles de `staff_invitations`, `convocations`, `dirigeant_acces`, `role_permissions`, statuts des affiliations, parents et dirigeants. Écarts : bloc 4 réduit à l'annuaire (l'auto-ajout est déjà verrouillé en base) ; club sans accès à `convocation_joueurs` (aucun écran) contrairement à l'objectif du bloc 6 ; président autorisé à écrire dans `staff_club` (nouveau, aucun président en base). Aucun fichier de code touché, aucun commit.

### Bloc 2 : fonctions de droits et fichier de tests
- Statut : fait (2026-11-16)
- Objectif : poser en base les fonctions de droits (ajout pur, aucune règle touchée) et le fichier de tests à deux clubs.
- Résultat testable : `supabase_securite_novembre_fonctions.sql` appliqué ; `supabase_securite_novembre_tests.sql` lancé : toutes les fonctions répondent juste pour chaque acteur des clubs A et B ; les tests des 4 tables montrent « ouvert » (état actuel, attendu à ce stade).
- Modèle : opus · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : fonctions SECURITY DEFINER = code qui contourne les règles ; une erreur ouvre une porte.
- Lancement : `/clear`, puis `/model opus`, puis `/effort high`, puis `/bloc 2 PLAN-securite-novembre.md`
- Dépend de : bloc 1 validé, comptes de test créés
- Prérequis : sauvegarde avant le script
- Étapes :
  - Écrire les fonctions de la matrice (dont la fonction « annuaire » du staff), avec garde-fous et contrôles finaux.
  - Écrire le fichier de tests : fixtures (vrais identifiants des comptes du club test et d'AS CANNES), `set_config('request.jwt.claims', ...)` + `SET LOCAL ROLE authenticated` par acteur, un cas par case de la matrice, résultat attendu à côté.
  - Écrire `supabase_securite_novembre_fonctions_SECOURS_NE_PAS_EXECUTER.sql` (retrait des fonctions).
  - Présenter le script, Kevin sauvegarde puis lance, puis lance les tests.
- Ce que je teste pour valider : le script se termine sans « ARRÊT » ; les tests des fonctions sont tous ok ; l'application marche comme avant.
- Reste à finir :
  - Rien pour ce bloc. Les blocs 3, 5, 6, 7 relancent `supabase_securite_novembre_tests.sql` : leurs écarts doivent passer à « ok ».
  - Constat hors bloc (corrigé par le bloc 6) : la règle actuelle d'écriture de `convocation_joueurs` exige une fiche `profil_educateur` ; 12 éducateurs sur 19 n'en ont pas (dont `testfinal`), leurs convoqués ne s'enregistrent donc pas aujourd'hui (tests T303, T304).
  - À noter pour plus tard : `DashboardClub.jsx:1272` traite un membre du staff au rôle vide comme président (aucun cas en base ; les fonctions le refusent). Les restrictions de catégorie du staff (`role_categories_access`) ne s'appliquent pas aux séances, conforme à la matrice.
- Journal :
  - 2026-11-14 · Opus 5.5 · bloc non démarré : prérequis vérifiés en base (diagnostic relancé, lecture seule). Club test = `testfinal` éducateur accepté + 3 équipes, aucun staff, aucun joueur, parent ni dirigeant, aucun compte `deabreu.amorim+…` hormis le club. Matrice validée par Kevin (3 recommandations), `testfinal` remplace `+educ`. Aucun SQL écrit, aucun commit.
  - 2026-11-14 · Opus 5.5 · relance de `/bloc 2` : toujours bloqué. Lecture de `auth.users` : seuls `testfinal@` et `+club@` existent ; `+joueur`, `+parent`, `+staff`, `+dirigeant` absents. Rien écrit.
  - 2026-11-14 · Opus 5.5 · 3e relance : toujours bloqué (mêmes 2 comptes dans `auth.users`). AS CANNES n'a aucun staff (cf. `supabase_sponsors_tests.sql`), il ne peut donc pas remplacer `+staff`. Proposé à Kevin : créer les 4 comptes, ou découper le bloc (2a fonctions + secours maintenant, 2b tests quand les comptes existent). Rien écrit en base.
  - 2026-11-15 · Opus 5.5 · Kevin a recréé des comptes sur d'autres adresses (voir « Comptes de test »). Joueur, parent et staff OK en base. Toujours bloqué : (1) aucun dirigeant, car l'ajout de dirigeant a disparu avec Explorer (commit `b971f3d`, touche tous les éducateurs) ; (2) aucune restriction de catégorie posée pour le directeur sportif (`role_categories_access` vide pour le club test). Signalé aussi : le parent voit des champs modifiables ; vérifié en base, rien n'a été enregistré à son nom ni au nom du joueur.
  - 2026-11-15 · Sonnet 5.5 · (1) Ajout de dirigeant revenu dans Mon équipe, sous la liste des joueurs (`rendreDirigeants` dans `DashboardEducateur.jsx`), aide ligne 235 corrigée : le compte dirigeant peut maintenant être invité par `testfinal`. (2) Mode parent en consultation seule : Mon profil bloqué, « Accès parents » masqué, Mes Statistiques sans « Saisir un match », bandeau sans boutons de bascule. Le compte parent `bykenza.contact` est aussi joueur (forfait starter) : ses modifications via « Vue Joueur » touchaient son propre profil, pas celui de l'enfant. Commit `9972a70` poussé sur `main`, pas encore vérifié à l'écran. Reste pour le bloc 2 : inviter le dirigeant, limiter le directeur sportif à une catégorie.
  - 2026-11-16 · Opus 5.5 · prérequis réunis (dirigeant accepté : entraînements édition, compétition lecture ; directeur sportif limité à U11). Écrits : `supabase_securite_novembre_fonctions.sql` (7 fonctions `secu_*`, garde-fous, contrôles finaux, marqueur `securite-novembre-v1`), `supabase_securite_novembre_tests.sql` (196 cas : 94 fonctions, 102 tables et droits techniques ; chaque cas crée ses propres séances et convocations puis s'annule), `supabase_securite_novembre_fonctions_SECOURS_NE_PAS_EXECUTER.sql`. Vérifié sur une copie locale de la structure et des 18 règles réelles (Postgres 17, identifiants seulement, aucune donnée personnelle) : script passé et rejouable ; garde-fou anti-écrasement OK ; tests 141 ok, 55 écarts attendus, 0 échec ; fermeture simulée des 4 tables (brouillon local, non livré) : 196/196 ok ; tests sans trace ; secours testé (bloqué en entier, bloqué sans confirmation, bloqué si des règles utilisent les fonctions, retrait OK sinon). Écarts : compte club exigé en plan `club` (les 7 clubs le sont) ; création de séance par le club seulement au nom de l'éducateur de l'équipe (comme `PlanificationSeances.jsx`). Aucune écriture en production, aucun commit.
  - 2026-11-16 · Opus 5.5 · Kevin a appliqué `supabase_securite_novembre_fonctions.sql` en production (« Bloc 2 appliqué »). Vérifié en lecture : 7 fonctions, SECURITY DEFINER, search_path vide, marqueur v1, fermées à anon, ouvertes à authenticated ; 14 règles des 4 tables inchangées. Tests lancés par Kevin : 196 lignes, 0 échec, 94 cas F ok, 55 écarts identiques à la copie locale. Vérifié ensuite : aucune trace des tests (séances, convocations, staff, droits du dirigeant et du directeur sportif inchangés).

### Bloc 3 : fermeture de `role_categories_access`
- Statut : fait (2026-11-16)
- Objectif : seul le club propriétaire (et les rôles prévus par la matrice) lit et modifie les droits par catégorie de son staff.
- Résultat testable : `rca_all` remplacée ; tests SQL de la table tous ok ; l'écran des droits du staff dans le dashboard club marche.
- Modèle : opus · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : première fermeture, elle rode le protocole repris par les trois suivantes.
- Lancement : `/clear`, puis `/model opus`, puis `/effort high`, puis `/bloc 3 PLAN-securite-novembre.md`
- Dépend de : bloc 2
- Prérequis : sauvegarde avant le script
- Étapes :
  - `supabase_securite_novembre_rca.sql` : garde-fous (règles actuelles exactement celles du diagnostic), nouvelles règles, contrôles finaux (aucune règle ouverte, aucun droit `anon`).
  - `supabase_securite_novembre_rca_SECOURS_NE_PAS_EXECUTER.sql`.
  - Passer les tests de la table de « ouvert » à « fermé » dans le fichier de tests.
  - Liste de tests à l'écran (compte, page, ce qui doit s'afficher, ce qui doit s'enregistrer).
- Ce que je teste pour valider : script sans « ARRÊT », tests SQL ok, puis avec le compte club test : ouvrir les droits d'un membre du staff, cocher une catégorie, enregistrer, recharger la page, la case est toujours cochée.
- Reste à finir :
  - Hors bloc, constaté le 2026-11-16 (rien à voir avec la fermeture) : (1) réinviter un compte déjà inscrit affiche « Edge Function returned a non-2xx status code » : `inviter-staff` renvoie 500 sur le refus de Supabase et l'écran ne montre pas le vrai message ; (2) un membre du staff sans prénom ni nom apparaît en « ? » dans l'onglet Staff (cas de `7kevin.amorim10`, profil vide, plan `joueur_starter`, d'où le bouton « Vue Joueur ») ; (3) la limite de catégorie du staff (U11) n'est appliquée que par `peut_voir_categorie` → `categories_commun_visible` (nouveau système du chantier catégories), pas par les écrans actuels du dashboard club, qui montrent toutes les équipes. Vérifié dans l'historique : le réglage est enregistré depuis le commit `5e2f409` (août 2026) mais aucun écran ne l'a jamais appliqué. Kevin l'a constaté à l'écran (directeur sportif limité à U11 voit U13 et U20 dans Catégories & Équipes et Stat équipe). À traiter dans un chantier à part.
- Journal :
  - 2026-11-16 · Opus 5.5 · lu en base : `rca_all` seule (ALL, public, `auth.uid() IS NOT NULL`), RLS active, 42 lignes (14 par club : club test, AS CANNES, un 3e club), toutes à un compte en plan `club`, contrainte `UNIQUE (club_id, role)`, seule fonction lectrice `peut_voir_categorie`. Code : seul l'écran Accès du bureau lit et enregistre (`DashboardClub.jsx:2335`, upsert `2368`, `EtapeAccesBureau.jsx`). Écrits : `supabase_securite_novembre_rca.sql` (3 règles `rca_club_president_*` sur `secu_club_ou_president`, aucune suppression, droits `anon`/PUBLIC retirés, TRUNCATE/REFERENCES/TRIGGER retirés à `authenticated`, essai réel par club dans les contrôles finaux), secours (3 règles limitées au compte club seul, sans suppression, jamais public), tests : `t.blocs_appliques = '2,3'` (un écart d'un bloc appliqué devient « ÉCHEC »). Vérifié sur Postgres 17 local (structure + 42 lignes fictives) : 22 cas ok après fermeture (T101-T114, T901-T902, 4 upserts comme l'écran : club, président, directeur sportif, club A sur B) ; 2e passage arrêté « déjà appliqué » ; 8 garde-fous testés un par un, chacun arrête sans rien modifier ; contrôle final en échec annule tout ; secours bloqué en entier, bloqué sans confirmation, bloqué avant bloc 3, appliqué ensuite (seul le président perd l'accès). Aucune écriture en production, aucun commit.
  - 2026-11-16 · Opus 5.5 · 1er essai de Kevin refusé par le SQL Editor (« unterminated dollar-quoted string ») : les expressions régulières finissant par `$'` dans un bloc `do $$` faisaient mal découper le script ; vérifié en lecture, base inchangée. Remplacées par des comparaisons `in (...)`, retesté en local (22/22). Kevin a appliqué la version corrigée (« Bloc 3 appliqué »). Vérifié en lecture : 3 règles `rca_club_president_*` réservées à `authenticated`, RLS active, 42 lignes, `anon` sans aucun droit, `authenticated` sans TRUNCATE/REFERENCES/TRIGGER. Règle pour les blocs suivants : pas de `$` isolé dans le corps d'un bloc `do $$`.
  - 2026-11-16 · Opus 5.5 · Tests SQL lancés par Kevin : 0 échec, 94 F ok, T101-T114 et T901-T902 ok, 47 écarts restants (blocs 5, 6, 7), identiques au tableau du bloc 2 moins les 10 cas fermés (le « 55 » du journal du bloc 2 était une erreur de compte : le tableau en avait 57). Écran : Accès du bureau enregistre et garde le réglage (compte club test, U13 décoché, reste U11). Bloc clos, commit à faire avec l'accord de Kevin.

### Bloc 4 : `staff_club` côté code (annuaire masqué et invitation sûre)
- Statut : fait (2026-11-16)
- Objectif : rendre le code compatible avec la future règle avant de fermer : collègues lus par la fonction « annuaire », ajout au staff fait par la fonction serveur et plus par le navigateur (`AcceptInvite.jsx` vers la ligne 172).
- Résultat testable : un membre du staff voit ses collègues (nom, rôle) sans email ni téléphone ; une invitation staff acceptée crée la ligne via le serveur avec le rôle inscrit dans l'invitation, pas celui envoyé par le navigateur.
- Modèle : opus · Effort : high · Coût estimé : élevé
- Pourquoi ce modèle : faille d'élévation de droits (se déclarer président d'un club) ; erreur coûteuse.
- Lancement : `/clear`, puis `/model opus`, puis `/effort high`, puis `/bloc 4 PLAN-securite-novembre.md`
- Dépend de : bloc 2 (fonction annuaire en base)
- Prérequis : aucune fermeture de `staff_club` avant la mise en production de ce bloc
- Étapes :
  - Brancher les écrans recensés au bloc 0 qui listent les collègues sur la fonction annuaire (sans changer l'affichage pour le club et le président).
  - ~~Déplacer l'ajout au staff dans une fonction serveur~~ : abandonné au bloc 1, déjà verrouillé en base (voir Matrice, « Décision sur l'ajout au staff »). Seul essai à garder : une invitation staff acceptée de bout en bout.
  - `npm run build` et `npm test` ; essai réel en local avec le compte `+staff` du club test.
  - Commit dédié (fichiers du bloc uniquement) après accord ; déploiement de la fonction serveur puis du site : version de test, puis production avec le « ok ».
- Ce que je teste pour valider : sur la version de test, inviter `+staff` depuis le club test, accepter, arriver sur le dashboard club avec le bon rôle ; avec `+staff`, voir les collègues sans coordonnées ; avec le compte club, voir les coordonnées.
- Reste à finir :
  - Rien pour ce bloc : en production, le bloc 5 peut démarrer.
  - Rappel mise en ligne : pas d'outil Vercel sur la machine, le site part en production à l'envoi sur `main`. Seul le contenu commité part.
  - Hors bloc : le commit du bloc 3 (fichiers `supabase_securite_novembre_rca*.sql`, tests, journal) n'est pas encore fait.
- Journal :
  - 2026-11-16 · Opus 5.5 · Un seul écran liste les collègues : `chargerStaff` de `DashboardClub.jsx` (onglet Staff, demandes de saison via `DemandesClub`/`libelleValideurs`, listes de responsables vers les lignes 5273 et 6026). Aucun n'utilise l'email : seuls `id`, `user_id`, `role`, `membre.prenom`, `membre.nom`. Branché sur `rpc('secu_staff_annuaire')`, résultat remis dans la même forme (`membre: { prenom, nom }`), affichage identique. Vérifié en base (lecture, transaction annulée) : staff du club test et compte club test voient 1 ligne du club test, 0 ligne d'AS CANNES ; compte sans lien 0 ; colonnes rendues sans email ni téléphone. `npm run build` OK, `npm test` 527 ok, 0 échec. Ajout au staff : aucun changement (décision du bloc 1). Commit à faire seul (le fichier porte d'autres changements non commités) : version préparée = HEAD + ce seul passage.
  - 2026-11-16 · Opus 5.5 · « ok bloc 4 » de Kevin. Commit `7c409ad` (seul le passage `chargerStaff`, le chantier design de `DashboardClub.jsx` reste non commité), compilé à part dans une copie propre avant l'envoi, poussé sur `main`. Déploiement Vercel de production « success » ; vérifié sur digital-football-accademy.vercel.app : le fichier du dashboard club appelle l'annuaire et ne contient plus l'ancienne lecture avec email. PLAN non commité (il porte aussi le journal du bloc 3, dont le commit n'est pas fait).

### Bloc 5 : fermeture de `staff_club`
- Statut : fait (2026-11-16)
- Objectif : lecture complète réservée au compte club, au président et à la personne elle-même ; écriture au club et au président ; aucun auto-ajout depuis le navigateur.
- Résultat testable : `staff_read_all` remplacée ; tests SQL ok (dont « un compte sans lien ne peut pas s'ajouter comme président ») ; connexion, menus multi-rôles, invitation et newsletter marchent.
- Modèle : opus · Effort : high · Coût estimé : élevé
- Pourquoi ce modèle : table lue au démarrage de l'application (`App.jsx`, `multiRole.js`) : une erreur peut bloquer la connexion de tout le staff.
- Lancement : `/clear`, puis `/model opus`, puis `/effort high`, puis `/bloc 5 PLAN-securite-novembre.md`
- Dépend de : bloc 4 en production
- Prérequis : sauvegarde avant le script
- Étapes :
  - Vérifier que les lecteurs serveur (`api/_droits.js`, `send-newsletter`, `inviter-staff`, `envoyer-invitation`) utilisent le service role ou passent la règle ; corriger dans un commit dédié si besoin.
  - `supabase_securite_novembre_staff.sql` avec garde-fous et contrôles finaux ; fichier secours séparé.
  - Mettre à jour les tests SQL de la table.
  - Liste de tests à l'écran.
- Ce que je teste pour valider : connexion avec `+staff` et avec le compte club (le bon espace s'ouvre), changement de rôle dans le menu, invitation d'un membre du staff de bout en bout, envoi d'une newsletter de test au club test uniquement.
- Reste à finir :
  - Pour les blocs 6 et 7 : même piège que celui trouvé ici. Des règles d'autres tables accessibles au visiteur consultent `convocation_joueurs` (2) et `entrainements` (6). Retirer la LECTURE technique au visiteur sur ces tables ferait échouer ces lectures : vérifier lesquelles avant d'écrire le script et les tests T905/T907.
  - Hors bloc : `role_categories_access` garde le droit « maintenance » (MAINTAIN, Postgres 17, permet de verrouiller la table) pour `authenticated` ; à retirer au bloc 9.
- Journal :
  - 2026-11-16 · Opus 5.5 · Lu en base : 5 règles exactes (`club_manage_staff`, `staff_accepte_invitation`, `staff_lit_sa_ligne`, `staff_quitte_club`, `staff_read_all`), RLS active, 5 lignes toutes à un compte club, Postgres 17. Lecteurs serveur : clé de service partout, aucune correction de code. Code du site : ne lit que sa propre ligne (le reste passe par l'annuaire depuis le bloc 4). **Écart au plan, justifié** : 51 règles de lecture de 41 autres tables (`club_categories`, `club_educateurs`, `matchs_equipe`…) consultent `staff_club` et s'appliquent aussi au visiteur ; lui retirer la lecture technique les ferait échouer en « permission refusée » (vérifié sur Postgres 17 local). Le visiteur garde donc SELECT, sans aucune règle qui lui ouvre une ligne (il lit 0 ligne). Écrits : `supabase_securite_novembre_staff.sql` (retire `staff_read_all` ; `club_manage_staff` remplacée par 4 règles `staff_club_president_*` sur `secu_club_ou_president` ; `staff_lit_sa_ligne` et `staff_quitte_club` réservées à `authenticated` ; `staff_accepte_invitation` inchangée ; visiteur sans écriture ; `authenticated` sans TRUNCATE/REFERENCES/TRIGGER/MAINTAIN ; contrôle final avec essai réel pour chaque compte club et chaque membre du staff), secours (ajoute une lecture limitée au club et à son staff + écriture du compte club, jamais public), tests : T903 ajusté, T909 ajouté (le visiteur garde la lecture), `t.blocs_appliques = '2,3,5'`. Vérifié sur Postgres 17 local (structure et règles identiques à la prod, données fictives, 3 clubs) : 27 essais ok (club, président, directeur sportif, invité au rôle triché refusé, invité au bon rôle accepté, compte sans lien, visiteur sur `staff_club` et sur une autre table) ; 2e passage arrêté ; 11 garde-fous testés un par un, chacun arrête sans rien modifier, dont un contrôle final en échec ; secours bloqué en entier, sans confirmation, avant le bloc 5, appliqué ensuite. Aucune écriture en production, aucun commit.
  - 2026-11-16 · Opus 5.5 · Kevin a appliqué le script (un 2e lancement s'est arrêté sur « déjà appliqué », base inchangée). Vérifié en lecture : 7 règles prévues toutes `authenticated`, RLS active, 5 lignes, `anon=r`, `authenticated=arwd`. Tests SQL lancés par Claude avec l'accord de Kevin, enveloppés dans `begin … rollback` : 197 cas, 0 échec, 158 ok (T101-T114, T201-T219, T901-T904, T909 ok), 39 écarts restants (bloc 6 : 15, bloc 7 : 24) ; vérifié après coup : 5 lignes de staff, 0 séance de test restée. Reste : tests à l'écran par Kevin, puis commit avec son accord.
  - 2026-11-16 · Opus 5.5 · Tests à l'écran faits par Kevin (« fait ») : connexion +staff, onglet Staff, changement de rôle par le compte club. Bloc clos, commit à faire avec l'accord de Kevin.

### Bloc 6 : fermeture de `convocation_joueurs`
- Statut : à faire
- Objectif : lecture par l'éducateur de la convocation, le club, le joueur convoqué et ses parents ; écriture par l'éducateur de la convocation et le club.
- Résultat testable : lecture `USING true` et écriture « tout éducateur » remplacées ; tests SQL ok ; convoquer, répondre et voir la convocation marchent.
- Modèle : opus · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : données de mineurs, écritures depuis le navigateur par plusieurs acteurs.
- Lancement : `/clear`, puis `/model opus`, puis `/effort high`, puis `/bloc 6 PLAN-securite-novembre.md`
- Dépend de : bloc 3 (protocole rodé)
- Prérequis : sauvegarde avant le script
- Étapes :
  - Vérifier dans l'Inventaire si le joueur ou le parent écrit dans la table (réponse à une convocation) : la règle d'écriture doit le permettre sur sa propre ligne seulement.
  - `supabase_securite_novembre_convocations.sql` + secours séparé.
  - Tests SQL (identifiants de compte, pas de fiche : ne pas mélanger).
  - Liste de tests à l'écran.
- Ce que je teste pour valider : avec `+educ`, créer une convocation pour `+joueur` ; avec `+joueur` puis `+parent`, la voir (et y répondre si l'écran le permet) ; avec le compte club, la voir.
- Reste à finir :
- Journal :

### Bloc 7 : fermeture de `entrainements` (script et tests SQL)
- Statut : à faire
- Objectif : chaque club, ses éducateurs, son staff autorisé, ses joueurs et leurs parents ne voient que les séances qui les concernent ; seuls l'éducateur auteur et le club modifient ou suppriment.
- Résultat testable : règles ouvertes remplacées ; tests SQL ok pour les 9 acteurs, lecture et écriture.
- Modèle : opus · Effort : high · Coût estimé : élevé
- Pourquoi ce modèle : 12 lecteurs, suppression possible aujourd'hui, table la plus lue.
- Lancement : `/clear`, puis `/model opus`, puis `/effort high`, puis `/bloc 7 PLAN-securite-novembre.md`
- Dépend de : blocs 3, 5, 6
- Prérequis : sauvegarde avant le script
- Étapes :
  - Revoir l'Inventaire des 12 lecteurs : colonnes de filtre utilisées (éducateur, équipe, club), séances d'éducateurs sans club, fonctions SQL qui lisent la table (planning, clôture de saison, nutrition).
  - `supabase_securite_novembre_entrainements.sql` + secours séparé.
  - Tests SQL complets.
  - Préparer la liste de tests à l'écran du bloc 8 (une ligne par lecteur).
- Ce que je teste pour valider : script sans « ARRÊT », tests SQL tous ok.
- Reste à finir :
- Journal :

### Bloc 8 : `entrainements`, tests à l'écran et corrections
- Statut : à faire
- Objectif : vérifier les 12 écrans lecteurs avec les bons comptes et corriger ce qui casse.
- Résultat testable : la liste du bloc 7 entièrement cochée ; corrections éventuelles en commits dédiés.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : la décision de sécurité est prise ; il reste des vérifications et de petites corrections de code. Repasser en Opus si une correction touche une règle en base.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 8 PLAN-securite-novembre.md`
- Dépend de : bloc 7
- Prérequis : comptes `+educ`, `+joueur`, `+parent`, `+staff`, club test
- Étapes :
  - Kevin passe la liste, écran par écran, et note ce qui ne s'affiche pas ou ne s'enregistre pas.
  - Pour chaque écart : trouver la requête précise, corriger le code (pas la règle), `npm run build`.
  - Si la règle est en cause : arrêter, retour au protocole du bloc 7 (script présenté, sauvegarde).
  - Commit dédié par correction, déploiement test puis production avec le « ok ».
- Ce que je teste pour valider : planning, planification annuelle et séances, sondage de la semaine, carte joueur, nutrition, clôtures de saison, historique collectif, parcours coach, dashboards éducateur, club et joueur : chaque séance du club test apparaît, aucune séance d'AS CANNES n'apparaît, créer, modifier et supprimer une séance de test marche.
- Reste à finir :
- Journal :

### Bloc 9 : vérification finale et clôture
- Statut : à faire
- Objectif : prouver que les 4 tables sont fermées et qu'aucune nouvelle ouverture n'existe, puis ranger.
- Résultat testable : `supabase_controle_ouvertures.sql` ne liste plus aucune des 4 tables ; fichier de tests complet tout ok ; BRIEF passé à « terminé ».
- Modèle : sonnet · Effort : medium · Coût estimé : faible
- Pourquoi ce modèle : relance de contrôles et mise à jour de documents, sans décision nouvelle.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 9 PLAN-securite-novembre.md`
- Dépend de : blocs 3 à 8
- Prérequis : aucun
- Étapes :
  - Kevin relance le contrôle des ouvertures et le fichier de tests complet.
  - Comparer avec l'état de départ du bloc 0 ; signaler toute autre ouverture trouvée (sans la corriger : nouveau brief).
  - Mettre à jour ce plan, le brief, la mémoire (failles closes ; le bloc 3 de PLAN-categories.md peut reprendre, en adaptant ses règles aux nouvelles fonctions).
  - Commit des fichiers SQL et documents de ce chantier uniquement, après accord.
- Ce que je teste pour valider : je lis le compte rendu et les résultats du contrôle ; un tour rapide connecté avec le compte club test et `+joueur`.
- Reste à finir :
- Journal :

## Inventaire
(côté code rempli au bloc 0 le 2026-11-14 ; côté base à compléter au bloc 1 avec le diagnostic)

### Côté serveur : non concerné par les règles
`api/_droits.js`, fonctions `inviter-staff`, `envoyer-invitation`, `send-newsletter` : lisent `staff_club` (est-ce un membre du staff ?) avec la clé de service, qui passe au-dessus des règles. Rien ne casse à la fermeture. Aucune page publique, aucun fichier de `api/` ne touche les 3 autres tables.

### Côté base (complété au bloc 1, diagnostic + lectures en base du 2026-11-14)
- Règles actuelles : `role_categories_access` → `rca_all` (tout, pour tout compte connecté). `staff_club` → `club_manage_staff` (club seul), `staff_accepte_invitation`, `staff_lit_sa_ligne`, `staff_quitte_club`, et l'ouverte `staff_read_all`. `convocation_joueurs` → `lecture convocation joueurs` (`true`, même sans compte), `gestion convocation joueurs` (tout éducateur), `parent_lit_donnees_enfant`, `categories_commun_lecture`. `entrainements` → 4 règles « tout compte connecté » (lire, créer, modifier, supprimer).
- Droits techniques : `anon` et `authenticated` ont tout sur les 4 tables, y compris vider la table (`TRUNCATE`). À retirer à `anon` ; `TRUNCATE`, `REFERENCES`, `TRIGGER` à retirer aussi à `authenticated`.
- Règles d'autres tables qui lisent `staff_club` (84) : 83 ne lisent que la ligne de la personne connectée, la dernière (`profiles_select_liens_travail`) lit le staff du point de vue du compte club. **Aucune ne casse** si la lecture est limitée à « sa ligne + club ».
- Fonctions qui citent les 4 tables : 26, toutes SECURITY DEFINER (passent au-dessus des règles, rien ne casse). Aucune vue. Hors chantier : 9 d'entre elles sont exécutables par `anon` avec `search_path = public` (`a_permission_inventaire`, `affecter_terrain_match`, `annuler_reclamation_date`, `club_gere_educateur`, `is_club_manager`, `liberer_creneau_date`, `log_entrainement_supprime`, `peut_acceder_budget`, `reclamer_creneau_date`) : à mettre dans le nouveau brief.
- Déclencheurs : `trg_entrainement_supprime` (journal des suppressions, SECURITY DEFINER), `trg_entrainements_updated_at`, `marquer_invitation_staff_utilisee` : non touchés.
- Liens utiles : `convocation_joueurs.convocation_id` → `convocations` (qui porte `educateur_id`, `club_id`, `equipe_id`, `publiee`). `convocations` a ses propres règles (éducateur auteur, dirigeant « compétition » en édition, joueur et parent si publiée).
- Données : `staff_club` 4 lignes (3 directeurs sportifs, 1 préparateur physique, aucun président, aucun rôle vide) ; `entrainements` 952 dont 93 sans équipe et 4 où l'auteur n'est pas l'éducateur de l'équipe ; affiliations `accepte`/`refuse` seulement ; 6 dirigeants acceptés (1 en édition, 5 en lecture) ; 18 parents acceptés.
- Lecteur oublié au bloc 0 : `sponsors/GestionSponsors.jsx:849` lit `staff_club` (sa propre ligne) : non concerné.

### `role_categories_access`
| Fichier | Opération | Colonnes / filtre | Acteur |
|---|---|---|---|
| `DashboardClub.jsx:2307` | lecture | `role, categories, acces_complet` · `club_id = club` | club, staff du club |
| `DashboardClub.jsx:2338` | upsert (création ou modification) | conflit sur `club_id, role` | club, staff ayant le droit « permissions » |

### `staff_club`
| Fichier | Opération | Colonnes / filtre | Acteur |
|---|---|---|---|
| `App.jsx:77`, `lib/multiRole.js:16`, `DashboardClub.jsx:1237` | lecture de SA ligne | `user_id = moi` (+ jointure `profiles` du club) | tout compte connecté (aiguillage, choix du rôle) |
| `DashboardClub.jsx:2290` | lecture de tout le staff | `*` + `membre:user_id(prenom, nom, email)` · `club_id = club` | club, staff du club : **chaque membre du staff voit l'email de ses collègues** (annuaire, bloc 4) |
| `DashboardClub.jsx:2363` | insertion | `club_id, user_id, role` | club (ajout depuis la recherche) |
| `DashboardClub.jsx:2388` / `2394` | modification du rôle / retrait | `id` | club |
| `AcceptInvite.jsx:169-172` | lecture puis **insertion par l'invité lui-même** | `club_id` et `role` lus dans les métadonnées du compte (`meta.role_invite`, défaut `secretaire`) | nouvel invité staff. **Risque** : les métadonnées sont modifiables par l'utilisateur ; aujourd'hui n'importe qui peut s'ajouter au staff de n'importe quel club. À traiter au bloc 4 avant la fermeture. **Corrigé au bloc 1 : faux, la base exige une invitation valide pour ce compte, ce club et ce rôle (voir Matrice).** |

### `convocation_joueurs`
| Fichier | Opération | Colonnes / filtre | Acteur |
|---|---|---|---|
| `DashboardEducateur.jsx:5532` | lecture | `joueur_id` · `convocation_id` | éducateur (et dirigeant qui consulte l'éducateur) |
| `DashboardEducateur.jsx:5577` / `5579` | suppression puis réinsertion de la liste | `convocation_id`, `joueur_id` | éducateur (dirigeant si droit d'écriture) |
| `DashboardJoueur.jsx:822` | lecture | `convocation_id` · `joueur_id = joueur affiché` | joueur, **et parent** : le parent voit le tableau du joueur avec l'identifiant de l'enfant (`joueurIdOverride`), donc une règle « `joueur_id = moi` » casserait l'écran parent |

### `entrainements`
| Fichier | Opération | Colonnes / filtre | Acteur |
|---|---|---|---|
| `DashboardEducateur.jsx:2314` | lecture | `*` + `presences_entrainement(*)` · `educateur_id` | éducateur ; **dirigeant** via `DashboardDirigeant.jsx:39` (`educateurIdOverride`, permissions `entrainements` lecture ou écriture) |
| `DashboardEducateur.jsx:5363, 5456` | insertion (une séance, planificateur) | payload complet | éducateur, dirigeant avec droit |
| `DashboardEducateur.jsx:2932, 5385, 5413, 9168-9201, 9687` | modification | `fiche_id`, `date, heure, description, lieu`, `sondage_clos`, `cloture_sondage_avant`, `heure` | éducateur, dirigeant avec droit |
| `DashboardEducateur.jsx:5433` | suppression | `id` (un déclencheur remplit `entrainements_supprimes`) | éducateur, dirigeant avec droit |
| `saisons/HistoriqueCollectif.jsx:67` | lecture | `*` + `presences_entrainement(*)`, par dates | éducateur (chargé à part dans `DashboardEducateur`) et club (via `HistoriqueClub`) |
| `prepphysique/GestionCloturesSaison.jsx:174` | lecture | `id` · `educateur_id` | éducateur |
| `lib/parcoursCoach.js:15` | lecture | `id, date, club_categorie_id` + présences · `educateur_id` | éducateur (`MesSaisonsCoach`, `PublierParcours`) |
| `club/PlanificationAnnuelle.jsx:872, 906` / `913, 919` | lecture / modification de `plan_semaine_id` | `plan_semaine_id`, `club_categorie_id` | club (`ProjetSportif`) **et** éducateur (`ProjetSportifEducateur`) |
| `club/PlanificationSeances.jsx:41` / `51, 91` / `61` | lecture / insertion / suppression | `club_categorie_id` ; insertion avec `educateur_id` de l'équipe | **club qui écrit pour le compte de l'éducateur** |
| `pages/Planning.jsx:71`, `DashboardClub.jsx:2617`, `saisons/HistoriqueClub.jsx:120` | lecture | `educateur_id in (éducateurs du club)` ou `club_categorie_id in (équipes)` | club, staff du club |
| `DashboardJoueur.jsx:511, 554, 1113, 1245-1246` | lecture | `id, date, description, heure, lieu, sondage_clos, cloture_sondage_avant, created_at, updated_at` · `educateur_id` de l'affiliation | joueur, **parent** (même tableau) |
| `SondageSemaine.jsx:149, 180`, `NutritionDashboard.jsx:257, 278` | lecture | dates, `sondage_*`, `fiche_id` · `educateur_id` | joueur, parent |
| `CarteJoueur.jsx:64` | lecture | `id, date` · `educateur_id` + `club_categorie_id` | joueur (`MesStats` → `ProfilStatsJoueur`) |

À trancher au bloc 1 : les lectures joueur filtrent seulement par `educateur_id` (un éducateur avec deux équipes : le joueur voit les séances des deux) ; certaines séances peuvent n'avoir aucune équipe (`club_categorie_id` vide, compté par le diagnostic). Un commentaire de `DashboardEducateur.jsx:5394` dit « le joueur ne lit pas entrainements », c'est faux aujourd'hui.

### Comptes de test à créer (avant le bloc 2)
Tous rattachés au club test `deabreu.amorim+club@gmail.com`. La ligne 37 du diagnostic dit lesquels existent déjà.
1. ~~`deabreu.amorim+educ@gmail.com`~~ : remplacé par `testfinal@gmail.com` (déjà éducateur accepté du club test, équipes U20 A, U13 C, U13 A ; Kevin a son mot de passe, décision du 2026-11-14). Les comptes 2 et 5 se rattachent donc à `testfinal`.
2. `deabreu.amorim+joueur@gmail.com` : joueur invité par `testfinal` dans **une seule** de ses équipes, affiliation acceptée.
3. `deabreu.amorim+parent@gmail.com` : parent de `+joueur`, accès accepté.
4. `deabreu.amorim+staff@gmail.com` : membre du staff du club test, avec un rôle limité à **une seule catégorie** (pour tester `role_categories_access`).
5. `deabreu.amorim+dirigeant@gmail.com` : dirigeant invité par `testfinal`, avec le droit « entraînements » en écriture (le dirigeant écrit dans `entrainements` et `convocation_joueurs` via le tableau de l'éducateur).

État au 2026-11-15 (comptes recréés par Kevin, adresses différentes de la liste ci-dessus) :
- Joueur = `kenza.harroudsilva@gmail.com` (`5e9dc7a1-7f35-4f55-87da-8c63ed60b703`), affilié accepté à `testfinal`, une seule équipe.
- Parent = `bykenza.contact@gmail.com` (`1981ced9-3814-4dcd-a3d1-ed168b0101bf`), accès accepté à ce joueur.
- Staff = `7kevin.amorim10@gmail.com` (`a011f381-88c4-4799-a05b-aea76d527052`), `directeur_sportif` du club test. Reste à le limiter à une seule catégorie (Mon club → Accès du bureau).
- Dirigeant = `deabreu.amorim@gmail.com` (`d857dd06-f13c-4e5f-a435-2b3d6396e5e3`), accepté le 2026-11-16 par `testfinal` (effectif, stats, compétition en lecture ; entraînements en édition). Un identifiant de connexion d'un autre compte gardait cette adresse (corrigé par SQL de Kevin) ; `AcceptInvite.jsx` affiche maintenant le vrai message d'erreur du serveur.

## Matrice
(rédigée au bloc 1 le 2026-11-14, validée par Kevin le 2026-11-14)

Mots utilisés : **club** = le compte club lui-même ; **président** = membre du staff avec le rôle `president` (aucun en base aujourd'hui) ; **autre staff** = membre du staff avec un autre rôle ; **dirigeant** = dirigeant délégué par un éducateur (`dirigeant_acces` accepté). « Non » partout pour : éducateur d'un autre club, compte sans lien, visiteur sans compte (sauf mention). Le visiteur sans compte perd aussi tous ses droits techniques sur les 4 tables (aujourd'hui il a même le droit de tout vider).

### `role_categories_access` (droits du staff par catégorie)
Une seule personne s'en sert : celui qui règle l'« Accès du bureau » (étape de Mon club réservée au président, `menuClubGroupes.js:54`).
| Acteur | Lire | Créer / modifier | Supprimer | Écran qui en a besoin |
|---|---|---|---|---|
| Club | oui, son club | oui, son club | non | Mon club → Accès du bureau |
| Président | oui, son club | oui, son club | non | idem |
| Autre staff | non | non | non | aucun : le tri des catégories visibles se fait en base (`peut_voir_categorie`, qui passe au-dessus des règles) |
| Tous les autres | non | non | non | aucun |
Supprimer : aucun écran ne supprime (enregistrement par « upsert »). Même logique que la table voisine `role_permissions`, déjà réservée au club et au président.

### `staff_club`
| Acteur | Lire | Créer | Modifier | Supprimer | Écran |
|---|---|---|---|---|---|
| Club | tout son staff, toutes colonnes | oui | oui (rôle) | oui | onglet Staff |
| Président | tout son staff | oui | oui | oui | onglet Staff (nouveau en base : aujourd'hui seul le club écrit) |
| Autre staff | sa ligne ; ses collègues **par l'annuaire** (prénom, nom, rôle, sans email ni téléphone) | seulement lui-même, avec une invitation valide (règle actuelle `staff_accepte_invitation`, gardée) | non | sa propre ligne (règle actuelle `staff_quitte_club`, gardée) | connexion, menus, onglet Staff, demandes de saison, responsables d'événements, équipement |
| Tout compte connecté | sa propre ligne s'il en a une | lui-même avec invitation valide | non | sa ligne | aiguillage au démarrage (`App.jsx`, `multiRole.js`), page d'invitation |
| Éducateur, joueur, parent, dirigeant | rien de plus que ci-dessus | non | non | non | aucun |
Annuaire : fonction réservée au club et à son staff, qui rend `id, user_id, role, prénom, nom, created_at`. Aucun écran n'affiche l'email ou le téléphone d'un collègue (vérifié : l'onglet Staff montre photo, nom, rôle), donc **tous les écrans peuvent passer par l'annuaire**, club compris : affichage identique.

### `convocation_joueurs`
| Acteur | Lire | Créer / supprimer | Modifier | Écran |
|---|---|---|---|---|
| Éducateur auteur de la convocation | oui | oui (la liste est effacée puis réécrite) | non (aucun écran) | Compétition → convocation |
| Dirigeant | si son droit « compétition » n'est pas « aucun » | si « édition » | non | tableau de l'éducateur délégant |
| Joueur convoqué | sa propre ligne | non | non | Dashboard joueur |
| Parent accepté | les lignes de son enfant (règle actuelle `parent_lit_donnees_enfant`, gardée) | non | non | Dashboard joueur vu par le parent |
| Club et staff | **non** : aucun écran club ne lit cette table | non | non | aucun |
| Autre éducateur | non (aujourd'hui : tout éducateur peut tout modifier) | non | non | aucun |
| Compte sans lien, visiteur | non (aujourd'hui : lisible **même sans compte**) | non | non | aucun |
Gardée telle quelle : `categories_commun_lecture` (chantier catégories, déjà limitée). Le statut de réponse est écrit en base par `categories_publier_convocation`, pas par le navigateur.

### `entrainements`
| Acteur | Lire | Créer | Modifier | Supprimer | Écran |
|---|---|---|---|---|---|
| Éducateur auteur | ses séances | oui, pour lui-même | oui | oui | tableau éducateur, historique, clôtures, parcours coach |
| Éducateur de l'équipe (pas auteur) | séances de ses équipes | non | oui | non | planification annuelle de l'éducateur (4 séances en base dans ce cas) |
| Dirigeant | séances de l'éducateur délégant si droit « entraînements » n'est pas « aucun » | si « édition » | si « édition » | si « édition » | tableau de l'éducateur délégant |
| Club et tout son staff | séances des équipes du club, plus les séances sans équipe des éducateurs acceptés du club | club, président, ou rôle ayant « Séances » en édition (par défaut directeur sportif), pour une équipe du club | non (aucun écran) | mêmes personnes que « créer » | Planning, accueil, historique club, planification des séances |
| Joueur affilié (accepté) | séances de son éducateur (toutes ses équipes, comme aujourd'hui) | non | non | non | dashboard joueur, sondage, nutrition, carte joueur |
| Parent accepté | comme son enfant | non | non | non | idem, vu par le parent |
| Autre éducateur, autre club, sans lien, visiteur | non | non | non | non | aucun |

### Points tranchés par Kevin le 2026-11-14 (recommandation retenue sur les 3)
1. **Délégués « Staff »** : un membre du staff à qui le président a donné « Staff » en édition voit des boutons ajouter, changer de rôle, retirer… qui n'enregistrent déjà rien aujourd'hui (la base refuse en silence). Recommandé : garder l'écriture au club et au président, et masquer ces boutons plus tard (hors chantier). Autre choix : ouvrir l'écriture à ces délégués, avec interdiction de toucher au rôle président.
2. **Convocations côté club** : recommandé non (aucun écran n'en a besoin). Le plan prévoyait « oui » au bloc 6 : cette matrice le remplace si tu valides.
3. **Joueur** : recommandé de garder « toutes les séances de son éducateur » (rien ne change à l'écran). Restreindre à sa seule équipe changerait ce qu'il voit si son éducateur a deux équipes.

### Décision sur l'ajout au staff (bloc 4)
Rien à déplacer côté serveur : l'auto-ajout est déjà verrouillé en base. La règle `staff_accepte_invitation` n'accepte la ligne que si une invitation non utilisée existe pour **ce compte, ce club et ce rôle** ; ces invitations ne sont créées que par la fonction serveur `inviter-staff` (la table `staff_invitations` n'est ouverte à aucun compte du navigateur, vérifié en base). Si le navigateur triche sur le rôle, la base refuse. Le bloc 4 se limite donc à l'annuaire.

### Fonctions de droits à écrire au bloc 2
Toutes SECURITY DEFINER, `search_path = ''`, fermées à `anon`. Elles évitent aussi une boucle infinie : les règles de `convocations` lisent déjà `convocation_joueurs`, donc la règle de `convocation_joueurs` ne peut pas lire `convocations` directement.
- `secu_club_ou_president(club)` : `role_categories_access` (tout) et écritures de `staff_club`.
- `secu_club_ou_staff(club)` : lecture des séances par le club.
- `secu_staff_annuaire(club)` : liste des collègues sans coordonnées.
- `secu_club_peut_editer_section(club, section, rôles par défaut)` : même calcul que `canEditSection` (président, sinon ligne `role_permissions`, sinon rôles par défaut), pour « Séances ».
- `secu_peut_gerer_convocation(convocation, edition)` : auteur ou dirigeant selon son droit « compétition ».
- `secu_peut_lire_seance(educateur, equipe)` et `secu_peut_ecrire_seance(educateur, equipe, operation)` : tableau `entrainements` ci-dessus.
Réutilisée telle quelle : `est_parent_accepte_de`. Non réutilisées : `sponsors_est_membre_club` (trop large : éducateurs, joueurs, parents), `is_club_manager` et `saison_est_membre_club` (ouvertes à `anon` ou `search_path = public`).
