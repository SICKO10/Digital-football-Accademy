# PLAN : Plan de jeu (fusion Principes de jeu + Zones de terrain)
Date : 2026-11-18 · Brief : BRIEF-plan-de-jeu.md
Réunir principes et zones en un seul onglet « Plan de jeu » (terrain et principes côte à côte, reliés par des pastilles numérotées), pour le club et l'éducateur.
Faire enfin arriver ce plan au joueur, trié selon sa ligne, avec les consignes propres à son coach, et une fiche A4 imprimable par phase.

## Relevé fait pendant /plan (à confirmer en prod au bloc 0)
- Règles d'accès (fichiers SQL du dépôt) : `principes_jeu`, `terrain_zones`, `terrain_fonds`, `terrain_galerie`, `cpa_schemas`, `principes_photos` ont toutes 4 règles : club + staff (tout), éducateur accepté du club (tout, la permission fine est gérée seulement à l'écran via `canEditerProjetSportif`), joueur affilié (lecture), parent accepté (lecture).
- Donc le joueur a déjà le droit de lire `principes_jeu` : c'est l'écran `PreparationTactiqueJoueur.jsx` qui ne la lit pas.
- Poste du joueur : `profiles.poste` (texte libre, valeurs à relever au bloc 0 pour les ranger en 4 lignes).
- Équipe : une ligne de `club_categories` (catégorie + `educateur_id`) ; le joueur y est relié par `equipe_joueurs.club_categorie_id` + `joueur_id`. La colonne ajoutée s'appellera `club_categorie_id` (vide = plan du club).
- Choix de périmètre : seuls `principes_jeu` et `terrain_zones` reçoivent le niveau équipe. Fonds, photos, galerie et schémas CPA restent au niveau club ; l'éducateur les voit en lecture dans le Plan de jeu.

## État des lieux prod (bloc 0, 2026-11-18, Sonnet 5.5)
- Sauvegarde : `backups/plan-de-jeu-20261118/` (6 fichiers).
- Règles confirmées pour les 6 tables : club, éducateur accepté, joueur et parent en lecture. NOUVEAU : `principes_jeu` a aussi une règle RESTRICTIVE `verrou_outils` (ferme l'outil projet_sportif). Le bloc 2 doit la garder intacte ; `terrain_zones` n'en a pas.
- Colonnes actuelles : `principes_jeu` = id, club_id, pole_key, phase, principe, ordre, created_at. `terrain_zones` = id, club_id, pole_key, phase, x, y, largeur, hauteur, label, description, couleur, ordre, created_at. Aucune des trois colonnes à ajouter n'existe encore.
- Contenu en prod : 0 principe et 0 zone, tous clubs confondus. Le prérequis « pôle du club test rempli » (bloc 1) est donc à faire par Kevin.
- Postes : `profiles.poste` ne contient que 'Milieu', 'Attaquant', 'gardien' (plus 'COACH', 'club', 'educateur' qui ne sont pas des joueurs). Les vraies valeurs détaillées sont dans `equipe_joueurs.poste` (texte libre, casse variable). Les deux sources sont à gérer au bloc 4.
- Correspondance proposée (insensible à la casse, par mots-clés) : gardien → gardien ; « défenseur », « latéral », « libéro » → defense ; « milieu » → milieu ; « attaquant », « avant-centre » → attaque. Cas mixtes : « Ailier » → attaque ; « Piston » → defense et milieu ; « Milieu offensif / Ailier » → milieu et attaque (plusieurs lignes possibles). Poste vide ou inconnu : aucune ligne, ordre normal.
- Lien joueur → équipe : confirmé, `equipe_joueurs.club_categorie_id` + `joueur_id`. `club_categories.educateur_id` existe (17 équipes sur 60 ont un éducateur).
- `HistoriqueClub.jsx` ne lit ni `principes_jeu` ni `terrain_zones` (seulement un texte ligne 325 disant qu'ils n'ont pas de saison). Rien à corriger au bloc 8 à part ce texte si besoin.
- Seuls `ProjetSportif.jsx` (club) et `PreparationTactiqueJoueur.jsx` touchent ces tables. Ce dernier lit déjà `terrain_zones` (ligne 210) mais pas `principes_jeu`.

## Ce que je dois fournir
| Élément | Pourquoi | Où le trouver | Nécessaire avant |
|---|---|---|---|
| Compte club test (deabreu.amorim+club@) avec un pôle rempli : quelques principes et zones | Voir la fusion avec du vrai contenu | Existe déjà, à remplir si vide | Bloc 1 |
| Un éducateur test rattaché au club test, avec une équipe (catégorie) et le droit d'éditer le projet sportif | Tester les ajouts « Consigne de ton coach » | À créer (adresse +edu@ par exemple) | Bloc 5 |
| Un joueur test affilié à cet éducateur, avec un poste renseigné sur son profil | Tester la vue joueur, le tri par ligne et la visibilité par équipe | À créer (+joueur@) | Bloc 6 |
| Idéalement un second joueur dans une autre équipe du même pôle | Vérifier qu'il ne voit pas les consignes de l'autre coach | À créer | Bloc 9 |

## Manipulations à faire moi-même
1. Avant le bloc 1 : remplir un pôle du club test (2 ou 3 principes et 2 zones sur au moins une phase) si ce n'est pas déjà fait.
2. Au bloc 2, après mon feu vert : lancer `~/Sauvegardes-DigitalFootball/sauvegarder.sh`, puis exécuter dans Supabase le fichier `supabase_plan_de_jeu.sql`, puis `supabase_plan_de_jeu_verification.sql`, et me coller le résultat. Ne pas exécuter le fichier `..._ANNULATION_NE_PAS_EXECUTER.sql`.
3. Avant le bloc 5 : créer l'éducateur test, le rattacher au club, lui donner une équipe et le droit d'éditer.
4. Avant le bloc 6 : créer le joueur test, l'affilier à l'éducateur, renseigner son poste.
5. Au bloc 10 : valider la version de test Vercel avant toute mise en production.

## Répartition suggérée
- Aujourd'hui : blocs 0 et 1 (faible + moyen).
- Demain : bloc 2 (Opus, SQL) en début de fenêtre 5 h, puis bloc 3.
- Jour 3 : blocs 4 et 5.
- Jour 4 : blocs 6 et 7.
- Jour 5 : blocs 8, 9 et 10.
Rappel : `/clear` et une session neuve par bloc. Si la barre « 5h » dépasse 60 % avant un bloc « élevé », le garder pour la fenêtre suivante.

## Blocs

### Bloc 0 : mise en place et état des lieux en prod
- Statut : fait
- Objectif : sauvegarder les fichiers touchés et confirmer en prod ce que le relevé ci-dessus annonce.
- Résultat testable : un dossier de sauvegarde daté et un paragraphe « État des lieux prod » ajouté dans ce plan.
- Modèle : sonnet · Effort : medium · Coût estimé : faible
- Pourquoi ce modèle : lecture et requêtes SELECT, rien de délicat.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 0 PLAN-plan-de-jeu.md`
- Dépend de : rien
- Prérequis : aucun
- Étapes :
  - Copier `ProjetSportif.jsx`, `ProjetSportifEducateur.jsx`, `PreparationTactiqueJoueur.jsx`, `TutorielsClub.jsx`, `HistoriqueClub.jsx`, `DashboardClub.jsx` dans `backups/plan-de-jeu-<date>/`.
  - SELECT en prod (`supabase db query --linked`) : règles réelles des 6 tables, colonnes de `principes_jeu` et `terrain_zones`, nombre de lignes par club.
  - Relever les valeurs distinctes de `profiles.poste` pour les joueurs et proposer la table de correspondance vers gardien / défense / milieu / attaque.
  - Confirmer le lien joueur → équipe (`equipe_joueurs.club_categorie_id`) et repérer ce que `HistoriqueClub.jsx` lit des principes et zones.
  - Écrire le résultat dans ce plan.
- Ce que je teste pour valider : je lis le paragraphe « État des lieux prod » et la correspondance des postes.
- Reste à finir : Kevin remplit un pôle du club test avant le bloc 1 (0 ligne en prod).
- Journal : 2026-11-18, Sonnet 5.5. Sauvegarde faite, SELECT en lecture seule seulement. Écart trouvé : règle restrictive verrou_outils sur principes_jeu.

### Bloc 1 : onglet unique « Plan de jeu » côté club (sans changement de base)
- Statut : à faire
- Objectif : remplacer les onglets Principes et Zones par un seul onglet, avec sélecteur de phase (8 phases + CPA), terrain à gauche, principes à droite, empilés sur téléphone.
- Résultat testable : dans le dashboard club, Projet sportif, un onglet « Plan de jeu » où l'on édite zones et principes d'une phase sur la même page.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : réorganisation d'écran sur un gros fichier existant (1 000 lignes), sans risque sur les données.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 1 PLAN-plan-de-jeu.md`
- Dépend de : bloc 0
- Prérequis : pôle du club test rempli
- Étapes :
  - Créer `src/components/club/PlanDeJeu.jsx` qui réutilise l'édition de `SectionZones` et de `SectionPrincipes` (pas de réécriture de la logique d'enregistrement).
  - Sélecteur de phase commun ; page CPA : texte « coups de pied arrêtés » + schémas CPA offensifs et défensifs ensemble.
  - Images : fond sous le terrain, photo des principes en illustration sous la liste.
  - Brancher l'onglet dans `ProjetSportif.jsx` et `ProjetSportifEducateur.jsx` ; anciens onglets retirés du menu (le code reste tant que tout n'est pas validé).
  - Mise en page téléphone : terrain en haut, principes dessous ; pas d'emojis, thème couleurs club respecté.
  - `npm run build` sans erreur.
- Ce que je teste pour valider : avec le club test, ajouter un principe et déplacer une zone sur une phase, recharger, tout est là ; même chose en largeur téléphone.
- Reste à finir : test à l'écran par Kevin (club test, ordinateur et téléphone) ; en prod il y a 1 principe et 0 zone seulement, donc remplir via le nouvel onglet. Tutoriel « Plan de jeu » et textes FAQ au bloc 8 (en attendant, l'onglet affiche l'ancien tutoriel des principes). Anciens onglets retirés du menu ; le code des sections est conservé et réutilisé par le nouvel onglet.
- Journal : 2026-11-18, Sonnet 5.5. Créé `src/components/club/PlanDeJeu.jsx` (sélecteur de 9 pages : 8 phases + CPA ; terrain et zones à gauche, principes à droite, empilés sous 320 px par colonne ; CPA = principes puis schémas offensifs et défensifs). `SectionPrincipes` reçoit `phaseUnique` (photo de phase sous la liste), `SectionZones` reçoit `phaseFixe`, `compact`, `titre` ; leur logique d'enregistrement n'a pas bougé. Branché dans `ProjetSportif.jsx` (club) et `ProjetSportifEducateur.jsx`. Écarts : grille des schémas CPA rendue adaptable (auto-fit) pour tenir sur téléphone. Vérifié : `npm run build` OK, rendu serveur des 9 pages en édition et en lecture seule (boutons d'ajout absents en lecture seule). Pas de test connecté (identifiants du club test non disponibles pour Claude). Aucun changement de base.

### Bloc 2 : migration SQL (lien zone, lignes, équipe, règles d'accès)
- Statut : fait (SQL exécuté en prod le 2026-11-18, vérification 18/18 OK)
- Objectif : ajouter les colonnes et resserrer les règles d'accès pour les deux niveaux de plan.
- Résultat testable : fichier de vérification qui affiche « OK » sur chaque contrôle après exécution par Kevin.
- Modèle : opus · Effort : high · Coût estimé : élevé
- Pourquoi ce modèle : règles d'accès en production sur des données de clubs ; une erreur ouvre ou ferme l'accès à tort.
- Lancement : `/clear`, puis `/model opus`, puis `/effort high`, puis `/bloc 2 PLAN-plan-de-jeu.md`
- Dépend de : bloc 0
- Prérequis : état des lieux prod du bloc 0
- Étapes :
  - `principes_jeu` : `zone_id` (lien vers `terrain_zones`, vidé si la zone est supprimée), `lignes` (liste parmi gardien, defense, milieu, attaque ; vide = tout le monde), `club_categorie_id` (vide = plan du club).
  - `terrain_zones` : `club_categorie_id` (vide = plan du club).
  - Règles : club et staff inchangés ; éducateur : lit tout le plan de son club, mais n'écrit que les lignes rattachées à une de ses équipes (`club_categories.educateur_id = auth.uid()`) ; joueur et parent : lignes du club + lignes de leur équipe seulement.
  - Les lignes déjà modifiées par un éducateur restent au niveau club (aucune reprise).
  - Trois fichiers : `supabase_plan_de_jeu.sql` (avec arrêt sans rien changer si l'état n'est pas celui attendu), `supabase_plan_de_jeu_verification.sql`, `supabase_plan_de_jeu_ANNULATION_NE_PAS_EXECUTER.sql`.
  - Kevin : sauvegarde, exécution, vérification ; Claude contrôle ensuite par SELECT en prod.
- Ce que je teste pour valider : j'exécute les fichiers dans l'ordre et je colle le résultat de la vérification ; le Plan de jeu du club test fonctionne toujours.
- Reste à finir : Entre le bloc 2 et le bloc 5 : un éducateur qui a le droit d'éditer (2 clubs l'accordent à tous leurs éducateurs, 0 droit individuel) voit encore les boutons d'édition du plan du club mais l'enregistrement sera refusé ; le bloc 5 doit passer le plan du club en lecture seule pour lui et envoyer `club_categorie_id` à chaque ajout.
- Journal : 2026-11-18, Opus 5.5. Relevé prod : règles identiques au bloc 0 ; droit d'éditer = `club_educateurs.peut_editer_projet_sportif`, sinon `profiles.educateurs_editent_projet_sportif` du club (même calcul que l'écran). Décisions : (1) le droit d'éditer est maintenant aussi contrôlé par la base pour les écritures de l'éducateur (avant, seulement à l'écran) ; (2) l'éducateur lit tout le plan du club, ajouts des autres équipes compris ; (3) une ligne d'équipe n'est visible par le joueur que s'il est aussi affilié au club ET dans `equipe_joueurs` de cette équipe (45 joueurs sur 173 y sont reliés à un compte) ; (4) suppression d'une équipe = ses ajouts supprimés (jamais remontés au niveau club) ; (5) garde-fou : équipe du même club, zone reliée du même club et du même niveau ; (6) `lignes` non vide de valeur, `{}` par défaut. `verrou_outils` intact. Testé sur une copie locale Postgres 17 (mêmes règles que la prod) : 18/18 vérifications OK, 18 essais d'écriture conformes, lectures par rôle conformes (club, 2 éducateurs, 2 joueurs, parent, inconnu), cascades OK, 2e exécution arrêtée sans rien changer, annulation bloquée par garde-fou puis, garde-fou retiré, retour exact aux 9 règles d'origine. Exécuté en prod par Kevin : 18/18 OK. Contrôle Claude par SELECT en prod : un éducateur réel ayant le droit peut écrire pour sa propre équipe (vrai), pas pour le plan du club ni pour l'équipe d'un autre coach (faux) ; 1 principe et 0 zone comme avant, aucune ligne modifiée.

### Bloc 3 : lien principe ↔ zone avec pastilles numérotées [IDÉE]
- Statut : à faire
- Objectif : rattacher un principe à une zone ; pastille numérotée sur la zone ; toucher l'un met l'autre en évidence.
- Résultat testable : dans le Plan de jeu club, un principe rattaché montre son numéro sur la zone, et le clic sur l'un surligne l'autre.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : interaction d'écran, la base est déjà prête.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 3 PLAN-plan-de-jeu.md`
- Dépend de : blocs 1 et 2
- Prérequis : SQL du bloc 2 exécuté
- Étapes :
  - Choix de la zone dans la fiche d'un principe (liste des zones de la phase, ou « aucune »).
  - Numérotation selon l'ordre des principes ; pastille réutilisant `PastilleTerrain.jsx` si adapté.
  - Mise en évidence croisée au toucher, accessible au clavier et sur téléphone.
  - Composant d'affichage en lecture seule séparé, réutilisable pour le joueur (bloc 6) et la fiche A4 (bloc 7).
- Ce que je teste pour valider : relier 2 principes à 2 zones, recharger, toucher chaque pastille et chaque principe.
- Reste à finir :
- Journal :

### Bloc 4 : « Mon poste dans ce plan », côté club [IDÉE]
- Statut : à faire
- Objectif : le club marque un principe pour une ou plusieurs lignes (gardien, défense, milieu, attaque).
- Résultat testable : dans la liste des principes, des étiquettes de ligne s'affichent et s'enregistrent.
- Modèle : sonnet · Effort : medium · Coût estimé : faible
- Pourquoi ce modèle : petit ajout de formulaire.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 4 PLAN-plan-de-jeu.md`
- Dépend de : bloc 2
- Prérequis : SQL du bloc 2 exécuté
- Étapes :
  - Sélection multiple des lignes dans la fiche d'un principe ; rien coché = « Tout le monde ».
  - Étiquettes discrètes dans la liste.
  - Créer la fonction de correspondance poste → ligne (`src/constants/`) à partir du relevé du bloc 0, prête pour le bloc 6.
- Ce que je teste pour valider : marquer un principe « défense », un autre « milieu, attaque », recharger.
- Reste à finir :
- Journal :

### Bloc 5 : ajouts de l'éducateur au niveau équipe
- Statut : à faire
- Objectif : l'éducateur autorisé ajoute ses propres principes et zones pour son équipe, sans pouvoir toucher le plan du club.
- Résultat testable : connecté en éducateur test, je vois le plan du club verrouillé et je peux ajouter une consigne et une zone pour mon équipe.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : logique d'écran avec deux niveaux, les règles d'accès protègent déjà la base.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 5 PLAN-plan-de-jeu.md`
- Dépend de : blocs 2 et 3
- Prérequis : éducateur test rattaché avec une équipe et le droit d'éditer
- Étapes :
  - Dans `ProjetSportifEducateur.jsx` : plan du club en lecture, ajouts de l'éducateur éditables et signalés « Consigne de ton coach ».
  - Éducateur avec deux équipes : choix de l'équipe au moment de l'ajout, et filtre par équipe à l'affichage.
  - Éducateur sans droit : tout en lecture, comme aujourd'hui ; aucun verrou ajouté pour les non affiliés.
  - Côté club : les ajouts des éducateurs visibles en lecture, avec le nom de l'équipe.
- Ce que je teste pour valider : en éducateur, ajouter une consigne ; vérifier que modifier un principe du club n'est plus proposé ; en club, voir la consigne de l'éducateur.
- Reste à finir :
- Journal :

### Bloc 6 : vue joueur dans Préparation tactique
- Statut : à faire
- Objectif : chaque onglet phase montre au joueur le terrain et les principes de son pôle, triés selon sa ligne, avec les consignes de son coach.
- Résultat testable : connecté en joueur test, chaque phase affiche terrain, pastilles et principes, les siens en premier.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : écran de lecture, réutilise le composant du bloc 3.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 6 PLAN-plan-de-jeu.md`
- Dépend de : blocs 3, 4 et 5
- Prérequis : joueur test affilié avec un poste
- Étapes :
  - `PreparationTactiqueJoueur.jsx` lit `principes_jeu` (club + son équipe, la base filtre déjà).
  - Tri : principes de sa ligne d'abord (bloc « Ton poste »), puis les autres ; sans poste, ordre normal.
  - Consignes de l'équipe signalées « Consigne de ton coach ».
  - Lisible sur téléphone : terrain en haut, principes dessous ; état vide clair si le club n'a rien écrit.
- Ce que je teste pour valider : sur téléphone, en joueur test, parcourir 3 phases et la page CPA ; changer son poste et voir l'ordre changer.
- Reste à finir :
- Journal :

### Bloc 7 : fiche A4 imprimable par phase [IDÉE]
- Statut : à faire
- Objectif : imprimer une phase : terrain, zones numérotées, principes, logo et couleurs du club.
- Résultat testable : bouton « Imprimer cette phase » chez le club, l'éducateur et le joueur, aperçu A4 propre sur une page.
- Modèle : sonnet · Effort : medium · Coût estimé : moyen
- Pourquoi ce modèle : mise en page d'impression, même approche que la Fiche séance.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 7 PLAN-plan-de-jeu.md`
- Dépend de : blocs 3 et 6
- Prérequis : aucun
- Étapes :
  - Reprendre la méthode d'impression de la Fiche séance (styles `@media print`).
  - Contenu : en-tête club (logo, couleurs), nom de la phase, terrain avec pastilles, principes numérotés, consignes du coach si présentes.
  - Bouton présent pour les trois profils ; le joueur imprime sa version (avec ses consignes d'équipe).
- Ce que je teste pour valider : aperçu avant impression depuis chaque profil, une phase avec 5 principes tient sur une page.
- Reste à finir :
- Journal :

### Bloc 8 : tutoriels, FAQ, permissions, historique des saisons
- Statut : à faire
- Objectif : mettre tous les textes et lecteurs annexes au niveau du nouvel onglet.
- Résultat testable : plus aucune mention des anciens onglets « Principes » et « Zones » dans l'interface.
- Modèle : sonnet · Effort : medium · Coût estimé : faible
- Pourquoi ce modèle : textes lus par les clients (pas Haiku), sans logique délicate.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 8 PLAN-plan-de-jeu.md`
- Dépend de : blocs 5 et 6
- Prérequis : aucun
- Étapes :
  - `TutorielsClub.jsx` : un seul tutoriel « Plan de jeu » à la place des deux, qui explique le lien zone, les lignes et le changement pour les éducateurs.
  - FAQ et libellé de permission dans `DashboardClub.jsx` : « l'éducateur ajoute les consignes de son équipe, le plan du club reste protégé ».
  - `HistoriqueClub.jsx` : vérifier l'affichage avec les nouvelles colonnes, corriger si besoin.
  - Textes sans tiret long ni moyen, sans formules creuses.
- Ce que je teste pour valider : ouvrir le tutoriel, la FAQ et l'écran des permissions côté club.
- Reste à finir :
- Journal :

### Bloc 9 : vérification de bout en bout et contrôle des accès
- Statut : à faire
- Objectif : prouver les parcours des trois profils et l'étanchéité entre équipes.
- Résultat testable : compte rendu avec, pour chaque profil, ce qui a été vu, et le résultat des requêtes de contrôle.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : contrôle méthodique, pas de nouvelle logique.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 9 PLAN-plan-de-jeu.md`
- Dépend de : blocs 1 à 8
- Prérequis : idéalement un second joueur dans une autre équipe du pôle
- Étapes :
  - `npm run build` et lancement local.
  - Parcours club, éducateur, joueur, parent sur ordinateur et largeur téléphone.
  - Contrôle en prod (SELECT) : un joueur d'une autre équipe ne reçoit pas les consignes du coach ; un éducateur ne peut pas modifier une ligne du club.
  - Corriger les écarts trouvés (petites corrections seulement, sinon noter dans « Reste à finir »).
- Ce que je teste pour valider : je refais moi-même le parcours joueur sur mon téléphone.
- Reste à finir :
- Journal :

### Bloc 10 : nettoyage, version de test et clôture
- Statut : à faire
- Objectif : retirer l'ancien code devenu inutile, ranger, mettre en ligne une version de test, commit et push après validation.
- Résultat testable : adresse de test Vercel où tout fonctionne ; plan mis à jour.
- Modèle : haiku · Effort : low · Coût estimé : faible
- Pourquoi ce modèle : rangement mécanique et déploiement guidé par le skill.
- Lancement : `/clear`, puis `/model haiku`, puis `/effort low`, puis `/bloc 10 PLAN-plan-de-jeu.md`
- Dépend de : bloc 9
- Prérequis : bloc 9 validé
- Étapes :
  - Supprimer de `ProjetSportif.jsx` les morceaux des anciens onglets qui ne servent plus (vérifier qu'aucun autre fichier ne les importe).
  - `npm run build`, puis skill `vercel-deploy` en version de test seulement.
  - Mettre à jour ce plan et la mémoire du projet.
  - Après mon ok : commit en français et push sur `main` ; production seulement sur mon ok explicite.
- Ce que je teste pour valider : l'adresse de test, parcours club et joueur.
- Reste à finir :
- Journal :
