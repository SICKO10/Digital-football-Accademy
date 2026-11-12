# PLAN : Mon club, un seul endroit pour personnaliser et composer les dashboards
Date : 2026-11-11 · Brief : BRIEF-mon-club.md

Une page « Mon club » en quatre étapes (Identité, Outils du club, Dashboard de mes éducateurs, Accès du bureau) qui remplace trois écrans dispersés.
Chaque réglage agit tout de suite, s'annule en un clic, ne supprime aucune donnée, et ne change rien pour les clubs de l'ancien modèle tant qu'ils ne touchent à rien.

## Ce que le code a déjà confirmé (lu au /plan)
- [HYPOTHÈSE] du brief confirmée : `menuMasque()` dans `src/lib/outilsAcces.js` ne masque jamais un outil que l'éducateur paie lui-même. On garde cette règle pour les masquages décidés par le club.
- Ancien modèle : `menuVisible()` renvoie toujours « visible » quand `modeleOutils` est faux. Il faudra une nouvelle branche « masquage d'affichage seulement » pour ces clubs (bloc 5).
- Existant du chantier outils à la carte (bloc 10) : table `outils_club_ouverts` (outils que le club ouvre à ses éducateurs) et `outils_affichage_educateur` (outils que l'éducateur retire lui-même de son menu). On les garde : le réglage du club s'ajoute, il ne les remplace pas. Un éducateur peut toujours masquer en plus ce que le club affiche.
- La matrice « droits par rôle » (directeur sportif, trésorier, secrétaire…) est la table `role_permissions`, aujourd'hui dans Staff, « Gérer les permissions » (`DashboardClub.jsx` vers la ligne 921). C'est elle qui devient « Accès du bureau ». L'encart « Droits des éducateurs » de Projet sportif (éditer le projet et la planification) est autre chose : il reste où il est.
- Le bloc 10 de PLAN-outils-a-la-carte.md n'est pas encore poussé. Ce chantier part de lui : il doit être validé et poussé avant le bloc 4.

## Ce que je dois fournir
| Élément | Pourquoi | Où le trouver | Nécessaire avant |
|---|---|---|---|
| Un compte club de test **ancien modèle** avec 2 éducateurs affiliés | tester qu'il ne change rien par défaut, puis le masquage d'affichage | inscription sur le site, adresses `+test` de ta boîte | bloc 5 |
| Un compte club de test **nouveau modèle** avec 2 éducateurs affiliés | tester les outils, les deux modes, les notifications | idem, puis marquage `modele_outils` (SQL fourni au bloc 0) | bloc 4 |
| Ton « ok » sur le bloc 10 d'outils à la carte (test réel + push) | Mon club s'appuie dessus | PLAN-outils-a-la-carte.md, bloc 10 | bloc 4 |
| Validation des noms et du contenu des modèles de départ | proposés par Claude au début du bloc 9 | réponse dans la session du bloc 9 | bloc 9 |

## Manipulations à faire moi-même
1. Avant le bloc 0 : terminer le test réel du bloc 10 d'outils à la carte et donner ton « ok » pour le pousser (ou le faire dans la session du bloc 0).
2. Avant le bloc 3 : lancer `~/Sauvegardes-DigitalFootball/sauvegarder.sh`, puis exécuter dans Supabase le SQL que le bloc 3 te donne.
3. Avant le bloc 4 : créer les deux clubs de test et leurs éducateurs (le bloc 0 te donne la marche exacte et le SQL de marquage).
4. Avant le bloc 10 (optionnel) : nouvelle sauvegarde, puis SQL du journal des changements.
5. À chaque fin de bloc : tester le parcours indiqué et répondre « ok » ou ce qui ne va pas.

## Répartition suggérée
Je ne vois pas ta barre de statut d'ici : ajuste selon ton compteur. Base prudente pour un abonnement Pro :
- Jour 1 : blocs 0 et 1 (faible + moyen).
- Jour 2 : blocs 2 et 3 (moyen + moyen, le 3 en Opus : session courte).
- Jour 3 : bloc 4 (élevé).
- Jour 4 : bloc 5 (élevé, Opus).
- Jour 5 : bloc 6 (élevé).
- Jour 6 : blocs 7 et 8 (moyen + moyen).
- Jour 7 : bloc 9 (moyen), puis bloc 11 ; le bloc 10 (journal) peut venir plus tard.
Rappel : `/clear` et une session neuve par bloc ; pas de nouveau bloc si la barre « 5h » dépasse 80 %.

## Blocs

### Bloc 0 : mise en place
- Statut : fait (en attente de ta validation)
- Objectif : partir d'une base propre et sauvegardée, avec la marche des comptes de test prête.
- Résultat testable : un commit de sauvegarde existe, le bloc 10 d'outils à la carte est poussé (si ton « ok » est donné), un petit fichier `GUIDE-COMPTES-TEST-MON-CLUB.md` explique comment créer et marquer les deux clubs de test.
- Modèle : haiku · Effort : low · Coût estimé : faible
- Pourquoi ce modèle : rangement, commit et rédaction d'une marche à suivre, sans logique.
- Lancement : `/clear`, puis `/model haiku`, puis `/effort low`, puis `/bloc 0 PLAN-mon-club.md`
- Dépend de : rien
- Prérequis : aucun
- Étapes :
  - Vérifier `git status` ; commiter le travail en cours séparément (brief, `DashboardJoueur.jsx`) après accord de Kevin.
  - Pousser le bloc 10 d'outils à la carte si Kevin a donné son « ok ».
  - Écrire `GUIDE-COMPTES-TEST-MON-CLUB.md` : création des 2 clubs, des 4 éducateurs, affiliation, SQL de marquage `modele_outils` du club nouveau modèle (en lecture d'abord, pas de suppression).
  - Créer le dossier `src/components/monclub/` vide.
- Ce que je teste pour valider : le guide est clair et je peux créer les comptes seul.
- Reste à finir : (1) ton « ok » pour commiter le travail en cours (BRIEF-mon-club.md, DashboardJoueur.jsx) et pour pousser le bloc 10 d'outils à la carte : rien n'a été commité ni poussé ; (2) le dossier `src/components/monclub/` n'a pas été créé : Git ne garde pas un dossier vide, il sera créé au bloc 1 ; (3) à confirmer : procédure d'affiliation, adresse du 2e éducateur de chaque club, et l'adaptation du SQL `supabase_outils_a_la_carte_comptes_test.sql` (trois adresses seulement).
- Journal : 2026-11-11, Haiku 5.5. Créé `GUIDE-COMPTES-TEST-MON-CLUB.md` (clubs A et B, éducateurs A1, A2, B1, B2). Aucune modification de base, aucun commit, aucune mise en ligne.

### Bloc 1 : page Mon club et étape Identité
- Statut : fait (en attente de ta validation)
- Objectif : la page existe dans le menu du club, avec ses 4 étapes, et l'étape Identité fonctionne.
- Résultat testable : entrée « Mon club » dans le menu du club ; l'étape Identité règle couleurs, logo, photo, slogan avec aperçu en direct ; le bouton « Personnaliser » de l'accueil devient un lien vers cette étape ; les 3 autres étapes affichent leur titre et une phrase « bientôt ici » visible seulement en local (aucun onglet vide en production : elles restent masquées tant qu'elles ne sont pas faites).
- Modèle : sonnet · Effort : medium · Coût estimé : moyen
- Pourquoi ce modèle : déplacement d'un écran existant dans un nouveau fichier, sans logique nouvelle.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 1 PLAN-mon-club.md`
- Dépend de : bloc 0
- Prérequis : aucun
- Étapes :
  - Créer `src/pages/MonClub.jsx` (ou `src/components/monclub/MonClub.jsx`) avec navigation par étapes, lisible sur mobile.
  - Sortir le panneau Personnaliser de `DashboardClub.jsx` (autour de la ligne 3699) dans `monclub/EtapeIdentite.jsx`, en réutilisant `ApercuCouleurClub.jsx`.
  - Ajouter l'entrée de menu « Mon club » ; remplacer le bouton de l'accueil par un lien.
  - Accès provisoire : président seul (le droit « Mon club » arrive au bloc 2).
  - Build, lint, tests ; contrôle visuel clair et sombre, 375 px.
- Ce que je teste pour valider : sur mon compte club, changer la couleur secondaire depuis Mon club, voir l'aperçu, vérifier que l'accueil la reprend.
- Reste à finir : (1) test visuel connecté (clair, sombre, 375 px) à faire par Kevin : je n'ai pas de session club ouverte ici ; (2) rien commité ni poussé ; (3) l'étape Identité garde les emojis de l'ancien panneau (📷, 🖼️, ⏳), à retirer plus tard si tu le souhaites.
- Journal : 2026-11-11, Sonnet 5.5. Panneau Personnaliser sorti de `DashboardClub.jsx` vers `src/components/monclub/EtapeIdentite.jsx` (mêmes réglages, titre et bouton fermer retirés) ; nouvelle page `monclub/MonClub.jsx` avec 4 étapes (2 à 4 visibles seulement en local, via `import.meta.env.DEV`) ; entrée de menu « Mon club » (président seul) dans Administratif ; le bouton « Personnaliser » en haut mène à cette page. Build OK, 348 tests OK, lint sans nouvelle erreur (17 déjà là avant).

### Bloc 2 : étape Accès du bureau
- Statut : fait (en attente de ta validation)
- Objectif : déplacer la matrice des droits par rôle dans Mon club, renommée « Accès du bureau », avec une nouvelle ligne « Mon club ».
- Résultat testable : l'étape 4 montre la matrice actuelle (même comportement) ; une ligne « Mon club » existe, cochée pour le président seul par défaut ; un rôle à qui on la donne voit Mon club mais pas l'étape 4 ; l'ancien bouton « Gérer les permissions » mène à cette étape.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : déplacement d'écran, mais une erreur ouvrirait des droits : effort élevé.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 2 PLAN-mon-club.md`
- Dépend de : bloc 1
- Prérequis : aucun
- Étapes :
  - Sortir la matrice (`DashboardClub.jsx` vers 921, lecture 2624, écriture 2663) dans `monclub/EtapeAccesBureau.jsx`.
  - Ajouter la section `mon_club` aux sections pilotables ; vérifier si `role_permissions` accepte une nouvelle valeur de section sans SQL (si une contrainte la refuse : SQL préparé, sauvegarde d'abord, Kevin l'exécute).
  - Étape 4 réservée au président ; étapes 1 à 3 ouvertes aux rôles ayant « Mon club ».
  - Ancien écran Staff : lien vers l'étape 4 au lieu de la matrice.
- Ce que je teste pour valider : donner « Mon club » au rôle trésorier d'un membre du staff de test, me connecter avec lui, voir les étapes 1 à 3 mais pas la 4.
- Reste à finir : (1) fait : `supabase_mon_club_section.sql` exécuté en production le 2026-11-12 (contrôle conforme : `stages` et `mon_club` dans la règle) ; (2) test connecté par Kevin : donner « Mon club » à un rôle d'un membre du staff de test et se connecter avec lui (je n'ai pas de session club ici) ; (3) rien commité ni poussé ; (4) les tutoriels club qui parlent de « Permissions par rôle » seront mis à jour au bloc 11 ; (5) la matrice garde ses autres colonnes telles quelles (Voir et Modifier) ; seule « Mon club » a un bouton unique « Accès ».
- Journal : 2026-11-11, Sonnet 5.5. Matrice sortie de `DashboardClub.jsx` vers `monclub/EtapeAccesBureau.jsx`, affichée en page (plus en fenêtre), sans emoji, avec « Annuler mes changements » et message d'état. Constantes partagées dans `src/lib/rolesClub.js` (rôles, sections), section `mon_club` ajoutée (première colonne) et `mon_club: []` dans `PERMISSION_DEFAULTS` (président seul par défaut). Entrée de menu et bouton Personnaliser : visibles si `canEditSection('mon_club')` ; étape Accès du bureau : président seul. Bouton Staff renommé « Accès du bureau » et mène à l'étape. `sauvegarderPermissions` rend vrai ou faux. Écart : la contrainte `role_permissions_section_check` refuse `mon_club` : SQL préparé (reprend aussi `stages`, déjà dans l'écran) + fichier d'annulation séparé. Tests : 6 nouveaux (354 OK, 1 ignoré), build OK, lint inchangé (17 sur DashboardClub), contrôle visuel de l'étape en clair et sombre, 1280 px et 375 px (sans débordement de page), rôle délégué sans l'étape 4.


### Bloc 3 : stockage des réglages (SQL)
- Statut : fait, SQL exécuté en production le 2026-11-11 (contrôle conforme : true, 0, 0, true, 6, false, true)
- Objectif : la base sait stocker l'affichage choisi par le club, le mode éducateurs et les réglages individuels mis de côté.
- Résultat testable : un fichier `supabase_mon_club.sql` exécuté sans erreur ; une requête de contrôle montre les nouvelles tables vides et les règles d'accès (seul le club et les rôles « Mon club » écrivent, l'éducateur lit les siennes).
- Modèle : opus · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : modification de la base en production et règles d'accès (RLS) : une erreur coûte cher.
- Lancement : `/clear`, puis `/model opus`, puis `/effort high`, puis `/bloc 3 PLAN-mon-club.md`
- Dépend de : bloc 2 (droit `mon_club` connu)
- Prérequis : sauvegarde `~/Sauvegardes-DigitalFootball/sauvegarder.sh` lancée par Kevin juste avant d'exécuter le SQL
- Étapes :
  - Concevoir : mode éducateurs sur le club (`commun` par défaut), table des masquages du club (cible : le club lui-même, le commun éducateurs, ou un éducateur précis), drapeau « actif » pour mettre de côté les réglages individuels sans les effacer.
  - Aucune ligne créée par défaut : sans ligne, tout est affiché (garantie pour l'ancien modèle).
  - RLS : écriture par le président ou un rôle ayant `mon_club` ; lecture par l'éducateur concerné.
  - Requête de contrôle en lecture seule ; script d'annulation dans un fichier séparé nommé `..._ANNULATION_NE_PAS_EXECUTER.sql`, jamais dans le message.
- Ce que je teste pour valider : exécuter le SQL, puis la requête de contrôle, et vérifier qu'aucun dashboard n'a changé.
- Reste à finir :
- Journal :

### Bloc 4 : étape Outils du club
- Statut : fait (en attente de ta validation)
- Objectif : le club voit tous ses outils rangés par thème, avec un interrupteur et une ligne d'explication.
- Résultat testable : cartes par thème (Entraînement, Match, Effectif, Communication, Gestion) ; nouveau modèle : états actif, essai, payant repris de Mes outils ; ancien modèle : tout allumé, l'interrupteur cache seulement l'entrée du menu club ; bandeau « Annuler » quelques secondes après chaque changement.
- Modèle : sonnet · Effort : high · Coût estimé : élevé
- Pourquoi ce modèle : écran riche avec deux comportements selon le modèle, sans risque de paiement (on réutilise les actions existantes).
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 4 PLAN-mon-club.md`
- Dépend de : blocs 3 et bloc 10 d'outils à la carte poussé
- Prérequis : clubs de test ancien et nouveau modèle créés
- Étapes :
  - Ajouter thème et ligne d'explication à chaque outil dans `src/lib/catalogueOutils.js` (texte sans tiret long, sans emoji).
  - `monclub/EtapeOutils.jsx` + composant commun `CarteOutil` et `BandeauAnnuler` (réutilisés au bloc 6).
  - Nouveau modèle : réutiliser les actions de `MesOutils.jsx` (aucun nouveau lien Stripe, aucun changement de prix).
  - Ancien modèle : écrire le masquage du club (cible club) ; brancher `menuVisible` côté club sur ce masquage.
  - Tests unitaires du masquage club ; build ; contrôle 375 px.
- Ce que je teste pour valider : club ancien modèle : masquer « Vidéos », vérifier que l'entrée disparaît du menu et que les vidéos sont toujours là après réactivation ; club nouveau modèle : l'écran montre les mêmes états que Mes outils.
- Reste à finir : (1) test connecté par Kevin sur les deux clubs de test (ancien et nouveau modèle) : je n'ai pas de session club ici, et l'écriture en base du masquage (table `mon_club_affichage`, règles d'accès réelles) n'a donc été vérifiée que par lecture du SQL et avec un faux serveur ; (2) nouveau modèle : seul le compte du club lui-même peut activer ou désactiver un outil (règle du serveur `choisir_club`, inchangée) ; un président connecté avec son propre compte ou un rôle ayant « Mon club » voit l'état sans interrupteur, avec une phrase qui l'explique ; (3) l'étape ne montre que les 6 outils du catalogue club : le thème « Effectif » n'a aucun outil pour l'instant, il n'est donc pas affiché ; (4) le masquage ne touche que le menu : la page reste joignable par un lien direct ; (5) l'état « essai » de Mes outils n'existe pas côté club (outils inclus dans le forfait, essais suspendus) ; (6) rien commité ni poussé.
- Journal : 2026-11-11, Sonnet 5.5. Catalogue : `theme` et `explication` sur les 6 outils du club, liste `THEMES_CLUB` (Entraînement, Match, Effectif, Communication, Gestion). `outilsAcces.js` : nouvelle branche `masquesClub` dans `menuVisible` (vaut pour l'ancien modèle aussi, ne touche ni le socle, ni Mon club, ni Mes outils, ni les éducateurs). `useOutils` lit `mon_club_affichage` (cible club, visible faux) pour tous les clubs et expose `masquesClub`. Nouveaux composants : `monclub/EtapeOutils.jsx`, `monclub/BandeauAnnuler.jsx` (8 secondes, réutilisable au bloc 6), `outils/Interrupteur.jsx` (extrait de `MesOutils.jsx`, même rendu). Ancien modèle : masquer = une ligne `visible = false` (supprimée au réaffichage, donc aucune ligne par défaut) ; nouveau modèle : action existante `choisir_club`, aucun lien Stripe ni prix touché. Si l'outil désactivé était ouvert aux éducateurs, le serveur le ferme (comportement existant) : le bandeau le dit et l'annulation ne le rouvre pas. Tests : 7 nouveaux (361, 1 ignoré), build OK, lint sans erreur sur les fichiers touchés. Contrôle visuel (faux serveur, Chromium) : ancien et nouveau modèle, clair et sombre, 375 px sans débordement, bandeau Annuler visible après un clic. Écart : le contrôle de 375 px s'est fait en bornant la largeur du conteneur (Chrome sans interface ne descend pas sous 500 px).


### Bloc 5 : règle d'affichage du menu éducateur
- Statut : fait (en attente de ta validation)
- Objectif : une seule règle, testée, qui décide de chaque entrée du menu d'un éducateur affilié.
- Résultat testable : une suite de tests couvre tous les cas (ancien et nouveau modèle, mode commun et individualisé, outil payé par l'éducateur, masquage par l'éducateur lui-même, nouvel éducateur) ; sans aucun réglage, aucun menu ne change (comparaison avant/après sur les comptes de test).
- Modèle : opus · Effort : high · Coût estimé : élevé
- Pourquoi ce modèle : logique délicate qui touche le menu de tous les éducateurs en production.
- Lancement : `/clear`, puis `/model opus`, puis `/effort high`, puis `/bloc 5 PLAN-mon-club.md`
- Dépend de : bloc 3
- Prérequis : comptes de test des deux modèles
- Étapes :
  - Charger dans `useOutils` le mode et les masquages du club (commun, et individuel s'il est actif).
  - Étendre `menuVisible` : ordre de priorité réglage individuel actif, sinon commun ; jamais de masquage d'un outil payé par l'éducateur ; ancien modèle : masquage d'affichage seulement, la page reste ouverte.
  - Garder `outils_affichage_educateur` en plus (l'éducateur peut cacher ce que le club affiche, pas l'inverse).
  - Tests unitaires de chaque cas ; vérification sur les comptes de test sans réglage.
- Ce que je teste pour valider : me connecter avec un éducateur de chaque club de test et constater que son menu est identique à avant.
- Reste à finir : (1) test connecté par Kevin avec un éducateur de chaque club de test : pas de compte de test ni de session éducateur ici, la lecture réelle en base (règles d'accès) n'est vérifiée que par lecture du SQL ; sans ligne en base, la règle ne change rien, prouvé par test ; (2) pour le bloc 6 : les lignes `educateurs` et `educateur` portent les ids des outils **éducateur** du catalogue ; ne pas proposer « Stats collectives » (aucune entrée de menu) ; masquer « Suivi des joueurs » retire Santé, Historique et Fiche d'évaluation mais garde Statistiques (la présence gratuite y vit) ; (3) quand le club a masqué quelque chose, l'entrée peut s'afficher une fraction de seconde au chargement avant de disparaître (même comportement que le masquage côté club) ; (4) un dirigeant délégué qui ouvre le dashboard d'un éducateur ne voit pas les réglages du club appliqués (rien n'est lu dans ce cas, comme avant) : à prévoir au bloc 8 pour « Voir comme un éducateur » ; (5) rien commité ni poussé.
- Journal : 2026-11-12, Opus 5.5. `outilsAcces.js` : `affichageDepuisLignes(mode, lignes, educateurId)` (commun, individuel ; en mode commun les lignes individuelles sont ignorées sans être effacées ; aucune ligne = null) et nouvelle branche `menuMasqueParSonClub` dans `menuVisible`, appliquée avant le test du modèle : vaut donc pour l'ancien modèle aussi. Priorité : individuel (mode individualisé) > commun > affiché. Jamais masqué : un outil payé par l'éducateur (abonnement, essai ou période en cours), le socle, et Statistiques. Le masquage de l'éducateur lui-même (`outils_affichage_educateur`) reste en plus. `useOutils` : nouveau paramètre `clubId`, lit `mon_club_reglages` et `mon_club_affichage` (filtrés sur le club d'affiliation acceptée) ; nouveau modèle : réglages appliqués seulement une fois les droits lus, pour ne jamais cacher un outil payé. `DashboardEducateur.jsx` : déclaration de `clubAffiliation` remontée au-dessus de `useOutils` pour lui passer le club. Décision : ancien modèle, l'éducateur n'a pas de droit par outil, il suit donc le club sans exception (conforme au brief). Pas de drapeau « actif » : c'est le mode du club qui met de côté les réglages individuels (choix du bloc 3). Tests : 10 nouveaux (371, 370 passés, 1 ignoré), dont la comparaison menu avant/après sans réglage sur 24 entrées, ancien et nouveau modèle ; build OK ; lint : aucune nouvelle erreur (23 déjà présentes dans `DashboardEducateur.jsx` avant le bloc).

### Bloc 6 : étape Dashboard de mes éducateurs
- Statut : fait (en attente de ta validation)
- Objectif : le club règle le menu de ses éducateurs, pour tous ou un par un.
- Résultat testable : choix du mode en haut (« Le même pour tous » par défaut) ; même grille de cartes ; en « Individualisé », liste des éducateurs avec pastille pour ceux ajustés ; repasser en « même pour tous » met les réglages individuels de côté et les retrouve en revenant ; bandeau « Annuler ».
- Modèle : sonnet · Effort : high · Coût estimé : élevé
- Pourquoi ce modèle : écran et écritures, la règle d'affichage est déjà faite et testée au bloc 5.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 6 PLAN-mon-club.md`
- Dépend de : blocs 4 et 5
- Prérequis : club de test avec 2 éducateurs
- Étapes :
  - `monclub/EtapeEducateurs.jsx` avec `CarteOutil` et `BandeauAnnuler` du bloc 4.
  - Mode commun : écrit le masquage « commun ». Mode individualisé : copie le commun comme point de départ, ajuste par éducateur.
  - Bascule de mode sans effacement (drapeau du bloc 3) ; nouvel éducateur = réglage commun.
  - Outils payés par l'éducateur : carte grisée « payé par l'éducateur, toujours affiché ».
- Ce que je teste pour valider : masquer un outil pour tous, vérifier sur les 2 éducateurs ; passer en individualisé, réafficher pour l'un seulement ; revenir en commun puis en individualisé et retrouver l'ajustement.
- Reste à finir : (1) test connecté par Kevin sur le club de test avec 2 éducateurs : pas de session club ici, l'écriture réelle en base (règles d'accès) n'est vérifiée que par lecture du SQL et avec un faux serveur qui garde les écritures en mémoire ; (2) la carte « payé par l'éducateur, toujours affiché » n'est pas faite : le club ne peut pas lire ce que chaque éducateur paie, donc une phrase en haut de l'écran l'explique et la règle du bloc 5 garde l'outil affiché côté éducateur ; (3) pas de rangement par thème (les outils éducateur n'ont pas de thème dans le catalogue) : une grille simple de 9 outils ; (4) l'étape suit le même réglage commun pour un éducateur qui arrive plus tard, sans rien à faire ; (5) rien commité ni poussé.
- Journal : 2026-11-12, Sonnet 5.5. Nouveau `monclub/EtapeEducateurs.jsx` (réutilise `CarteOutil`, `Interrupteur`, `BandeauAnnuler`), branché dans `MonClub.jsx` (étape 3 visible en production) ; `DashboardClub.jsx` lui passe les éducateurs acceptés. Choix du mode « Le même pour tous » / « Individualisé » (écrit `mon_club_reglages`). Commun : une ligne « educateurs » seulement quand l'outil est masqué. Individualisé : onglets par éducateur avec pastille « Ajusté », l'état de départ est le réglage commun ; si on remet la valeur du commun, la ligne individuelle est supprimée (la pastille reste juste). Repasser en commun garde les lignes individuelles (phrase « N éducateurs ont un réglage gardé de côté ») et elles reviennent en repassant en individualisé. Bandeau Annuler après chaque changement, y compris le changement de mode. Outils proposés : les 9 outils éducateur qui ont une entrée de menu (pas Stats collectives, conformément à la note du bloc 5). Vérifié avec un faux serveur dans Chrome : masquer Séances pour tous, passer en individualisé, réafficher pour Léa seulement (Karim reste masqué), revenir en commun, repasser en individualisé et retrouver l'ajustement, annuler. Build OK, lint propre sur le dossier monclub.

### Bloc 7 : prévenir les éducateurs
- Statut : fait (en attente de ta validation)
- Objectif : chaque changement du club côté éducateurs leur arrive dans la cloche avec sa date d'effet.
- Résultat testable : un masquage ou un réaffichage crée une notification « Votre club a retiré X de votre menu le JJ/MM » ; pas de notification si le changement est annulé dans les secondes du bandeau ; plusieurs changements rapprochés regroupés en une seule notification.
- Modèle : sonnet · Effort : medium · Coût estimé : moyen
- Pourquoi ce modèle : on réutilise le circuit de notifications du bloc 10 d'outils à la carte (`api/outils.js`, table `notifications`).
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 7 PLAN-mon-club.md`
- Dépend de : bloc 6
- Prérequis : vérifier que la table `notifications` accepte le nouveau type (sinon SQL court, sauvegarde d'abord)
- Étapes :
  - Action serveur dans `api/outils.js` (ou fichier voisin) : écrire le réglage et la notification ensemble, droits vérifiés côté serveur.
  - Envoi différé de quelques secondes pour respecter « Annuler », regroupement des changements.
  - Aucun email : cloche seulement (règles d'envoi d'emails inchangées).
- Ce que je teste pour valider : masquer un outil pour un éducateur de test, voir sa notification ; masquer puis annuler, ne rien recevoir.
- Reste à finir : (1) test connecté par Kevin sur le club de test (masquer, voir la notification dans la cloche de l'éducateur ; masquer puis annuler, rien) : pas de session club ici, l'écran n'a pas été joué dans un navigateur, seule l'action serveur est prouvée par tests ; (2) la table `notifications` n'a aucune contrainte sur `type` dans les SQL du dépôt (le type `menu_club_modifie` est libre, comme `outil_club_retire`), mais la base réelle n'a pas été interrogée : si l'envoi échoue, le message d'erreur s'affiche sous le réglage ; (3) si le club ferme l'onglet ou le navigateur pendant les 9 secondes d'attente, les éducateurs ne sont pas prévenus (changer de page dans l'appli envoie tout de suite) ; (4) la cloche des éducateurs affiche le texte tel quel, pas de vérification visuelle côté éducateur ; (5) rien commité ni poussé.
- Journal : 2026-11-12, Sonnet 5.5. Nouvelle action `prevenir_menu` dans `api/outils.js` (placée avant le contrôle « nouveau modèle » : les clubs de l'ancien modèle sont prévenus aussi). Le club envoie, par éducateur, les outils retirés et réaffichés ; le serveur relit mode et réglages en base avec la même règle que l'appli de l'éducateur (`affichageDepuisLignes`), ne garde que ce que la base confirme, saute les outils que l'éducateur paie lui-même, ignore les éducateurs d'un autre club et les outils sans entrée de menu, et écrit une seule notification par éducateur (type `menu_club_modifie`, « Votre club a retiré X de votre menu le JJ/MM. » et/ou « Votre club a réaffiché X dans votre menu le JJ/MM. »). Cloche seulement, aucun email. Côté écran (`EtapeEducateurs.jsx`) : l'état avant le premier changement est gardé, puis 9 secondes après le dernier changement (un peu plus que le bandeau Annuler de 8 s) l'écran relit la base, compare avant/après pour chaque éducateur et envoie la différence : un changement annulé ou remis comme avant n'envoie rien, plusieurs changements rapprochés font un seul envoi. Le changement de mode (commun/individualisé) est compté aussi. Quitter la page envoie le lot en attente. Tests : 7 nouveaux dans `tests/outils-api.test.js` (378 au total, 377 passés, 1 ignoré) ; build OK ; lint propre sur `monclub` et `api/outils.js`. Décision : choix de la date en heure de Paris.

### Bloc 8 : « Voir comme un éducateur » [IDÉE 2]
- Statut : fait (en attente de ta validation)
- Objectif : le club voit le menu réel d'un éducateur, aux couleurs du club, avant de valider.
- Résultat testable : bouton dans l'étape 3 ; choix « un éducateur type » ou un éducateur précis ; aperçu du menu en lecture seule, avec les entrées qui changeraient signalées ; fonctionne sur mobile.
- Modèle : sonnet · Effort : medium · Coût estimé : moyen
- Pourquoi ce modèle : écran d'aperçu qui réutilise la règle du bloc 5, sans écriture.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 8 PLAN-mon-club.md`
- Dépend de : bloc 6
- Prérequis : aucun
- Étapes :
  - Composant d'aperçu du menu éducateur alimenté par `menuVisible` avec les réglages en cours.
  - Mise en évidence avant/après (texte et contour, pas seulement la couleur).
  - Aucune connexion « à la place de » l'éducateur : aperçu calculé, pas d'accès à ses données.
- Ce que je teste pour valider : comparer l'aperçu avec le vrai menu d'un éducateur de test.
- Reste à finir : (1) test connecté par Kevin sur le club de test (bouton « Voir comme un éducateur » dans l'étape 3, comparer avec le vrai menu d'un éducateur de test) : l'écran n'a pas été ouvert dans un navigateur ici, seule la règle est prouvée par tests ; (2) l'aperçu ne connaît ni les outils que l'éducateur paie lui-même (ils restent affichés chez lui), ni les entrées qui dépendent de son compte (Stages, Explorer, Mes outils, Recrutement) : une phrase le dit à l'écran ; (3) la liste des entrées est une copie du menu de `DashboardEducateur.jsx` (`src/lib/menuEducateur.js`) : à garder alignée si ce menu change ; (4) le bloc 5 notait qu'un dirigeant délégué ne voit pas les réglages du club : non traité ici, l'aperçu est un écran du club, pas une connexion à la place de l'éducateur ; (5) rien commité ni poussé.
- Journal : 2026-11-12, Sonnet 5.5. Nouveau `src/lib/menuEducateur.js` : `apercuMenuEducateur(mode, lignes, educateurId)` calcule le menu par la même règle `menuVisible` que l'appli de l'éducateur, avec et sans les réglages du club. Nouveau composant `monclub/ApercuMenuEducateur.jsx` : choix « Éducateur type » (réglage commun) ou un éducateur précis, menu en lecture seule aux couleurs du club, entrées retirées barrées avec la mention « Retiré » et contour en pointillés (pas seulement la couleur), compteur annoncé. Bouton dans `EtapeEducateurs.jsx`, l'aperçu suit en direct les réglages en cours (mode individualisé : la ligne de l'éducateur passe avant le commun). Aucune donnée de l'éducateur lue. Tests : 4 nouveaux dans `tests/menuEducateur.test.js` (382 au total, 381 passés, 1 ignoré) ; build OK ; lint propre.


### Bloc 9 : modèles de départ [IDÉE 1]
- Statut : fait (en attente de ta validation)
- Objectif : un clic pré-règle les étapes 2 et 3, puis on ajuste.
- Résultat testable : trois modèles proposés en haut de l'étape 2 (noms validés par Kevin) ; un clic montre ce qui va changer, « Appliquer » le fait, « Annuler » revient en arrière ; aucun modèle n'achète ni n'active un outil payant (il ne fait qu'afficher ou masquer).
- Modèle : sonnet · Effort : medium · Coût estimé : moyen
- Pourquoi ce modèle : contenu et écran simples posés sur les écritures existantes.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 9 PLAN-mon-club.md`
- Dépend de : blocs 6 et 8
- Prérequis : au début du bloc, Claude propose les 3 modèles (« Club compétition », « École de foot / formation », « Minimal ») et leur contenu ; Kevin valide avant le code
- Étapes :
  - Proposer le contenu des modèles à Kevin et attendre son accord.
  - Les écrire dans le catalogue (données, pas de SQL).
  - Écran de confirmation avec l'aperçu du bloc 8.
- Ce que je teste pour valider : appliquer « Minimal » sur le club de test, regarder le menu d'un éducateur, annuler.
- Reste à finir : (1) test connecté par Kevin sur le club de test (appliquer « Minimal », regarder le menu d'un éducateur, annuler) : l'écran n'a pas été joué dans un navigateur ici, seuls la règle (tests) et le build sont prouvés ; (2) nouveau modèle : un modèle qui retire un outil du club le désactive pour de bon (action `choisir_club`) et le ferme aux éducateurs, l'annulation le réactive mais ne le rouvre pas : l'écran de confirmation le dit ; (3) les modèles passent le menu éducateur en « même pour tous » (réglages individuels gardés de côté, restaurés par Annuler) ; (4) l'aperçu intégré montre le menu de l'éducateur type après modèle, sans comparer avec l'état actuel ; (5) rien commité ni poussé.
- Journal : 2026-11-12, Sonnet 5.5. Contenu des modèles validé par Kevin (Club compétition, École de foot / formation, Minimal) plus un quatrième « Tout afficher » (décision de Claude, accord de Kevin : remet tout à zéro sans dépendre du bandeau Annuler de 8 s). Nouveau `src/lib/modelesDepart.js` (données + `planModele`, calcul de ce qui change) et `monclub/ModelesDepart.jsx` en haut de l'étape 2 : un clic ouvre l'écran de confirmation (nombre d'outils retirés en gras, liste par groupe, avertissements, aperçu du bloc 8), « Appliquer » écrit, bandeau « Annuler » restaure outils du club, mode et lignes communes. Éducateurs prévenus par la cloche comme au bloc 7 (9 s, rien si annulé). Écritures communes sorties dans `monclub/ecritures.js`, `EtapeOutils` et `EtapeEducateurs` les réutilisent. Réservé à qui peut régler les outils (compte du club en nouveau modèle). Tests : 6 nouveaux (388 au total, 387 passés, 1 ignoré) ; build OK ; lint propre.



### Bloc 10 (optionnel) : journal des changements [IDÉE 3]
- Statut : à faire
- Objectif : savoir qui a changé quoi et revenir en arrière sans appeler Kevin.
- Résultat testable : liste courte « 12/11, outil Vidéo retiré pour tous les éducateurs, par Président » dans Mon club ; bouton « Rétablir » sur chaque ligne.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : petite table et écran, logique simple mais écriture en base.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 10 PLAN-mon-club.md`
- Dépend de : bloc 7
- Prérequis : sauvegarde Supabase avant le SQL du journal
- Étapes :
  - SQL : table du journal (club, auteur, action, cible, date), RLS lecture club et rôles « Mon club ».
  - Écriture du journal dans l'action serveur du bloc 7.
  - Écran et « Rétablir » (qui repasse par la même action, donc notifie aussi).
- Ce que je teste pour valider : faire 3 changements, les voir dans le journal, en rétablir un.
- Reste à finir : (1) **Kevin exécute dans Supabase** : sauvegarde d'abord, puis `supabase_mon_club_section.sql` (bloc 2) s'il ne l'est pas encore, puis `supabase_mon_club.sql`, puis `supabase_mon_club_verification.sql` (attendu : `true, 0, 0, true, 6, false, true`) ; (2) rien commité ni poussé ; (3) écart connu pour le bloc 5 : un membre du staff dont le rôle est vide est traité en « président » par l'écran (`role || 'president'` dans `DashboardClub.jsx`) mais la base lui refuse l'écriture Mon club (même règle stricte que le budget) : s'il en existe, l'enregistrement échouera pour lui seul.
- Journal : 2026-11-11, Opus 5.5. Créé `supabase_mon_club.sql`, `supabase_mon_club_verification.sql`, `supabase_mon_club_ANNULATION_NE_PAS_EXECUTER.sql`. Structure, à utiliser aux blocs 4 à 6 : `mon_club_reglages` (`club_id` clé, `mode_educateurs` `commun` ou `individualise` ; pas de ligne = `commun`) et `mon_club_affichage` (`club_id`, `cible` `club` / `educateurs` / `educateur`, `educateur_id` rempli seulement pour `educateur`, `outil` identifiant du catalogue, `visible` vrai ou faux ; pas de ligne = affiché ; upsert sur `club_id, cible, educateur_id, outil`). `maj_le` et `maj_par` remplis par la base. Écart : pas de drapeau « actif » ; c'est le mode qui met de côté les réglages individuels (en `commun`, l'appli ignore les lignes `educateur`, qui restent en base) : une seule source de vérité. Accès : écriture par le compte club, le staff `president` ou un rôle ayant « Mon club » (Voir et Modifier) ; cible `educateur` acceptée seulement pour un éducateur affilié accepté ; lecture par le club et tout son staff, et par l'éducateur affilié (mode, commun et ses propres lignes, jamais celles des autres). Garde-fous : Postgres 15 ou plus, fonctions d'outils à la carte présentes, arrêt si déjà exécuté. Test réel dans un Postgres 16 en mémoire (PGlite) avec copie minimale des tables et les vraies fonctions d'outils à la carte : 43 vérifications OK (droits de chaque rôle, éducateur en attente, autre club, visiteur, upsert sans doublon, auteur non falsifiable, retour au mode commun sans perte, annulation puis ré-exécution). Base Supabase réelle non touchée.

### Bloc 11 : vérification finale et nettoyage
- Statut : fait (en attente de ta validation), non commité
- Objectif : tout le parcours marche sur les comptes réels de test, et l'ancien code mort est retiré.
- Résultat testable : compte rendu avec captures du parcours complet (4 étapes, 2 modèles, 2 modes) ; anciens panneaux supprimés de `DashboardClub.jsx` ; tests, lint, build verts ; un club réel de l'ancien modèle vérifié en lecture : rien n'a changé.
- Modèle : sonnet · Effort : medium · Coût estimé : moyen
- Pourquoi ce modèle : vérification et petit nettoyage.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 11 PLAN-mon-club.md`
- Dépend de : blocs 0 à 9 (10 si fait)
- Prérequis : aucun
- Étapes :
  - Parcours complet sur les deux clubs de test, clair et sombre, mobile.
  - Retirer le code des anciens écrans devenus de simples liens.
  - Mettre à jour les tutoriels club qui parlent de « Personnaliser » ou « Droits des éducateurs » (`TutorielsClub.jsx`).
  - Commit et push après « ok » de Kevin.
- Ce que je teste pour valider : le parcours de bout en bout sur mon propre compte club.
- Reste à finir : (1) parcours complet à jouer par Kevin sur son compte club (4 étapes, clair/sombre, mobile) : aucune session club ici, rien n'a été ouvert dans un navigateur ; (2) vérification en lecture d'un club réel ancien modèle non faite ici (pas d'accès à la base) ; (3) commit et push après ton « ok » ; (4) bloc 10 (journal) toujours optionnel, non fait ; (5) lint : 17 problèmes déjà présents avant le chantier dans `DashboardClub.jsx` (dont `sportifVisible` et `administratifVisible` inutilisés), non touchés.
- Journal : 2026-11-12, Sonnet 5.5. Les anciens panneaux de `DashboardClub.jsx` étaient déjà remplacés par des liens vers Mon club (« Personnaliser », « Accès du bureau ») : rien de plus à retirer. `TutorielsClub.jsx` : étape « Logo, couleurs et slogan » et étape « Ce que chacun peut faire » (Staff) pointent maintenant vers Mon club ; « Droits des éducateurs » de Projet sportif laissé tel quel (encart conservé). Vérifs : `npm test` 387 OK, 1 ignoré, 0 échec ; `npm run build` OK.
