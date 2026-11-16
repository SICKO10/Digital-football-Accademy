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
- Statut : à faire
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
- Reste à finir :
- Journal :

### Bloc 3 : créer, lire, modifier, supprimer un procédé du club
- Statut : à faire
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
- Reste à finir :
- Journal :

### Bloc 4 : schéma tactique et import par scan pour le club
- Statut : à faire
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
- Reste à finir :
- Journal :

### Bloc 5 : base de données, vidéos du club et lecture Digital Football
- Statut : à faire
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
- Reste à finir :
- Journal :

### Bloc 6 : vidéos du club dans la bibliothèque du club
- Statut : à faire
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
- Reste à finir :
- Journal :

### Bloc 7 : onglet Digital Football côté club, et copie dans la bibliothèque du club
- Statut : à faire
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
- Reste à finir :
- Journal :

### Bloc 8 : côté éducateur affilié, lire et reprendre dans une séance
- Statut : à faire
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
- Reste à finir :
- Journal :

### Bloc 9 (optionnel) : [IDÉE] le club adopte un procédé partagé par un de ses éducateurs
- Statut : à faire
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
- Reste à finir :
- Journal :

### Bloc 10 (optionnel) : [IDÉE] catégorie de l'éducateur et nouveautés
- Statut : à faire
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
- Reste à finir :
- Journal :

### Bloc 11 : vérification finale et nettoyage
- Statut : à faire
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
- Journal :

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
