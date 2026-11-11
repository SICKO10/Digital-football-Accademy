# PLAN : outils à la carte et dashboard composé
Date : 2026-11-07 · Brief : BRIEF-outils-a-la-carte.md
Fichier séparé de `PLAN.md` et des autres chantiers.

Objectif : un club ou un éducateur choisit ses outils, chacun avec son prix (mensuel ou annuel), et son dashboard ne montre que ceux-là.
Le paiement passe par un abonnement Stripe à plusieurs lignes (forfait club et outils) qu'on modifie à tout moment, avec essai gratuit de 14 jours par outil.

## Décisions techniques prises au /plan (à corriger au bloc 0 si besoin)
1. **Drapeau par compte `profiles.modele_outils`** (faux par défaut). Tout le nouveau fonctionnement (dashboard composé, Mes outils, paiement, verrou base) ne s'applique qu'aux comptes où il est vrai. Pendant le chantier, seuls les 3 comptes de test l'ont. Conséquence : chaque bloc validé peut être poussé en production sans rien changer pour les autres comptes. À la bascule (bloc 16), il passe à vrai pour tous les clubs et éducateurs.
2. **Prix Stripe identifiés par « clé de recherche »** (`lookup_key`, ex. `outil_seances_mensuel`), pas par leur identifiant. Le catalogue contient ces clés : le même code marche en mode test et en live, sans rien recopier à la bascule.
3. **Une seule fonction serveur Vercel `api/outils.js`** avec plusieurs actions (essai, payer, ajouter, retirer, résilier, portail, périodicité, offrir). Raison : l'offre gratuite Vercel limite à 12 fonctions et `api/` en compte déjà 10. Clé Stripe dédiée `STRIPE_OUTILS_SECRET_KEY` (clé test jusqu'à la bascule, live ensuite), indépendante de la clé joueur et recruteur.
4. **Nouveau webhook séparé `supabase/functions/stripe-webhook-outils`**. L'ancien `stripe-webhook` (joueur, recruteur) n'est pas modifié, sauf à la bascule : il ignorera les paiements marqués `offre: outils`, pour ne pas confondre un forfait club avec l'ancien palier de même montant.
5. **Retirer un outil** : la ligne est supprimée de l'abonnement Stripe tout de suite, sans remboursement ni avoir (`proration_behavior: none`), et l'accès reste ouvert en base jusqu'à la date de fin de période déjà payée. Si c'est la dernière ligne d'un éducateur, l'abonnement est résilié en fin de période.
6. **Ajouter un outil** : ajout de la ligne avec prorata facturé immédiatement (`always_invoice`), outil actif dès le paiement confirmé.
7. **Fin d'essai sans tâche planifiée** : l'accès dépend de la date de fin enregistrée, il s'éteint seul. La proposition de garder l'outil s'affiche dans l'appli (encart) dès la fin de l'essai.
8. **Verrou base par politiques « restrictives »** ajoutées aux tables des outils payants : elles s'ajoutent aux règles existantes sans les réécrire, et ne s'appliquent qu'aux comptes `modele_outils`.
9. **Hypothèses à confirmer au bloc 0** : une offre de l'administrateur ignore la règle « un essai par outil » ; un club sans forfait actif ne peut pas lancer d'essai ; « accès limité » d'un club résilié = l'accès actuel d'un club non payé.

## Règles techniques pour tous les blocs
- `DashboardEducateur.jsx` (13 350 lignes) et `DashboardClub.jsx` (7 500) : **ne jamais les lire en entier**. Chercher l'endroit précis (grep), brancher le minimum, écrire le nouveau code dans `src/components/outils/` et `src/lib/`.
- Le catalogue `src/lib/catalogueOutils.js` est la seule source : aucun nom, prix ou clé Stripe écrit ailleurs.
- Couleurs via `useColors()`, zéro couleur en dur, zéro emoji, textes clients sans tiret long ni moyen.
- Base de production : chaque SQL est relu ; Kevin lance `~/Sauvegardes-DigitalFootball/sauvegarder.sh` **avant**, puis exécute le SQL et le fichier de vérification. Le fichier d'annulation porte le suffixe `_ANNULATION_NE_PAS_EXECUTER.sql` et n'est jamais donné dans le même message que le SQL à lancer.
- Stripe : **mode test uniquement** jusqu'au bloc 16. Aucune clé n'est affichée ni écrite dans un fichier du projet : Kevin la colle lui-même dans Vercel et Supabase.
- Git : le dépôt contient des modifications d'un autre chantier (espace joueur). Ne commiter que les fichiers de ce chantier (`git add` fichier par fichier). Push = mise en production, seulement après le « ok » de Kevin.
- Tests automatiques : fonctions pures dans `src/lib/`, tests dans `tests/*.test.js`, lancés par `npm test`.

## Ce que je dois fournir
| Élément | Pourquoi | Où le trouver | Nécessaire avant |
|---|---|---|---|
| Validation de la liste socle / outils et des 3 questions | Le catalogue en dépend | Proposition rédigée au bloc 0 | bloc 1 |
| Grille de prix : un prix mensuel et un prix annuel par outil | Affichés dans Mes outils et créés dans Stripe ; aucun prix inventé | Ta décision commerciale | bloc 5 |
| Compte éducateur indépendant de test | Tester le dashboard composé éducateur | À créer toi-même (méthode donnée au bloc 0) | bloc 3 |
| Compte club de test (avec forfait sans payer en live) | Tester le dashboard club et le paiement | Méthode donnée au bloc 0 (l'inscription club demande un paiement) | bloc 4 |
| Compte éducateur affilié au club de test | Tester les outils fournis par le club | À créer toi-même | bloc 10 |
| Accès au tableau de bord Stripe en mode test | Créer les produits, le webhook test, régler le portail client | dashboard.stripe.com, bouton « Mode test » | bloc 6 |
| Accès Vercel et Supabase (variables d'environnement, secrets) | Y coller toi-même les clés test puis live | Vercel > Settings > Environment Variables ; Supabase > Edge Functions > Secrets | bloc 6 |
| Ton compte coach admin | Tester les offres d'essai | Ton compte habituel | bloc 12 |
| Relecture des CGV modifiées | Engagement juridique | Texte livré au bloc 14 | bloc 14 |
| Vérification Stripe live : aucun abonnement club ou éducateur actif | Condition de la bascule sans transition | Stripe live > Abonnements | bloc 16 |
| Ton « ok » explicite pour la bascule live | Paiements réels | Message dans la session du bloc 16 | bloc 16 |

## Manipulations à faire moi-même
1. **Après le bloc 0** : valider (ou corriger) la liste socle / outils, les 3 questions et les hypothèses ; créer les comptes de test avec la méthode indiquée.
2. **Avant le bloc 5** : envoyer la grille de prix complète.
3. **Pendant le bloc 2** : lancer la sauvegarde, exécuter le SQL du bloc dans Supabase (SQL Editor), puis le SQL de vérification, et me coller le résultat. Puis exécuter le petit SQL fourni qui active `modele_outils` sur tes comptes de test.
4. **Pendant le bloc 6** : en mode test Stripe, lancer toi-même dans ton terminal le script de création des produits (la commande exacte sera donnée, tu y colles ta clé test) ; régler le portail client ; coller la clé test dans Vercel (`STRIPE_OUTILS_SECRET_KEY`) et Supabase ; créer le webhook test vers `stripe-webhook-outils` et coller son secret dans Supabase.
5. **Pendant les blocs 7 à 9** : payer avec les cartes de test Stripe (`4242 4242 4242 4242`), jamais une vraie carte.
6. **Pendant le bloc 15** : sauvegarde puis SQL du verrou, comme au bloc 2.
7. **Avant le bloc 16** : vérifier dans Stripe live qu'aucun abonnement club ou éducateur n'est actif, puis donner ton « ok ». Pendant le bloc : sauvegarde, script de création des produits avec la clé live, webhook live, remplacement des clés test par les clés live dans Vercel et Supabase.
8. **À chaque fin de bloc** : tester sur téléphone et ordinateur, thème sombre et clair, puis valider ou dire ce qui ne va pas.
9. Ne pas m'envoyer d'identifiants ni de clés.

## Répartition suggérée
Je ne vois pas ta barre de statut d'ici : adapte selon ton compteur. 18 blocs, environ 12 jours.
- **Jour 1** : blocs 0 et 1 (tu valides la liste entre les deux).
- **Jour 2** : bloc 2 (Opus, base de données), puis création des comptes de test.
- **Jour 3** : blocs 3 et 4 (premier résultat visible : dashboards composés).
- **Jour 4** : blocs 5 et 6 (grille de prix nécessaire).
- **Jour 5** : bloc 7 (Opus, élevé), seul.
- **Jour 6** : bloc 8 (Opus, élevé), seul.
- **Jour 7** : bloc 9 (Opus), puis bloc 14 (léger).
- **Jour 8** : blocs 10 et 11.
- **Jour 9** : blocs 12 et 13.
- **Jour 10** : bloc 15 (Opus, élevé), seul.
- **Jour 11** : bloc 16 (Opus, bascule live), en début de fenêtre 5 h neuve.
- **Jour 12** : bloc 17.
Les 6 blocs Opus (2, 7, 8, 9, 15, 16) pèsent le plus sur la limite de la semaine : jamais deux le même jour.
Rappel : `/clear` et une session neuve par bloc.

## Blocs

### Bloc 0 : inventaire, sauvegarde et proposition de découpage
- Statut : fait
- Objectif : savoir précisément quels menus existent côté club et éducateur, et proposer la liste socle / outils et les 3 questions.
- Résultat testable : un fichier `docs/outils-a-la-carte/INVENTAIRE.md` lisible, avec un tableau « entrée de menu → outil ou socle », les 3 questions et leurs pré-cochages, et la méthode pour créer les comptes de test.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : inventaire et proposition structurée, sans risque ; Kevin tranche.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 0 PLAN-outils-a-la-carte.md`
- Dépend de : rien
- Prérequis : aucun
- Étapes :
  - Commit de sauvegarde des seuls fichiers du brief et du plan (pas les fichiers de l'autre chantier).
  - Repérer par grep les tableaux de menus de `DashboardEducateur.jsx` et `DashboardClub.jsx`, et les clés de `role_permissions` / `permissionsClub.js` réutilisables.
  - Repérer où le dashboard teste aujourd'hui le plan payé (`plan`, `estPro`, quota équipes) et le parcours d'inscription club (`Register.jsx`, `RegisterChoix.jsx`, paiement avant inscription).
  - Proposer : socle, liste d'outils club et éducateur (nom, promesse en une phrase, menus débloqués), 3 questions et pré-cochages, réponses aux hypothèses 9.
  - Donner la méthode pour obtenir un club de test sans payer en live.
- Ce que je teste pour valider : je lis INVENTAIRE.md, je valide ou corrige la liste, les questions et les hypothèses.
- Reste à finir : Kevin tranche les questions A à E de `docs/outils-a-la-carte/INVENTAIRE.md` avant le bloc 1 (Stages, CFF4, lien club vers éducateur, regroupements, écran d'abonnement du club).
- Journal : 2026-11-07, Sonnet 5.5. Commit de sauvegarde 7e789e8 (brief et plan seuls). Inventaire fait par grep, aucun fichier de code touché. Écart par rapport aux hypothèses 9 : un club non payé n'a pas d'accès limité aujourd'hui, il voit un écran plein « Abonnement non actif ». Point à trancher : CFF4 ne doit pas être mis derrière un outil payant sans ton accord.

### Bloc 1 : catalogue des outils et règles d'accès
- Statut : fait
- Objectif : la source unique des outils et le calcul « quels outils sont visibles pour ce compte ».
- Résultat testable : `npm test` vert avec des cas couvrant éducateur seul, éducateur affilié, club, essai expiré, outil retiré encore payé, outil retiré du club.
- Modèle : sonnet · Effort : medium · Coût estimé : faible
- Pourquoi ce modèle : code pur sans base ni paiement.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 1 PLAN-outils-a-la-carte.md`
- Dépend de : bloc 0 validé
- Prérequis : liste socle / outils validée
- Étapes :
  - Créer `src/lib/catalogueOutils.js` : socle, outils (id, rôle, nom, promesse, prix mensuel et annuel laissés vides tant que la grille n'est pas donnée, clés de recherche Stripe, menus débloqués), 3 questions et pré-cochages.
  - Fonctions pures : `outilsVisibles(...)`, `menuFiltre(...)`, `totalComposition(outils, periodicite)`, `joursRestantsEssai(...)`.
  - Un garde-fou : un test échoue si un outil n'a pas de prix au moment de la bascule (vérifié au bloc 16).
  - Tests dans `tests/catalogueOutils.test.js`.
- Ce que je teste pour valider : je lis le compte rendu ; les noms et promesses des outils me conviennent.
- Reste à finir : (1) « stats collectives » de Compétition éducateur : je ne sais pas quel onglet exactement, à repérer au bloc 3 ; (2) découper au bloc 3 les pages Suivi des joueurs (onglet présences gratuit) et Compétition (calendrier gratuit) ; (3) Explorer à retirer du menu éducateur au bloc 3 ; (4) lien club vers éducateur à confirmer par Kevin (question 4) ; (5) prix et grille au bloc 5 ; (6) Recrutement retiré du catalogue et à retirer des menus des deux dashboards (blocs 3 et 4) ; à rouvrir plus tard.
- Journal : 2026-11-07, Sonnet 5.5. Décisions de Kevin : socle éducateur = accueil, profil, effectif, compétition sans stats collectives, calendrier, présences, taux de présence, organisation ; socle club = accueil, profil, catégories et équipes, éducateurs, staff, organigramme, inventaire, planning, séances, terrains, déplacements ; CFF4 et Stages = outils payants, l'éducateur affilié les reçoit seulement si son club les a ; Explorer retiré ; regroupements Finances et Vie du club validés ; écran « Abonnement non actif » conservé pour le club. Outils éducateur : 8 (dont Stages non achetable seul ; CFF4 achetable seul ET reçu via le club), club : 6. Recrutement retiré partout. Fichiers : `src/lib/catalogueOutils.js`, `tests/catalogueOutils.test.js`. `npm test` : 158 réussis, 1 ignoré (garde-fou prix, actif avec `BASCULE_LIVE=1`).

### Bloc 2 : base de données des outils
- Statut : fait
- Objectif : enregistrer qui a quel outil, d'où il vient et jusqu'à quand, avec un contrôle d'accès côté base.
- Résultat testable : le SQL de vérification renvoie les tables, les règles d'accès et des résultats attendus pour `a_outil(...)` sur les comptes de test.
- Modèle : opus · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : données clients et règles de sécurité, une erreur coûte cher.
- Lancement : `/clear`, puis `/model opus`, puis `/effort high`, puis `/bloc 2 PLAN-outils-a-la-carte.md`
- Dépend de : bloc 1
- Prérequis : sauvegarde lancée par Kevin juste avant l'exécution
- Étapes :
  - `supabase_outils_a_la_carte.sql` : colonne `profiles.modele_outils` (non modifiable par l'utilisateur), tables `outils_comptes` (compte, outil, source achat / club / essai / offre, fin le, lien Stripe), `outils_club_ouverts`, `outils_essais_utilises`, `outils_affichage_educateur`.
  - Fonction `a_outil(compte, outil)` : achat ou essai non expiré, ou outil ouvert par le club d'affiliation et actif chez le club.
  - Règles d'accès : chacun lit ses lignes ; seules les fonctions serveur écrivent les achats et essais ; le club gère ses outils ouverts ; l'éducateur gère son affichage.
  - Fichiers `_verification.sql` et `_ANNULATION_NE_PAS_EXECUTER.sql`, plus un petit SQL qui active `modele_outils` sur les comptes de test (par email).
- Ce que je teste pour valider : je lance sauvegarde, SQL, vérification, et je colle le résultat.
- Reste à finir : (1) `supabase_outils_a_la_carte_comptes_test.sql` seulement après avoir créé les 3 comptes de test (avant le bloc 3) ; (2) délégation au staff pour ouvrir les outils du club : non faite, à voir au bloc 10.
- Journal : 2026-11-07, Opus 5.5. Fichiers : `supabase_outils_a_la_carte.sql`, `_verification.sql`, `_comptes_test.sql`, `_ANNULATION_NE_PAS_EXECUTER.sql`. Écarts et décisions : pas de source « club » stockée dans `outils_comptes` (l'outil reçu du club est calculé à la lecture, il s'éteint à la même date que chez le club sans recopie) ; un outil du club arrive chez l'éducateur seulement si le club l'a actif, l'a ouvert, et a son abonnement actif ; `fin_le` vide = abonnement en cours ; une offre admin n'est pas inscrite dans les essais utilisés ; ajout de `outils_actifs(compte)` (liste des outils actifs avec leur source, pour le bloc 3) ; seul le compte club ouvre ou ferme un outil. Testé sur un PostgreSQL local imitant Supabase : SQL rejoué deux fois sans erreur, vérification 37/37, données de test effacées, SQL des comptes de test limité aux 3 adresses, annulation corrigée (ordre de suppression) puis validée. 2026-11-07 : Kevin a exécuté sauvegarde, SQL et vérification en production : 37/37 ok.

### Bloc 3 : dashboard éducateur composé
- Statut : fait (validé par Kevin le 2026-11-07)
- Objectif : un éducateur `modele_outils` ne voit que le socle et ses outils actifs ; une adresse d'outil non pris affiche une carte « outil non activé ».
- Résultat testable : avec l'éducateur de test, le menu passe d'une quinzaine d'entrées au socle ; après le SQL fourni qui lui donne un outil, cet outil apparaît.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : branchement front dans un très gros fichier, demande de la précision mais pas de paiement.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 3 PLAN-outils-a-la-carte.md`
- Dépend de : bloc 2 exécuté
- Prérequis : éducateur de test créé et marqué `modele_outils`
- Étapes :
  - Hook `src/lib/useOutils.js` (lecture des tables, calcul via le catalogue).
  - Filtrer le menu et les tuiles de l'accueil de `DashboardEducateur.jsx` au point d'entrée trouvé au bloc 0.
  - Composant `src/components/outils/OutilNonActive.jsx` (promesse, prix ou « essai gratuit 14 jours » selon ce qui est déjà branché).
  - Vérifier qu'un compte sans drapeau voit exactement l'ancien dashboard.
- Ce que je teste pour valider : connexion éducateur de test (menu réduit), puis avec un outil donné ; connexion d'un compte sans drapeau (rien n'a changé).
- Reste à finir : (1) mise en production non faite (push à demander) ; (2) un dirigeant délégué ou un club qui consulte un éducateur voit tout (pas de filtre, le verrou base du bloc 15 couvrira) ; (3) la carte « outil non activé » n'a pas de bouton d'essai ni d'achat avant les blocs 5 à 7 ; (4) les liens d'autres écrans (alertes, notifications) vers une page verrouillée affichent la carte, sans filtrage de leurs lignes ; (5) Stats collectives est un 9e outil éducateur : sa place dans la grille de prix (bloc 5) et son pré-cochage (priorité « matchs ») sont à valider ; (6) le club n'a pas d'équivalent Stats collectives (à voir au bloc 4).
- Journal : 2026-11-07, Sonnet 5.5. Fichiers : `src/lib/outilsAcces.js` (règles pures), `src/lib/useOutils.js` (lecture de `outils_actifs`), `src/components/outils/OutilNonActive.jsx`, branchement minimal dans `DashboardEducateur.jsx` (sauvegarde `~/Sauvegardes-DigitalFootball/DashboardEducateur.jsx.avant-bloc3-20261107`), `tests/outilsAcces.test.js`. Décisions : une page d'outil non actif devient `outil_verrouille` (la valeur brute reste dans `activeSectionBrut`) ; Statistiques reste ouverte avec le seul onglet Présences (taux de présence inclus) sans Suivi des joueurs ; Santé et Historique cachés ; Bilan de saison de Compétition rattaché à Suivi des joueurs (hypothèse sur « stats collectives ») ; Explorer et Recrutement retirés du menu pour les comptes du nouveau modèle ; accueil : bouton Nouvelle séance, carte Prochaine séance, Classement du mois et raccourcis filtrés. Un compte sans drapeau garde exactement l'ancien comportement (aucune lecture, aucun filtre). `npm test` : 170 réussis, 1 ignoré ; build et lint ok. Pas de test navigateur connecté : pas d'identifiants, à faire par Kevin.
  - 2026-11-07 (suite) : thème clair par défaut aux couleurs Digital Football (menu sombre, entrée active et boutons « marque » en vert vif #4ADE80, textes verts restés foncés), dans `paletteClub.js` et `clubTheme.js`, avec un test. Décision de Kevin : « Stats collectives » = outil payant regroupant l'onglet Graphiques, Bilan de l'équipe (buts par quart d'heure, nature des buts, côté) et le scan de la feuille de match ; ajouté au catalogue (`stats_collectives`, sans menu propre), l'onglet Graphiques et les autres parties sortent de Suivi des joueurs. Le Bilan de saison V/N/D de Compétition reste gratuit. `npm test` : 174 réussis, 1 ignoré.
  - 2026-11-07 (suite 2) : décision de Kevin, la planification des séances (Planning, clé `entrainements`) passe dans le socle éducateur ; l'outil Séances ne garde que les fiches (`mes_seances`). Code d'équipe (Profil) et invitation des joueurs (Mon équipe) étaient déjà dans le socle, rien à changer : le code n'apparaît qu'une fois le profil éducateur enregistré. Barre de sous-onglets masquée quand un seul onglet est accessible. `npm test` : 174 réussis, 1 ignoré.
  - 2026-11-07 (suite 3) : décision de Kevin, le RPE va avec les stats individuelles (outil Suivi des joueurs). Le bouton « Demander le ressenti RPE » du Planning reste visible, mais sans l'outil il ouvre une fenêtre « outil payant » (`OutilPayantModale`, réutilisable pour d'autres boutons). Les résultats RPE (Statistiques > Notes) sont déjà derrière Suivi des joueurs. Le champ RPE prévu dans les fiches d'exercice (Séances) n'est pas touché.

### Bloc 4 : dashboard club composé
- Statut : fait (en attente de validation de Kevin)
- Objectif : même chose côté club, en gardant le forfait selon les équipes.
- Résultat testable : le club de test ne voit que le socle et ses outils ; les autres comptes club sont inchangés.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : même travail qu'au bloc 3 sur l'autre dashboard.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 4 PLAN-outils-a-la-carte.md`
- Dépend de : bloc 3
- Prérequis : club de test créé et marqué `modele_outils`
- Étapes :
  - Filtrer menu et accueil de `DashboardClub.jsx` avec `useOutils`, en respectant aussi `role_permissions` (staff du club).
  - Brancher `OutilNonActive` sur les sections non prises.
  - Vérifier le quota d'équipes : il reste piloté par le forfait.
- Ce que je teste pour valider : connexion club de test et un membre du staff ; un club réel n'a pas bougé.
- Reste à finir : (1) test connecté non fait (pas d'identifiants) : à faire par Kevin avec le club de test et un membre du staff ; (2) mise en production non faite (commit et push à demander après validation) ; (3) la carte « outil non activé » n'a toujours pas de bouton d'essai ni d'achat (blocs 5 à 7) ; (4) l'accueil du club montre encore les événements dans le widget « Planning du club » (le planning est dans le socle) : un clic sur un événement ouvre la carte « outil non activé » ; (5) pas d'équivalent Stats collectives côté club ; (6) le verrou côté base reste au bloc 15 : aujourd'hui seul l'affichage est filtré ; (7) les tutoriels intégrés des pages verrouillées ne sont pas filtrés (ils ne s'ouvrent que sur une page visible).
- Journal : 2026-11-07, Sonnet 5.5. Sauvegarde `~/Sauvegardes-DigitalFootball/DashboardClub.jsx.avant-bloc4-20261107`. Branchement minimal dans `DashboardClub.jsx` : `useOutils({ role: 'club', userId: clubId, modeleOutils: club?.modele_outils })` (les outils sont ceux du compte club, que le président ou le staff soit connecté ; la fonction base autorise déjà le staff), `activeTab` calculé sur `activeTabBrut` comme côté éducateur, menu filtré par `menuVisible` EN PLUS de `canViewSection` (une entrée doit passer les deux), carte `OutilNonActive` pour une page verrouillée, raccourcis et alertes de l'accueil filtrés (sponsors, projets, événements) au rendu. Le parcours d'accueil Cedinho suit le menu filtré. Recrutement retiré du menu club pour le nouveau modèle (`menuVisible`, règle commune aux deux rôles). Quota d'équipes : code non touché, toujours piloté par `club.quota_equipes`. Un club sans drapeau garde exactement l'ancien comportement (aucune lecture, aucun filtre). `npm test` : 180 réussis, 1 ignoré (6 nouveaux tests club) ; build ok ; lint identique à avant (17 problèmes déjà présents, aucun nouveau).

### Bloc 5 : espace « Mes outils » et essai gratuit de 14 jours
- Statut : fait (en attente de validation de Kevin, SQL et déploiement à faire pour tester)
- Décisions de Kevin avant le bloc (2026-11-09) : grille éducateur (mensuel / annuel) : Suivi des joueurs 1 / 10, Stats collectives 1 / 10, Séances 3 / 30, Tacticboard 4 / 40, Bibliothèque 4 / 40 (séparée du Tacticboard), Préparation physique 2 / 20, Évaluations et vidéo 2 / 20, Projet sportif 2 / 20, Projet Club CFF4 2 / 20 ; Stages : plus de prix pour l'éducateur (reçu seulement via le club). Club : pas de prix par outil, le forfait selon les équipes couvre tout, le club choisit ses outils et peut en ajouter ou retirer quand il veut sans supplément ; il décide aussi, sans supplément, des outils de ses éducateurs. Pas d'essai ni de ligne Stripe pour les outils du club. Offre « tous les outils éducateur » à 15 € par mois ou 150 € par an : à ajouter comme bloc à part, après le bloc 5.
- Objectif : voir ses outils (actifs, en essai avec jours restants, disponibles avec prix) et lancer un essai sans carte.
- Résultat testable : l'éducateur de test clique « Essayer » : l'outil apparaît dans le menu avec « 14 jours restants » ; un second essai du même outil est refusé ; un essai dont la date est passée (SQL fourni) disparaît et l'encart « Garder cet outil » s'affiche.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : écran et fonction serveur simple, sans argent en jeu.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 5 PLAN-outils-a-la-carte.md`
- Dépend de : blocs 3 et 4
- Prérequis : grille de prix reçue et reportée dans le catalogue
- Étapes :
  - Créer `api/outils.js` (vérification du jeton comme `cancel-subscription.js`) avec l'action `essai` : drapeau, essai jamais utilisé, club avec forfait actif.
  - Page `src/components/outils/MesOutils.jsx`, entrée dans le socle des deux dashboards.
  - Encart de fin d'essai (accueil et Mes outils).
  - Les boutons Ajouter et Retirer n'apparaissent qu'au bloc 8 (aucun bouton sans effet).
- Ce que je teste pour valider : le parcours ci-dessus avec l'éducateur et le club de test.
- Reste à finir : (1) pour tester : sauvegarde, puis `supabase_outils_a_la_carte_bloc5.sql`, puis `_bloc5_verification.sql` (nécessaire seulement pour le choix des outils du club) ; (2) la fonction `api/outils.js` n'existe qu'une fois déployée : version de test Vercel ou push après ton « ok » ; (3) l'encart de fin d'essai renvoie vers Mes outils, sans bouton « Garder » : le paiement vient au bloc 7 ; (4) la Bibliothèque est maintenant un outil à part du Tacticboard : un compte qui avait l'ancien « Tactique » n'a plus la Bibliothèque (aucun compte réel concerné, seulement les comptes de test), et elle n'est pas pré-cochée aux questions d'inscription (à revoir au bloc 11) ; (5) seul le compte du club (président) voit et modifie Mes outils, pas le staff ; (6) ajouter un bloc « offre tous les outils éducateur à 15 € par mois ou 150 € par an » après le bloc 5 ; (7) blocs 6 à 9 : les outils du club n'ont ni prix ni ligne Stripe, seuls les 9 outils éducateur achetables (prix mensuel et annuel) sont à créer ; (8) test connecté non fait (pas d'identifiants) : à faire par Kevin.
- Journal : 2026-11-09, Sonnet 5.5. Grille éducateur écrite dans `src/lib/catalogueOutils.js` (Tactique renommé Tacticboard, Bibliothèque séparée ; Stages éducateur sans prix, reçu seulement via le club ; outils du club marqués `inclus`, garde-fou prix ignoré pour eux). Base : nouvelle origine `forfait` pour les outils choisis par le club (`supabase_outils_a_la_carte_bloc5.sql`, vérification, SQL de test qui fait expirer l'essai de testfinal@gmail.com, annulation à ne pas lancer). Serveur : `api/outils.js` (actions `essai` et `choisir_club`, jeton vérifié, un essai par outil, essai rendu si l'écriture échoue). Écrans : `MesOutils.jsx` (éducateur : statut, jours restants, prix, bouton Essayer ; club : Ajouter ou Retirer sans prix), `EncartFinEssai.jsx` à l'accueil éducateur, entrée « Mes outils » dans le socle des deux dashboards (club : réservée au président, entrée à côté de Profil), bouton « Voir dans Mes outils » sur la carte « outil non activé ». Hook `useOutils` : lit aussi les essais utilisés. Pas de modification des comptes sans drapeau (entrée de menu ajoutée seulement si `modele_outils`). `npm test` : 210 réussis, 1 ignoré (tests catalogue, états, api) ; build ok ; lint identique à avant ; rendu des écrans vérifié hors navigateur connecté. SQL non testé sur une base locale (pas de PostgreSQL sur cette machine) : il ne change que deux règles de contrôle, en les élargissant.

### Bloc 6 : produits Stripe en mode test
- Statut : code fait ; en attente de tes manipulations Stripe, Vercel et Supabase (GUIDE-STRIPE-OUTILS-TEST.md)
- Objectif : tous les outils et forfaits club existent dans Stripe test, avec leurs clés de recherche, et les réglages sont en place.
- Résultat testable : le script affiche la liste des prix créés ; un appel de contrôle de `api/outils.js` retrouve chaque clé de recherche du catalogue.
- Modèle : sonnet · Effort : medium · Coût estimé : faible
- Pourquoi ce modèle : script court et guidage pas à pas.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 6 PLAN-outils-a-la-carte.md`
- Dépend de : bloc 5
- Prérequis : accès Stripe test, Vercel, Supabase
- Étapes :
  - Script `scripts/stripe-creer-produits-outils.mjs` : lit le catalogue, crée produits et prix (mensuel, annuel) avec clés de recherche, sans doublon s'il est relancé. Kevin le lance lui-même avec sa clé.
  - Guide pas à pas : portail client (carte, factures, résiliation), clé `STRIPE_OUTILS_SECRET_KEY` dans Vercel, secrets Supabase.
  - Action de contrôle `verifier-prix` dans `api/outils.js`.
- Ce que je teste pour valider : je vois les produits dans Stripe test ; le contrôle est vert.
- Reste à finir : (1) Kevin suit `GUIDE-STRIPE-OUTILS-TEST.md` : création des prix (script), contrôle vert, portail client, clé dans Vercel et dans Supabase ; (2) le contrôle `verifier-prix` côté Vercel n'est testable qu'après déploiement avec la clé, et sans bouton pour le lancer : le script `stripe-verifier-prix-outils.mjs` fait le même contrôle en local, un bouton admin viendra avec le bloc 12 ; (3) l'offre « tous les outils éducateur » (15 € par mois, 150 € par an) n'a pas encore de produit Stripe : à ajouter avec son bloc ; (4) les produits sont nommés sans mention de la marque (ex. « Séances ») : à relire dans le portail client et sur une facture test au bloc 7 ; (5) les montants des forfaits club sont recopiés de `stripeLinks.js` dans le catalogue : au bloc 16, `stripeLinks.js` reste la référence des anciens liens, à ne pas modifier.
- Journal : 2026-11-09, Sonnet 5.5. Catalogue : `FORFAITS_CLUB` (6 paliers, mêmes montants que les liens actuels, annuel = 10 mois), `lignesStripe()` (30 prix : 9 outils éducateur achetables et 6 forfaits, clés `outil_educateur_<id>_mensuel|annuel` et `forfait_club_<palier>_mensuel|annuel`), `comparerPrix()`. Les outils du club n'ont ni produit ni prix. Scripts : `stripe-creer-produits-outils.mjs` (option `--simulation` sans clé, clé saisie masquée, jamais écrite, refuse une clé live sans `--live`, produits à identifiant fixe, prix retrouvés par clé de recherche, relançable, ne modifie jamais un prix existant), `stripe-verifier-prix-outils.mjs` (lecture seule), `_cle-stripe.mjs`. Serveur : action `verifier-prix` dans `api/outils.js` (administrateurs seulement via `admins_coach`, clé `STRIPE_OUTILS_SECRET_KEY`, 503 clair si absente). Tests : 221 (220 réussis, 1 ignoré), dont le script avec un faux Stripe (deux passages, aucun doublon) ; lint sans nouvelle erreur ; build ok. Aucun appel réel à Stripe fait (pas de clé ici) : la création et le contrôle vert restent à constater par Kevin.



### Bloc 7 : premier paiement et webhook des outils
- Statut : code fait, fonction webhook déployée ; en attente de tes manipulations (GUIDE-STRIPE-OUTILS-TEST.md, étapes 1 à 13) et de ton « ok push » pour le test de bout en bout
- Objectif : payer une composition (forfait club et outils, ou outils seuls pour un éducateur) en une fois, et voir les outils s'activer.
- Résultat testable : depuis Mes outils, l'éducateur de test coche 2 outils, paie en mensuel avec la carte test, revient sur la plateforme : les 2 outils sont actifs. Pareil pour le club avec forfait.
- Modèle : opus · Effort : high · Coût estimé : élevé
- Pourquoi ce modèle : paiement et synchronisation Stripe vers la base, une erreur coûte cher.
- Lancement : `/clear`, puis `/model opus`, puis `/effort high`, puis `/bloc 7 PLAN-outils-a-la-carte.md`
- Dépend de : bloc 6
- Prérequis : webhook test créé par Kevin vers `stripe-webhook-outils`, secret collé dans Supabase
- Étapes :
  - Action `payer` : session Stripe Checkout à plusieurs lignes, une seule périodicité, client Stripe réutilisé, métadonnées `offre: outils` et identifiant du compte.
  - `supabase/functions/stripe-webhook-outils` : signature vérifiée, idempotence (comme `supabase_fix_stripe_webhook_idempotence.sql`), lignes reconnues par clé de recherche, mise à jour de `outils_comptes` et du forfait club (quota équipes).
  - Bouton « Payer » et récapitulatif dans Mes outils (total mensuel ou annuel).
  - Déploiement de la fonction, test de bout en bout en mode test.
- Ce que je teste pour valider : les deux paiements test ; l'abonnement visible dans Stripe test avec les bonnes lignes.
- Reste à finir : (1) Kevin : étapes 1 à 7 du guide (bloc 6, pas encore faites : `STRIPE_OUTILS_SECRET_KEY` absente des secrets Supabase au 2026-11-09), puis étapes 8 à 13 (SQL du bloc 7, webhook test, secret `STRIPE_OUTILS_WEBHOOK_SECRET`, paiements test) ; (2) ton « ok push » : je commite et pousse les fichiers des blocs 5, 6 et 7 seulement (pas ceux de l'espace joueur) ; (3) test de bout en bout non fait (pas de clé ici) : les 2 paiements test et les 2 abonnements Stripe restent à constater ; (4) le journal des paiements (table `paiements`, page Revenus) n'est pas alimenté par ce webhook : à faire au bloc 8 avec `invoice.paid`, et seulement pour les paiements live (un paiement test ne doit pas gonfler les revenus) ; (5) payer un outil en essai démarre l'abonnement tout de suite, les jours d'essai restants sont perdus (c'est écrit avant de payer) : à revoir si tu préfères décaler le premier prélèvement ; (6) pas de champ code promo sur ce paiement : à décider ; (7) client Stripe retrouvé par l'identifiant du compte, pas par l'ancien `stripe_customer_id` : au bloc 16, un ancien client live devra ressaisir sa carte (à décider) ; (8) un éducateur déjà abonné ne voit plus l'encadré de paiement, le serveur refuse un second premier paiement : l'ajout d'outils vient au bloc 8 ; (9) un club déjà actif ne change pas de forfait ici (blocs 8 et 9).
- Décision du 2026-11-10 : essais gratuits suspendus (interrupteur `ESSAIS_GRATUITS = false` dans `catalogueOutils.js`, action `essai` refusée, bouton et texte retirés de Mes outils ; SQL `supabase_outils_a_la_carte_essais_suspendus.sql` pour effacer les essais des comptes de test). Les offres de l'administrateur (bloc 12) restent possibles.
- Décision du 2026-11-10 : les clôtures de saison passent dans le socle gratuit ; la fiche d'évaluation (onglet Évaluations, clé `notes`) passe dans « Suivi des joueurs » ; l'outil à 2 € / 20 € s'appelle maintenant « Analyse vidéo » (même identifiant et mêmes clés de prix Stripe). Le produit Stripe garde l'ancien nom « Évaluations et vidéo » : à renommer dans Stripe si tu veux (sans effet sur les prix).
- Décision du 2026-11-11 : offre « Tous les outils éducateur » à 15 € par mois ou 150 € par an (les 9 outils achetables, Stages exclu), ajoutée au bloc 7 : produit Stripe `pack_educateur` avec les clés `pack_educateur_mensuel` et `pack_educateur_annuel` (à créer dans Stripe avant de pousser), choix dans « Payer mes outils » (une ligne Stripe, le webhook active les 9 outils avec le même `stripe_item_id`), mention « Sans engagement » au paiement. À traiter au bloc 8 : retirer un outil d'un pack, passer d'outils séparés au pack et inversement, résiliation en un clic (la mention « sans engagement » suppose qu'elle existe).
- Journal : 2026-11-09, Opus 5.5. Prérequis manquants constatés (bloc 6 non appliqué, blocs 5 et 6 pas en ligne) : Kevin a choisi « code maintenant et déploiement du webhook ». Catalogue : `compositionPaiement()` (lignes Stripe et total, une seule périodicité ; club : forfait qui couvre ses équipes), `forfaitPourEquipes()`, `trouverForfait()`. Serveur : action `payer` dans `api/outils.js` (refus avant tout appel Stripe si la demande n'est pas valable ; outil déjà payé refusé ; garde-fou montant Stripe = catalogue ; un seul client Stripe par compte retrouvé par `metadata.compte_id`, clé d'idempotence ; second abonnement refusé ; session Checkout à plusieurs lignes, métadonnées `offre: outils`, `compte_id`, `role` sur la session et l'abonnement ; retour vers `/educateur` ou `/club` avec `?outils=paye|annule`, origine vérifiée). Base : `supabase_outils_a_la_carte_bloc7.sql` (registre `outils_stripe_evenements` et fonction `outils_appliquer_abonnement`, tout ou rien, refuse un compte hors nouveau modèle, outils payés réservés aux éducateurs et forfait aux clubs, palier qui recalcule le quota d'équipes), vérification, annulation à ne pas lancer, SQL de test qui retire le forfait du club de test. Webhook : `supabase/functions/stripe-webhook-outils` (signature vérifiée, `checkout.session.completed` seulement, abonnement relu chez Stripe, lignes reconnues par clé de recherche, réponse 500 si rien n'a pu être écrit pour que Stripe relivre), logique pure dans `logique.js`, déclarée sans JWT dans `config.toml`, déployée (répond « configuration incomplète » tant que les secrets manquent). Écrans : encadré « Payer mes outils » dans Mes outils (outils cochés, en essai ou essai terminé pré-cochés, mensuel ou annuel, total et économie annuelle, message au retour de Stripe avec attente de l'activation), écran « Active le forfait de ton club » qui remplace pour les clubs du nouveau modèle l'écran des anciens liens Stripe live (forfaits qui couvrent ses équipes, staff sans bouton), encart de fin d'essai « Garder cet outil », Mes outils rouvert au retour du paiement. Tests : 237 (236 réussis, 1 ignoré), dont 8 nouveaux pour `payer` et 8 pour le webhook ; lint sans nouvelle erreur ; build ok ; rendu des écrans contrôlé hors navigateur. Sauvegarde avant modification : `~/Sauvegardes-DigitalFootball/bloc7-outils-2026-11-09/`.
  2026-11-09 (suite), décision de Kevin : les 30 prix ont été créés directement en mode **live** (script `--live`, 30 créés, 0 différent), pas en test ; contrôle `verifier-prix` sauté (clé live non réaffichable). Conséquences : le bloc 7 se teste en réel (1 € par mois avec « Suivi des joueurs », remboursé ensuite dans Stripe) ; le webhook et les secrets sont à créer en live ; l'ancien webhook doit ignorer `offre: outils` AVANT tout paiement (modification écrite et testée, déployée le 2026-11-09 après le « ok » de Kevin : répond 400 sans signature, comme avant) ; SQL des blocs 5 et 7 exécutés par Kevin et vérifiés (6 colonnes vraies) ; les 12 prix club créés sont inutilisés pour l'instant.

### Bloc 8 : ajouter, retirer, résilier, factures et carte
- Statut : à faire
- Objectif : modifier sa composition à tout moment selon les règles du brief.
- Résultat testable : ajouter un outil facture le prorata et l'active ; retirer un outil le garde jusqu'à la date affichée, sans remboursement ; « Résilier tout » ramène l'éducateur au socle (le club en accès limité) à la fin de période ; « Factures et carte » ouvre le portail Stripe.
- Modèle : opus · Effort : high · Coût estimé : élevé
- Pourquoi ce modèle : modification d'abonnements en cours et prorata.
- Lancement : `/clear`, puis `/model opus`, puis `/effort high`, puis `/bloc 8 PLAN-outils-a-la-carte.md`
- Dépend de : bloc 7
- Prérequis : abonnements test du bloc 7 encore actifs
- Étapes :
  - Actions `ajouter`, `retirer`, `resilier`, `portail` dans `api/outils.js` (décisions techniques 5 et 6).
  - Webhook : `customer.subscription.updated` et `deleted`, `invoice.paid`, `invoice.payment_failed`.
  - Boutons et confirmations dans Mes outils, avec la date de fin affichée avant de confirmer.
  - Pour simuler la fin de période : horloge de test Stripe (test clock), guidée.
- Ce que je teste pour valider : chacun des 4 parcours, avec contrôle des factures dans Stripe test.
- Reste à finir :
- Journal :

### Bloc 9 : changer de périodicité au renouvellement
- Statut : à faire
- Objectif : passer de mensuel à annuel (ou l'inverse) à la prochaine échéance, pour toute la composition.
- Résultat testable : le choix affiche « annuel à partir du JJ/MM » ; après avance de l'horloge de test, la facture suivante est annuelle avec les mêmes outils.
- Modèle : opus · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : échéancier d'abonnement Stripe (subscription schedule), logique délicate.
- Lancement : `/clear`, puis `/model opus`, puis `/effort high`, puis `/bloc 9 PLAN-outils-a-la-carte.md`
- Dépend de : bloc 8
- Prérequis : aucun
- Étapes :
  - Action `periodicite` : échéancier à deux phases (actuelle jusqu'à l'échéance, puis nouvelle périodicité).
  - Ajouter ou retirer un outil pendant qu'un changement est programmé : mettre à jour les deux phases.
  - Affichage et annulation du changement programmé dans Mes outils.
- Ce que je teste pour valider : le passage mensuel vers annuel avec l'horloge de test.
- Reste à finir :
- Journal :

### Bloc 10 : outils du club pour ses éducateurs
- Statut : à faire
- Objectif : le club ouvre certains de ses outils à ses éducateurs ; l'éducateur affilié choisit lesquels afficher et peut acheter les autres.
- Résultat testable : le club de test ouvre un outil, l'éducateur affilié le voit gratuitement et peut le masquer ; si l'éducateur payait déjà cet outil, il reçoit une notification « vous pouvez retirer le vôtre » ; quand le club retire l'outil, l'éducateur est prévenu de la date de fin et le perd à cette date.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : écrans et notifications, la logique d'accès existe déjà en base (bloc 2).
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 10 PLAN-outils-a-la-carte.md`
- Dépend de : bloc 8
- Prérequis : éducateur affilié de test créé et marqué `modele_outils`
- Étapes :
  - Section « Outils pour mes éducateurs » dans Mes outils côté club.
  - Côté éducateur affilié : outils fournis par le club (afficher ou masquer), autres outils achetables.
  - Notifications plateforme (doublon, retrait par le club) via `send-notification-plateforme`.
- Ce que je teste pour valider : les trois situations ci-dessus avec le club et l'éducateur affilié de test.
- Reste à finir :
- Journal :

### Bloc 11 : composer son offre en 3 questions à l'inscription
- Statut : à faire
- Objectif : à l'inscription club ou éducateur, 3 questions pré-cochent les outils, le total s'affiche en direct, puis paiement ou continuation gratuite.
- Résultat testable : par l'adresse cachée `/inscription?composer=1`, je crée un éducateur : les outils proposés suivent mes réponses, le total change entre mensuel et annuel, « Continuer gratuitement » marche sans outil ; un club passe par forfait et outils jusqu'au paiement test.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : parcours d'interface, le paiement réutilise le bloc 7.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 11 PLAN-outils-a-la-carte.md`
- Dépend de : blocs 7 et 10
- Prérequis : aucun
- Étapes :
  - Composant `src/components/outils/ComposerOffre.jsx` (3 questions, pré-cochage depuis le catalogue, total en direct).
  - Branchement dans `RegisterChoix.jsx` / `Register.jsx`, seulement avec `?composer=1` jusqu'à la bascule ; les comptes créés ainsi reçoivent `modele_outils`.
  - Club : choix du forfait selon les équipes dans la même composition.
- Ce que je teste pour valider : une inscription éducateur gratuite, une payante, une inscription club, sur téléphone.
- Reste à finir :
- Journal :

### Bloc 12 : offres d'essai depuis l'espace administrateur
- Statut : à faire
- Objectif : Kevin offre l'essai d'un outil, pour la durée choisie, à un compte ou à un groupe (tous les clubs, tous les éducateurs).
- Résultat testable : depuis le coach admin, j'offre 30 jours d'un outil à l'éducateur de test : il reçoit la notification et voit l'outil avec « 30 jours restants ». L'envoi à un groupe affiche le nombre de comptes concernés et demande confirmation.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : écran admin et action serveur protégée, sans paiement.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 12 PLAN-outils-a-la-carte.md`
- Dépend de : bloc 5
- Prérequis : aucun
- Étapes :
  - Action `offrir` dans `api/outils.js`, réservée à l'administrateur (`api/_droits.js`).
  - Écran dans le coach admin (`DashboardCoach.jsx`, repéré par grep) : outil, durée, cible, aperçu du nombre de comptes.
  - Notification plateforme, aucun email.
- Ce que je teste pour valider : une offre à un compte, une offre à un groupe (limité aux comptes `modele_outils` avant la bascule).
- Reste à finir :
- Journal :

### Bloc 13 : page publique des tarifs avec simulateur
- Statut : à faire
- Objectif : une page tarifs où l'on coche des outils et voit le total mensuel ou annuel, club ou éducateur.
- Résultat testable : la page `/tarifs` (cachée jusqu'à la bascule) calcule les mêmes totaux que Mes outils, et renvoie vers l'inscription composée.
- Modèle : sonnet · Effort : medium · Coût estimé : moyen
- Pourquoi ce modèle : page et textes marketing.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 13 PLAN-outils-a-la-carte.md`
- Dépend de : bloc 11
- Prérequis : aucun
- Étapes :
  - Page `src/pages/Tarifs.jsx` alimentée par le catalogue et `totalComposition` (aucun prix en dur).
  - Promesse « Ne payez que ce que vous utilisez vraiment », textes sans tiret long ni moyen.
  - Lien depuis l'accueil public ajouté seulement à la bascule.
- Ce que je teste pour valider : la page sur téléphone et ordinateur, les totaux comparés à Mes outils.
- Reste à finir :
- Journal :

### Bloc 14 : CGV mises à jour
- Statut : à faire
- Objectif : les CGV décrivent le prorata, le retrait, la résiliation, l'essai et les outils fournis par le club.
- Résultat testable : un texte modifié lisible, avec les passages changés signalés pour ta relecture.
- Modèle : sonnet · Effort : medium · Coût estimé : faible
- Pourquoi ce modèle : rédaction encadrée, relue par Kevin.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 14 PLAN-outils-a-la-carte.md`
- Dépend de : bloc 9 (règles définitives)
- Prérequis : aucun
- Étapes :
  - Lire seulement les sections abonnement et résiliation de `src/pages/CGV.jsx`.
  - Proposer le nouveau texte dans un fichier de relecture, puis l'intégrer après ton accord.
  - Publication du texte seulement au bloc 16.
- Ce que je teste pour valider : je relis et valide le texte.
- Reste à finir :
- Journal :

### Bloc 15 : verrou côté base et côté serveur
- Statut : à faire
- Objectif : un outil non pris reste fermé même par son adresse ou par un appel direct à la base.
- Résultat testable : avec l'éducateur de test sans un outil, les données de cet outil ne se chargent pas (SQL de vérification et essai dans l'appli) ; avec l'outil, tout fonctionne ; les comptes sans drapeau ne voient aucune différence.
- Modèle : opus · Effort : high · Coût estimé : élevé
- Pourquoi ce modèle : règles de sécurité sur des dizaines de tables en production.
- Lancement : `/clear`, puis `/model opus`, puis `/effort high`, puis `/bloc 15 PLAN-outils-a-la-carte.md`
- Dépend de : bloc 10
- Prérequis : sauvegarde lancée par Kevin juste avant l'exécution
- Étapes :
  - Lister les tables principales de chaque outil payant (via le catalogue et grep).
  - `supabase_outils_verrou.sql` : politiques restrictives `a_outil(...)` limitées aux comptes `modele_outils`, plus vérification et annulation séparées.
  - Contrôle `a_outil` dans les fonctions serveur liées à un outil payant (`api/ia.js`, `api/generer-montage.js`, fonctions `scan-*` si concernées).
- Ce que je teste pour valider : je lance sauvegarde, SQL, vérification ; je teste l'éducateur de test avec et sans l'outil.
- Reste à finir :
- Journal :

### Bloc 16 : bascule en live
- Statut : à faire
- Objectif : tous les clubs et éducateurs passent au nouveau modèle, avec paiements réels.
- Résultat testable : un nouveau compte éducateur créé par l'inscription normale passe par la composition ; tous les produits existent en live ; un premier paiement réel de faible montant (fait par toi, puis remboursé par toi dans Stripe) active l'outil.
- Modèle : opus · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : paiements réels et bascule de tous les comptes.
- Lancement : `/clear`, puis `/model opus`, puis `/effort high`, puis `/bloc 16 PLAN-outils-a-la-carte.md`
- Dépend de : blocs 11 à 15 validés
- Prérequis : aucun abonnement club ou éducateur actif en live (vérifié par Kevin), ton « ok » explicite, sauvegarde
- Étapes :
  - Contrôle que chaque outil a ses prix (test du bloc 1).
  - Kevin : script de création des produits avec la clé live, webhook live, clés live dans Vercel et Supabase, portail client live.
  - Ancien webhook : ignorer les paiements `offre: outils` ; retirer les liens fixes club et éducateur de `stripeLinks.js` (joueur et recruteur intacts).
  - SQL : `modele_outils` vrai pour tous les clubs et éducateurs et par défaut ; inscription composée sans paramètre ; page tarifs et CGV publiées.
- Ce que je teste pour valider : l'inscription réelle, le paiement réel remboursé, un joueur paie toujours avec son ancien lien.
- Reste à finir :
- Journal :

### Bloc 17 : vérification finale et nettoyage
- Statut : à faire
- Objectif : tout le parcours vérifié en production, code mort retiré.
- Résultat testable : une liste de contrôle cochée (inscription, essai, ajout, retrait, résiliation, club vers éducateur, offre admin, tarifs) ; `npm test` et `npm run build` verts.
- Modèle : sonnet · Effort : medium · Coût estimé : moyen
- Pourquoi ce modèle : vérification et retrait prudent d'ancien code, pas seulement mécanique.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 17 PLAN-outils-a-la-carte.md`
- Dépend de : bloc 16
- Prérequis : aucun
- Étapes :
  - Retirer les anciens boutons « passer Pro » club et éducateur et les références à `STRIPE_LINKS_EDU` / `STRIPE_LINKS_CLUB` qui ne servent plus.
  - Liste de contrôle en production avec les comptes de test.
  - Mettre à jour la mémoire du projet (règles Stripe, webhook) et ce plan.
- Ce que je teste pour valider : je refais la liste de contrôle sur téléphone.
- Reste à finir :
- Journal :

## Idées écartées ou pour plus tard
- [IDÉE] Packs à prix réduit : écartée pour le lancement (brief).
