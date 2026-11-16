# PLAN : bibliothèque du club
Date : 2026-11-16 · Brief : BRIEF-bibliotheque-club.md
Objectif : donner à chaque club une section « Bibliothèque » qui lui appartient (procédés et vidéos), réglable par rôle, lue par ses éducateurs affiliés qui la reprennent dans leurs séances. Le club lit aussi toute la bibliothèque Digital Football et peut en copier des procédés chez lui.

Lancement d'un bloc : `/bloc N PLAN-bibliotheque-club.md`

## Décisions prises au /plan (2026-11-16)
Réponses de Kevin aux points à confirmer du brief :
1. Éducateur affilié sans l'outil Bibliothèque payant : il lit quand même la bibliothèque de son club et reprend ses procédés dans ses séances (offert par le club).
2. Modifier ou supprimer un procédé du club : seulement les rôles qui ont l'écriture. Le nom de l'auteur reste affiché, même s'il quitte le club.
3. Le club peut copier un procédé Digital Football dans sa bibliothèque (copie modifiable, l'original ne change pas).
4. La bibliothèque du club regroupe procédés ET vidéos du club. Les rôles qui ont l'écriture peuvent ajouter des vidéos (aujourd'hui seul le compte président le peut).
5. Clubs existants (hypothèse du brief retenue) : la permission « Bibliothèque » apparaît avec ses valeurs par défaut, rien d'autre ne change.

Choix techniques retenus (Claude, à valider au bloc 1) :
- **Table à part** `bibliotheque_club_procedes` plutôt qu'une colonne de plus dans `bibliotheque_exercices`. Raison : la table actuelle donne tous les droits au créateur (`educateur_id`) et ses règles de lecture sont déjà empilées ; un procédé du club y serait modifiable par son auteur et pourrait sortir du club par une règle existante. Une table séparée = des règles simples, et aucun risque pour les procédés actuels des éducateurs.
- Une fonction en base `a_permission_bibliotheque(club, edition)` sur le modèle de `a_permission_inventaire` (supabase_inventaire.sql), avec les valeurs par défaut du brief : écriture président + directeur sportif, lecture pour tous les autres rôles du staff, tant que le club n'a rien réglé.
- Côté écran, la matrice actuelle `PERMISSION_DEFAULTS` (src/lib/permissionsClub.js) ne connaît qu'une liste « voit et écrit ». La Bibliothèque est la première section avec une lecture par défaut différente de l'écriture : on ajoute une liste « lecture par défaut » à part, sans toucher aux autres sections.
- Les procédés du club n'ont pas de bouton « Copier dans ma bibliothèque » côté éducateur : sinon l'éducateur les emporterait en partant (décision 1). Il garde ses fiches séance, qui contiennent déjà une copie (c'est le fonctionnement actuel de `importerProcedeDansBloc`). Si Kevin veut l'inverse, une ligne à changer au bloc 8.

## Ce que je dois fournir
| Élément | Pourquoi | Où le trouver | Nécessaire avant |
|---|---|---|---|
| Un compte staff « directeur sportif » du club test | Vérifier l'écriture par défaut hors président | Inviter depuis le club test (deabreu.amorim+club@), adresse type deabreu.amorim+ds@ | Bloc 3 |
| Un compte staff avec un autre rôle (ex. secrétaire) | Vérifier la lecture seule par défaut, puis « aucun droit » après réglage | Même méthode, deabreu.amorim+staff@ (peut servir aussi au chantier sécurité) | Bloc 3 |
| Un compte éducateur affilié au club test, SANS l'outil Bibliothèque | Vérifier la lecture et la reprise en séance offertes | deabreu.amorim+edu@, invité par le club test puis accepté | Bloc 8 |
| Un deuxième club test (ou un club réel dont tu acceptes la lecture seule par requête) | Prouver qu'un club ne voit jamais la bibliothèque d'un autre | deabreu.amorim+club2@ | Bloc 11 |
| Ton accord pour chaque exécution SQL | Base de production | Toi | Blocs 1, 5, 9 |

## Manipulations à faire moi-même
1. Avant le bloc 1, puis avant les blocs 5 et 9 : lancer la sauvegarde `~/Sauvegardes-DigitalFootball/sauvegarder.sh` et me dire qu'elle est finie.
2. Bloc 1, 5 et 9 : copier le SQL que je te présente dans l'éditeur SQL de Supabase, l'exécuter, me coller le résultat. Je lance ensuite moi-même les vérifications en lecture.
3. Avant le bloc 3 : créer les deux comptes staff du tableau (directeur sportif, secrétaire) dans le club test.
4. Avant le bloc 8 : créer l'éducateur test affilié au club test, sans lui acheter l'outil Bibliothèque.
5. Avant le bloc 11 : créer le deuxième club test.
6. À la fin de chaque bloc : tester ce qui est écrit dans « Ce que je teste pour valider », puis me dire ok ou ce qui ne va pas. Je ne commite qu'avec ton accord.

## Répartition suggérée
Je ne vois pas ta barre « 5h » depuis ici : si elle dépasse 30 % au moment de lancer, garde un seul bloc pour la fenêtre. Deux autres chantiers sont ouverts (design identité, sécurité novembre) et partagent ton compteur de la semaine.
- Jour 1 (16/11 ou 17/11) : blocs 0 et 1 (le 1 est en Opus, coûteux, à faire en début de fenêtre).
- Jour 2 : blocs 2 et 3. Premier résultat visible dans l'espace club.
- Jour 3 : blocs 4 et 5.
- Jour 4 : blocs 6 et 7.
- Jour 5 : bloc 8 seul (gros fichier éducateur).
- Jour 6 : blocs 9 et 10 (optionnels) puis 11.
Rappel : `/clear` et une session neuve par bloc.

## Blocs

### Bloc 0 : mise en place et état des lieux
- Statut : fait (2026-11-16)
- Objectif : partir d'un état connu, sans rien modifier en production.
- Résultat testable : une section « État des lieux » ajoutée en bas de ce plan, avec les colonnes réelles et les règles réelles lues en base.
- Modèle : sonnet · Effort : medium · Coût estimé : faible
- Pourquoi ce modèle : lecture et relevé, pas de décision délicate.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 0 PLAN-bibliotheque-club.md`
- Dépend de : rien
- Prérequis : aucun
- Étapes :
  - `git status` : relever les fichiers déjà modifiés par d'autres chantiers (design identité en cours). Règle pour tout ce chantier : ne commiter que ses propres fichiers, nommés un par un.
  - Lire en production (SELECT via `supabase db query --linked`) : colonnes de `bibliotheque_exercices` et `bibliotheque_videos`, règles actives (`pg_policies`) de ces deux tables, contrainte de `role_permissions.section`, colonnes de `staff_club` (y a-t-il un statut accepté ?), nombre de vidéos `type = 'club'` existantes.
  - Repérer dans `DashboardClub.jsx` (par recherche, sans lecture complète) : la liste des sections du menu, l'écran de configuration des rôles, et `EtapeAccesBureau.jsx`.
  - Repérer dans `DashboardEducateur.jsx` : où l'outil payant `bibliotheque` bloque l'accès à la bibliothèque, et `procedeComplet` (qui relit un procédé dans `bibliotheque_exercices`).
  - Écrire l'état des lieux en bas de ce plan.
- Ce que je teste pour valider : je lis l'état des lieux ; rien n'a changé dans l'application.
- Reste à finir : rien pour ce bloc. Points à traiter plus tard : voir « Vérification d'écart » dans l'état des lieux (bloc 5 plus lourd, branchement de EtapeAccesBureau au bloc 2).
- Journal : 2026-11-16, Sonnet 5.5. Lectures seules (SELECT), aucune modification du code ni de la base. Écart : `bibliotheque_videos` est ouverte à tout compte connecté.

### Bloc 1 : base de données, procédés du club et droit « Bibliothèque »
- Statut : fait (2026-11-16)
- Objectif : créer en production l'endroit où le club range ses procédés, protégé par les droits du club.
- Résultat testable : la table existe, les vérifications en lecture prouvent qui voit et qui écrit.
- Modèle : opus · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : règles de sécurité en base de production, une erreur exposerait les procédés d'un club à d'autres.
- Lancement : `/clear`, puis `/model opus`, puis `/effort high`, puis `/bloc 1 PLAN-bibliotheque-club.md`
- Dépend de : bloc 0
- Prérequis : sauvegarde Supabase lancée par Kevin.
- Étapes :
  - Fichier `supabase_bibliotheque_club.sql` : table `bibliotheque_club_procedes` (mêmes champs utiles que `bibliotheque_exercices` relevés au bloc 0, plus `club_id` lié au club et supprimé avec lui, `auteur_id` qui passe à vide si le compte disparaît, `auteur_nom` figé pour garder la trace, `origine` = club ou copie Digital Football, `origine_id`, dates).
  - Fonction `a_permission_bibliotheque(club, edition)` : le compte du club, le président, sinon le réglage du rôle s'il existe, sinon les valeurs par défaut (écriture : directeur sportif ; lecture : tous les rôles du staff).
  - Fonction de lecture pour les éducateurs acceptés du club (`club_educateurs`, statut accepté). Lecture seule, quel que soit l'outil acheté.
  - Règles : lecture = permission lecture OU éducateur accepté ; écriture, modification, suppression = permission écriture. Rien d'autre.
  - Ajout de `bibliotheque` à la contrainte de `role_permissions.section` (en reprenant la liste réelle relevée au bloc 0).
  - Fichiers séparés : `supabase_bibliotheque_club_verif.sql` (vérifications, lancées par Claude) et `supabase_bibliotheque_club_retour_arriere.sql` (présenté à part, jamais dans le même message que le SQL à exécuter).
- Ce que je teste pour valider : j'exécute le SQL ; Claude me montre le résultat des vérifications (table vide, règles présentes, fonction présente, contrainte à jour, aucune autre table touchée).
- Reste à finir : rien pour ce bloc. Commit des 5 fichiers du bloc (SQL, vérification, empreinte, annulation, plan) en attente de l'accord de Kevin.
- Journal : 2026-11-16, Opus 5.5. Fichiers écrits : `supabase_bibliotheque_club.sql`, `supabase_bibliotheque_club_verification.sql`, `supabase_bibliotheque_club_ANNULATION_NE_PAS_EXECUTER.sql` (noms alignés sur la convention du dépôt plutôt que `_verif` / `_retour_arriere` ; annulation entièrement en commentaire). Choix : fonction lecture éducateur nommée `secu_educateur_accepte_club` (réutilisable au bloc 5) ; déclencheur qui pose l'auteur, son nom figé et les dates (impossible à falsifier depuis l'écran ; club, auteur et origine non modifiables ensuite) ; `origine` accepte déjà 'educateur' pour le bloc 9 (évite un SQL de plus) ; `origine_id` lié à `bibliotheque_exercices` et passe à vide si l'original est supprimé ; pas de règle `verrou_outils`. Testé sur une base Postgres 17 locale jetable avec la vraie contrainte et des comptes fictifs : ajout (club, président, directeur oui ; secrétaire, rôle réglé sans droit, éducateurs, autre club, inconnu non), lecture (staff et éducateur accepté oui ; éducateur en attente, autre club, inconnu, anonyme non), modification et suppression réservées à l'écriture, déplacement vers un autre club ou changement d'auteur neutralisés, réglage de rôle respecté dans les deux sens, copie conservée si l'original ou le compte auteur disparaît, procédés effacés avec le club, valeur de section inventée refusée. Empreinte production AVANT, hors objets du bloc (règles 666 / 6335e58d…, tables 232 / e9ca6756…, fonctions 129 / 794864ae…, contraintes 798 / 034ac6ac…, déclencheurs 39 / f1716f13…).
  Exécuté en production par Kevin le 2026-11-16 (succès). Vérification lancée par Claude : 17 contrôles sur 17 ok (structure, droits anonymes, contrainte à 18 sections, et 5 vrais comptes simulés : compte club, directeur sportif, directeur d'un autre club, éducateur accepté, préparateur physique). Empreinte APRÈS hors bloc : tables, fonctions, contraintes, déclencheurs identiques ; règles 666 → 668, expliqué par le SQL `supabase_securite_novembre_rca.sql` (chantier sécurité) exécuté entre-temps : `rca_all` remplacée par 3 règles `rca_club_president_*` sur `role_categories_access`. Aucun autre objet touché par ce bloc.

### Bloc 2 : la section Bibliothèque apparaît dans l'espace club
- Statut : fait (2026-11-16), à valider par Kevin à l'écran
- Objectif : rendre la section visible et réglable, avant même d'y mettre du contenu.
- Résultat testable : « Bibliothèque » dans le menu du club, une page avec un état vide propre, et une ligne « Bibliothèque » dans le réglage des rôles.
- Modèle : sonnet · Effort : medium · Coût estimé : moyen
- Pourquoi ce modèle : branchement d'écran et de réglage, sans base de données.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 2 PLAN-bibliotheque-club.md`
- Dépend de : bloc 1
- Prérequis : aucun
- Étapes :
  - `src/lib/permissionsClub.js` : section `bibliotheque` (écriture par défaut président + directeur sportif) et nouvelle liste « lecture par défaut » utilisée seulement par cette section.
  - `DashboardClub.jsx` : `canViewSection` tient compte de la lecture par défaut ; entrée de menu « Bibliothèque » ; branchement minimal vers `src/components/bibliotheque-club/BibliothequeClub.jsx`.
  - Écran de réglage des rôles : la ligne Bibliothèque, lecture et écriture réglables.
  - Page : deux onglets « Bibliothèque du club » et « Digital Football », état vide, couleurs du thème du club, pas d'emoji.
- Ce que je teste pour valider : président connecté, je vois « Bibliothèque » ; je règle un rôle sur « aucun droit », j'enregistre, ça tient après rechargement ; téléphone : le menu et la page s'affichent sans débordement.
- Reste à finir : contrôle écran par Kevin (président, rôle sans droit, téléphone). Aucun commit fait, en attente de l'accord de Kevin.
- Journal : 2026-11-16, Sonnet 5.5. Fichiers : `src/lib/permissionsClub.js` (section `bibliotheque` en écriture président + directeur sportif, `LECTURE_PAR_DEFAUT`, fonctions `voitParDefaut` / `ecritParDefaut`), `src/lib/rolesClub.js` (ligne Bibliothèque dans la grille), `src/components/monclub/EtapeAccesBureau.jsx` (cases par défaut via les deux fonctions, sinon la grille aurait affiché « aucun droit » à tort), `src/pages/DashboardClub.jsx` (droits de lecture et d'écriture, entrée de menu « Bibliothèque » dans la partie Sportif, icône livre, branchement de la page), nouveau `src/components/bibliotheque-club/BibliothequeClub.jsx` (deux onglets, états vides, pas d'emoji). Les autres sections ne changent pas (`PERMISSION_DEFAULTS` intacte, `api/_droits.js` inchangé). Pas passé par `outils.menuVisible` : la Bibliothèque du club n'est pas un outil payant. Vérifié : build Vite ok, tableau des droits par défaut contrôlé en Node (président et directeur sportif voient et écrivent ; secrétaire et marketing voient seulement ; rôle vide rien ; budget inchangé). Non vérifié : affichage réel (connexion requise).



### Bloc 3 : créer, lire, modifier, supprimer un procédé du club
- Statut : fait (2026-11-16), à valider par Kevin à l'écran
- Objectif : le club remplit sa bibliothèque.
- Résultat testable : un procédé créé par le président ou le directeur sportif apparaît dans la liste, avec auteur, filtres et fiche détaillée.
- Modèle : sonnet · Effort : high · Coût estimé : élevé
- Pourquoi ce modèle : écran complet avec formulaire, sans logique sensible (la sécurité est en base depuis le bloc 1).
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 3 PLAN-bibliotheque-club.md`
- Dépend de : bloc 2
- Prérequis : comptes staff directeur sportif et secrétaire créés.
- Étapes :
  - Liste des procédés du club : cartes, recherche, filtres (type, thème, catégorie d'âge), même vocabulaire que la bibliothèque éducateur.
  - Fiche détaillée en lecture (but, organisation, consignes, critères, variables, durée, joueurs, auteur).
  - Formulaire créer et modifier (champs texte) et suppression avec confirmation, affichés seulement si le rôle a l'écriture.
  - Tout le code dans `src/components/bibliotheque-club/`.
- Ce que je teste pour valider : président crée, modifie, supprime ; directeur sportif crée ; secrétaire voit la liste sans bouton de modification ; téléphone.
- Reste à finir : contrôle écran par Kevin (président crée, modifie, supprime ; directeur sportif crée ; secrétaire lit sans bouton ; téléphone). Pas de schéma tactique ni de scan (bloc 4). Aucun commit fait, en attente de l'accord de Kevin.
- Journal : 2026-11-16, Sonnet 5.5. Nouveau `src/components/bibliotheque-club/ProceduresClub.jsx` (liste en cartes, recherche, filtres type, thème, âge, fiche détaillée avec auteur et date, formulaire créer et modifier, suppression avec confirmation dans l'écran, boutons cachés sans droit d'écriture, messages d'erreur clairs si la base refuse). `BibliothequeClub.jsx` reçoit `clubId` et affiche ce composant dans l'onglet club ; `DashboardClub.jsx` passe `clubId` (portée des données, donc correcte pour un compte staff). Auteur, nom figé et dates posés par la base (bloc 1), l'écran ne les envoie pas. Vocabulaire repris de la bibliothèque éducateur (4 types, 6 thèmes, 9 tranches d'âge), textes en français seulement (pas de traduction, section club). Vérifié : build Vite ok. Non vérifié : affichage et écriture réels (connexion requise), comptes staff de test non confirmés.

### Bloc 4 : schéma tactique et import par scan pour le club
- Statut : fait (2026-11-16), à valider par Kevin à l'écran
- Objectif : le club a les mêmes outils que l'éducateur pour illustrer un procédé.
- Résultat testable : un procédé du club peut avoir un schéma dessiné, et peut être créé à partir d'une photo de fiche.
- Modèle : sonnet · Effort : medium · Coût estimé : moyen
- Pourquoi ce modèle : réutilisation de composants existants.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 4 PLAN-bibliotheque-club.md`
- Dépend de : bloc 3
- Prérequis : aucun
- Étapes :
  - Brancher l'éditeur de schéma déjà utilisé par la bibliothèque éducateur (à repérer, probablement Tactipad) dans le formulaire du club ; enregistrer `schema_png` et `schema_data`.
  - Brancher `ScannerProc.jsx` pour qu'il remplisse le formulaire du club au lieu d'écrire dans `bibliotheque_exercices`.
  - Vérifier que l'envoi d'image (`api/upload-image.js`) accepte un compte staff qui a l'écriture Bibliothèque, sinon l'ajuster avec `peutEditerSection`.
- Ce que je teste pour valider : je dessine un schéma, j'enregistre, il s'affiche dans la fiche ; je scanne une fiche papier, le formulaire se remplit ; avec le compte directeur sportif aussi.
- Reste à finir : contrôle écran par Kevin (dessin d'un schéma, scan d'une fiche, avec le président puis le directeur sportif). Aucun commit fait, en attente de l'accord de Kevin.
- Journal : 2026-11-16, Sonnet 5.5. `ProceduresClub.jsx` : bouton « Dessiner un schéma » (même éditeur Tactipad que l'éducateur, PNG envoyé sur Cloudinary en arrière-plan puis lien enregistré), miniature sur les cartes, schéma affiché dans la fiche, champs `schema_png`, `schema_data` et `principe_jeu` enregistrés ; bouton « Scanner une fiche ». `ScannerProc.jsx` : deux options ajoutées (`onResultat`, `libelleValider`), sans changer son comportement côté éducateur : en mode club il n'écrit rien dans `bibliotheque_exercices`, n'affiche pas la case « partager avec la communauté » et ouvre le formulaire du club prérempli, à relire avant d'enregistrer. `BibliothequeClub.jsx` et `DashboardClub.jsx` passent l'identifiant du compte connecté (`userId`) à Tactipad. Envoi d'image : aucun changement nécessaire dans `api/upload-image.js`, l'usage `schema` est un dossier personnel ouvert à tout compte connecté (staff compris) ; la sécurité de l'écriture reste en base (bloc 1). Vérifié : build Vite ok. Non vérifié : affichage, dessin et scan réels (connexion requise, le scan appelle l'IA).

### Bloc 5 : base de données, vidéos du club et lecture Digital Football
- Statut : fait (2026-11-16)
- Objectif : ouvrir juste ce qu'il faut pour les vidéos du club et pour que le club lise Digital Football.
- Résultat testable : vérifications en lecture : un rôle avec l'écriture peut ajouter une vidéo club ; un compte club ou staff autorisé lit les procédés Digital Football ; rien d'autre ne change.
- Modèle : opus · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : modification de règles existantes en production, à reprendre à l'identique en ajoutant une seule branche.
- Lancement : `/clear`, puis `/model opus`, puis `/effort high`, puis `/bloc 5 PLAN-bibliotheque-club.md`
- Dépend de : bloc 1 (fonction de permission)
- Prérequis : sauvegarde Supabase lancée par Kevin.
- Étapes :
  - `bibliotheque_videos`, vidéos `club` : ajout, modification, suppression par `a_permission_bibliotheque(club, écriture)` au lieu du seul compte du club ; lecture élargie au staff qui a la lecture. Les autres branches (vidéos Digital Football, vidéos perso, joueurs) recopiées telles qu'elles sont en production.
  - `bibliotheque_exercices`, règle de lecture : partir de la définition réelle relevée au bloc 0 et ajouter une seule branche « procédé partagé Digital Football ET lecteur = compte club ou staff ayant la lecture Bibliothèque ».
  - Vérifier que cela ne donne accès à aucun procédé `partage_club` ni personnel.
  - Fichiers vérification et retour arrière séparés, comme au bloc 1.
- Ce que je teste pour valider : j'exécute le SQL ; Claude me montre les vérifications avant/après (nombre de procédés lisibles par compte).
- Reste à finir : commit des 5 fichiers du bloc (SQL, vérification, empreinte, annulation, plan) en attente de l'accord de Kevin. Hors bloc, noté : (1) un membre du staff qui est aussi un éducateur en outils à la carte SANS l'outil Séances ni Bibliothèque reste bloqué par `verrou_outils` sur tous les procédés, DF compris (aucun cas aujourd'hui : les 3 staff éducateurs ont `modele_outils` faux) ; (2) `anon` garde des droits de table sur `bibliotheque_videos` et `bibliotheque_exercices` (sans effet, les règles l'excluent) ; (3) l'administrateur Digital Football ne lit aucun procédé DF d'autrui par la base (39/0/0), situation antérieure à ce bloc.
- Journal : 2026-11-16, Opus 5.5. Fichiers : `supabase_bibliotheque_club_bloc5.sql`, `supabase_bibliotheque_club_bloc5_verification.sql`, `supabase_bibliotheque_club_bloc5_empreinte.sql`, `supabase_bibliotheque_club_bloc5_ANNULATION_NE_PAS_EXECUTER.sql` (entièrement en commentaire, et rouvrirait la faille vidéo). Écarts et choix : la lecture DF n'est pas une branche ajoutée DANS `lecture_exercices` mais une règle séparée `lecture_exercices_df_club` (même effet, règles additionnées ; l'existante n'est pas réécrite, donc aucun risque de la modifier). Vidéos : les 4 règles ouvertes sont remplacées par des règles par type, réservées aux comptes connectés ; écriture DF par la fonction existante `est_admin_coach()` (table `admins_coach` = exactement les 2 comptes de `COACH_ADMIN_EMAILS`) plutôt que par emails écrits en dur ; branches joueurs (`visible_joueurs`) reprises du fichier d'origine `supabase_bibliotheque_videos.sql` via une fonction protégée `secu_joueur_affilie`. Ajout d'un déclencheur qui fige type, club et propriétaire d'une vidéo (sinon un rôle avec l'écriture pouvait transformer une vidéo du club en vidéo personnelle). Testé sur une base Postgres 17 locale jetable (vraies règles de `bibliotheque_exercices` recopiées, blocs 1 et 5 appliqués, 12 comptes fictifs) : 34 contrôles conformes (un écart d'ordre de tri seulement) + visiteur anonyme sans accès. Photo AVANT en production : empreinte hors bloc (règles 668 / 186bf906…, tables 233 / 489282c9…, fonctions 132 / 7aceb749…, contraintes 806 / 24ba1fe9…, déclencheurs 40 / eceb392b…, droits 6049 / 2eb0aa83…) ; lectures vidéos/DF/non partagés d'autrui : club A 39/0/0, DS A 39/41/7, DS B 39/41/0, éducateur A 39/41/7, préparateur physique 39/0/0, admin DF 39/0/0, joueur 39/0/0, autre club 39/0/0.
  Incident : un premier « succès » venait en réalité de `supabase_securite_novembre_staff.sql` (bloc 5 du chantier sécurité, exécuté en production le 2026-11-16 ; ses vérifications restent à faire dans son propre chantier). Contrôle aussitôt : bibliothèque inchangée. Puis `supabase_bibliotheque_club_bloc5.sql` exécuté par Kevin (succès ; nouvelle sauvegarde demandée avant, non confirmée explicitement). Vérification APRÈS : 23 contrôles sur 23 ok (une valeur attendue corrigée : le compte administrateur DF est un profil de type club, il lit donc DF comme tout club, 39/41/0). Lectures après : club A 39/41/0, DS A 39/41/7, DS B 39/41/0, éducateur A 39/41/7, préparateur physique 39/41/0, joueur 39/0/0, autre club 39/41/0 ; le 3e chiffre (procédés non partagés d'autrui) n'a bougé pour personne. Empreinte APRÈS hors bloc : tables, fonctions, contraintes, déclencheurs identiques ; règles 668 → 670 et droits 6049 → 6040 entièrement expliqués par le SQL sécurité sur `staff_club` (5 → 7 règles ; droits anon/authenticated 14 → 5) ; hors `staff_club`, 663 règles et 6021 droits, soit les décomptes d'avant.

### Bloc 6 : vidéos du club dans la bibliothèque du club
- Statut : fait (2026-11-16), à valider par Kevin à l'écran
- Objectif : procédés et vidéos du club au même endroit.
- Résultat testable : l'onglet « Bibliothèque du club » montre aussi les vidéos du club, ajoutables par les rôles qui ont l'écriture.
- Modèle : sonnet · Effort : medium · Coût estimé : moyen
- Pourquoi ce modèle : réutilisation de `BibliothequeVideos.jsx`.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 6 PLAN-bibliotheque-club.md`
- Dépend de : blocs 3 et 5
- Prérequis : aucun
- Étapes :
  - Repérer comment `BibliothequeVideos.jsx` est utilisé aujourd'hui côté club ; l'afficher dans l'onglet club avec un sélecteur Procédés / Vidéos.
  - Bouton d'ajout de vidéo selon `canEditSection('bibliotheque')`, avec `club_id` = le club (et non le compte connecté, sinon un directeur sportif écrirait à son propre nom).
  - Garder l'ancien point d'accès aux vidéos du club s'il existe, pour ne rien casser.
- Ce que je teste pour valider : directeur sportif ajoute une vidéo YouTube, le président la voit ; secrétaire la voit sans bouton d'ajout.
- Reste à finir : contrôle écran par Kevin (directeur sportif ajoute une vidéo YouTube, président la voit ; secrétaire la voit sans bouton ; téléphone). Le formulaire d'ajout de `BibliothequeVideos` reste sur deux colonnes (`1fr 1fr`) : à regarder sur téléphone, à corriger au bloc 11 si serré. Les 📋 emojis des types de procédé dans ce composant sont antérieurs (non touchés). Aucun commit fait, en attente de l'accord de Kevin.
- Journal : 2026-11-16, Sonnet 5.5. Seul `src/components/bibliotheque-club/BibliothequeClub.jsx` change : sélecteur « Procédés / Vidéos » dans l'onglet « Bibliothèque du club », vidéos par `BibliothequeVideos type="club" clubId={clubId} peutAjouter={peutEditer}` (le composant gérait déjà le type club : club_id = le club, filtre `club_id`, ajout, modification, suppression ; la base du bloc 5 fige type/club/propriétaire). Aucun ancien point d'accès à conserver (0 usage côté club avant). Vérifié : build Vite ok. Non vérifié : affichage et ajout réels (connexion requise).

### Bloc 7 : onglet Digital Football côté club, et copie dans la bibliothèque du club
- Statut : fait (2026-11-16), à valider par Kevin à l'écran
- Objectif : le club consulte tout Digital Football et en reprend ce qui l'intéresse.
- Résultat testable : l'onglet « Digital Football » liste les procédés et vidéos Digital Football ; « Copier dans la bibliothèque du club » crée une copie modifiable.
- Modèle : sonnet · Effort : medium · Coût estimé : moyen
- Pourquoi ce modèle : écran de lecture et une copie simple.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 7 PLAN-bibliotheque-club.md`
- Dépend de : blocs 3 et 5
- Prérequis : aucun
- Étapes :
  - Liste des procédés `partage_platform` (pagination : plus de 1000 procédés), même cartes et filtres qu'au bloc 3, en lecture seule ; vidéos `df`.
  - Bouton « Copier dans la bibliothèque du club » visible seulement avec l'écriture : copie avec `origine` = copie Digital Football, auteur = la personne connectée, mention de l'auteur d'origine.
  - Message clair après copie, lien vers la copie.
- Ce que je teste pour valider : je copie un procédé, je modifie la copie, l'original Digital Football est inchangé ; secrétaire lit sans bouton de copie ; téléphone.
- Reste à finir : contrôle écran par Kevin (copier un procédé DF, le modifier, original inchangé ; secrétaire sans bouton de copie ; téléphone). Pas de copie de vidéo DF (non demandée). Aucun commit fait, en attente de l'accord de Kevin.
- Journal : 2026-11-16, Sonnet 5.5. Nouveau `src/components/bibliotheque-club/DigitalFootballClub.jsx` : sélecteur Procédés / Vidéos ; procédés `partage_platform` lus par pages de 1000 (colonnes sans schéma, schéma lu à l'ouverture et avant copie), recherche et filtres type, thème, âge, affichage progressif par 60 ; fiche en lecture ; vidéos par `BibliothequeVideos type="df"` sans bouton d'ajout. Bouton « Copier dans la bibliothèque du club » seulement avec l'écriture : insert dans `bibliotheque_club_procedes` (origine `digital_football`, `origine_id`, schéma inclus, auteur posé par la base = personne connectée, auteur d'origine mentionné à la fin de la description), pastille « Déjà copié », message avec lien « Voir dans la bibliothèque du club ». `ProceduresClub.jsx` : exports de `Pastille`, `Rubrique`, `labelType`, `dateFr` (aucun changement de comportement). `BibliothequeClub.jsx` branche l'onglet. Aucune modification de base. Vérifié : build Vite ok. Non vérifié : affichage et copie réels (connexion requise).

### Bloc 8 : côté éducateur affilié, lire et reprendre dans une séance
- Statut : fait (2026-11-16), à valider par Kevin à l'écran
- Objectif : la bibliothèque du club sert vraiment sur le terrain.
- Résultat testable : un éducateur affilié, même sans l'outil Bibliothèque, voit « Bibliothèque du club » et ajoute un procédé à sa fiche séance ; il modifie sa fiche, l'original du club ne bouge pas.
- Modèle : sonnet · Effort : high · Coût estimé : élevé
- Pourquoi ce modèle : branchement dans le très gros fichier éducateur, avec la règle d'accès gratuit à respecter sans ouvrir le reste de l'outil payant.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 8 PLAN-bibliotheque-club.md`
- Dépend de : blocs 3 et 6
- Prérequis : éducateur test affilié, sans l'outil Bibliothèque.
- Étapes :
  - Dans la rubrique « Club » de la bibliothèque éducateur : une partie « Bibliothèque du club » (procédés et vidéos du club) au-dessus des procédés partagés par les autres éducateurs, avec une mention claire de la différence.
  - Sans l'outil payant : accès à cette seule partie (pas à « Ma bibliothèque » ni à Digital Football), avec une phrase discrète expliquant que c'est offert par le club.
  - `procedeComplet` et `importerProcedeDansBloc` : savoir relire un procédé depuis `bibliotheque_club_procedes` ; « Nouvelle séance avec ce procédé » marche aussi.
  - Pas de bouton modifier, supprimer ni « Copier dans ma bibliothèque » sur un procédé du club.
  - Ne pas toucher à la branche `estAffilie` abandonnée.
- Ce que je teste pour valider : éducateur test : je vois la bibliothèque du club, j'ajoute un procédé à une fiche, je change la consigne dans ma fiche, l'original est le même côté club ; un éducateur non affilié ne voit aucune bibliothèque de club ; téléphone.
- Reste à finir : contrôle écran par Kevin avec l'éducateur test affilié sans l'outil Bibliothèque (voir la bibliothèque du club, ajouter un procédé à une fiche, changer la consigne, original inchangé côté club ; éducateur non affilié : rien ; téléphone). Limites notées : (1) pour voir le menu « Bibliothèque » sans l'outil payant, l'éducateur doit être affilié accepté ; si le club a masqué l'outil dans le menu de ses éducateurs, ce réglage est ignoré pour ce cas précis ; (2) « Nouvelle séance avec ce procédé » ouvre « Mes séances » : sans l'outil Séances, l'éducateur tombe sur la carte « outil non activé » (hors périmètre, le club règle cela via ses outils offerts) ; (3) la fenêtre « Importer un procédé » dans une fiche liste la rubrique ouverte en dernier (comportement antérieur), pas de sélecteur ajouté ; (4) l'avertissement lint « setState dans un effet » existe déjà ailleurs dans ce fichier. Aucun commit fait, en attente de l'accord de Kevin.
- Journal : 2026-11-16, Sonnet 5.5. Seul `src/pages/DashboardEducateur.jsx` change, plus ce plan. Accès : `biblioClubSeule` = outil Bibliothèque verrouillé ET affilié accepté ; la section ne passe alors plus en « outil non activé », le menu reste visible, seules les rubriques « Bibliothèque club » et « Vidéos du club » existent, avec une phrase discrète « Offert par ton club ». Données : la rubrique club lit `bibliotheque_club_procedes` (lecture seule, règle du bloc 1) puis, avec l'outil payant seulement, les procédés partagés par les éducateurs ; les lignes du club sont marquées `officiel` et arrivent déjà complètes (schéma inclus), donc `procedeComplet`, `importerProcedeDansBloc`, la sélection multiple et « Nouvelle séance avec ce procédé » marchent sans autre changement (copie dans la fiche, l'original n'est jamais écrit). Écran : deux parties distinctes « Bibliothèque du club » (officiel, auteur figé) au-dessus de « Partagés par les éducateurs du club » ; pastille « Officiel du club » ou « Partagé par un éducateur » ; sur un procédé officiel, ni Modifier, ni Supprimer, ni Copier (carte et aperçu). Vidéos : onglet « Vidéos du club » en lecture seule (la base du bloc 5 laisse déjà lire les éducateurs acceptés). Non touché : branche `estAffilie`, base de données. Statuts des blocs 3 et 4 remis à « fait » (restés à « à faire » alors que leur journal est rempli). Vérifié : build Vite ok, eslint sans erreur de variable inconnue. Non vérifié : affichage réel (connexion requise, éducateur test à créer).

### Bloc 9 (optionnel) : [IDÉE] le club adopte un procédé partagé par un de ses éducateurs
- Statut : en cours (2026-11-16) : code et SQL prêts, SQL à exécuter par Kevin
- Objectif : le directeur sportif repère les meilleurs exercices de ses éducateurs et les fait entrer dans la bibliothèque officielle du club, qui les garde même si l'éducateur part.
- Résultat testable : dans l'espace club, une liste « Partagés par vos éducateurs » et un bouton « Ajouter à la bibliothèque du club » (copie, auteur conservé).
- Modèle : opus · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : nécessite d'ouvrir au compte club la lecture des procédés `partage_club` de ses propres éducateurs, règle de sécurité délicate.
- Lancement : `/clear`, puis `/model opus`, puis `/effort high`, puis `/bloc 9 PLAN-bibliotheque-club.md`
- Dépend de : blocs 3 et 5
- Prérequis : sauvegarde Supabase ; accord de Kevin sur l'idée.
- Étapes :
  - SQL : une branche de lecture « procédé `partage_club` de ce club ET lecteur = club ou staff ayant l'écriture Bibliothèque ». Vérification et retour arrière à part.
  - Écran : liste en lecture, bouton d'adoption (copie avec `origine` = éducateur, `auteur_nom` de l'éducateur).
  - L'éducateur garde son procédé personnel intact.
- Ce que je teste pour valider : l'éducateur test partage un procédé au club ; le directeur sportif l'adopte ; la copie du club reste si l'éducateur supprime le sien.
- Reste à finir : (1) Kevin : sauvegarde puis exécution de `supabase_bibliotheque_club_bloc9.sql` ; Claude relance `supabase_bibliotheque_club_bloc9_verification.sql` et l'empreinte. (2) Contrôle écran (directeur sportif ou président : onglet « Partagés par vos éducateurs », ajouter un procédé, la copie porte le nom de l'éducateur ; secrétaire : pas d'onglet ; téléphone). (3) Ordre de mise en ligne : SQL AVANT de publier l'écran (avec l'ancien déclencheur, un directeur sportif qui est aussi éducateur pourrait adopter un procédé à son propre nom). Aucun commit fait.
- Journal : 2026-11-16, Opus 5.5. Fichiers : `supabase_bibliotheque_club_bloc9.sql`, `supabase_bibliotheque_club_bloc9_verification.sql`, `supabase_bibliotheque_club_bloc9_empreinte.sql`, `supabase_bibliotheque_club_bloc9_ANNULATION_NE_PAS_EXECUTER.sql` (en commentaire ; testée décommentée en local : remet le déclencheur du bloc 1 à l'identique, empreinte ba014bf5…). Écran : nouveau `src/components/bibliotheque-club/PartagesEducateursClub.jsx` (liste, recherche, filtres éducateur, type, thème, fiche, bouton « Ajouter à la bibliothèque du club », pastille « Déjà dans le club ») ; `BibliothequeClub.jsx` (3e onglet, affiché seulement avec l'écriture) ; `ProceduresClub.jsx` (fiche d'un procédé adopté : « Procédé de X, ajouté à la bibliothèque du club le … ») ; `DashboardEducateur.jsx` une ligne : la case « Bibliothèque club » dit désormais « Visible par les éducateurs et la direction de ton club » (transparence pour l'éducateur).
  Choix : règle de lecture AJOUTÉE `lecture_exercices_partage_club_direction` (lecture_exercices non réécrite), réservée à l'écriture Bibliothèque ET à un auteur toujours accepté dans le club (un éducateur parti ou en attente n'est pas lisible ; un éducateur ne peut pas « pousser » un procédé chez un club où il n'est pas accepté). Auteur de la copie = l'éducateur (identifiant et nom), posé par le déclencheur qui vérifie aussi que l'original est bien partagé avec CE club ; sinon refus. Création club et copie DF inchangées. Pas de mention ajoutée dans la description (l'auteur suffit).
  Production AVANT (lecture seule) : 69 procédés, 49 partagés club dont 38 avec club (tous club A af8db5d3, auteurs tous acceptés), 11 « club seulement » dont 7 au club A ; 0 procédé du club. Le déclencheur en production est identique au fichier du bloc 1 (md5 ba014bf5…). Lecture « club seulement / personnels d'autrui » : club A 0/0 (attendu après 7/0), DS A 7/0, éducateur A 7/0, DS B, préparateur physique, admin DF, joueur, autre club 0/0. Empreinte AVANT hors bloc : règles 675 / 6e2d71a7…, tables 233 / 489282c9…, fonctions 134 / 39816ee0…, contraintes 806 / 24ba1fe9…, déclencheurs 41 / 3a7a9fc6…, droits 6040 / 3f67b7d3…
  Testé sur Postgres 17 local jetable (vraies règles de `bibliotheque_exercices` recopiées, bloc 1 puis bloc 9 appliqués, 11 comptes fictifs) : lecture conforme pour 12 profils (direction du club A voit les partages de ses éducateurs acceptés, jamais un procédé privé, sans club, d'un auteur en attente ni d'un autre club ; secrétaire, éducateurs, joueur inchangés) ; 22 contrôles d'écriture sur 22 (adoption ok avec auteur = éducateur ; refus : privé, auteur en attente, autre club, sans club, sans original, secrétaire, éducateur ; création club et copie DF gardent la personne connectée ; auteur et origine figés à la modification ; original intact ; copie conservée quand l'éducateur supprime le sien). Build Vite ok. Non vérifié : affichage réel (connexion requise).

### Bloc 10 (optionnel) : [IDÉE] catégorie de l'éducateur et nouveautés
- Statut : fait (2026-11-17), à valider par Kevin à l'écran
- Objectif : l'éducateur U11 voit d'abord ce qui concerne les U11, et repère ce que le club vient d'ajouter.
- Résultat testable : filtre par catégorie d'âge prérempli avec la catégorie de l'éducateur (modifiable) ; mention « Nouveau » sur les procédés du club ajoutés depuis moins de 14 jours.
- Modèle : sonnet · Effort : medium · Coût estimé : faible
- Pourquoi ce modèle : petit ajout d'écran.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 10 PLAN-bibliotheque-club.md`
- Dépend de : bloc 8
- Prérequis : aucun
- Étapes :
  - Lire la catégorie de l'éducateur déjà disponible dans son dashboard, l'appliquer comme filtre par défaut sur la partie club.
  - Mention « Nouveau » d'après la date de création, sans notification ni email.
- Ce que je teste pour valider : éducateur test U11 : le filtre est sur U11, je peux l'enlever ; un procédé créé aujourd'hui porte « Nouveau ».
- Reste à finir : contrôle écran par Kevin avec l'éducateur test (équipe U11 : filtre sur « U10-U11 », je peux l'enlever ; procédé du club créé aujourd'hui : pastille « Nouveau » ; téléphone). Limites : (1) la catégorie vient de l'équipe active de l'éducateur (nom de l'équipe, ex. « U11 », « U11 A »), à défaut de son profil ; si le nom ne se lit pas (« Loisirs »), le filtre reste sur « toutes » ; (2) tant que le filtre est prérempli, les procédés « Pour tous » restent affichés ; dès que l'éducateur choisit lui-même une valeur, le filtre redevient strict comme avant ; (3) « Nouveau » ne marque que les procédés officiels du club (pas ceux partagés par les éducateurs), 14 jours après la date d'ajout ; un procédé adopté au bloc 9 compte à sa date d'adoption ; (4) le préremplissage ne s'applique qu'à la rubrique club ; « Ma bibliothèque » et Digital Football restent sur « toutes ». Aucun commit fait.
- Journal : 2026-11-17, Sonnet 5.5. Seul `src/pages/DashboardEducateur.jsx` change, plus ce plan, aucune base de données. Deux petites fonctions hors composant (`trancheAgeDepuisNomEquipe`, `estNouveauProcede`), un état `biblioAgeChoisi` (le choix de l'éducateur, même « toutes », l'emporte sur le préremplissage), la pastille « Nouveau » à côté de « Officiel du club » (fond de couleur ET texte, pas seulement une couleur). Vérifié : build Vite ok ; eslint : aucune erreur sur les lignes touchées (les erreurs restantes du fichier existaient déjà) ; la règle de correspondance testée sur 16 noms d'équipe (U5, U6, U7 F, U10, U11, U11 A, U13 Elite, u15, U19, U20, Seniors, Vétérans, U10-U11, Loisirs, vide) et la règle des 14 jours (2 j, 13 j oui ; 15 j, date absente non). Non vérifié : affichage réel (connexion requise).

### Bloc 11 : vérification finale et nettoyage
- Statut : fait côté base et code (2026-11-17) ; restent le SQL du bloc 9, les contrôles écran de Kevin et le commit
- Objectif : prouver chaque règle du brief avec de vrais comptes, puis ranger.
- Résultat testable : tableau de vérification rempli dans ce plan, build et console sans erreur.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : parcours de tests méthodique, pas de nouvelle logique.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 11 PLAN-bibliotheque-club.md`
- Dépend de : blocs 0 à 8 (et 9, 10 s'ils sont faits)
- Prérequis : deuxième club test créé.
- Étapes :
  - Matrice du brief : président (écrit), directeur sportif (écrit), rôle sans droit (selon réglage), éducateur affilié (lit, reprend, sa copie change, l'original non), éducateur non affilié (rien), deuxième club (ne voit rien du premier, vérifié aussi par requête), lecture Digital Football par un club.
  - Ordinateur et téléphone ; `npm run build` ; console sans erreur.
  - Nettoyage : code mort, fichiers SQL rangés, mise à jour de ce plan et de la mémoire du projet.
  - Commit des seuls fichiers du chantier, avec l'accord de Kevin.
- Ce que je teste pour valider : je relis le tableau ; je refais moi-même le parcours éducateur affilié sur téléphone.
- Reste à finir :
  1. **Bloc 9 : SQL jamais exécuté en production** (`lecture_exercices_partage_club_direction` absente des règles, constaté le 2026-11-17). Tant qu'il ne l'est pas : l'onglet « Partagés par vos éducateurs » (visible avec l'écriture) reste vide et l'adoption ne peut pas marcher. Kevin décide : exécuter `supabase_bibliotheque_club_bloc9.sql` (sauvegarde avant, puis Claude relance `..._bloc9_verification.sql`), ou ne pas mettre le bloc 9 en ligne (alors retirer l'onglet). SQL avant mise en ligne de l'écran.
  2. Contrôles à l'écran par Kevin, jamais faits (connexion requise, aucun compte de test accessible à Claude) : voir la liste ci-dessous.
  3. Pas de deuxième club test créé : l'isolation entre clubs est prouvée par requête sur les 7 clubs existants (voir tableau), sans toucher à leurs données.
  4. Commit : en attente de l'accord de Kevin. Attention : `src/pages/DashboardClub.jsx`, `src/pages/DashboardEducateur.jsx`, `src/components/ScannerProc.jsx` et `src/components/BibliothequeVideos.jsx` contiennent aussi des changements du chantier design identité. À committer avec un choix de lignes, ou avec le design, pas en bloc. `src/pages/coach/Bibliotheque.jsx` n'est pas de ce chantier. Les 11 fichiers SQL, `BRIEF-bibliotheque-club.md`, ce plan et `src/components/bibliotheque-club/` (dossier neuf) sont, eux, entièrement de ce chantier.
  5. Limites connues (non bloquantes) : avertissements eslint « setState dans un effet » et « exports hors composants » dans `bibliotheque-club/` (même schéma que le reste du code, sans effet pour l'utilisateur) ; copie de vidéo Digital Football vers le club non prévue ; éducateur staff + outils à la carte sans Séances ni Bibliothèque bloqué par `verrou_outils` (aucun cas aujourd'hui) ; « Nouvelle séance avec ce procédé » sans l'outil Séances mène à « outil non activé ».
- Tableau de vérification (relevé le 2026-11-17, lecture seule, vraie base de production, comptes simulés avec les vraies règles) :

| Règle du brief | Preuve | Résultat |
|---|---|---|
| Président et compte club : lisent et écrivent | `a_permission_bibliotheque` sur les 7 clubs, 0 écart avec la règle recalculée | ok |
| Directeur sportif : écrit par défaut | idem, 0 écart (contrôle 5) | ok |
| Autre rôle du staff (préparateur physique, secrétaire) : lit, n'écrit pas | contrôle 4 et 5, plus vérification bloc 1 ligne 24 | ok |
| Rôle réglé « aucun droit » | aucun réglage en production aujourd'hui (contrôle 1) ; la règle a été prouvée en base locale au bloc 1 (réglage respecté dans les deux sens) | ok en local, à voir à l'écran |
| Éducateur affilié accepté : lit, n'écrit pas | contrôles 6 et 8 | ok |
| Éducateur non affilié (et tout profil sans lien) : rien | contrôles 9 et 10 (profils sans lien testés sur les 7 clubs) | ok |
| Deuxième club : ne voit rien du premier | contrôle 7 : 0 droit sur un club sans lien, pour tous les comptes sur tous les clubs (plus de 100 paires) | ok |
| Personne de connecté : rien | contrôle 11, plus droits anonymes (bloc 1) | ok |
| Club lit Digital Football, pas les procédés non partagés d'autrui | bloc 5 : 23 contrôles sur 23, 3e chiffre inchangé | ok |
| Vidéos du club : par type, plus ouvertes à tout connecté | bloc 5 (règles par type, déclencheur qui fige type et club) | ok |
| Reprise en séance : l'original ne bouge pas | code : copie dans la fiche, le club n'écrit rien (bloc 8) ; aucune écriture possible côté éducateur (contrôle 5) | ok côté base, à voir à l'écran |

Contrôles à l'écran pour Kevin (je n'ai pas de connexion aux comptes) :
  - Président (compte club) : menu « Bibliothèque », créer, modifier, supprimer un procédé ; dessiner un schéma ; ajouter une vidéo YouTube ; onglet « Digital Football » : copier un procédé, le modifier, l'original DF reste le même.
  - Directeur sportif : mêmes actions d'écriture. Autre rôle (préparateur physique ou secrétaire) : lit, aucun bouton.
  - Réglage des rôles : mettre un rôle sur « aucun droit », enregistrer, recharger : ça tient, le menu disparaît pour lui.
  - Éducateur affilié sans l'outil Bibliothèque : « Bibliothèque club », ajouter un procédé à une fiche, changer la consigne, l'original est le même côté club ; pastille « Nouveau » ; filtre sur sa catégorie. Éducateur non affilié : aucune bibliothèque de club.
  - Téléphone : tout le parcours ci-dessus (menu, cartes, fiche, formulaires, ajout de vidéo).
- Journal : 2026-11-17, Sonnet 5.5. Relancé en lecture seule : vérifications bloc 1 (17 sur 17 ok) et bloc 5 (23 sur 23 ok, rien n'a bougé depuis). Nouveau fichier `supabase_bibliotheque_club_final_verification.sql` : pour chaque compte connu (comptes club, staff, éducateurs, 40 profils sans lien) et chacun des 7 clubs, droit réel de la base comparé à la règle du brief recalculée à part : 11 contrôles sur 11 ok. Écart au plan : pas de deuxième club test (non créé), preuve par requête sur les clubs réels, sans lire ni écrire leurs données. Bloc 9 : SQL non exécuté (voir ci-dessus). Nettoyage : seul changement de code, `src/components/BibliothequeVideos.jsx`, formulaire d'ajout de vidéo à deux colonnes rendu adaptable (une colonne sur petit écran, noté au bloc 6) ; aucun code mort ni import inutile dans `bibliotheque-club/` (eslint : seulement les deux types d'avertissement ci-dessus). Build Vite ok (deux fois). Non vérifié : affichage réel sur ordinateur et téléphone, console du navigateur (connexion requise).

## État des lieux (bloc 0, relevé le 2026-11-16, en lecture seule)

**Git** : 190 fichiers déjà modifiés et non commités (design identité surtout : src/components, src/pages, index.html, package.json...). Aucun n'est de ce chantier. Règle : ne commiter que nos fichiers, nommés un par un.

**Table `bibliotheque_exercices`** (colonnes réelles) : id, educateur_id (obligatoire), type (obligatoire), nom (obligatoire), theme, description, consignes, variables, duree (entier), nb_joueurs (texte), tags (texte), created_at, updated_at, club_id, schema_data (jsonb), partage_club, partage_platform (booléens, faux par défaut), schema_png, objectif, but, criteres_realisation, principe_jeu, categorie_age (liste), organisation.
Règles actives : INSERT/UPDATE/DELETE = `auth.uid() = educateur_id` ; SELECT `lecture_exercices` = auteur, OU `partage_club` + éducateur accepté du même club, OU `partage_platform` + (profil plan éducateur OU éducateur accepté d'un club) ; règle `verrou_outils` (outil_ferme 'seances','bibliotheque'). Constat : aucune branche ne donne la lecture à un compte club ou staff, d'où le bloc 5.

**Table `bibliotheque_videos`** : id, type (obligatoire), club_id, proprietaire_id, titre, description, youtube_url, youtube_id, categorie, tags, duree, visible_joueurs, created_at, theme_seance, type_seance, theme, principe_jeu, type_procede.
Règles actives : `bv_select`, `bv_insert`, `bv_update`, `bv_delete` = seulement `auth.uid() IS NOT NULL`. **Alerte** : tout compte connecté peut lire, ajouter, modifier et supprimer n'importe quelle vidéo, y compris celles d'un autre club. Le code (`BibliothequeVideos.jsx`, `type='club'` filtré par `club_id`) est le seul garde-fou. À traiter au bloc 5 (ce n'est pas seulement « une branche à ajouter » : il faudra écrire de vraies règles par type).
Contenu : 39 vidéos `df`, **0 vidéo `club`** et 0 `perso` : rien à migrer côté club. Aujourd'hui `BibliothequeVideos` est branché côté club nulle part (seulement `pages/coach/Bibliotheque.jsx` en `df` et `DashboardEducateur.jsx` en `favoris`/`df`).

**`role_permissions`** : colonnes id, club_id, role, section, can_view, can_edit. Contrainte `role_permissions_section_check` actuelle : sportif, seances, terrains, deplacements, budget, sponsors, repartition_bus, profil, evenements, stages, organigramme, staff, inventaire, newsletter, taches, projet_club_cff4, mon_club (17 valeurs). Il faut y ajouter `bibliotheque` (bloc 1). Règles : lecture pour compte club ou staff du club ; écriture pour président.

**`staff_club`** : id, club_id, user_id, role, created_at, nom, prenom, telephone, email, photo_url, ordre. **Pas de colonne statut** : un membre listé est actif. Rôles présents en production : directeur_sportif (4), preparateur_physique (1). **`club_educateurs`** : statut texte (13 lignes, toutes `accepte`), role, categories_access...

**Modèles de fonctions existants** : `a_permission_inventaire(club, edition)` (président et compte club = tout ; sinon ligne `role_permissions` ; aucune valeur par défaut) et `secu_club_peut_editer_section(club, section, roles_defaut[])` (avec défauts, mais pour l'écriture seulement, et exige `can_view` ET `can_edit`). Pour la Bibliothèque, il faut une lecture par défaut distincte de l'écriture : à écrire au bloc 1 sur le modèle des deux.

**Écran club** (`src/pages/DashboardClub.jsx`) : `canViewSection` / `canEditSection` (l.1132-1143) retombent sur `PERMISSION_DEFAULTS` (src/lib/permissionsClub.js : liste unique « voit et écrit »). Menu administratif construit l.1210 (liste d'ids filtrée par `canViewSection`) ; menu général l.3330-3371. Rendu des onglets : `{activeTab === '...' && canViewSection(...)}` à partir de l.4052. Réglage des rôles : `src/components/monclub/EtapeAccesBureau.jsx`, grille construite depuis `PERMISSION_SECTIONS` (src/lib/rolesClub.js l.51) : ajouter `{ id: 'bibliotheque', label: 'Bibliothèque' }` suffit pour la ligne.
Piège : EtapeAccesBureau calcule la case cochée par défaut avec `PERMISSION_DEFAULTS` (l.36), donc avec une lecture par défaut distincte il faut aussi l'y brancher, sinon la grille afficherait « aucun droit » à tort.

**Écran éducateur** (`src/pages/DashboardEducateur.jsx`, ~12 000 lignes) : section `bibliotheque` (menu l.5939, rendu l.11298) avec 4 rubriques `personal`, `club` ('Bibliothèque club' : procédés `partage_club` des collègues), `platform`, `videos`. `procedeComplet` l.3252 (relit `schema_png, schema_data` dans `bibliotheque_exercices`), `importerProcedeDansBloc` l.3473, `importerProcedeDansBloc` appelé l.11909 et l.11991. L'outil payant `bibliotheque` (catalogueOutils.js l.83, 4 €/mois ou 40 €/an) ferme l'accès via `outil_ferme` en base (règle `verrou_outils`, qui s'applique aussi à la nouvelle table si on la copie : **ne pas** la copier sur `bibliotheque_club_procedes`, sinon la décision 1 du plan serait bloquée en base) et via `outils.outilActif`/`menuVisible` côté écran (à regarder au bloc 8). Rubrique 'club' existante à ne pas confondre avec la nouvelle « Bibliothèque du club ».

**Vérification d'écart avec le plan** :
1. `bv_*` totalement ouvertes : plus lourd que prévu au bloc 5.
2. Pas de vidéos `club` existantes : rien à préserver.
3. Pas de statut dans `staff_club` : la lecture staff n'a pas de filtre « accepté » à gérer.
4. Aucun SQL à exécuter à ce stade.
