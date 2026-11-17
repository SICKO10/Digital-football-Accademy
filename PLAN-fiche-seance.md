# PLAN : nouvelle fiche séance « Fiche club » (modèle AS Cannes) et 8 phases de jeu
Date : 2026-11-17 · Brief : BRIEF-fiche-seance.md

Remplacer la fiche séance Libre de l'éducateur par la « Fiche club », copie fidèle du modèle papier AS Cannes (A4 paysage recto verso, 6 procédés) aux couleurs et au logo du club.
Puis faire des 8 phases de jeu de cette fiche les phases de toute la plateforme (projet sportif, planification, thèmes de séance).

## Décisions de Kevin (17/11, questions du brief)

| Question | Décision |
|---|---|
| 1. Pour qui | La Fiche club **remplace le modèle Libre** pour toutes les nouvelles fiches. BMF, BEF, DEF restent au choix. Les 53 fiches Libres déjà créées (3 éducateurs) restent lisibles et modifiables avec l'ancien gabarit. |
| 2. Phases | Les 8 phases remplacent les phases **partout** (projet sportif, côté joueur, planification annuelle, thèmes de séance). Les coups de pied arrêtés restent une rubrique à part, hors phases. |
| 3 et 4. Écran ou papier, terrains | Remplissage à l'écran puis impression ; ce qui reste vide s'imprime vierge. **Un schéma Tactipad ajouté à un procédé remplace son terrain** (procédé 1 avec schéma = 1er terrain remplacé ; procédé 2 sans schéma = terrain quadrillé vierge du modèle). |
| 5. Effectif | Toute l'équipe choisie, rangée en GB / DEF / MIL / ATT selon le poste. |
| 6. Verso | Recto et verso identiques : en-tête, effectif, thème, phases, jour répétés. |
| 7. J+1 à J-1 | Coché automatiquement d'après le match le plus proche de l'équipe, modifiable. |
| 8. Dominante, Récupération, Tps | Tout en texte libre, rien de calculé. |
| 9. Sans club (choix par défaut, non posé) | Logo Digital Football et rouge du modèle. |

Choix par défaut fixés par Claude (à corriger au moment du bloc si besoin) :
- Joueur sans poste renseigné : listé sur une petite ligne « Poste non renseigné » sous le tableau, pour ne pas le ranger dans une mauvaise colonne (le code actuel `getPosteFamille` le classerait Milieu).
- Plus de 5 joueurs dans une colonne : le tableau prend autant de lignes que la colonne la plus remplie, le texte se réduit pour que chaque face tienne sur une page.
- « Effectif : .. + .. GB » se remplit tout seul (joueurs de champ + gardiens), modifiable.
- Correspondance des anciennes phases : Transition offensive = Trans. DEF-OFF ; Transition défensive = Trans. OFF-DEF ; Organisation offensive = les 3 phases de construction ; Organisation défensive = les 3 phases de défense en bloc ; Pressing = Déf. bloc haut.

## Ce qu'on sait de l'existant (repérage du 17/11)

- Fiches stockées dans `seances_uploadees.fiche_seance` (JSON). Le modèle est choisi par `mode_diplome` : null = Libre (53 fiches), BMF (6), BEF (1). La Fiche club sera `mode_diplome = 'CLUB'` : **aucun changement de base pour la fiche**.
- Code : `src/pages/DashboardEducateur.jsx` (13 400 lignes) : `ficheVide` vers la ligne 2656, `FicheSeancePrint` ligne 814, boutons de modèle vers la ligne 10520, scan IA vers la ligne 4353. Gabarits : `FicheContenu` (Libre), `FicheBEFContenu`, `src/components/fiches/FicheBMFContenu.jsx`. Impression : `#fiche-print` et `@page` dans `src/index.css`. Export PDF : `genererPdfDepuisElement` + `orientationFiche`.
- Fiches affichées aussi dans `PublierSeanceJoueurs.jsx`, `CauserieAvantMatch.jsx`, `DashboardClub.jsx`, `SeanceDuJourJoueur.jsx`, `joueur/SeanceAccueil.jsx`.
- Phases en base (production, lu le 17/11) : `principes_jeu`, `principes_photos`, `terrain_zones`, `terrain_galerie` **vides** ; `terrain_fonds` = 46 images de fond rangées sur les anciennes phases (attaque 8, defense 8, transition_att 8, transition_def 7, pressing 1, cpa_offensif 7, cpa_defensif 7) ; `cpa_schemas` = 3 (CPA, non touchés).
- Planification annuelle (`PlanificationAnnuelle.jsx` + `src/constants/methodologie.js`) et thèmes de séance (`src/lib/themesSeance.js`) : la phase n'est **pas** stockée en base, seul le regroupement à l'écran change.
- Couleur et logo du club : `src/lib/clubTheme.js`, logo = `club.avatar_url`.

## Ce que je dois fournir

| Élément | Pourquoi | Où le trouver | Nécessaire avant |
|---|---|---|---|
| « Modèle de jeu et méthodologie AS Cannes.pdf » copié dans `docs/modeles/methodologie-cannes.pdf` | Définitions des 8 phases pour classer thèmes et principes sans rien inventer | Ton iCloud | Bloc 9 (sans lui, le classement se fera seulement avec le contenu déjà présent sur la plateforme) |
| Un compte éducateur test rattaché à une équipe avec des joueurs, dont au moins 1 gardien, 1 joueur sans poste et une colonne de plus de 5 joueurs | Tester l'effectif automatique | Ton compte club test (deabreu.amorim+club@) | Bloc 3 |
| Un match à venir pour cette équipe | Tester J+/J- automatique | Calendrier de l'équipe test | Bloc 4 |
| Une imprimante recto verso | Vérifier le rendu papier réel | Chez toi ou au club | Blocs 2 et 11 |

## Manipulations à faire moi-même

1. Avant le bloc 9 : copier le PDF de méthodologie AS Cannes dans `docs/modeles/methodologie-cannes.pdf`.
2. Au bloc 2 : imprimer une fiche vierge en A4 recto verso et comparer avec le modèle papier.
3. Au bloc 7 : lancer `~/Sauvegardes-DigitalFootball/sauvegarder.sh`, puis exécuter le script SQL présenté (copie des images de fond vers les nouvelles phases, les anciennes restent).
4. Aux blocs 9 et 10 : valider le tableau de classement (quel thème ou principe va dans quelle phase) avant que Claude l'applique.
5. Au bloc 11 : faire le parcours complet sur la version de test Vercel, puis donner ton « ok » pour la production.

## Répartition suggérée

Je ne vois pas ta barre de statut : à ajuster selon ton compteur « 5h ».
- Jour 1 : blocs 0, 1 (la fiche visible à l'écran).
- Jour 2 : blocs 2, 3.
- Jour 3 : blocs 4, 5.
- Jour 4 : bloc 6 (la fiche Libre est remplacée : la partie fiche est terminée et utilisable).
- Jour 5 : blocs 7, 8.
- Jour 6 : blocs 9, 10.
- Jour 7 : bloc 11 (et 12 si tu le veux).
Rappel : `/clear` et une session neuve par bloc.

Attention commits : le chantier « dashboard joueur v3 » a des fichiers non commités (`translations.js`, `menuLateral.js`, `DashboardJoueur.jsx`...). Chaque bloc de ce plan ne commite **que ses propres fichiers** (`git add` fichier par fichier, jamais `git add -A`).

## Blocs

### Bloc 0 : mise en place
- Statut : fait (2026-11-17)
- Objectif : préparer le terrain sans toucher au code.
- Résultat testable : les 2 pages du modèle existent en images légères dans `docs/modeles/`, le point de départ Git est noté.
- Modèle : haiku · Effort : low · Coût estimé : faible
- Pourquoi ce modèle : rangement et conversion de fichiers, aucune décision.
- Lancement : `/clear`, puis `/model haiku`, puis `/effort low`, puis `/bloc 0 PLAN-fiche-seance.md`
- Dépend de : rien
- Prérequis : aucun
- Étapes :
  - Noter dans le journal le dernier commit et la liste des fichiers non commités d'autres chantiers (à ne pas toucher).
  - Convertir `docs/modeles/fiche-seance-cannes.pdf` en 2 images PNG légères (recto, verso) `docs/modeles/fiche-cannes-recto.png` et `-verso.png`, pour que les blocs suivants n'aient pas à relire le PDF de 9,5 Mo.
  - Ajouter `docs/modeles/*.pdf` au `.gitignore` (les PDF ne sont pas commités).
  - Créer une copie de sauvegarde datée de `DashboardEducateur.jsx`, `index.css`, `ProjetSportif.jsx`, `methodologie.js`, `themesSeance.js` dans `backups/`.
- Ce que je teste pour valider : ouvrir les 2 PNG, ils sont lisibles.
- Reste à finir : rien. Écarts à garder en tête pour les blocs 1 et 2 : les pages du PDF sont au format portrait, le modèle est un paysage tourné de 90°. Les PNG sont aussi plus légers que prévu (recto 0,6 Mo, verso 0,9 Mo).
- Journal : 2026-11-17, modèle réel Haiku 5.5 (conforme au plan). Dernier commit 1b58ff8. Fichiers non commités d'autres chantiers, à ne pas toucher : DashboardJoueur.jsx, MesStats.jsx, FloatingHelper.jsx, OnboardingGuide.jsx, SponsorsBar.jsx, menuLateral.js, translations.js, src/components/joueur/*. Conversion PDF en PNG avec pypdfium2 (installé dans un venv de scratchpad, pas dans le projet), échelle 1,1, palette réduite. Ajout de `docs/modeles/*.pdf` au .gitignore. Sauvegardes dans backups/fiche-seance-bloc0-<date>/ : DashboardEducateur.jsx, index.css, methodologie.js, themesSeance.js, ProjetSportifEducateur.jsx, ProjetSportif.jsx (le plan citait src/pages/ProjetSportif.jsx, qui n'existe pas : le fichier est dans src/components/club/). Rien commité pour ce bloc.

### Bloc 1 : gabarit visuel de la Fiche club
- Statut : fait (2026-11-17), contrôle visuel dans l'application à faire par Kevin
- Objectif : créer le gabarit des 2 faces, fidèle au modèle, aux couleurs et au logo du club.
- Résultat testable : dans « Créer une séance », un bouton « Fiche club » à côté de BMF/BEF/DEF ; l'aperçu montre la fiche vierge recto et verso avec le logo et la couleur du club à la place du rouge.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : production visuelle exigeante (fidélité au modèle) dans un très gros fichier.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 1 PLAN-fiche-seance.md`
- Dépend de : bloc 0
- Prérequis : PNG du modèle dans `docs/modeles/`
- Étapes :
  - Créer `src/constants/phasesJeu.js` : les 8 phases (clé, libellé court du modèle, libellé long, camp offensif ou défensif), la rubrique CPA à part, la table de correspondance anciennes phases vers nouvelles (voir Décisions).
  - Créer `src/components/fiches/FicheClubContenu.jsx` : une face = en-tête (logo, Date, Effectif .. + .. GB), tableau GB/DEF/MIL/ATT, Thème, 8 cases Phase de jeu, colonne gauche (JOUR J+1 à J-1, Dominante athlétique, 3 carrés gris séparés par 2 bandes Récupération, Tps effectif, Tps total), 3 terrains entiers quadrillés en SVG avec leur carré blanc. Deux faces : procédés 1-3 et 4-6.
  - Couleur : couleur principale du club via `clubTheme.js` ; sans club : logo Digital Football et rouge du modèle.
  - Brancher le bouton « Fiche club » (`mode_diplome = 'CLUB'`, 6 procédés) et l'aperçu ; ne pas encore toucher au bouton Libre.
  - Comparer côte à côte avec les PNG du modèle et corriger les écarts.
- Ce que je teste pour valider : créer une séance, choisir Fiche club, ouvrir l'aperçu ; comparer avec le papier (disposition, libellés, couleur du club, logo). Tester avec un éducateur sans club.
- Reste à finir :
  - Le bouton « Fiche club » et l'aperçu dans l'application n'ont pas pu être cliqués par Claude (connexion éducateur requise) : le gabarit a été contrôlé en capture avec des données d'essai, le branchement par le build et la lecture du code. À vérifier par Kevin (parcours ci-dessus), y compris avec un éducateur sans club.
  - Écart avec le brief : le modèle papier montre 3 bandes « Récupération » par face (une après chaque carré gris), pas 2. Le gabarit en a 3. Au bloc 4, prévoir 6 champs de récupération (3 par face) au lieu des 4 du plan.
  - Pas encore branchés (blocs suivants) : effectif GB/DEF/MIL/ATT et « Effectif : .. + .. GB » (bloc 3, le composant accepte déjà `joueursParPoste` et `nonRenseignes`), saisie de date/thème/phases/J±/dominante/temps (bloc 4, le composant lit déjà `phases_club`, `jour_match`, `dominante_athletique`), contenu des procédés et schémas (bloc 5, carrés gris et blancs vides pour l'instant).
  - Impression : règles de base ajoutées (page A4 paysage nommée `fc-paysage`, zoom 0,71 comme BMF), à vérifier et affiner au bloc 2.
  - Formulaire : en mode Fiche club le formulaire reste celui de Libre (pas d'encart « Fiche officielle »), les 6 procédés sont créés au clic sur le bouton. Le bouton Libre n'a pas été touché.
  - Logo sans club : icône d'application Digital Football (`/icons/icon-192.png`), fond noir arrondi. À remplacer par un logo plus propre si tu en as un.
  - Rien commité (le plan prévoit le commit au bloc 6, fichiers du chantier seulement).
- Journal : 2026-11-17, modèle réel Sonnet 5.5 (conforme au plan). Créés : `src/constants/phasesJeu.js` (8 phases, CPA à part, correspondance anciennes vers nouvelles), `src/components/fiches/FicheClubContenu.jsx` (2 faces, terrain SVG vertical quadrillé, couleur via variable CSS `--fc`, texte blanc ou encre selon contraste). Modifiés : `src/index.css` (styles `.fc-*`, ajoutés à la fin du fichier) et `src/pages/DashboardEducateur.jsx` (import, bouton « Fiche club » à côté de Libre/BMF/BEF/DEF, aperçu en cours, aperçu d'une fiche enregistrée, impression, orientation PDF paysage, étiquette « Fiche club » dans la liste des séances). Couleur et logo du club lus seulement si l'affiliation est acceptée, sinon rouge du modèle et logo Digital Football. Vérifications : `vite build` OK, ESLint propre sur les 2 nouveaux fichiers, captures de la fiche vierge et remplie (7 joueurs dans une colonne : la page tient en 1060 px).



### Bloc 2 : impression A4 paysage recto verso et PDF
- Statut : fait (2026-11-17), impression sur vraie imprimante à tester par Kevin
- Objectif : rendu papier fidèle depuis le navigateur et dans le PDF exporté.
- Résultat testable : « Imprimer » sort 2 pages A4 paysage (recto, verso), couleurs du club imprimées, rien de coupé ; le PDF téléchargé a les mêmes 2 pages.
- Modèle : sonnet · Effort : medium · Coût estimé : faible
- Pourquoi ce modèle : réglages d'impression ciblés, sans logique délicate.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 2 PLAN-fiche-seance.md`
- Dépend de : bloc 1
- Prérequis : aucun
- Étapes :
  - Styles d'impression dans `src/index.css` : `@page` A4 paysage pour la Fiche club, saut de page entre les 2 faces, `print-color-adjust: exact` pour garder les bandeaux de couleur.
  - `orientationFiche('CLUB')` en paysage et export PDF sur 2 pages via `genererPdfDepuisElement`.
  - Vérifier que les gabarits BMF/BEF/Libre impriment toujours comme avant.
- Ce que je teste pour valider : imprimer une fiche vierge en recto verso sur ma vraie imprimante et la poser sur le modèle papier ; télécharger le PDF.
- Reste à finir : comparer le papier imprimé au modèle (étape 2 des manipulations de Kevin). Le zoom 0,71 laisse 4 mm de marge de sécurité en hauteur : si l'imprimante coupe le bas, réduire à 0,70. Le téléchargement PDF depuis l'application n'a pas été cliqué (connexion éducateur requise) : le code est branché, à vérifier avec une fiche réelle.
- Journal : 2026-11-17, modèle réel Sonnet 5.5 (conforme). Constat : `@page fc-paysage` A4 paysage, saut de page et zoom existaient déjà (bloc 1) et `orientationFiche('CLUB')` aussi. Ajouté : `print-color-adjust: exact` sur toute la fiche (bandeaux de couleur imprimés) et `break-inside: avoid` dans `src/index.css` ; `.fc-page` ajouté à la liste des pages de l'export PDF dans `DashboardEducateur.jsx` (chaque face = sa propre page PDF). Preuve : impression Chrome en ligne de commande d'un gabarit à 2 faces = 2 pages A4 paysage (842x595 pt). `vite build` OK. BMF/BEF/Libre : règles inchangées, leurs sélecteurs n'ont pas été touchés (seule l'ajout de `.fc-page` à la liste PDF).


### Bloc 3 : effectif automatique
- Statut : fait (2026-11-17), contrôle dans l'application à faire par Kevin
- Objectif : remplir le tableau GB/DEF/MIL/ATT avec toute l'équipe choisie.
- Résultat testable : je choisis mon équipe, les prénoms apparaissent dans la bonne colonne sur les 2 faces, « Effectif : 14 + 2 GB » est rempli.
- Modèle : sonnet · Effort : medium · Coût estimé : moyen
- Pourquoi ce modèle : branchement de données existantes, logique simple.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 3 PLAN-fiche-seance.md`
- Dépend de : bloc 1
- Prérequis : équipe test avec joueurs (voir « Ce que je dois fournir »)
- Étapes :
  - Choix de l'équipe dans la fiche (réutiliser le sélecteur d'équipe existant, utile pour un éducateur qui a 2 équipes) ; enregistrer l'équipe choisie dans `fiche_seance`.
  - Ranger les joueurs avec `src/lib/postes.js` ; joueur sans poste sur la ligne « Poste non renseigné ».
  - Tableau extensible au-delà de 5 lignes, texte réduit pour tenir sur la page.
  - « Effectif : .. + .. GB » calculé, modifiable.
- Ce que je teste pour valider : équipe test avec gardien, sans-poste et colonne de plus de 5 ; aperçu et impression.
- Reste à finir : test écran avec l'équipe test (connexion éducateur requise, non cliquable par Claude). Le 1er test réel doit confirmer qu'un joueur de l'effectif commun (catégorie partagée) s'affiche bien. L'effectif est lu en direct : une fiche enregistrée affichera l'équipe telle qu'elle est au moment de l'ouverture (pas figée). Rien commité (commit au bloc 6).
- Journal : 2026-11-17, modèle réel Sonnet 5.5 (conforme). Créés : `src/lib/effectifFicheClub.js` (rangement GB/DEF/MIL/ATT, sans-poste à part, texte « N + N GB »), `src/components/fiches/FicheClubEquipe.jsx` (charge l'effectif de l'équipe de la fiche, `fiche.equipe_id`). Modifié `DashboardEducateur.jsx` : `equipe_id` posé à l'équipe active au clic sur « Fiche club », sélecteur d'équipe (si 2 équipes ou plus) et champ « Effectif » modifiable dans le formulaire, effectif branché sur l'aperçu en cours, l'aperçu enregistré et l'impression. Vérifications : test du rangement (gardien, défenseur/latéral, ailier = ATT, sans poste, 6 milieux : colonne extensible déjà gérée au bloc 1), ESLint propre, `vite build` OK.

### Bloc 4 : saisie de l'en-tête à l'écran
- Statut : à faire
- Objectif : remplir à l'écran tout ce qui n'est pas un procédé.
- Résultat testable : je saisis date, thème, coche des phases, dominante, récupérations, temps ; la case J± est déjà cochée selon le prochain match ; tout se retrouve sur l'aperçu, est enregistré et revient quand je rouvre la séance.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : formulaire dans un fichier de 13 400 lignes, avec brouillon local et sauvegarde à ne pas casser.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 4 PLAN-fiche-seance.md`
- Dépend de : blocs 1 et 3
- Prérequis : un match à venir pour l'équipe test
- Étapes :
  - Nouveaux champs dans `ficheVide` et dans la reprise d'une fiche (vers la ligne 3137) : `phases_club` (liste des 8), `jour_match`, `dominante_athletique`, `recup_1` à `recup_4`, `tps_effectif_recto/verso`, `tps_total_recto/verso`.
  - Formulaire visible seulement en mode Fiche club : 8 cases phases, 6 boutons J±, champs texte libre.
  - J± : calculé d'après le match de l'équipe le plus proche de la date de séance, modifiable.
  - Vérifier enregistrement, réouverture et brouillon local.
- Ce que je teste pour valider : remplir, enregistrer, fermer, rouvrir ; changer la date de séance et voir J± suivre.
- Reste à finir : parcours à cliquer par Kevin (connexion éducateur requise) : remplir, enregistrer, rouvrir, changer la date et voir J± suivre, avec un match à venir. Le calcul J± n'utilise que les matchs de l'équipe active (si la fiche est pour une autre équipe, la case se choisit à la main). Pas de case pour le jour même du match (le modèle papier n'en a pas). Rien commité (commit au bloc 6).
- Journal : 2026-11-17, modèle réel Sonnet 5.5 (conforme). Créés : `src/lib/jourMatchFiche.js` (J± d'après le match le plus proche, à moins de 3 jours, à égalité le match à venir l'emporte ; testé sur 8 cas), `src/components/fiches/ChampsFicheClub.jsx` (8 phases, 6 boutons J±, dominante, 6 récupérations, 4 temps ; utilisé en rédaction et en édition d'une fiche enregistrée). Modifiés : `FicheClubContenu.jsx` (affiche récupérations et temps par face), `index.css` (centrage des cases), `DashboardEducateur.jsx` (champs dans `ficheVide`, formulaire branché aux 2 endroits). Correction au passage : la réouverture d'une fiche club enregistrée perdait `equipe_id` et `effectif_texte` à l'enregistrement (la copie d'édition ne gardait que les champs connus) ; elle garde maintenant tous les champs. Sauvegardes : `backups/*.2026-11-17-bloc4`. Vérifications : ESLint propre, `vite build` OK. Choix : J± choisi à la main (`jour_match_manuel`) n'est plus recalculé, lien « Revenir au calcul automatique ».


### Bloc 5 : les 6 procédés et leurs schémas
- Statut : fait (2026-11-17), parcours dans l'application à cliquer par Kevin
- Objectif : saisir les 6 procédés et remplacer un terrain par son schéma Tactipad.
- Résultat testable : procédé 1 avec schéma = 1er terrain remplacé par le schéma ; procédé 2 sans schéma = terrain quadrillé vierge ; carrés gris = critères de réalisation et organisation ; carrés blancs = consignes et variantes.
- Modèle : sonnet · Effort : medium · Coût estimé : moyen
- Pourquoi ce modèle : réutilise le Tactipad et les champs existants des procédés.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 5 PLAN-fiche-seance.md`
- Dépend de : bloc 4
- Prérequis : aucun
- Étapes :
  - Formulaire de procédé en mode Fiche club : titre, durée, critères de réalisation, organisation (carré gris), consignes, variantes (carré blanc), schéma.
  - Réutiliser les champs existants (`criteres_realisation`, `organisation`, `consignes`, `variables`, `schema_png`) pour garder la compatibilité.
  - Brancher le Tactipad existant (`tactipadModal`) ; le schéma prend la place du terrain dans le même cadre.
  - Texte trop long : réduction de la taille pour rester dans le carré, sans couper.
- Ce que je teste pour valider : remplir 2 procédés (un avec schéma, un sans), aperçu, impression.
- Reste à finir : parcours à cliquer par Kevin (connexion éducateur requise) : remplir 2 procédés (un avec schéma Tactipad, un sans), aperçu, impression. Le schéma Tactipad est un rectangle en largeur ; il est posé en entier au centre du cadre vertical du terrain (rien n'est coupé), donc il laisse du blanc au-dessus et en dessous. Si tu préfères le schéma tourné ou agrandi, à décider au bloc 11. Texte très long : la police descend jusqu'à 6 px minimum ; au-delà, c'est coupé (cas extrême, 600 caractères et plus dans un seul carré). Le champ « But » n'est plus affiché en mode Fiche club (il n'a pas de case sur le modèle). Les boutons « Importer de la bibliothèque » et « Sauvegarder le procédé » restent actifs. Rien commité (commit au bloc 6).
- Journal : 2026-11-17, modèle réel Sonnet 5.5 (conforme). Modifiés : `FicheClubContenu.jsx` (carré gris = titre, durée, nombre de joueurs, organisation, critères de réalisation ; carré blanc = consignes, variantes ; schéma Tactipad à la place du terrain quadrillé ; composant `TexteAjuste` qui réduit la police pour que le texte tienne), `index.css` (styles des carrés et du schéma), `DashboardEducateur.jsx` (formulaire de procédé propre à la Fiche club avec 4 champs regroupés en « carré gris » et « carré blanc » ; édition d'une fiche enregistrée sans le champ But). Champs réutilisés : `organisation`, `criteres_realisation`, `consignes`, `variables`, `schema_png`, donc rien de changé en base. Vérifications : ESLint propre, `vite build` OK, capture d'une fiche d'essai (procédé 1 avec schéma, 2 presque vide, 3 avec texte très long, 4 à 6 vides) : terrain vierge conservé là où il n'y a pas de schéma, texte réduit sans débordement. Sauvegardes : `backups/*.2026-11-17-bloc5`.

### Bloc 6 : la Fiche club remplace la fiche Libre
- Statut : fait côté code (2026-11-17), parcours dans l'application à cliquer par Kevin ; commité en local, PAS poussé (voir Reste à finir)
- Objectif : faire de la Fiche club le modèle par défaut, sans abîmer les 53 fiches Libres existantes.
- Résultat testable : une nouvelle séance s'ouvre en Fiche club ; le bouton Libre a disparu ; une ancienne fiche Libre s'ouvre, s'imprime et se modifie comme avant ; la Fiche club s'affiche correctement côté joueur, club et causerie.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : touche des fiches clients existantes, demande de la rigueur mais pas d'écriture en base.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 6 PLAN-fiche-seance.md`
- Dépend de : blocs 2 à 5
- Prérequis : aucun
- Étapes :
  - `ficheVide` : `mode_diplome = 'CLUB'` et 6 procédés par défaut ; boutons de modèle : Fiche club, BMF, BEF, DEF.
  - Anciennes fiches (`mode_diplome` null) : toujours rendues avec l'ancien gabarit `FicheContenu`, en lecture et en modification.
  - Scan IA d'une fiche manuscrite (vers la ligne 4353) : produit une Fiche club, champs rangés dans les bons carrés.
  - Vérifier l'affichage dans `PublierSeanceJoueurs.jsx`, `CauserieAvantMatch.jsx`, `DashboardClub.jsx`, `SeanceDuJourJoueur.jsx`, `joueur/SeanceAccueil.jsx`.
  - Commit et push des blocs 1 à 6 (fichiers du chantier uniquement).
- Ce que je teste pour valider : nouvelle séance ; ouvrir une de mes anciennes fiches Libres ; une fiche BMF ; voir une Fiche club publiée depuis un compte joueur.
- Reste à finir :
  - Parcours à cliquer par Kevin (connexion éducateur requise) : nouvelle séance (s'ouvre en Fiche club), une ancienne fiche Libre (aperçu, impression, modification), une fiche BMF, une fiche Fiche club publiée puis vue depuis un compte joueur.
  - Push NON fait : ce dépôt est relié à Vercel, un push sur `main` peut mettre en production une fiche jamais cliquée. À pousser sur ton « ok » (ou à regrouper avec le test Vercel du bloc 11).
  - Le champ « But » n'a pas de case sur la Fiche club : pour le scan IA il est rangé en tête du carré gris (organisation) ; pour la génération IA, il est recopié dans les critères de réalisation ; pour un procédé importé de la bibliothèque, il reste enregistré mais invisible sur la fiche.
  - Plus de 6 procédés (génération IA ou bibliothèque) : la fiche reste au gabarit Libre pour ne rien perdre. Cliquer « Fiche club » la bascule, seuls les 6 premiers procédés sont alors placés.
  - Brouillon local : un brouillon enregistré avant ce bloc (ancien mode Libre) se restaure en Libre, comme avant.
- Journal : 2026-11-17, modèle réel Sonnet 5.5 (conforme). `DashboardEducateur.jsx` : `ficheVide` = `mode_diplome 'CLUB'`, 6 procédés, équipe active (effet qui la rattache dès que les équipes sont chargées) ; `procedeVide()` factorisé ; boutons de modèle Fiche club, BMF, BEF, DEF (Libre retiré, un 2e clic sur BMF/BEF/DEF revient à Fiche club, retour vers BMF/BEF/DEF retire les blocs vides en trop pour garder 4 blocs) ; scan IA : fiche manuscrite = Fiche club, formats officiels BMF/BEF/DEF inchangés (4 blocs) ; génération IA et import de procédés de la bibliothèque rangés en Fiche club. Anciennes fiches (`mode_diplome` null) : rendu, aperçu et modification non touchés (même gabarit `FicheContenu`). Côté joueur : `PublierSeanceJoueurs.jsx` copie aussi les variantes et compte un procédé qui n'a que des critères ou des variantes ; `SeanceDuJourJoueur.jsx` affiche « Variantes » (les consignes, organisation et critères passaient déjà). `CauserieAvantMatch.jsx`, `DashboardClub.jsx` et `SeanceAccueil.jsx` ne lisent pas le gabarit de fiche (rien à changer). Vérifications : ESLint 0 erreur (4 avertissements anciens, hors lignes touchées), `vite build` OK.

### Bloc 7 : script SQL des images de fond par phase
- Statut : fait (2026-11-17), script exécuté en production par Kevin
- Objectif : préparer la base pour les 8 phases sans rien perdre, avant de changer le projet sportif.
- Résultat testable : les 46 images de fond existent aussi sous les nouvelles phases ; les anciennes sont toujours là ; le site actuel n'a pas bougé.
- Modèle : opus · Effort : medium · Coût estimé : faible
- Pourquoi ce modèle : écriture en base de production sur des données de clubs, une erreur coûte cher.
- Lancement : `/clear`, puis `/model opus`, puis `/effort medium`, puis `/bloc 7 PLAN-fiche-seance.md`
- Dépend de : bloc 1 (clés des phases dans `phasesJeu.js`)
- Prérequis : sauvegarde lancée par Kevin
- Étapes :
  - Lire en production les contraintes des colonnes `phase` (`terrain_fonds`, `terrain_zones`, `terrain_galerie`, `principes_jeu`, `principes_photos`) : une contrainte qui n'accepte que les anciennes valeurs doit être élargie.
  - Écrire le script : élargir les contraintes si besoin, puis copier chaque image de fond vers ses nouvelles phases (attaque vers les 3 constructions, defense vers les 3 blocs, pressing vers bloc haut en priorité, transitions 1 pour 1), sans écraser ni supprimer. Le présenter à Kevin.
  - Kevin lance la sauvegarde puis le script. Claude contrôle par SELECT et note les chiffres dans le journal.
- Ce que je teste pour valider : le projet sportif d'un club s'affiche toujours comme avant.
- Reste à finir :
  - Kevin : vérifier que le projet sportif du club s'affiche comme avant (images de fond par phase).
  - Les anciennes lignes (attaque, defense, pressing, transition_att, transition_def) restent en base ; leur nettoyage éventuel se décidera après le bloc 8, pas avant.
- Journal : 2026-11-17, modèle réel Opus 5.5 (conforme). Lu en production : 4 contraintes n'acceptent que les anciennes phases (`terrain_fonds`, `terrain_zones`, `terrain_galerie`, `principes_photos` qui a en plus `coups_pied_arretes`) ; `principes_jeu` sans contrainte de phase ; aucune règle RLS ni déclencheur ne dépend de la phase. 46 images, 1 seul club ; le pôle `formation` a à la fois pressing et defense (pressing gardé pour le bloc haut). Code actuel : `PreparationTactiqueJoueur.jsx` et `ProjetSportif.jsx` lisent par nom de phase, les nouvelles lignes sont ignorées tant que le bloc 8 n'est pas fait. Supprimer un fond dans le projet sportif n'efface que la ligne, pas le fichier image : partager la même adresse d'image entre phases est sans risque. Script `supabase_phases_jeu_fonds.sql` : une transaction, contraintes élargies (anciennes valeurs gardées), copies en `on conflict do nothing`, relançable. Attendu : 63 copies (constructions 24, blocs 24, transitions 15). Exécuté par Kevin le 17/11 ; contrôle Claude par SELECT : 109 lignes (46 anciennes intactes + 63 copies, 8 par construction et par bloc, 8 et 7 par transition), 4 contraintes élargies, bloc haut du pôle formation = image Pressing. Commit local, pas poussé (même raison qu'au bloc 6).

### Bloc 8 : projet sportif et côté joueur sur les 8 phases
- Statut : fait (2026-11-17), à contrôler à l'écran par Kevin
- Objectif : le projet sportif du club et la préparation tactique du joueur utilisent les 8 phases.
- Résultat testable : dans le projet sportif d'un club, les onglets sont les 8 phases + CPA offensifs et défensifs, avec les images de fond copiées au bloc 7 ; côté joueur, même chose.
- Modèle : sonnet · Effort : medium · Coût estimé : moyen
- Pourquoi ce modèle : remplacement de listes et affichages, données déjà prêtes.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 8 PLAN-fiche-seance.md`
- Dépend de : bloc 7 (script exécuté en production)
- Prérequis : aucun
- Étapes :
  - `ProjetSportif.jsx` : `PHASES`, `PHASES_ZONES`, `PHASES_AVEC_PHOTO` lus depuis `phasesJeu.js` ; CPA gardés.
  - `PreparationTactiqueJoueur.jsx` et tout autre lecteur de ces tables : mêmes listes.
  - Rechercher les autres usages des anciennes clés (`attaque`, `defense`, `transition_att`, `transition_def`, `pressing`) et les traiter.
- Ce que je teste pour valider : projet sportif d'un club qui avait des images de fond ; la même page côté joueur sur téléphone.
- Reste à finir :
  - Kevin : contrôle à l'écran (projet sportif du club, onglet Zones de terrain : 8 phases + CPA, images de fond présentes ; même page côté joueur sur téléphone). Je n'ai pas pu me connecter à un compte, seules la compilation et la base ont été vérifiées.
  - Les principes texte et les photos de principes n'ont aucune donnée en base : les nouvelles phases démarrent vides, rien à reprendre.
  - Les anciennes lignes (attaque, defense, pressing, transition_att, transition_def) restent en base, plus lues par l'écran ; nettoyage éventuel à décider plus tard.
  - Hors périmètre, notés pour le bloc 10 : `src/constants/principesJeu.js` (sous-dossiers Offensif/Défensif de « Mes séances ») garde son ancien découpage.
- Journal : 2026-11-17, modèle réel Sonnet 5.5 (conforme). `ProjetSportif.jsx` : principes texte = 8 phases + coups de pied arrêtés ; zones de terrain = 8 phases + CPA offensifs + CPA défensifs (l'onglet Pressing disparaît, son image est déjà sur Déf. bloc haut) ; photo de principe possible sur les 6 phases d'organisation (3 constructions + 3 blocs), à la place d'Organisation offensive/défensive. `PreparationTactiqueJoueur.jsx` : onglets Schémas partagés, les 8 phases (noms courts, titre complet au-dessus du terrain), CPA ; lecture de la galerie et des zones par nouvelle clé. Aucun autre lecteur de `terrain_fonds`, `terrain_zones`, `terrain_galerie`, `principes_jeu`, `principes_photos` ni des anciennes clés dans `src` (`principesJeu.js`, `schemasSeanceIA.js` et `translations.js` n'en dépendent pas : autre sujet). Vérifications : `vite build` OK ; ESLint sans nouvelle erreur (les erreurs restantes sont dans des effets déjà là, lignes non modifiées) ; lecture de la production : `terrain_fonds` contient bien les nouvelles phases (8 par construction et par bloc, 8 et 7 par transition) en plus des anciennes.

### Bloc 9 : planification annuelle sur les 8 phases
- Statut : fait (2026-11-17), à contrôler à l'écran par Kevin
- Objectif : le sélecteur phase > thème > principes de la planification suit les 8 phases.
- Résultat testable : dans la planification annuelle, je choisis une des 8 phases et je retrouve les thèmes et principes rangés dessous ; les plans déjà enregistrés s'affichent comme avant.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : reclassement de contenu football à faire avec soin, sans rien inventer.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 9 PLAN-fiche-seance.md`
- Dépend de : bloc 1
- Prérequis : `docs/modeles/methodologie-cannes.pdf` copié par Kevin (sinon classement avec le contenu existant seulement)
- Étapes :
  - Lire les définitions des 8 phases dans le PDF de méthodologie (seulement les pages utiles).
  - Proposer à Kevin un tableau : chaque thème actuel de `methodologie.js` va dans quelle phase. Attendre sa validation.
  - Réorganiser `methodologie.js` et `SelecteurMethodo` dans `PlanificationAnnuelle.jsx` ; le camp offensif ou défensif reste déduit de la phase (rien ne change en base).
- Ce que je teste pour valider : créer un plan annuel, ouvrir un plan existant.
- Reste à finir :
  - Kevin : contrôle à l'écran (planification annuelle, catégorie avec un plan : ouvrir une phase et une semaine existantes ; créer une phase et choisir une des 8 phases). Je n'ai pas pu me connecter à un compte : compilation, données et lecture de la production vérifiées seulement.
  - Transition DEF-OFF n'a aucun thème (aucun contenu existant ne lui correspond, Kevin d'accord) : le sélecteur affiche « Aucun thème rangé dans cette phase pour le moment ». À remplir plus tard avec les thèmes du club (le PDF de méthodologie n'a pas été fourni).
  - En production (lu le 17/11), 2 phases et 12 semaines de plans utilisent les 3 thèmes retirés, et 1 phase et 9 semaines d'anciens thèmes déjà hors liste (« Conserver et maîtriser », « Jouer simple et se rendre disponible ») : leur texte est conservé et affiché ; en modification, le thème apparaît dans la liste de la semaine avec la mention « (thème enregistré avant) », et dans une phase il n'est simplement pas pré-sélectionné.
- Journal : 2026-11-17, modèle réel Sonnet 5.5 (conforme). Le PDF `methodologie-cannes.pdf` était absent : classement avec le contenu existant, tableau validé par Kevin. Rangement : Construction basse = Sortir de la pression, Conserver pour bien progresser ; médiane = Progresser vers l'avant, Maîtriser le tempo ; haute = Déséquilibrer pour créer des occasions, Attaquer la surface pour finir ; Transition DEF-OFF (offensive) = vide ; Transition OFF-DEF (défensive) = Transition défensive ; bloc haut = Pressing haut, Pression sur le porteur et repli ; bloc médian = S'opposer à la progression, Gêner pour récupérer ; bloc bas = Protéger notre but, Être solide dans la surface. Retirés sur décision de Kevin (hors cadre pour le moment) : S'exprimer collectivement, Maîtriser collectivement sans le ballon, Optimiser notre organisation. Noms des thèmes, principes et sous-principes inchangés, rien de nouveau inventé, rien ne change en base. `methodologie.js` : phases lues depuis `phasesJeu.js`, camp déduit de la phase. `PlanificationAnnuelle.jsx` : message pour une phase vide, phases vides masquées dans la liste de la semaine, thème ancien conservé et visible. Vérifications : `vite build` OK, ESLint sans nouvelle erreur (l'erreur restante ligne 902 est ancienne), test des fonctions de recherche sur les noms réels de production. Commit local, pas poussé.

### Bloc 10 : thèmes de séance regroupés par les 8 phases
- Statut : fait (2026-11-17), à contrôler à l'écran par Kevin
- Objectif : les thèmes FFF des séances et des vidéos se rangent sous les 8 phases.
- Résultat testable : dans la fiche séance et la bibliothèque vidéos, les thèmes sont groupés par les 8 phases + CPA ; les anciennes séances et vidéos gardent leur thème.
- Modèle : sonnet · Effort : medium · Coût estimé : faible
- Pourquoi ce modèle : regroupement d'affichage, les valeurs enregistrées ne changent pas.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 10 PLAN-fiche-seance.md`
- Dépend de : bloc 9
- Prérequis : aucun
- Étapes :
  - Proposer à Kevin le tableau thème FFF vers phase (un thème peut aller dans plusieurs phases ; Gardien de but et CPA à part). Attendre sa validation.
  - `themesSeance.js` : regroupement par phase ; adapter les sélecteurs de `DashboardEducateur.jsx` et `BibliothequeVideos.jsx`.
  - Mettre à jour les textes qui citent les anciennes phases (`FicheBMFContenu.jsx`, `TutorielsClub.jsx`, `DashboardEducateur.jsx`).
- Ce que je teste pour valider : choisir un thème dans une nouvelle séance ; ajouter une vidéo ; rouvrir une ancienne séance.
- Reste à finir :
  - Kevin : contrôle à l'écran. Fiche séance (nouvelle fiche, liste « thème ») : les thèmes sont rangés sous les 8 phases + Coups de pied arrêtés + Gardien de but ; fiche Libre ancienne : le thème enregistré s'affiche toujours. Bibliothèque vidéos (ajout d'une vidéo, onglet défensif/offensif de formation) : 10 boutons de phase, puis les thèmes de la phase ; rouvrir une ancienne vidéo : sa phase et son thème sont sélectionnés. Je n'ai pas pu me connecter à un compte : compilation et logique de rangement vérifiées seulement.
  - Les filtres « Offensif / Défensif » des listes (Mes séances, bibliothèque de procédés, vidéos) restent à 2 camps, sur décision de Kevin pour ce bloc. Peut faire un petit bloc à part.
  - Le menu « Phase de jeu » des fiches BMF, BEF, DEF (Attaque, Défense, Transition offensive...) est le champ officiel du diplôme : non touché, volontairement.
  - Erreurs ESLint déjà présentes avant ce bloc (BibliothequeVideos ligne 168, TutorielsClub lignes 488 et 898) : non traitées.
- Journal : 2026-11-17, modèle réel Sonnet 5.5 (conforme). Tableau thème vers phase validé par Kevin (« ok »), sans le PDF de méthodologie : rangement par le sens football. 14 thèmes tous rangés, certains dans plusieurs phases : Construction basse = Conservation, Progression ; médiane = Conservation, Progression, Utilisation et création des espaces, Fixer et renverser, Agrandir l'espace de jeu ; haute = Utilisation et création des espaces, Dribble et élimination, Fixer et renverser, Agrandir l'espace de jeu, Déséquilibrer et finir ; Transition offensive vers défensive = Reformer le bloc équipe, Protéger son but en déséquilibre, Défense en infériorité numérique ; bloc haut = Récupérer le ballon en bloc, Duels ; bloc médian = Récupérer le ballon en bloc, Duels, Se remplacer sur l'axe ballon/but, Reformer le bloc équipe ; bloc bas = Récupérer le ballon en bloc, Duels, Se remplacer sur l'axe ballon/but, Défense en infériorité numérique, Protéger son but en déséquilibre ; Transition défensive vers offensive = Progression, Déséquilibrer et finir, Dribble et élimination ; CPA et Gardien de but à part. `themesSeance.js` : `GROUPES_THEMES_PHASES` et `groupeThemeSeance` ajoutés (valeurs et `THEMES_SEANCE` inchangés, rien ne change en base). `DashboardEducateur.jsx` : 4 listes de thèmes groupées par les 8 phases (nouvelle fiche, séance uploadée, procédé, aperçu en édition). `BibliothequeVideos.jsx` : sélecteur de phase en 10 boutons, la phase affichée à la réouverture est la première contenant le thème. `TutorielsClub.jsx` : deux écrans citent les 8 phases au lieu des anciennes. Vérifications : `vite build` OK, test du rangement en Node (aucun thème oublié). Incident : un `git stash` lancé par erreur par Claude a été défait aussitôt (`stash pop`), aucun fichier perdu, l'ancien stash « reste du travail non commité avant merge » intact.


### Bloc 11 : vérification finale, mise en ligne
- Statut : en cours
- Objectif : tout vérifier en conditions réelles et publier.
- Résultat testable : parcours complet validé sur la version de test Vercel, puis en production après mon « ok ».
- Modèle : sonnet · Effort : medium · Coût estimé : moyen
- Pourquoi ce modèle : contrôle et corrections ciblées.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 11 PLAN-fiche-seance.md`
- Dépend de : blocs 0 à 10
- Prérequis : imprimante recto verso
- Étapes :
  - Build, puis parcours : éducateur avec club, éducateur sans club, ancienne fiche Libre, fiche BMF, projet sportif, planification, côté joueur, téléphone, mode sombre.
  - Impression réelle recto verso.
  - Ranger `backups/` du chantier, mettre à jour BRIEF et mémoire.
  - Commit et push des blocs 7 à 11 ; déploiement via `vercel-deploy` (test d'abord).
- Ce que je teste pour valider : la liste du compte rendu, sur la version de test.
- Reste à finir :
  - Kevin : parcours complet sur écran (éducateur avec club, sans club, ancienne Libre, BMF, projet sportif, planification, côté joueur, téléphone, mode sombre) : je ne peux pas me connecter à un compte.
  - Kevin : impression réelle recto verso.
  - Version de test Vercel : la commande `vercel` n'est pas installée ; le dossier contient aussi le travail non commité du dashboard joueur v3 (il partirait dans le test). Décision attendue de Kevin.
  - Pousser les 3 commits locaux (blocs 9 et 10) seulement après ton « ok » pour la mise en ligne.
- Journal : 2026-11-17, modèle réel Sonnet 5.5 (conforme). `vite build` OK. Blocs 7 à 8 déjà poussés, blocs 9 et 10 commités en local (3 commits, non poussés). `backups/` du chantier rangés dans `backups/fiche-seance/` (les sauvegardes du dashboard joueur v3 laissées en place). BRIEF mis à jour. Rien déployé, rien poussé.

### Bloc 12 (optionnel) : [IDÉE] fiche vierge du jour en un clic
- Statut : fait (code et build OK, test écran par Kevin)
- Objectif : pour les coachs qui écrivent au stylo, un bouton « Imprimer une fiche vierge » qui sort directement la fiche avec logo, couleur, date, effectif et J± remplis, sans passer par le formulaire.
- Résultat testable : depuis le planning de l'équipe, 1 clic = 2 pages prêtes à imprimer.
- Modèle : sonnet · Effort : medium · Coût estimé : faible
- Pourquoi ce modèle : réutilise le gabarit et l'impression des blocs 1 à 3.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 12 PLAN-fiche-seance.md`
- Dépend de : bloc 6
- Prérequis : aucun
- Étapes :
  - Bouton dans le planning ou la séance du jour de l'éducateur.
  - Fiche remplie automatiquement (équipe, date, J±), impression directe.
- Ce que je teste pour valider : imprimer la fiche vierge du prochain entraînement.
- Reste à finir :
  - Kevin : tester à l'écran (Planning ou Mes séances, bouton fiche d'un entraînement, « Imprimer une fiche vierge pour ce jour ») : je ne peux pas me connecter.
  - Le bouton est dans la fenêtre « Importer une fiche » d'un entraînement (accessible depuis l'accueil, le planning et la liste des entraînements). Pas de bouton séparé sur la carte.
- Journal : 2026-11-17, modèle réel Sonnet 5.5 (conforme). Bouton ajouté dans `DashboardEducateur.jsx` : fiche Fiche club vierge avec date de l'entraînement, équipe active, logo, couleur, effectif (automatique) et J± (calculé d'après les matchs), impression directe via `window.print()`, la fiche en cours de rédaction n'est pas touchée. Clé de traduction `ent_imprimer_fiche_vierge` (6 langues). `vite build` OK. Commité, non poussé.
