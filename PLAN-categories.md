# PLAN : catégories à plusieurs équipes
Date : 2026-11-14 · Brief : BRIEF-categories.md

Objectif : un club regroupe ses équipes en catégories et choisit, par catégorie, un effectif commun ou des effectifs par équipe, sans rien changer pour les clubs qui ne touchent à rien.
Principe : une nouvelle table `categories` au-dessus des équipes existantes (`club_categories`). Tout l'historique (matchs, entraînements, présences, convocations, stats) reste rattaché à l'équipe de l'événement, donc changer de mode ne déplace aucune donnée passée.

## Modèle de données (proposé, à confirmer après le bloc 0)
- `categories` : `id`, `club_id`, `nom` (U15), `mode` (`par_equipe` par défaut | `commun`), `created_at`. Unique (club, nom nettoyé). Pas de saison (décision 4 du brief).
- `club_categories` (équipes) : + `categorie_id` (obligatoire pour une équipe de club). Un déclencheur le remplit à chaque création d'équipe (cherche ou crée la catégorie du même nom) : les formulaires actuels marchent sans changement.
- `equipe_joueurs` : + `categorie_id`, rempli par déclencheur depuis l'équipe. `club_categorie_id` = équipe principale (obligatoire en par équipe, gardée pour information en commun).
- Renfort : aucune colonne. Renfort = équipe principale de la fiche ≠ équipe de l'événement.
- `disponibilites_categorie` : `joueur_id` (compte), `categorie_id`, `date`, `statut` (present | absent), `commentaire`. Unique (joueur, catégorie, date). Sondage « à l'événement » du mode commun ; `disponibilites` ne bouge pas.
- Fonction `categorie_changer_mode` : tout ou rien, réservée au compte club, applique la répartition fournie.

## Règle de reprise
Même club + même nom nettoyé (majuscules, espaces retirés) = même catégorie. « U18 » + « A » → catégorie U18, équipe A. Toutes en `par_equipe`. Les cas ambigus sont listés par le diagnostic du bloc 0 et tranchés par Kevin avant le bloc 1. Les éducateurs sans club (fiches sans équipe de club) ne sont pas concernés.

## Règles techniques pour tous les blocs
- `DashboardEducateur.jsx` (13 400 lignes), `DashboardClub.jsx` (7 200) et `DashboardJoueur.jsx` (5 600) : **ne jamais les lire en entier**. Chercher l'endroit précis, y brancher le minimum, écrire le nouveau code dans `src/components/categories/` et les calculs purs dans `src/lib/categories*.js` avec tests (`npm test`).
- Mode `par_equipe` = comportement actuel à l'identique : toute nouveauté est conditionnée à `mode === 'commun'` ou à une action explicite (renfort).
- Couleurs via le thème existant (`useColors()`, thème club), zéro couleur en dur, zéro emoji.
- Identifiants : `presences_entrainement.joueur_id` = id de fiche ; convocations et disponibilités = id de compte. Ne jamais les mélanger.
- Base de production : chaque SQL est présenté, Kevin lance `~/Sauvegardes-DigitalFootball/sauvegarder.sh` avant, puis exécute lui-même le SQL et le fichier de vérification (simulation annulée à la fin). Le fichier de retour arrière est fourni à part (`_ANNULATION_NE_PAS_EXECUTER.sql`), jamais dans le même message.
- **Aucun commit, push ni déploiement sans l'accord explicite de Kevin.**
- Chaque bloc dit quoi regarder sur http://localhost:5173.

## Ce que je dois fournir
| Élément | Pourquoi | Nécessaire avant |
|---|---|---|
| Le résultat du diagnostic (`diagnostic-categories.csv`) | Connaître les vraies règles d'accès et les cas ambigus | bloc 1 |
| Un club de test avec deux éducateurs de test (A et B) et un compte joueur de test | Tester commun, renfort, sondage, droits | bloc 3 |
| Un deuxième club de test | Vérifier qu'un club ne voit jamais l'autre | bloc 10 |
| Un membre du staff de test ayant la catégorie (directeur) | Tester les droits « directeur » | bloc 10 |

## Blocs

### Bloc 0 : inventaire de la base et diagnostic de reprise
- Statut : fait et validé (2026-11-14, validation par le lancement du bloc 1). Chantier sécurité : toujours à décider avant le bloc 3.
- Journal : 2026-11-14, Opus 5.5. Diagnostic lancé par Kevin en production, résultat collé dans la conversation (pas de fichier CSV gardé). Inventaire écrit en bas de ce fichier. Écart : quatre failles d'accès déjà présentes découvertes, signalées sans rien corriger.
- Objectif : connaître les règles d'accès réelles et les cas ambigus avant d'écrire le moindre SQL.
- Résultat testable : section « Inventaire » en bas de ce fichier, règle de reprise et liste des cas ambigus avec une décision proposée pour chacun.
- Modèle : opus · Effort : medium
- Lancement : session en cours ; sinon `/clear`, `/model opus`, `/bloc 0 PLAN-categories.md`
- Étapes :
  - Kevin lance `supabase_categories_diagnostic.sql` (lecture seule) et enregistre le CSV dans le dossier.
  - Lire le CSV : colonnes réelles (dont `equipe_joueurs.educateur_id` obligatoire ou non, colonnes de `stats_match`), règles d'accès des 16 tables, déclencheurs, tables qui pointent vers les équipes et les fiches.
  - Écrire l'Inventaire : cas ambigus et décision proposée, ajustements du modèle de données.
- Ce que je teste pour valider : je lis l'Inventaire et je tranche les cas ambigus.

### Bloc 1 : fondation en base (catégories et reprise)
- Statut : fait, appliqué en production le 2026-11-14 (après un premier arrêt du SQL du bloc 3 qui a révélé qu'il ne l'était pas encore). Résultat en base : 57 équipes, 38 catégories (14 à plusieurs équipes), 146 fiches rattachées. Vérification 100 % ok après correction du contrôle 31 dans le fichier de vérification (il dépendait de l'essai 30, « sans objet » quand le club choisi n'a pas de fiche).
- Journal : 2026-11-14, Opus 5.5. Lancement du bloc 1 = validation du bloc 0 (la question « Frederic Gauvrit est-il un compte de test ? » reste ouverte, sans effet avant le bloc 8). Fichiers testés sur un Postgres 17 local imitant les tables (club, équipes, fiches, staff, éducateurs, garde des saisons réelle) : 27 contrôles ok, relance sans erreur, arrêt de sécurité vérifié, retour arrière puis réapplication ok. Décisions : la catégorie d'une équipe est toujours recalculée d'après son nom (une valeur écrite à la main est ignorée) ; une fiche sans équipe n'a pas de catégorie (le bloc 3 assouplira pour le mode commun) ; pas de modification directe d'une catégorie (le mode passera par la fonction du bloc 8) ; une catégorie ayant des équipes ou des fiches ne peut pas être supprimée. Sécurité ajoutée : le SQL s'arrête sans rien changer si un déclencheur inconnu réagit à toute modification des équipes ou des fiches.
- Reste à finir : une catégorie dont la dernière équipe est supprimée ou renommée reste en base, vide (invisible tant que le bloc 2 n'existe pas) : le bloc 2 doit l'afficher avec « Supprimer ». Renommer une catégorie devra renommer ses équipes (bloc 2 ou 8).
- Objectif : chaque équipe existante appartient à une catégorie `par_equipe`, sans aucun changement visible.
- Résultat testable : l'application se comporte exactement comme avant ; la vérification SQL affiche ok partout (une catégorie par club et nom, chaque équipe de club rattachée, chaque fiche d'équipe rattachée, aucune ligne perdue, nombres identiques avant et après).
- Modèle : opus · Effort : high
- Lancement : `/clear`, `/model opus`, `/effort high`, `/bloc 1 PLAN-categories.md`
- Dépend de : bloc 0 validé
- Étapes :
  - `supabase_categories.sql` : table `categories` + RLS (club propriétaire, éducateurs et staff du club en lecture, aucun autre club), colonnes `categorie_id`, déclencheurs de remplissage automatique, reprise selon la règle et les décisions du bloc 0.
  - `supabase_categories_verification.sql` : contrôles ok = true, plus une simulation annulée (création d'une équipe U15 C par le formulaire actuel → rattachée à U15).
  - `supabase_categories_ANNULATION_NE_PAS_EXECUTER.sql`, fourni à part.
  - Aucune ligne de code front.
- Ce que je teste pour valider : sauvegarde, SQL, vérification ; puis sur localhost, `/club` onglet équipes et `/educateur` Mon équipe identiques à avant.

### Bloc 2 : côté club, liste des catégories et création
- Statut : fait côté code, à valider par Kevin à l'écran (parcours non testé avec un vrai compte club : pas d'accès connecté depuis ma session).
- Journal : 2026-11-14, Sonnet 5.5. Bloc 1 déclaré appliqué par Kevin (« ok »). Boutons « Catégories » dans l'onglet équipes, puis écrans liste et création (`src/components/categories/`), calculs dans `src/lib/categoriesClub.js` (4 tests). Création = catégorie avec son mode, puis équipes par l'insertion habituelle (le déclencheur du bloc 1 les rattache) ; si les équipes échouent, la catégorie vide est retirée. Staff non principal : liste en lecture seule. Build ok, 471 tests ok.
- Reste à finir : renommer une catégorie (bloc 2 ou 8, voir bloc 1) non fait ; la liste actuelle des équipes et son bouton d'ajout d'équipe sont inchangés (une équipe ajoutée là rejoint la catégorie du même nom, quel que soit son mode).
- Objectif : le club voit ses équipes regroupées par catégorie et crée une catégorie en choisissant son mode.
- Résultat testable : `/club`, onglet des équipes : entrée « Catégories » (liste U15 : A, B, C avec le mode) ; écran « Créer la catégorie » avec fil d'Ariane, deux cartes sans présélection, bouton désactivé avec message d'aide tant qu'aucun mode n'est choisi, « + Ajouter une équipe » qui respecte la limite du forfait. La liste actuelle des équipes reste là, inchangée.
- Modèle : sonnet · Effort : medium
- Lancement : `/clear`, `/model sonnet`, `/effort medium`, `/bloc 2 PLAN-categories.md`
- Dépend de : bloc 1 appliqué
- Étapes : composants `ListeCategories.jsx`, `CreerCategorie.jsx` ; branchement minimal dans `DashboardClub.jsx` ; création réservée au compte principal du club (décision 2) ; rendu téléphone.
- Ce que je teste pour valider : créer U15 en commun avec A, B, C, puis U17 par équipe avec A et B ; vérifier la limite du forfait.

### Bloc 3 : effectif commun partagé (base + éducateur)
- Statut : SQL appliqué en production le 2026-11-14, vérification 100 % ok (23 contrôles, simulation sans reste, 0 catégorie en commun, 6 règles ajoutées). Reste : contrôle à l'écran avec les éducateurs de test A et B.
- Journal : 2026-11-14, Opus 5.5. Lancement du bloc 3 = validation du bloc 2. Kevin : comptes de test (club, éducateurs A et B, joueur) existants ; chantier sécurité juste après ce bloc. SQL : 8 fonctions (dont `est_educateur_de_categorie`, `peut_voir_categorie`) et 6 règles ajoutées, toutes inactives tant qu'une catégorie n'est pas en commun ; testé sur Postgres 17 local (imitation des tables et de règles existantes strictes) : 21 contrôles ok, droits du staff (directeur sportif, responsable école de foot, réglage « u 15 »), relance sans erreur, retour arrière puis réapplication ok. Front : `chargerJoueurs` charge toute la catégorie en commun (une ligne par compte), bandeau « Effectif commun » avec doublons possibles, suppression bloquée avec message pour la fiche d'un autre. 4 tests ajoutés (475 ok), build ok, ESLint inchangé (20 remarques déjà présentes). Écarts : (1) aucune règle d'ajout de fiche : l'éducateur ajoute dans sa propre équipe avec les règles existantes et la fiche rejoint la catégorie toute seule ; le déclencheur des fiches du bloc 1 n'est donc pas assoupli (toute fiche garde une équipe principale) ; (2) la lecture des matchs entre éducateurs n'est PAS ouverte : `Deplacements.jsx` lit tous les matchs visibles sans filtre et en aurait affiché trop ; (3) suppression d'une fiche : aucune règle ajoutée, réservée à son auteur et au club comme aujourd'hui ; (4) staff : mêmes réglages et mêmes valeurs par défaut que `src/lib/rolesClub.js` (président = tout), `club_educateurs.categories_access` ignoré (aucun écran ne l'utilise). Pas d'essai à l'écran depuis ma session (aucun compte connecté, SQL pas encore en production).
- Journal (relance) : 2026-11-17, Opus 5.5. Bloc relancé alors qu'il était déjà fait : aucun code ni SQL. Contrôle en lecture sur la production après le chantier sécurité de novembre : les 6 règles `categories_commun_*` (equipe_joueurs lecture et modification, convocations, convocation_joueurs, convocation_reponses, disponibilites) et les 2 fonctions sont toujours présentes. 2 catégories sont en commun en production ; au club test, U13 (2 équipes) est en mode par équipe : à passer en commun depuis l'écran du bloc 8 pour faire le contrôle à l'écran.
- Reste à finir : bloc 4 doit lire les matchs des autres équipes de la catégorie par une fonction dédiée (colonnes limitées), pas par une règle sur `matchs_equipe`, et ajouter l'écriture des convocations par le club ; un joueur convoqué par un autre éducateur de la catégorie ne lit pas encore ce match (bloc 6) ; en commun, la convocation, les stats et les présences de l'éducateur A proposent désormais tous les joueurs de la catégorie (voulu), mais le joueur affilié à B qui est convoqué par A ne le verra qu'après le bloc 6.
- Objectif : en commun, les éducateurs de la catégorie partagent une seule liste de joueurs.
- Résultat testable : éducateur A et éducateur B d'une catégorie commune voient les mêmes joueurs dans Mon équipe et peuvent en ajouter ; une catégorie par équipe ne change pas ; un éducateur d'un autre club ne voit rien.
- Modèle : opus · Effort : high
- Lancement : `/clear`, `/model opus`, `/effort high`, `/bloc 3 PLAN-categories.md`
- Dépend de : bloc 2
- Étapes :
  - SQL : fonctions `est_educateur_de_categorie`, `peut_voir_categorie` (club, staff ayant la catégorie) ; règles d'accès ajoutées (jamais retirées) sur `equipe_joueurs`, `convocations`, `convocation_joueurs`, `convocation_reponses`, `disponibilites` pour le mode commun ; vérification avec cas d'essai A, B, autre club.
  - Front : `chargerJoueurs` charge par catégorie quand le mode est commun (affichage regroupé par compte, doublons sans compte signalés) ; ajout d'un joueur rattaché à la catégorie.
- Ce que je teste pour valider : comptes éducateur A et B de test.

### Bloc 4 : grille de convocation (effectif commun)
- Statut : fait. SQL appliqué en production le 2026-11-14, vérification 100 % ok (4 fonctions, 26 contrôles ok, simulation sans reste). Reste : contrôle à l'écran de la grille avec les comptes de test (éducateurs A et B, club, joueur).
- Journal : 2026-11-14, Sonnet 5.5. Lancement du bloc 4 = validation du bloc 3 (contrôle d'écran du bloc 3 toujours à faire). SQL `supabase_categories_grille.sql` : 4 fonctions, aucune règle d'accès ajoutée ni modifiée (matchs des équipes de la catégorie le jour choisi, convoqués, prochaine date, publication de la convocation). Testé sur Postgres 17 local imitant les tables : 26 contrôles ok, relance sans erreur. Front : `GrilleConvocations.jsx` (recherche, date, une colonne par match, compteur en direct, cases, pagination 10 par page, envoi par colonne, téléphone = une équipe à la fois avec onglets), calculs dans `src/lib/categoriesGrille.js` (7 tests avec l'expiration), `calculerExpirationConvocation` extraite vers `src/lib/convocations.js` (comportement identique, la modale de l'éducateur l'utilise). Branchements : bouton « Convocations » sur chaque catégorie en commun de la liste des catégories du club, bouton « Convocations U15 » sous le bandeau « Effectif commun » de Mon équipe (éducateur). Build ok, 483 tests (482 ok, 1 ignoré déjà présent), ESLint sans nouvelle remarque. Essai visuel sur un harnais avec fausse base (ordinateur et 390 px) : affichage, cases, envoi (appel avec les bons joueurs et la bonne expiration) ok. Pas d'essai avec un vrai compte connecté depuis ma session.
- Écarts : (1) l'envoi passe par une fonction de la base et non par `publierConvocation` côté navigateur : c'est ce qui permet au club d'envoyer pour toutes les équipes sans ouvrir de règle d'écriture, de vérifier que chaque joueur est dans l'effectif et de faire l'envoi en une seule opération ; la logique de la modale de l'éducateur n'a pas bougé. (2) Comme aujourd'hui, aucune notification ni email n'est envoyé : la convocation apparaît en carte sur le dashboard du joueur (le plan disait « notification des seuls joueurs cochés » : la carte ne concerne que les joueurs cochés, c'est le même résultat qu'aujourd'hui). (3) Une convocation créée par la grille n'a ni terrain, ni arbitre, ni programme (terrain « Herbe » par défaut) : ils se complètent depuis la modale du match de l'éducateur, et sont conservés si la grille republie. (4) Les fiches sans compte sont affichées grisées (on ne peut pas convoquer sans compte). (5) Seul le compte principal du club envoie ; le staff voit la grille en lecture seule. (6) 10 joueurs par page.
- Reste à finir : bloc 5 (conflits entre colonnes et réponses au sondage) ; compteur de la colonne = cases cochées, sans les joueurs déjà convoqués dans une autre équipe ; l'éducateur d'une équipe sans match ce jour-là ne peut pas en créer depuis la grille.
- Objectif : convoquer toute la catégorie pour une date, équipe par équipe.
- Résultat testable : écran « Convocations U15 » (fil d'Ariane, « Effectif commun · N joueurs », date) ; recherche ; une colonne par match des équipes de la catégorie ce jour-là (nom, jour, heure, compteur en direct) ; cases à cocher ; pagination « 1–6 sur N » ; bouton « Envoyer · U15 A » qui publie comme aujourd'hui (convocation + notification des seuls joueurs cochés) ; l'éducateur n'envoie que pour son équipe, le club pour toutes ; utilisable sur téléphone (une équipe à la fois ou colonne figée).
- Modèle : sonnet · Effort : high
- Lancement : `/clear`, `/model sonnet`, `/effort high`, `/bloc 4 PLAN-categories.md`
- Dépend de : bloc 3
- Étapes : `GrilleConvocations.jsx` ; réutiliser la logique de `publierConvocation` (extraite dans `src/lib/convocations.js` sans changer son comportement) ; calcul des colonnes en fonction pure testée.
- Ce que je teste pour valider : deux matchs U15 A et U15 B le même samedi, cocher, envoyer, voir la convocation côté joueur de test.

### Bloc 5 : conflits et réponses au sondage dans la grille
- Statut : fait (code, aucun SQL). Reste : contrôle à l'écran avec les comptes de test.
- Journal : 2026-11-14, Sonnet 5.5. Lancement du bloc 5 sans le bloc 6 : le sondage lu est celui par match (`disponibilites.match_id`, statuts present, absent, blesse, malade), lisible par la règle du bloc 3, donc aucun SQL. Calculs purs ajoutés à `src/lib/categoriesGrille.js` (conflits, texte, index du sondage, statut) avec 2 tests ; branchement dans `GrilleConvocations.jsx`. Conflit : si le joueur est déjà coché dans une autre colonne du jour (publiée ou non), une confirmation s'ouvre au clic (« Déjà convoqué en U15 A à 14:00. Le convoquer quand même ? »), sans blocage, et une ligne orange reste sous son nom tant qu'il est coché deux fois. Sondage : sous le nom, « Absent », « Blessé » ou « Malade » (rouge) quand il l'a dit pour tous les matchs du jour, « Pas répondu » (gris) sans réponse, rien s'il est présent ; absent d'un seul match = confirmation au moment de le cocher dans cette colonne. 485 tests (484 ok, 1 ignoré déjà présent), build ok, ESLint sans remarque. Pas d'essai avec un vrai compte.
- Reste à finir : quand le bloc 6 ajoutera le sondage « à l'événement » (`disponibilites_categorie`), brancher ce statut à la place du sondage par match ; un joueur dont l'éducateur ne partage pas la catégorie n'a pas de réponse lisible (affiché « Pas répondu »).
- Objectif : éviter les doubles convocations et voir qui est disponible.
- Résultat testable : joueur coché en A et en B le même jour → message « Déjà convoqué en U15 A samedi 14 h » et confirmation demandée, sans blocage ; à côté du nom : « absent » ou « pas répondu » selon le sondage de la date.
- Modèle : sonnet · Effort : medium
- Lancement : `/clear`, `/model sonnet`, `/effort medium`, `/bloc 5 PLAN-categories.md`
- Dépend de : blocs 4 et 6 (le statut du sondage commun vient du bloc 6 ; à défaut, ce bloc affiche d'abord le sondage par match)
- Ce que je teste pour valider : cocher un joueur dans deux colonnes du même jour.

### Bloc 6 : sondage à l'événement et convocation avec l'équipe (joueur)
- Statut : fait côté code. SQL `supabase_categories_joueur.sql` appliqué en production le 2026-11-15, vérification 100 % ok (21 contrôles, simulation sans reste). Reste : contrôle à l'écran avec le compte joueur de test.
- Journal : 2026-11-14, Sonnet 5.5. SQL : table `disponibilites_categorie` (5 règles), 3 fonctions (`categories_joueur_dans_commun`, `categories_joueur_agenda`, `categories_joueur_convocations`), aucune règle existante modifiée. Testé sur Postgres 17 local (tables imitées) : 11 contrôles ok (agenda 3 lignes en commun, 0 en par équipe, réponse, changement, usurpation refusée, catégorie par équipe refusée, équipe B affichée sur la convocation), relance sans erreur. Front : `SondageCategorie.jsx` (carte « Ta catégorie U15 » : une ligne par date, séances et matchs de toutes les équipes, boutons « Je suis là samedi 21 » / « Absent »), calculs dans `src/lib/categoriesJoueur.js` (4 tests), branché sous `SondageSemaine` dans le dashboard joueur principal (la branche `estAffilie` morte n'est pas touchée). Carte « Tu es convoqué » : « · U15 B » ajouté dans `ALaUne.jsx` ; `chargerConvocationActive` lit le match par la fonction de la base (repli sur l'ancienne lecture si la fonction n'existe pas encore). Grille : la réponse à la date est fusionnée au sondage par match (`fusionnerSondageDate`, 1 test), la réponse au match l'emporte. 490 tests (489 ok, 1 ignoré déjà présent), build ok. Pas d'essai avec un vrai compte.
- Écarts : (1) le sondage par séance existant (`disponibilites.seance_id`) n'est pas étendu aux séances des autres équipes : en commun, une seule réponse par date remplace la réponse par séance ; (2) le joueur voit les séances et matchs de toute la catégorie sur 30 jours, colonnes limitées (équipe, date, heure, lieu, adversaire) ; (3) en par équipe, seul le nom de l'équipe est ajouté sur la convocation ; (4) la réponse est « présent » ou « absent » seulement (pas blessé ni malade : ceux-là restent dans le sondage par séance) ; (5) en lecture d'un parent, la carte ne montre que les réponses déjà données (agenda vide, la base filtre sur le compte connecté).
- Reste à finir : ESLint signale une erreur dans `ListeCategories.jsx` (setState dans un effet, bloc 2, hors périmètre) ; le joueur dont l'éducateur ne partage pas la catégorie n'a toujours pas de réponse lisible dans la grille ; un joueur sans compte relié à sa fiche ne reçoit pas la carte.
- Objectif : en commun, le joueur répond à la date ; la convocation affiche son équipe dans les deux modes.
- Résultat testable : `/dashboard-joueur` d'un joueur de catégorie commune : « Je suis là samedi 21 » / « Absent » ; les entraînements de toutes les équipes de la catégorie sont visibles avec leur sondage (décision 1) ; la carte « Tu es convoqué ! » affiche « U15 B ». Joueur de catégorie par équipe : inchangé, sauf le nom de l'équipe sur la convocation.
- Modèle : sonnet · Effort : medium
- Lancement : `/clear`, `/model sonnet`, `/effort medium`, `/bloc 6 PLAN-categories.md`
- Dépend de : bloc 3
- Étapes : SQL `disponibilites_categorie` + RLS + vérification ; composant joueur ; branchement minimal dans `DashboardJoueur.jsx`.
- Ce que je teste pour valider : compte joueur de test, répondre, voir la réponse dans la grille.

### Bloc 7 : renfort (effectifs par équipe)
- Statut : fait côté code. SQL `supabase_categories_renfort.sql` appliqué en production le 2026-11-15, vérification 100 % ok (25 contrôles, simulation sans reste ; la vérification a été corrigée deux fois : l'éducateur A devait avoir un profil éducateur, l'éducateur B ne devait pas être du staff du club, dont une règle existante lit les stats de tous les coachs). Reste : contrôle à l'écran avec les éducateurs de test A et B et le joueur de test.
- Journal : 2026-11-14, Sonnet 5.5. SQL : 2 fonctions (`categories_renforts_possibles` : joueurs des autres équipes de la catégorie, colonnes limitées ; `categories_renforts_match` : renforts d'un match, convoqués ou avec stats) et 1 règle de lecture ajoutée sur `stats_match` (l'éducateur d'une fiche lit les stats de ses fiches, même saisies par un autre). Aucune colonne, aucune règle existante modifiée, aucune règle d'écriture ajoutée. Testé sur Postgres 17 local (tables imitées) : 23 contrôles ok, relance sans erreur ; le fichier de vérification de production simule A, B, C, le club et un commun puis annule tout (il vérifie aussi que A peut convoquer et saisir des stats pour un joueur d'une autre équipe avec les règles actuelles : lignes 21 et 24 doivent afficher « accepté »). Front : `RenfortConvocation.jsx` (bloc « Renforts » sous la liste cochée de la modale de convocation : recherche, « + Ajouter un renfort », « Retirer », mention « renfort U15 B », joueur sans compte grisé), calculs dans `src/lib/categoriesRenfort.js` (6 tests). Branchements dans `DashboardEducateur.jsx` : état des renforts de la convocation (relus à l'ouverture, sinon republier les retirerait), ajout de leurs comptes à la publication et à la liste copiée, renforts ajoutés à la suite de l'équipe dans la feuille de match (deux endroits : liste du match et saisie du score) et dans la notation du match, avec la mention « renfort U15 B ». 496 tests (495 ok, 1 ignoré déjà présent), build ok, aucune remarque ESLint nouvelle. Rendu du bloc Renforts vérifié en rendu serveur (liste + vide) ; pas d'essai avec un vrai compte.
- Écarts : (1) le renfort ne concerne que les catégories « par équipe » : en commun tout le monde est déjà dans la liste, la fonction ne renvoie rien ; (2) un joueur sans compte ne peut pas être convoqué (pas d'écran où voir la convocation) mais, s'il a des stats sur le match, il apparaît quand même dans la feuille ; (3) les présences d'entraînement ne sont pas concernées (le renfort est une notion de match) ; (4) les stats d'un renfort sont écrites avec `educateur_id` = éducateur du match, comme toutes les stats : elles comptent donc pour l'équipe qui a joué, et l'éducateur d'origine les lit grâce à la nouvelle règle ; (5) le rapport de match (`RapportMatch`) n'est pas étendu aux renforts.
- Reste à finir : sans le SQL du bloc 6 appliqué, un joueur renfort (suivi par l'éducateur B) ne voit pas le détail du match de A sur sa carte « Tu es convoqué » (la lecture se fait par la fonction du bloc 6) : appliquer le SQL du bloc 6 avant de tester le renfort côté joueur ; le total des stats de la fiche du renfort chez l'éducateur B (« fiche joueur par équipe ») est le bloc 9 ; la règle d'écriture des stats et de `convocation_joueurs` reste celle de la production (la fermeture de `convocation_joueurs` du chantier sécurité autorise l'éducateur de la convocation, donc le renfort continue de marcher).
- Objectif : convoquer ponctuellement un joueur d'une autre équipe de la catégorie.
- Résultat testable : dans la convocation d'un match U15 A, « Ajouter un renfort » liste les joueurs de U15 B et C (prénom, nom, poste, numéro, équipe seulement) ; le joueur convoqué apparaît avec « renfort U15 B » dans la convocation, les présences et la feuille de match ; ses stats du match comptent pour U15 A ; il reste dans l'effectif de U15 B.
- Modèle : sonnet · Effort : high
- Lancement : `/clear`, `/model sonnet`, `/effort high`, `/bloc 7 PLAN-categories.md`
- Dépend de : bloc 3
- Étapes : SQL fonction `joueurs_renfort(categorie_id)` (sécurisée, colonnes limitées) + règle de lecture des stats/présences du renfort ; front dans la modale de convocation et la saisie du match.
- Ce que je teste pour valider : éducateur A convoque un joueur de B, saisit le match, éducateur B voit toujours son joueur.

### Bloc 8 : changement de mode
- Statut : fait. SQL appliqué en production le 2026-11-14 (2 fonctions présentes, 0 catégorie en commun), vérification 100 % ok (32 lignes, aller-retour sans écart, rien ne reste). Reste : contrôle à l'écran avec le compte club de test.
- Journal : 2026-11-14, Opus 5.5. SQL : 2 fonctions réservées au compte principal du club, aucune règle d'accès ajoutée ni modifiée, aucune colonne. `categories_mode_donnees` (fiches de la catégorie avec convocations par compte et présences par fiche, par équipe, depuis le début de saison) ; `categorie_changer_mode` (tout ou rien, catégorie et fiches verrouillées pendant le changement). Par équipe → commun : seul le mode change. Commun → par équipe : refusé si un joueur (compte ou fiche sans compte) n'a pas d'équipe, si une équipe n'est pas de la catégorie, si un joueur apparaît deux fois ; seules les fiches qui changent d'équipe bougent et passent chez l'éducateur de leur nouvelle équipe ; l'affiliation du joueur suit (celle attachée à la fiche, ou sans fiche chez l'ancien éducateur), sauf 3 cas renvoyés à l'écran : équipe sans éducateur, lien déjà existant (même archivé) avec le nouvel éducateur, ancien éducateur qui suit aussi le joueur dans une autre équipe. Testé sur Postgres 17 local (tables imitées, dont affiliations et présences) : vérification 32 lignes ok (droits, refus, aller-retour commun / par équipe / commun avec stats, présences et totaux par équipe identiques, vrais joueurs inchangés, rien ne reste) ; les 3 cas d'affiliation et les messages d'erreur vérifiés à part ; relance sans erreur ; retour arrière puis réapplication ok. Front : `ChangerModeCategorie.jsx` (fil d'Ariane, répartition avec équipe proposée et sa raison, liste déroulante par joueur, bouton bloqué avec le nombre de joueurs sans équipe, écran « Ce qui va changer », résultat avec « À regarder »), calculs dans `src/lib/categoriesMode.js` (11 tests). Branchement : lien « Changer de mode » sur chaque catégorie ayant des équipes dans la liste des catégories (compte principal du club seulement), vue `mode` dans `DashboardClub.jsx`. 507 tests (506 ok, 1 ignoré déjà présent), build ok, ESLint : aucune remarque nouvelle. Essai visuel sur un harnais avec fausse base (ordinateur et cadre de 390 px, aucun débordement) : répartition, confirmation, résultat, passage en commun ; la répartition envoyée est la bonne. Pas d'essai avec un vrai compte connecté. Sauvegarde des fichiers touchés : `~/Sauvegardes-DigitalFootball/fichiers-bloc8-categories-*`.
- Écarts : (1) pas de colonne `fiche_principale_id` ni d'écran « Est-ce le même joueur ? » (proposés au bloc 0) : la décision 6 du brief (doublons signalés, pas de fusion) est tenue par le signalement du bloc 3, et l'écran de passage en commun nomme les doublons possibles ; (2) une équipe sans éducateur ne peut recevoir que les joueurs qui y sont déjà (sinon le joueur n'apparaîtrait chez aucun éducateur) : message à l'écran, nommer l'éducateur d'abord ; (3) proposition = convocations de la saison en cours, puis présences, puis équipe de la fiche ; une proposition vers une équipe sans éducateur est laissée vide avec l'explication ; (4) un compte qui a deux fiches dans la catégorie (rare, aucun aujourd'hui) : une seule fiche reçoit l'équipe choisie, l'autre reste dans son équipe (dit à l'écran) ; (5) le classement des joueurs du club regroupe par équipe de la fiche : un joueur déplacé y apparaît dans sa nouvelle équipe avec toute sa saison (son total ne change pas, les totaux par match restent à l'équipe du match) ; (6) les réponses au sondage par date (`disponibilites_categorie`) sont gardées mais plus affichées en par équipe ; (7) renommer une catégorie : toujours pas fait.
- Reste à finir : contrôle à l'écran : passer la catégorie de test en commun puis en par équipe et comparer la fiche d'un joueur avant et après ; question ouverte du bloc 0 (« Frederic Gauvrit » est-il un compte de test ?), sans effet sur ce bloc.
- Objectif : passer une catégorie d'un mode à l'autre sans rien perdre.
- Résultat testable : réglages de la catégorie (compte club) ; commun → par équipe : chaque joueur reçoit une équipe proposée (convocations les plus fréquentes), corrigeable, bouton bloqué tant qu'un joueur n'a pas d'équipe ; par équipe → commun : fusion des listes ; écran de confirmation qui résume l'effet ; après le changement, stats par équipe et totaux identiques.
- Modèle : opus · Effort : high
- Lancement : `/clear`, `/model opus`, `/effort high`, `/bloc 8 PLAN-categories.md`
- Dépend de : blocs 3 et 4
- Étapes : SQL fonction `categorie_changer_mode` (tout ou rien) + vérification par simulation (chiffres avant = chiffres après) ; calcul de la répartition proposée en fonction pure testée ; écran de répartition et de confirmation.
- Ce que je teste pour valider : passer U15 en par équipe puis revenir en commun, comparer la fiche d'un joueur avant et après.

### Bloc 9 : fiche joueur par équipe
- Statut : fait côté code (aucun SQL). Reste : contrôle à l'écran avec un joueur de test ayant joué en A et en B.
- Journal : 2026-11-15, Sonnet 5.5. Code déjà présent au lancement (écrit lors d'une session précédente, plan non mis à jour), relu et vérifié : `src/lib/categoriesFiche.js` (calculs purs, doublons comptés une fois, équipe de l'événement), `FicheJoueurCategorie.jsx` (pastille, tableaux Entraînements et Matchs avec « Total U15 », dernières activités avec l'équipe), branché dans la fiche joueur de `DashboardEducateur.jsx` et `DashboardClub.jsx`. 512 tests (511 ok, 1 ignoré déjà présent), build ok. Pas d'essai avec un vrai compte. Rien n'est affiché si la fiche n'a pas de catégorie ou aucune donnée de saison.
- Objectif : voir la saison d'un joueur équipe par équipe, avec un total juste.
- Résultat testable : fiche « U15 / Joueurs / Lucas Moreau », pastille équipe principale ou catégorie ; tableau Entraînements (présences par équipe + « Total U15 » mis en valeur) ; tableau Matchs (matchs, minutes, buts par équipe + total) ; « Dernières activités » avec l'équipe.
- Modèle : sonnet · Effort : medium
- Lancement : `/clear`, `/model sonnet`, `/effort medium`, `/bloc 9 PLAN-categories.md`
- Dépend de : bloc 3
- Étapes : calcul en fonction pure (regroupement par équipe de l'événement, une ligne de présence ou de stats comptée une seule fois) testé ; composant `FicheJoueurCategorie.jsx` ; accès depuis la liste des joueurs (éducateur et club).
- Ce que je teste pour valider : un joueur de test ayant joué en A et en B, totaux = somme des colonnes.

### Bloc 10 : vérification complète
- Statut : fait côté vérifications automatiques (2026-11-15). Les parcours avec de vrais comptes (éducateurs A et B, directeur, joueur, deuxième club, tablette, téléphone) restent à faire par Kevin : liste ci-dessous.
- Journal : 2026-11-15, Sonnet 5.5. Prouvé : 512 tests (511 ok, 1 ignoré déjà présent), build ok, base de production lue en SELECT : 21 fonctions `categorie*` présentes, tables `categories` et `disponibilites_categorie` avec règles d'accès activées, 39 catégories, 0 en mode commun, 0 équipe sans catégorie (club existant inchangé). ESLint : 1 remarque dans `ListeCategories` (setState dans un effet, ligne `useEffect(() => { charger() }...`), même motif déjà toléré ailleurs dans le projet, sans effet visible. Non prouvé : aucun compte connecté depuis ma session, donc ni droits à l'écran, ni console du navigateur, ni tablette et téléphone.
- À tester par Kevin (compte, parcours, résultat attendu) :
  1. Club : créer une catégorie en commun et une en par équipe ; passer l'une puis l'autre d'un mode à l'autre ; la fiche d'un joueur est identique avant et après.
  2. Éducateur A et B (catégorie en commun) : chacun voit tous les joueurs, convoque dans son équipe ; un joueur déjà convoqué le même jour par l'autre est signalé en conflit.
  3. Éducateur B (catégorie en par équipe) : ne voit pas l'équipe de A, sauf le renfort pour convoquer.
  4. Joueur de test : répond au sondage à l'événement, voit sa convocation avec l'équipe.
  5. Match saisi : la fiche joueur montre les lignes par équipe et un total égal à leur somme.
  6. Directeur (staff) : voit toute la catégorie. Deuxième club : ne voit jamais les données du premier.
  7. Tableau de convocation sur téléphone (390 px) et tablette, console du navigateur sans erreur rouge.
- Reste à finir : tout ce qui précède ; renommer une catégorie (jamais fait) ; failles RLS existantes traitées dans PLAN-securite-novembre.md ; aucun commit fait (accord de Kevin requis).
- Objectif : tout le parcours du brief (section 9), sur ordinateur, tablette et téléphone.
- Résultat testable : liste cochée des vérifications du brief, avec ce qui a été prouvé et comment ; build sans erreur ; console sans erreur ; liste des fichiers modifiés et des SQL préparés ou appliqués.
- Modèle : sonnet · Effort : medium
- Lancement : `/clear`, `/model sonnet`, `/effort medium`, `/bloc 10 PLAN-categories.md`
- Dépend de : blocs 1 à 9, comptes de test
- Ce que je teste pour valider : les parcours avec éducateur A, éducateur B, directeur, joueur, et un deuxième club.

## Inventaire (bloc 0, 2026-11-14)
Source : résultat de `supabase_categories_diagnostic.sql`, collé par Kevin (production, lecture seule).

### Reprise : aucun cas ambigu sur les noms
- 57 équipes, 6 clubs → **38 catégories**, dont 14 à plusieurs équipes. 43 équipes sur 57 n'ont pas d'éducateur.
- Noms tous standard (U7 à U20, Seniors, U9F, U13F, U15F, U18F). Lettres A à E. Aucune équipe sans lettre, aucun doublon (la base l'interdit déjà : unique `club_id, nom, equipe`), aucun nom écrit de deux façons.
- Aucune table `categories` n'existe : le nom est libre.
- Aucun joueur avec compte inscrit dans deux équipes d'une même catégorie.

Décisions proposées :
1. **Règle appliquée telle quelle** (club + nom nettoyé). U15 et U15F restent deux catégories.
2. **Fiches sans compte en double possible** (même prénom et nom dans deux équipes de la catégorie) : AS CANNES U12 (6 personnes), club « Frederic Gauvrit » U11 (22 personnes). Rien à faire à la reprise (mode par équipe = comme aujourd'hui). Traitées seulement si le club passe la catégorie en commun : écran « Est-ce le même joueur ? », et si oui, la fiche en double pointe vers la fiche principale (nouvelle colonne `equipe_joueurs.fiche_principale_id`, bloc 8), sans fusion ni suppression. Question à Kevin : le club « Frederic Gauvrit » est-il un compte de test ?
3. **Matchs et entraînements sans équipe** chez un éducateur affilié : AS CANNES (1 match, 1 entraînement), « test test » (1 match, 9 entraînements). Laissés tels quels : ils ne comptent dans aucune équipe (déjà le cas aujourd'hui dans les stats par équipe).
4. **Catégorie écrite sur la fiche joueur** (`equipe_joueurs.categorie`, texte ancien) différente de l'équipe : 20 fiches (19 vides, 1 « U20 » dans une équipe U18). Ignorée : l'équipe fait foi.

### Structure réelle : ce qui change dans le modèle
- `equipe_joueurs.educateur_id` est **facultatif** : une fiche peut exister sans éducateur, donc l'effectif commun est possible sans ruse.
- **La fiche joueur (`equipe_joueurs.id`) est l'identité centrale** : `stats_match.joueur_id`, `notations_match`, `notes_joueurs`, `presences_entrainement`, `evaluations_joueur`, `blessures`, `tournois_convocations`, `affiliations.equipe_joueur_id`, `invitations` pointent dessus. Convocations et disponibilités pointent vers le compte. Confirme le choix « pas de fusion physique » (décision 6 du brief).
- **L'affiliation relie un joueur à un éducateur, pas à une équipe** (`affiliations` : unique `educateur_id, joueur_id`). Un joueur lit les matchs, entraînements, effectif et stats **de l'éducateur qu'il suit**. Conséquences :
  - en commun et pour un renfort, le joueur convoqué par un autre éducateur de la catégorie ne peut pas lire le match de cet éducateur : règles de lecture « par catégorie » à ajouter (blocs 3, 6, 7) ;
  - passer de commun à par équipe change le coach suivi par certains joueurs : la fonction du bloc 8 devra aussi mettre à jour leur affiliation (point délicat, à concevoir au bloc 8).
- `stats_match` et `presences_entrainement` ont un `educateur_id` (celui qui saisit) : un renfort saisi par l'éducateur A reste lisible par A ; l'éducateur B de l'équipe d'origine aura besoin d'une règle de lecture « stats de mes fiches » pour la fiche joueur (bloc 7).
- `convocations` : une seule par match (unique `match_id`), `educateur_id` facultatif ; colonnes en plus du fichier du dépôt (`club_id`, `equipe_id`, `titulaires`, `remplacants`, `formation`, `joueurs_convoques`…) utilisées par la composition et la causerie (`CompositionTerrain.jsx`, `CauserieAvantMatch.jsx`, `ALaUne.jsx`) : à relire avant le bloc 4.
- `matchs_equipe.educateur_id` est obligatoire : une équipe sans éducateur n'a pas de match, donc pas de colonne dans la grille de convocation.
- Déclencheur existant `saison_garde_attribution_equipe` sur `club_categories` (insertion et modification) : le déclencheur `categorie_id` du bloc 1 devra cohabiter avec lui ; la reprise lancée depuis le SQL Editor (aucun utilisateur connecté) est autorisée par sa règle.
- Droits staff par catégorie : `role_categories_access.categories` (liste de noms) et `club_educateurs.categories_access`. « Directeur » = rôle avec `acces_complet` ou dont la liste contient le nom de la catégorie.
- Côté club, les règles actuelles laissent **tout membre du staff** créer, modifier et supprimer des équipes. La décision 2 (compte principal seulement) s'applique à la nouvelle table `categories` et au changement de mode, pas aux équipes.

### Failles de sécurité déjà présentes en production (hors chantier, signalées)
Constatées dans les règles d'accès réelles. Elles existent aujourd'hui, indépendamment de ce chantier :
1. **`entrainements`** : lire, créer, modifier et **supprimer** sont ouverts à toute personne connectée (`auth.uid() IS NOT NULL`), tous clubs confondus. Une suppression est journalisée (`entrainements_supprimes`) mais reste possible.
2. **`convocation_joueurs`** : la liste des convoqués de tous les clubs est lisible par tous (`USING true`) ; tout compte éducateur, de n'importe quel club, peut ajouter ou retirer des joueurs de n'importe quelle convocation.
3. **`role_categories_access`** : toute personne connectée peut lire et modifier les droits par catégorie de n'importe quel club (`rca_all`). Le fichier du dépôt prévoyait l'inverse et disait de ne jamais appliquer cette règle.
4. **`staff_club`** : toute personne connectée lit le staff de tous les clubs, emails et téléphones compris (`staff_read_all`).

Les corriger demande de vérifier d'abord tout ce qui lit ces tables (joueurs, parents, dirigeants, planning, page publique), sinon on casse des écrans. Proposition : un court chantier sécurité à part, avant le bloc 3 (qui ajoute des règles sur ces mêmes tables). Les nouveautés de ce chantier ne s'appuieront jamais sur ces ouvertures.
