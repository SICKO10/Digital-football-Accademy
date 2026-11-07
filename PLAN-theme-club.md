# PLAN : Thème « couleurs du club » + refonte de l'accueil éducateur
Date : 2026-11-07 · Brief : BRIEF-theme-club.md

Les dashboards joueur, éducateur et club prennent la couleur du club, avec un thème clair vert Digital Football par défaut et le sombre toujours disponible. L'accueil de l'espace éducateur est refait de haut en bas.

## Décisions complémentaires (2026-11-07, au /plan)
- **Clair par défaut pour les nouveaux seulement** : qui n'a jamais touché le bouton soleil/lune arrive en clair ; qui a déjà choisi le sombre le garde.
- **Clair par défaut partout** (le réglage est commun aux 5 espaces) : parent et dirigeant arrivent aussi en clair, avec leurs couleurs claires actuelles inchangées et sans couleur du club.
- **Changement de couleur du club** : visible au prochain chargement de la page. Pas de temps réel.
- **Branche** : on revient sur `main` (règle « une seule branche »). La branche `proto/fff-sync` et son commit de prototype restent intacts, à part.
- **Menu sobre du 2026-11-06** (non commité) : sert de base technique, n'est jamais commité seul ; il est remplacé au bloc 4.
- **Tester des couleurs extrêmes sans toucher la production** : un réglage réservé au mode développement (`?couleurClub=` dans l'adresse locale), qui n'existe pas en ligne. On ne modifie jamais la couleur enregistrée d'un vrai club pour tester.

## Ce que je dois fournir
| Élément | Pourquoi | Où le trouver | Nécessaire avant |
|---|---|---|---|
| Ton compte éducateur relié à l'AS Cannes | Vérifier le passage du bleu au rouge du club | Tu te connectes toi-même sur http://localhost:5173 (Claude ne manipule pas de mot de passe) | Bloc 3 |
| Un compte joueur affilié à l'AS Cannes | Vérifier que joueur et éducateur voient la même couleur | Un joueur réel qui accepte, ou un compte test que tu crées | Bloc 2 |
| Un compte club : AS Cannes (lecture seule) et un club sans couleurs | Vérifier le dashboard club et le vert par défaut | Comptes existants | Bloc 2 |
| Ta validation visuelle à chaque bloc | Les tests d'écran se font connecté, donc par toi | Navigateur | Chaque bloc |

Si aucun compte joueur AS Cannes n'est disponible au bloc 2 : la vérification joueur se fait avec un joueur d'un autre club ayant des couleurs, plus l'adresse `?couleurClub=` pour simuler le rouge.

## Manipulations à faire moi-même
1. Avant le bloc 2 : avoir sous la main les identifiants des comptes ci-dessus (tu te connectes toi-même).
2. À chaque fin de bloc : lancer le site local si Claude te le demande, regarder les écrans listés, répondre « ok » ou dire ce qui ne va pas.
3. À chaque « ok » : Claude commite et pousse sur `main`. Aucune mise en ligne Vercel avant le bloc 8.
4. Après le bloc 8 : décider de la mise en ligne (version de test Vercel d'abord, puis production sur ton « ok »).

Aucune migration ni modification de la base n'est prévue : pas besoin de lancer `~/Sauvegardes-DigitalFootball/sauvegarder.sh` pour ce chantier.

## Répartition suggérée
Je ne vois pas ta barre de statut d'ici : regarde « 5h » avant chaque bloc (sous 50 % pour un bloc à coût élevé).
- Jour 1 : blocs 0 et 1 (faible + moyen).
- Jour 2 : blocs 2 et 3 (moyen + élevé), éventuellement sur deux fenêtres de 5 h.
- Jour 3 : bloc 4 (menu).
- Jour 4 : blocs 5 et 6 (accueil éducateur, partie haute et milieu).
- Jour 5 : blocs 7 et 8 (accueil, partie basse, puis vérification finale).
- Plus tard, si tu veux : bloc 9 optionnel.

Rappel : `/clear` et une session neuve par bloc. Commande de lancement : `/bloc N PLAN-theme-club.md`.

## Repères techniques (pour chaque bloc, éviter de relire)
- Thème : `src/lib/theme.js` (`useColors`, `ThemeContext`), `src/lib/ThemeProvider.jsx` (défaut `'sombre'` ligne 5, clé `df_dashboard_theme`), `src/tokens.js` (`colors`, `colorsClaire`).
- Couleurs en base : `profiles.couleur_principale`, `couleur_secondaire`, exposées par la vue `profiles_public`.
- Éducateur : `chargerClubAffiliation` (DashboardEducateur ~2121). Joueur : lecture de `profiles_public` du club (~1048). Accueil éducateur : `AccueilEducateur` (DashboardEducateur ~1143 à 1777).
- Palette du club (bloc 1) : `calculerPalette(hex, mode)` et `variablesCss(palette)` dans `src/lib/paletteClub.js` ; dans un composant, `useClubPalette()` (palette selon le thème actuel) et `useClubTheme().setCouleurClub(hex)` pour donner la couleur du club (null = vert) depuis `src/lib/clubTheme.js`. Statuts = `success`, `warning`, `danger` de la palette (constantes, jamais le club).
- Menu sobre actuel : `src/lib/menuLateral.js` + les 3 dashboards (non commité).
- Fichiers énormes (Educateur 13 349 lignes, Club 7 535, Joueur 5 710) : chercher avec grep, lire par tranches, jamais en entier.
- Référence lint (2026-11-07, avec le menu sobre) : **173 erreurs, 70 avertissements**. Ne doit pas augmenter.

## Blocs

### Bloc 0 : Mise en place
- Statut : fait
- Objectif : sauvegarder le travail non commité, revenir sur `main`, noter les références de build et de lint.
- Résultat testable : `git status` sur `main` montre les mêmes modifications qu'avant ; une copie datée existe ; le site local s'ouvre comme avant.
- Modèle : sonnet · Effort : low · Coût estimé : faible
- Pourquoi ce modèle : manipulation Git avec du travail non commité, une erreur ferait perdre le menu sobre ; Sonnet pour la prudence, effort bas car court.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort low`, puis `/bloc 0 PLAN-theme-club.md`
- Dépend de : rien
- Prérequis : aucun
- Étapes :
  - Copie de sauvegarde : `git diff` et `src/lib/menuLateral.js` dans `~/Sauvegardes-DigitalFootball/theme-club-2026-11-07/` (avec BRIEF-theme-club.md et BRIEF-joueur-v2.md).
  - `git switch main` en emportant les modifications (le commit prototype ne touche que `prototypes/fff-sync/`, pas de conflit attendu). Si Git refuse : s'arrêter et expliquer, ne rien forcer.
  - Vérifier que `proto/fff-sync` existe toujours avec son commit.
  - `npm run build` et `npx eslint .` : noter les chiffres dans le journal.
- Ce que je teste pour valider : le site local s'ouvre, le menu sobre est toujours là sur les 3 dashboards.
- Reste à finir :
- Journal : 2026-11-07, Sonnet 5.5. Copie dans ~/Sauvegardes-DigitalFootball/theme-club-2026-11-07/ (diff + menuLateral.js + briefs + plan). `git switch main` sans conflit, modifications intactes. proto/fff-sync toujours là (fa2c593). Build OK ; lint 173 erreurs / 70 avertissements (= référence).

### Bloc 1 : Moteur de palette et clair par défaut
- Statut : fait (en attente de ta validation visuelle)
- Objectif : un seul fichier qui calcule toute la palette à partir de la couleur du club (avec garde-fou de contraste), et le clair par défaut pour les nouveaux.
- Résultat testable : en navigation privée (aucun choix enregistré), les dashboards s'ouvrent en clair ; ton navigateur habituel garde ton choix. Une page d'aperçu locale montre les palettes calculées pour vert par défaut, rouge Cannes, jaune très clair, bleu nuit presque noir.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : calcul de couleurs et de contraste à poser proprement une fois pour toutes, sans être une logique critique (aucune donnée, aucun paiement).
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 1 PLAN-theme-club.md`
- Dépend de : bloc 0
- Prérequis : aucun
- Étapes :
  - Créer `src/lib/paletteClub.js` : à partir d'une couleur hex (ou rien), produire `primary`, `primary-dark`, `primary-soft`, `menu-bg`, `menu-text` et les variables du brief, en clair et en sombre. Couleur absente ou invalide : vert `#4ADE80`.
  - Garde-fou : contraste du texte blanc sur `primary` et de `primary-dark` sur fond clair (seuil WCAG 4,5:1 pour le texte, 3:1 pour les grands éléments) ; ajuster en assombrissant ou éclaircissant, sinon retour au vert.
  - Ajouter un contexte léger (`ClubThemeContext` ou équivalent) et un hook ; le réglage `?couleurClub=` lu seulement si `import.meta.env.DEV`.
  - `ThemeProvider.jsx` : défaut `'claire'` quand rien n'est enregistré ; le choix existant reste prioritaire.
  - Page d'aperçu des palettes dans le dossier de travail temporaire (hors du site), et vérification que les statuts (vert `#16A34A`, orange, rouge d'erreur) sont des constantes séparées, jamais dérivées du club.
- Ce que je teste pour valider : navigation privée = clair ; navigateur habituel = inchangé ; la page d'aperçu est lisible pour les 4 couleurs.
- Reste à finir : texte secondaire `#7A7A85` du brief = contraste 4,2:1 sur carte blanche et 3,9:1 sur écran (sous le 4,5:1 recommandé pour du petit texte). Gardé tel que voulu ; à assombrir un peu (ex. `#6B6B76`) si tu le trouves trop pâle au bloc 2.
- Journal : 2026-11-07, Sonnet 5.5. Créé `src/lib/paletteClub.js` (calcul + garde-fou), `src/lib/clubTheme.js` (contexte + hooks `useClubTheme`, `useClubPalette`), `ThemeProvider.jsx` (clair par défaut, palette du club, `?couleurClub=` seulement en développement), `tests/paletteClub.test.js` (24 tests). Page d'aperçu hors du site : `/private/tmp/claude-501/-Users-kevinamorim-digital-football/ba23f25e-946d-41c3-a442-1f38133d4714/scratchpad/apercu-palettes.html`. Build OK, `npm test` 131/131, lint inchangé (173 erreurs / 70 avertissements), fichiers touchés sans erreur de lint. `?couleurClub=` absent du site construit. Décisions : vert par défaut gardé tel quel (référence de marque) ; blanc ou gris très clair = retour au vert (`raison: 'trop-pale'`) ; couleur ajustée = `ajustee: true`. Ajout par rapport au plan : `primaryText` (texte coloré lisible, à utiliser pour l'accent de `useColors`), `onPrimary` (texte sur bouton couleur du club : blanc ou encre).

### Bloc 2 : Couleur du club dans les dashboards joueur et club
- Statut : fait (en attente de ta validation visuelle)
- Objectif : joueur et club chargent la couleur du club et l'appliquent (variables CSS à la racine, accent de `useColors`), avec la nouvelle palette claire neutre.
- Résultat testable : un joueur AS Cannes voit l'accent rouge ; un joueur d'un club sans couleurs voit le vert ; le club voit sa couleur et la nouvelle couleur après l'avoir enregistrée ; parent et dirigeant inchangés.
- Modèle : sonnet · Effort : medium · Coût estimé : moyen
- Pourquoi ce modèle : branchement guidé par le bloc 1, sans logique nouvelle.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 2 PLAN-theme-club.md`
- Dépend de : bloc 1
- Prérequis : comptes joueur et club disponibles (voir tableau)
- Étapes :
  - Joueur : ajouter `couleur_principale` à la lecture de `profiles_public` du club (~1048) ; joueur non affilié = vert par défaut.
  - Club : utiliser sa propre `couleur_principale` ; après enregistrement dans ses réglages, appliquer tout de suite dans sa session.
  - Poser les variables CSS à la racine des 2 dashboards et fournir à `useColors` la palette claire neutre (`#F5F5F7`, cartes `#FFFFFF`, bordure `#E7E7EB`, texte `#16161A` / `#7A7A85`) + accent du club, uniquement dans ces dashboards (parent et dirigeant gardent `colorsClaire`).
  - Vérifier que les couleurs de statut (victoire, présent, OUVERT, erreurs) ne suivent pas le club.
  - Build sans erreur, lint pas pire que la référence.
- Ce que je teste pour valider : joueur AS Cannes en clair et en sombre ; joueur sans club ; club AS Cannes ; un écran parent ; `?couleurClub=%23FFF59D` (jaune très clair) en local.
- Reste à finir : (1) Dans le dashboard joueur, le vert « marque » et le vert « statut » étaient le même `colors.accent.green` : j'ai basculé en `accent.success` (vert fixe) les lignes qui le mélangent à rouge/orange (seuils de présence, notes, victoires, présent, accepté), mais il peut en rester d'isolés (un vert de réussite seul) qui suivent le club : à repérer à l'écran. (2) Dashboard club : seuls les endroits qui utilisaient `couleurPrincipale` suivent le club ; ses autres verts (bilan V, recettes, présence) restent verts de statut, voulu. (3) Un menu sobre, des pages internes et des composants importés sans `useColors` gardent leur ancienne apparence (traités aux blocs 4 et suivants). (4) Texte secondaire `#7A7A85` (contraste 4,2:1) appliqué tel que voulu.
- Journal : 2026-11-07, Sonnet 5.5. Nouveau contexte « portée » (`PorteeThemeClub` dans App.jsx autour de /dashboard-joueur et /club) : pose les variables CSS du bloc 1 et active dans `useColors` la palette claire neutre + couleur du club (en sombre : fonds sombres actuels + accent du club). Parent (qui affiche le joueur en lecture seule) et dirigeant ne sont pas dans la portée : inchangés. `useDonnerCouleurClub(hex)` (clubTheme.js) : joueur lit `couleur_principale` du club affilié via `profiles_public` (non affilié = vert) ; club lit la sienne et `setClub` après enregistrement met à jour tout de suite. Tokens : ajout de `accent.brand`, `accent.onBrand`, `accent.success`. En clair l'accent utilise la version lisible sur fond blanc (`primaryText`) et le texte posé dessus est recalculé (jaune pâle = fond olive, texte blanc). Joueur : ~28 `#4ade80` codés en dur remplacés par l'accent, texte noir sur fond couleur du club remplacé par `onBrand`. Sauvegardes avant bloc : ~/Sauvegardes-DigitalFootball/theme-club-2026-11-07/*.avant-bloc2.jsx. Build OK, `npm test` 131/131, lint 173 erreurs / 70 avertissements (= référence). Écart : pas de test d'écran possible côté Claude (connexion obligatoire). Attention : une autre session (plan joueur-v2) modifie en même temps DashboardJoueur.jsx et src/components/joueur/* ; le commit du bloc 2 devra tenir compte de ça.

### Bloc 3 : Couleur du club dans le dashboard éducateur (fin du bleu)
- Statut : fait (en attente de ta validation visuelle)
- Objectif : le bleu propre à l'éducateur disparaît, remplacé par la couleur du club, sans toucher aux couleurs de statut.
- Résultat testable : ton compte éducateur AS Cannes est en rouge du club sur tout son espace ; un éducateur sans club est en vert ; victoires, présences et erreurs gardent leurs couleurs.
- Modèle : sonnet · Effort : high · Coût estimé : élevé
- Pourquoi ce modèle : fichier de 13 000 lignes, il faut distinguer au cas par cas le bleu « marque » du bleu « information » ; méticuleux plutôt que difficile.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 3 PLAN-theme-club.md`
- Dépend de : bloc 2
- Prérequis : ton compte éducateur AS Cannes
- Étapes :
  - Repérer avec grep où l'accent bleu de l'éducateur est défini (tokens ou constante locale) et le faire pointer vers l'accent du club.
  - Lister les bleus codés en dur restants ; ne changer que ceux qui jouent le rôle d'accent de marque, laisser les autres et les noter dans le journal.
  - Brancher `chargerClubAffiliation` (~2121) sur le contexte du bloc 1 et poser les variables CSS à la racine.
  - Mêmes vérifications sombre / clair / statuts / build / lint qu'au bloc 2.
- Ce que je teste pour valider : 5 onglets éducateur au choix (séances, matchs, effectif, tactique, vidéos) en clair et en sombre ; un éducateur sans club.
- Reste à finir : (1) Les composants importés dans l'espace éducateur (santé, vidéos, alertes, scanner...) utilisent aussi `accent.blue` : dans cet espace ils prennent la couleur du club, ce qui est voulu pour les boutons et onglets ; j'ai seulement figé en bleu d'information les 4 bleus « statut » repérés (convoqué du sondage, notification d'info, retour programmé, type championnat). D'autres bleus isolés peuvent encore suivre le club : à repérer à l'écran. (2) Bleus d'information laissés fixes dans DashboardEducateur : convoqué, défenseurs, licencié(s), passes décisives, droit « lecture », diplôme BEF, « Distribué », transfert coach, catégories de l'évaluation (module-level) et camembert de présence. (3) Le menu sobre et les pages hors espace éducateur restent à traiter aux blocs 4 et suivants. (4) Aucun test d'écran possible côté Claude (connexion obligatoire).
- Journal : 2026-11-07, Sonnet 5.5. Nouveau jeton `accent.info` (bleu fixe `#60a5fa`) dans tokens.js ; `colorsAvecClub` accepte la portée `'educateur'` (vert = statut inchangé, `accent.blue` = couleur du club). App.jsx : `/educateur` enveloppé dans `PorteeThemeClub accentVert="educateur"`. DashboardEducateur : `useDonnerCouleurClub` branché sur `clubAffiliation` (lien `accepte` seulement ; sans club = vert). 167 `accent.blue` suivent maintenant le club ; 36 passés en `accent.info` (statuts) ; 17 lignes de `#60a5fa` codés en dur (+ opacité) basculées sur l'accent ; 25 textes noirs posés sur fond couleur du club remplacés par `accent.onBrand` (lisible sur rouge foncé comme sur jaune). Sauvegardes : ~/Sauvegardes-DigitalFootball/theme-club-2026-11-07/*.avant-bloc3.*. Build OK, `npm test` 131/131, lint 173 erreurs / 70 avertissements (= référence).

### Bloc 4 : Menu plein couleur du club (3 dashboards)
- Statut : fait (en attente de ta validation visuelle)
- Objectif : remplacer le menu sobre par le menu plein couleur du club du brief, sur joueur, éducateur et club.
- Résultat testable : fond couleur du club, logo rond blanc à gauche de « Digital Football », entrée active en bloc blanc, pastilles blanches, sur bureau, tablette (icônes seules) et mobile (tiroir).
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : visuel avec trois modes d'affichage à préserver dans trois fichiers.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 4 PLAN-theme-club.md`
- Dépend de : blocs 2 et 3
- Prérequis : aucun
- Étapes :
  - Réécrire `src/lib/menuLateral.js` sur les variables `--menu-bg`, `--menu-text`, `--club-primary` : texte blanc atténué, titres de section plus clairs, survol blanc ~12 %, actif bloc blanc avec texte et icône couleur du club, pastilles fond blanc chiffre couleur du club.
  - En-tête du menu : logo du club dans un rond blanc (logo Digital Football si pas de logo club) à gauche de « Digital Football ».
  - Éducateur : sélecteur d'équipes (active en pastille blanche, autres en contour blanc), « Vue Club » en contour blanc.
  - Garder entrées, ordre, verrous et logique de chaque dashboard ; vérifier tablette (actif lisible en icône seule) et tiroir mobile ; en sombre, menu `#07130D` ou couleur du club assombrie selon le rendu, à montrer.
  - Retirer ce qui reste du menu sobre devenu inutile.
- Ce que je teste pour valider : les 3 dashboards, fenêtre large, fenêtre réduite (tablette), téléphone ou mode mobile du navigateur, clair et sombre, club sans couleur.
- Reste à finir : (1) Dashboard club, tiroir mobile : la rangée de contrôles (drapeaux, « Vue éducateur / joueur / parent », « Personnaliser ») est partagée avec la barre du haut et garde son apparence claire, posée telle quelle sur le fond couleur du club ; à regarder sur téléphone. (2) Les emojis des boutons « Vue ... » et du cadenas existaient avant, laissés tels quels. (3) Mode tablette (icônes seules) de l'éducateur : le code est conservé et stylé, mais ce mode est désactivé aujourd'hui dans le code (`isTablet = false`), donc rien à voir à l'écran. (4) Le contour d'activité de `.dj-cliquable` (écran joueur) lisait `--df-accent`, qui n'est plus posée par le menu : il retombe sur l'accent, sans effet visible.
- Journal : 2026-11-07, Sonnet 5.5. `menuLateral.js` réécrit (variables `--menu-*`, classes `df-menu`, `df-nav-*`, `df-menu-pastille`, `df-menu-contour`, `df-menu-chip`) ; nouveau `src/components/EnTeteMenu.jsx` (rond blanc + « Digital Football », « DF » dans le rond quand le club n'a pas de logo). Joueur : logo du club affilié (`clubAffilieInfo.avatar_url`) ; éducateur : logo du club (lien accepté) + pastilles d'équipes blanche/contour ; club : son logo, puis nom et compteurs du club sous l'en-tête (écart voulu : l'identité du club reste visible). Badge de l'entrée active inversé (fond couleur du club, chiffre blanc) pour rester lisible sur le bloc blanc ; le badge rouge du club (demandes en attente) devient blanc comme les autres. Sauvegardes : ~/Sauvegardes-DigitalFootball/theme-club-2026-11-07/*.avant-bloc4.*. Build OK, `npm test` 139/139, lint 173 erreurs / 70 avertissements (= référence, une variable devenue inutile retirée). Aperçu hors du site (6 cas : vert, rouge Cannes, jaune très clair, bleu nuit en clair ; rouge et vert en sombre) : `/private/tmp/claude-501/-Users-kevinamorim-digital-football/b73eee2c-3d87-4670-8bac-da36e9e2d828/scratchpad/apercu-menu.png`. En sombre le menu est la couleur du club presque noire (calcul du bloc 1), à valider à l'œil. Écart : aucun test d'écran connecté possible côté Claude.

### Bloc 5 : Accueil éducateur, partie haute
- Statut : fait (en attente de ta validation visuelle)
- Objectif : en-tête, 4 chiffres clés, prochaine séance, bandeau briefing/alerte (points 1 à 4 du brief).
- Résultat testable : l'accueil éducateur affiche « Bonjour {prénom} » avec un seul bouton « + Nouvelle séance », 4 cartes de même taille (Effectif, Bilan avec barre V/N/D, Présence en %, Match du week-end plein couleur du club), la carte prochaine séance avec trait couleur du club, et le bandeau orangé.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : remaniement de présentation sur données existantes, avec vérification que les chiffres sont vraiment calculés.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 5 PLAN-theme-club.md`
- Dépend de : bloc 4
- Prérequis : aucun
- Étapes :
  - Lire seulement `AccueilEducateur` (~1143 à 1777) et les fonctions de données qu'il appelle.
  - Vérifier d'abord : présence en %, compteurs présents / absents / en attente de la prochaine séance. S'ils n'existent pas : le dire, les calculer depuis les données déjà chargées si c'est possible sans nouvelle requête lourde, sinon ne pas afficher la carte et en parler à Kevin. Rien d'inventé.
  - Construire les points 1 à 4 avec les variables du thème ; « Fiche séance » et « Joueurs présents » ouvrent les écrans existants (aucun bouton sans effet).
  - Les sections non encore refaites restent en place, en dessous, et fonctionnent.
  - Disposition tablette et mobile (les 4 cartes passent en 2 x 2 puis en colonne).
- Ce que je teste pour valider : accueil avec et sans séance à venir, avec et sans match le week-end, clair et sombre, largeur tablette.
- Reste à finir : (1) Le brief demande « défaites » et « absents » en couleur du club : j'ai gardé le rouge de statut (identique pour AS Cannes, mais un club vert n'aura pas de défaites vertes à côté des victoires vertes). (2) La carte « Match du week-end » s'appelle « Prochain match » quand le prochain match n'est pas ce samedi ou dimanche (sinon le titre serait faux). (3) Le bandeau orangé n'apparaît que s'il y a au moins une alerte (avant : une ligne « Aucune alerte »). (4) Planning, Club, classement, actions rapides et alertes restent dans leur ancienne version, sous le bandeau (blocs 6 et 7). (5) Aucun test d'écran connecté possible côté Claude.
- Journal : 2026-11-07, Sonnet 5.5. `AccueilEducateur` (DashboardEducateur) : en-tête (date du jour, « Bonjour {prénom} », bouton « + Nouvelle séance » qui ouvre le formulaire de séance, via la nouvelle propriété `onNouvelleSeance`), 4 cartes de même taille en grille (4 colonnes, 2 x 2 sous 1200 px, 1 colonne sous 480 px) : Effectif, Bilan (pourcentage de victoires + barre V/N/D, statuts fixes), Présence (taux de la semaine, vert de statut, « — » s'il n'y a pas de séance passée), Match plein couleur du club ; carte prochaine séance (trait 4 px couleur du club, jour en grand en couleur du club, présents / absents / en attente sur une ligne, « Fiche séance » ou « Attacher une fiche » en plein, « Joueurs présents » en contour) ; bandeau orangé (clair `#FFF4E5` / `#7A4A06`, version adaptée en sombre) avec lien « Voir ». Vérifié : la présence en %, les compteurs présents / absents / en attente et le résumé des alertes existaient déjà, aucun chiffre inventé ni nouvelle requête. Retirés (devenus inutiles) : `DonutVND`, avatar du club et titre « Accueil » de l'accueil, ligne médiane décorative, eyebrow « Briefing de la semaine ». Sauvegarde : ~/Sauvegardes-DigitalFootball/theme-club-2026-11-07/DashboardEducateur.avant-bloc5.jsx. Build OK, `npm test` OK, lint 173 erreurs / 70 avertissements (= référence).

### Bloc 6 : Accueil éducateur, partie milieu
- Statut : fait (en attente de ta validation visuelle)
- Objectif : planning de la semaine en 7 colonnes, carte déplacement, vrai podium du classement du mois (points 5 à 7 du brief).
- Résultat testable : planning 7 jours (séances en couleur douce, séance du jour et match en couleur pleine), déplacement avec pastille « J-x » et bouton « Remplir la fiche », podium 1er au centre plus haut, rappel du mois précédent sur une ligne.
- Modèle : sonnet · Effort : medium · Coût estimé : moyen
- Pourquoi ce modèle : présentation de données existantes, modèle de composant posé au bloc 5.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 6 PLAN-theme-club.md`
- Dépend de : bloc 5
- Prérequis : aucun
- Étapes :
  - Planning : 7 colonnes à partir des données déjà chargées ; colonnes défilantes ou empilées sur mobile.
  - Déplacement : icône bus sur fond `-soft`, adversaire, date et heure de départ, « J-x » calculé, bouton vers la fiche existante.
  - Podium : 2e à gauche, 1er au centre (avatar plus grand bordé couleur du club, marche pleine couleur du club), 3e à droite (marches grises) ; gérer moins de 3 classés.
  - Supprimer les anciennes versions de ces sections.
- Ce que je teste pour valider : semaine avec et sans match, pas de déplacement prévu, classement avec 0, 1 et 3 joueurs si possible, clair et sombre.
- Reste à finir : (1) Le planning de l'accueil n'a plus la vue « Mois » (le widget partagé reste intact pour joueur et club) : « Voir tout » mène à l'onglet Entraînements ; à rétablir si tu y tiens. (2) Match : plein couleur du club seulement s'il tombe le samedi ou le dimanche, sinon teinte neutre. (3) La carte déplacement affiche la destination (`lieu_destination`), il n'existe pas de lien en base entre un déplacement et un match, donc pas de nom d'adversaire garanti. (4) La pastille « J-x » est maintenant calculée par jours calendaires (avant : arrondi sur 24 h, qui pouvait donner un jour d'écart). (5) La fiche déplacement ouverte par le bouton garde son ancienne apparence (modale, avec emojis existants). (6) Aucun test d'écran connecté possible côté Claude.
- Journal : 2026-11-07, Sonnet 5.5. Nouveau composant `PlanningSemaineAccueil` (DashboardEducateur) : 7 colonnes lundi à dimanche, navigation semaine précédente / suivante / aujourd'hui, séances en teinte douce (`--club-primary-soft` / `-dark`), séance du jour et match du week-end en couleur pleine, colonnes qui défilent sur petit écran. `DeplacementsAssignesWidget` (utilisé seulement par l'accueil éducateur) refait : icône bus sur fond doux, destination, date et heure de départ, pastille J-x / Demain / Aujourd'hui, bouton « Remplir la fiche » en contour couleur du club (« Fiche remplie » si déjà fait). Podium refait : 3 emplacements fixes, 2e gauche / 1er centre (avatar plus grand bordé couleur du club, marche pleine couleur du club) / 3e droite (marches grises plus basses), places vides laissées vides avec moins de 3 classés ; rappel du mois précédent réduit à une ligne discrète. Anciennes versions retirées (import du widget de planning partagé, ancien podium). Sauvegardes : ~/Sauvegardes-DigitalFootball/theme-club-2026-11-07/*.avant-bloc6.jsx. Build OK, `npm test` 142/142, lint 173 erreurs / 70 avertissements (= référence).

### Bloc 7 : Accueil éducateur, partie basse
- Statut : en cours
- Objectif : actions rapides, carte d'alertes compacte, bandeau partenaire (points 8 à 10 du brief).
- Résultat testable : 4 boutons d'action de même largeur avec l'action « à préparer » surlignée ; une seule carte d'alertes en liste (deux petits cartons jaunes dessinés, nom, « prochain jaune = suspension », coche « vu ») à la place des trois cartes tronquées ; bandeau partenaire sobre.
- Modèle : sonnet · Effort : medium · Coût estimé : moyen
- Pourquoi ce modèle : présentation, la coche « vu » réutilise le mécanisme d'alertes masquées existant.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 7 PLAN-theme-club.md`
- Dépend de : bloc 6
- Prérequis : aucun
- Étapes :
  - Actions rapides : reprendre les actions existantes, déterminer laquelle est « à préparer » selon une règle simple déjà disponible (prochain match sans composition, etc.), sinon aucune surlignée.
  - Alertes : une ligne par joueur, cartons dessinés en CSS ou SVG (pas d'emoji), coche « vu » branchée sur l'existant (table `alertes_masquees` si c'est elle qui sert déjà), sans nouvelle table.
  - Partenaire : bandeau blanc à bordure fine, même donnée qu'aujourd'hui.
  - Relire l'accueil complet de haut en bas en sombre.
- Ce que je teste pour valider : alertes avec 0, 1 et plusieurs joueurs ; cocher « vu » puis recharger ; clic sur chaque action rapide.
- Reste à finir :
- Journal :

### Bloc 8 : Vérification finale et nettoyage
- Statut : à faire
- Objectif : passer toute la liste « Vérifications attendues » du brief, corriger les petits écarts, nettoyer.
- Résultat testable : un tableau de vérification rempli (OK ou corrigé) pour chaque point du brief, build sans erreur, lint ≤ 173 erreurs / 70 avertissements, console propre.
- Modèle : sonnet · Effort : medium · Coût estimé : moyen
- Pourquoi ce modèle : vérification avec jugement visuel et petites corrections.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 8 PLAN-theme-club.md`
- Dépend de : blocs 0 à 7
- Prérequis : tous les comptes de test
- Étapes :
  - Couleurs extrêmes via `?couleurClub=` en local : blanc, jaune pâle, noir, bleu nuit, rouge Cannes, vert par défaut.
  - Joueur et éducateur AS Cannes : mêmes couleurs ; club sans couleurs : vert ; parent et dirigeant inchangés ; bureau, tablette, mobile, clair et sombre.
  - Vérifier que `?couleurClub=` est inactif dans `npm run build` + `npm run preview`.
  - Retirer le code mort (ancien menu sobre, anciennes sections d'accueil), mettre à jour les repères de ce plan.
  - Proposer la mise en ligne (version de test Vercel d'abord) sans la lancer avant ton « ok ».
- Ce que je teste pour valider : le parcours complet joueur, éducateur, club ; puis la version de test Vercel.
- Reste à finir :
- Journal :

### Bloc 9 (optionnel) : [IDÉE] Aperçu en direct dans les réglages couleurs du club
- Statut : à faire
- Objectif : quand le club choisit sa couleur, il voit tout de suite une miniature du menu et d'une carte « comme vos joueurs et éducateurs la verront », et un message clair si le garde-fou a dû ajuster la couleur (« ajustée pour rester lisible »).
- Pourquoi c'est utile : un dirigeant de club amateur n'a aucune idée de l'effet d'un jaune ou d'un bleu nuit ; il voit le résultat avant d'enregistrer et n'a pas la surprise d'une couleur « changée » sans explication.
- Résultat testable : dans les réglages du club, changer la couleur met à jour la miniature avant tout enregistrement.
- Modèle : sonnet · Effort : medium · Coût estimé : faible
- Pourquoi ce modèle : petit composant d'affichage réutilisant `paletteClub.js`.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 9 PLAN-theme-club.md`
- Dépend de : bloc 8
- Prérequis : aucun
- Étapes :
  - Repérer le formulaire de couleurs dans DashboardClub (grep `couleur_principale`).
  - Miniature (bout de menu + une carte + un bouton) alimentée par `paletteClub.js`.
  - Message si la couleur a été ajustée par le garde-fou.
- Ce que je teste pour valider : essayer 3 couleurs dans les réglages, sans enregistrer, puis en enregistrant.
- Reste à finir :
- Journal :
