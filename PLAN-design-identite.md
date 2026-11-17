# PLAN : Identité visuelle « Maison de club » (dashboards club et éducateur)
Date : 2026-11-15 · Brief : BRIEF-design-identite.md
Objectif : donner aux dashboards club et éducateur une identité propre au football amateur (Barlow, icônes au trait, formes signature) pour qu'ils ne ressemblent plus à un produit généré par IA. On construit par-dessus le thème couleurs du club (PLAN-theme-club.md), sans rien en défaire.

## Repères techniques (relevés le 2026-11-15)
- Tout est en styles en ligne : ~1 100 `style={{}}` dans DashboardClub.jsx (7 209 lignes), ~1 850 dans DashboardEducateur.jsx (13 513 lignes). Aucun module de styles partagé : chaque écran a ses objets locaux (`carte`, `cardSt`, `kpiCardSt`, `btnFiche`, `inputStyle`...). Le kit du bloc 1 les remplace écran par écran.
- Icônes de menu : déjà dessinées au trait (`IcoHome`... en SVG en ligne, famille Feather, même dessin que lucide). On les garde. lucide-react sert à remplacer les emojis.
- Emojis : 260 dans DashboardEducateur, 105 dans DashboardClub, 180 dans src/lib/translations.js, plus des composants importés (GestionSponsors 27, CauserieAvantMatch 40, TournoiOrganise 19, ProjetDetail 16, GestionCloturesSaison 16, ScannerProc 15, AlertesPanel 6...). Certains textes partent dans des notifications, emails ou PDF : vérifier chaque usage avant de remplacer.
- Police : Inter chargée dans index.html (avec déjà Barlow Condensed 600/800), et écrite en dur 826 fois dans 173 fichiers (`fontFamily: 'Inter, sans-serif'` et variantes).
- Jetons : src/tokens.js (`colors`, `fontSize`, `radius`), palette club : src/lib/paletteClub.js, src/lib/clubTheme.js, `useColors`.
- Écrans club (DashboardClub.jsx) : accueil `AccueilClub` (l. 518 et 3979), catégories (4009), planning (4198), séances (4203), projet sportif (4208), tournoi (4249), terrains (4254), éducateurs (4259), classements (4709), sponsors (4966), déplacements (4969), recrutement (4972), profil (4975), budget (5171), événements et projets (5204), inventaire (5937), newsletter (6470), stages (6480), tâches (6484), Mon club (6497), configuration (6509).
- Écrans éducateur (DashboardEducateur.jsx) : accueil `AccueilEducateur` (~1143 à 1777), Mon équipe (6427), stats (7148), santé (8167), historique (8172), matchs (8180), déplacements (9064), terrains (9080), annonces (9096), matériel (9128), entraînements (9279), notes (10036), recrutement (10137), mes séances (10140), stages (11392), bibliothèque (11398), analyse vidéo (12184), prép physique (12188), clôtures (12192), Tactipad (12196), projet sportif (12211), explorer (12223), profil (12524).
- Les numéros de ligne bougent à chaque bloc : chercher par `activeTab === '...'` (club) ou `activeSection === '...'` (éducateur).
- Commandes : `npm run build`, `npm test`, `npm run lint`, `npm run dev` (http://localhost:5173). Pas d'outil de capture d'écran installé : Claude ne peut pas voir les écrans connectés, c'est Kevin qui valide visuellement.

## Règles communes à tous les blocs
- Sauvegarde datée avant de toucher un fichier : `~/Sauvegardes-DigitalFootball/design-identite-2026-11/<fichier>.avant-blocN.<ext>`.
- Zéro changement de comportement : pas de nouvelle requête, pas de bouton déplacé, pas de texte métier modifié (sauf emoji retiré).
- Jamais de recherche-remplacement aveugle sur tout un fichier, sauf au bloc 3 (police), dont c'est l'objet et qui se vérifie par comptage.
- Ne jamais toucher : moteur couleurs club, couleurs de statut (`accent.success`, `warning`, `danger`, `info`), gabarits d'impression (`.bef-*`, `.fiche-*`, html2canvas), terrain Tactipad.
- Emojis : remplacés par une icône lucide-react quand c'est de l'interface (titre, bouton, carte, menu, onglet). Laissés quand c'est du contenu écrit par un utilisateur. Dans une notification, un email ou un PDF : supprimés ou laissés, jamais une icône React (elle ne s'y afficherait pas).
- Clair et sombre vérifiés à chaque bloc, avec la couleur du club par défaut (vert) et une couleur forte (`?couleurClub` n'existe pas : Kevin teste avec son compte relié à l'AS Cannes, rouge).
- Fin de bloc : build OK, `npm test` OK, lint pas pire que la référence notée au bloc 0. Commit et push seulement après le « ok » de Kevin (un push sur main met en ligne).

## Ce que je dois fournir
| Élément | Pourquoi | Où le trouver | Nécessaire avant |
|---|---|---|---|
| Décision sur le correctif non commité des stats de match scannées (DashboardEducateur.jsx + scan-feuille-match) | Ne pas mélanger ce correctif avec le design dans les commits | Tes tests du scan de feuille de match | Bloc 0 |
| Un compte club et un compte éducateur avec des données (matchs, séances, joueurs) | Valider chaque écran à l'œil, clair et sombre | Tes comptes habituels (club test deabreu.amorim+club@ et ton compte relié à l'AS Cannes) | Bloc 2 |
| Ton « ok » sur l'écran témoin | Tout le reste du chantier en dépend | Accueil du dashboard club sur http://localhost:5173 | Bloc 3 |

## Manipulations à faire moi-même
1. Avant le bloc 0 : me dire si le correctif d'enregistrement des stats de match scannées (non commité) est validé. Si oui, je le commite à part au début du bloc 0. Si non, je le mets de côté proprement (git stash nommé) et je te dis comment le récupérer.
2. Pour chaque bloc : dans un terminal du dossier, `npm run dev`, puis ouvrir http://localhost:5173 et te connecter avec le compte indiqué dans « Ce que je teste pour valider ».
3. Après le bloc 1 : ouvrir http://localhost:5173/dev/identite (page visible seulement en local) et me dire si les briques te plaisent.
4. Après le bloc 2 : décision clé. « ok » = on déroule ; sinon tu me dis ce qui ne va pas et on corrige le témoin avant d'aller plus loin.
5. Après le bloc 19 : relire tout le parcours club et éducateur une dernière fois sur la version de test Vercel avant la mise en production.

## Répartition suggérée
Je ne vois pas ta barre « 5h » : regarde-la avant chaque bloc (sous 50 % pour un bloc à coût élevé, sinon attends la fenêtre suivante).
- Jour 1 : blocs 0 et 1 (mise en place, kit et page vitrine).
- Jour 2 : bloc 2 (écran témoin) puis ta validation. Rien d'autre ce jour-là.
- Jour 3 : blocs 3 (police, Haiku, faible) et 4 (menu et cadre).
- Ensuite : 2 blocs par jour (5 à 18), environ 7 jours. Bloc 19 à la fin.
- Total : environ 2 semaines, en gardant de la marge sur la limite hebdomadaire.
Rappel : `/clear` et une session neuve par bloc.

## Blocs

### Bloc 0 : Mise en place
- Statut : fait
- Objectif : partir d'un dépôt propre, installer les outils et poser les jetons, sans changer l'apparence.
- Résultat testable : le site s'affiche exactement comme avant ; lucide-react et Barlow (toutes graisses) sont disponibles.
- Modèle : sonnet · Effort : medium · Coût estimé : faible
- Pourquoi ce modèle : réglages simples mais dans un dépôt en production, Haiku est trop juste pour gérer le correctif non commité proprement.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 0 PLAN-design-identite.md`
- Dépend de : rien
- Prérequis : manipulation 1 (décision sur le correctif non commité).
- Étapes :
  - Traiter le correctif non commité selon la décision de Kevin (commit séparé ou stash nommé `correctif-scan-stats`).
  - Sauvegarde datée de index.html, src/index.css, src/tokens.js, DashboardClub.jsx, DashboardEducateur.jsx.
  - `npm install lucide-react` ; dans index.html, charger Barlow 400/500/600/700 et Barlow Condensed 500/600/700 (Inter reste chargée jusqu'au bloc 3).
  - Dans src/tokens.js, ajouter les jetons `police` (`texte: "'Barlow', sans-serif"`, `titre: "'Barlow Condensed', sans-serif"`) et `forme` (rayon carte 6 px, rayon pastille 4 px, liseré 3 px, opacité ligne de craie). Rien ne les utilise encore.
  - Build, tests, lint : noter la référence lint (erreurs / avertissements) dans le journal.
- Ce que je teste pour valider : le site s'ouvre et n'a pas changé.
- Reste à finir :
- Journal :
  - 2026-11-15, Sonnet 5.5. Correctif scan commité à part (e85a3fb, non poussé ; la fonction scan-feuille-match reste à déployer par Kevin). Sauvegardes dans ~/Sauvegardes-DigitalFootball/design-identite-2026-11/. lucide-react 1.73 installé, Barlow 400-700 et Barlow Condensed 500-800 chargées (Inter gardée). Jetons `police` et `forme` ajoutés à src/tokens.js. Référence lint : 172 erreurs, 70 avertissements. Build OK, tests 511 OK.

### Bloc 1 : Kit d'identité et page vitrine
- Statut : fait (en attente de la validation visuelle de Kevin)
- Objectif : fabriquer les briques de la nouvelle identité, une fois pour toutes, et les montrer sur une page sans connexion.
- Résultat testable : http://localhost:5173/dev/identite montre toutes les briques, en clair et en sombre, avec trois couleurs de club (vert par défaut, rouge `#C8102E`, jaune `#F2C200`).
- Modèle : opus · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : ce bloc fixe le langage visuel que les 17 blocs suivants vont recopier ; une erreur ici se paie partout.
- Lancement : `/clear`, puis `/model opus`, puis `/effort high`, puis `/bloc 1 PLAN-design-identite.md`
- Dépend de : bloc 0
- Prérequis : aucun
- Étapes :
  - `src/lib/identite.js` : fonctions de style à partir de `colors` (`styleCarte`, `styleCarteLiseree`, `styleEtiquette` petites capitales espacées, `styleTitreEcran`, `styleChiffreHeros` condensé tabular-nums, `styleBoutonPrincipal`, `styleBoutonSecondaire`, `styleChamp`, `styleTableau`, `styleLigneCraie`).
  - `src/components/identite/` : `TitreEcran`, `Etiquette`, `CarteChiffre` (un chiffre héros + une étiquette), `PastilleResultat` (V/N/D, carré 22 px, coins 4 px, lettre condensée, couleurs de statut), `Jauge` (barre fine à deux ou trois segments type possession), `Icone` (lucide-react, tailles 18/20, trait constant, nom accessible obligatoire si seule).
  - Page `src/pages/DevIdentite.jsx`, route `/dev/identite` déclarée seulement si `import.meta.env.DEV` (absente du site en ligne).
  - Contraste vérifié par calcul (texte 4,5:1, grands chiffres 3:1) sur les trois couleurs et les deux thèmes ; focus visible sur les boutons ; `prefers-reduced-motion` respecté si une transition existe.
  - Build, tests, lint.
- Ce que je teste pour valider : la page vitrine, bouton clair/sombre, les trois couleurs ; me dire si les briques te plaisent avant le bloc 2.
- Reste à finir :
  - Contrôle à l'œil par Kevin (rendu Barlow, survol, focus clavier, téléphone) : Claude n'a pas d'outil de capture.
  - Bordure des champs sous 3:1 (le champ se repère aussi par son fond) : à reprendre si Kevin la trouve trop discrète.
- Journal :
  - 2026-11-15, Opus 5.5. Créés : src/lib/identite.js (styles + `verifierContrastes`), src/components/identite/ (TitreEcran, Etiquette, CarteChiffre, PastilleResultat, Jauge, Icone, index.js), src/pages/DevIdentite.jsx, tests/identite.test.js (17 tests). Modifiés : src/App.jsx (route `/dev/identite` seulement si `import.meta.env.DEV`), src/index.css (classes `df-bouton`, `df-bouton-secondaire`, `df-champ`, `df-cliquable` : survol, focus visible à la couleur du club, désactivé, mouvement réduit). Sauvegardes `*.avant-bloc1.*`.
  - Décisions issues du calcul des contrastes : étiquettes en `text.dim` (`text.muted` = 4,24:1 sur blanc) ; la couleur du club ne sert jamais au petit texte (rouge en sombre = 3,45:1), seulement liseré, jauge, fond de bouton, focus ; lettre des pastilles choisie blanc/encre automatiquement (V et D en encre : blanc = 3,3 et 3,76:1) ; N = gris `text.dim`. Liseré fait en ombre intérieure (angle net avec les coins 6 px). Champs en 16 px (pas de zoom iPhone). Classes CSS à poser avec les styles de bouton/champ.
  - Vérifications : 11 contrôles × 3 couleurs × 2 thèmes conformes (page et tests, plus bleu nuit et jaune très clair en test) ; page rendue côté serveur en clair et sombre sans erreur ; build OK, page absente du site construit ; tests 527 OK ; lint 172 erreurs / 70 avertissements (= référence, 0 dans les nouveaux fichiers).

### Bloc 2 : Écran témoin, accueil du dashboard club
- Statut : fait (validé par Kevin le 2026-11-15)
- Objectif : appliquer toute l'identité à un seul écran réel pour juger sur pièce.
- Résultat testable : l'accueil du dashboard club en Barlow, sans emoji, avec cartes chiffres condensés, liserés, pastilles V/N/D, jauges ; le reste du site inchangé.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : travail de production visuelle, guidé par le kit du bloc 1.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 2 PLAN-design-identite.md`
- Dépend de : bloc 1 validé par Kevin
- Prérequis : compte club avec des données.
- Étapes :
  - Sauvegarde de DashboardClub.jsx.
  - `AccueilClub` et ses widgets (StatCard, TerrainsLiberesWidget, bandeau des places, cartes du haut) : remplacer les objets de style locaux par le kit, Inter par les jetons `police`, emojis par `Icone`.
  - En-tête de l'écran avec `TitreEcran` ; chiffres en `CarteChiffre` ; résultats récents en `PastilleResultat`.
  - Vérifier mobile (375 px), tablette, ordinateur ; clair et sombre.
  - Build, tests, lint.
- Ce que je teste pour valider : accueil club sur ordinateur et téléphone, clair et sombre, avec ton compte AS Cannes (rouge) et le club test (vert). C'est la décision clé du chantier.
- Reste à finir :
  - Contrôle à l'œil par Kevin (Claude n'a pas d'outil de capture) : ordinateur, téléphone 375 px, clair/sombre, rouge et vert.
  - Alertes de l'accueil : la ligne entière est cliquable à la souris mais pas au clavier (comportement d'avant, non modifié) ; à traiter avec l'accessibilité.
  - PlanningSemaineWidget (grille semaine/mois) : seules les polices Inter en dur ont changé, son style intérieur reste à refaire (blocs suivants, écran planning).
- Journal :
  - 2026-11-15, Sonnet 5.5. Sauvegarde DashboardClub.jsx.avant-bloc2.jsx. AccueilClub refait avec le kit : TitreEcran (ou bannière photo conservée, coins 6 px), cartes chiffres CarteChiffre (liseré sur Joueurs, signalement par icône + texte), listes de matchs séparées par lignes de craie, PastilleResultat + score condensé, Jauge « Bilan » V/N/D sous les derniers résultats, actions rapides sans fond coloré. AlertesClub (étiquette, liseré de statut, coins 4/6 px) et TerrainsLiberesWidget (emoji remplacé par icône MapPin, titre en texte plein) alignés. Extension du kit : `CarteChiffre` accepte `detail` et `alerte`. Slogan et titres n'utilisent plus la couleur du club en texte (règle du bloc 1). StatCard (haut du fichier) non touchée : utilisée ailleurs.
  - Vérifications : build OK, tests 527 OK, lint des fichiers touchés = référence (15 erreurs / 7 avertissements avant et après, 0 dans les composants du kit), plus aucun emoji ni Inter dans AccueilClub.

### Bloc 3 : Bascule de police dans toute l'application
- Statut : fait (validé par Kevin le 2026-11-16, commit et push pas encore faits)
- Objectif : Inter disparaît partout au profit de Barlow.
- Résultat testable : toute l'application (joueur compris) s'affiche en Barlow ; `grep -rn "Inter" src` ne trouve plus aucune police Inter.
- Modèle : haiku · Effort : low · Coût estimé : faible
- Pourquoi ce modèle : remplacement mécanique vérifiable par comptage.
- Lancement : `/clear`, puis `/model haiku`, puis `/effort low`, puis `/bloc 3 PLAN-design-identite.md`
- Dépend de : bloc 2 validé par Kevin
- Prérequis : aucun
- Étapes :
  - Commit de sauvegarde avant de commencer (avec l'accord de Kevin) ou copie datée de `src/`.
  - Remplacer les variantes exactes `'Inter, sans-serif'`, `'Inter,sans-serif'`, `"Inter, sans-serif"` et la pile d'index.css par `'Barlow, sans-serif'`. Ne pas toucher `Arial`, `monospace`, `inherit`, ni les gabarits d'impression.
  - Retirer Inter du chargement dans index.html ; corriger le commentaire d'index.css.
  - Compter avant/après (826 occurrences attendues au départ, 0 à la fin), build, tests, lint.
- Ce que je teste pour valider : ouvrir l'accueil joueur, éducateur et club : texte en Barlow, rien de cassé ni de coupé.
- Reste à finir :
  - Les @import Google Inter du joueur et du coach sont passés à Barlow. Deux occurrences de Inter gardées, car elles font partie de gabarits d'impression ou PDF capturés (CauserieAvantMatch.jsx ligne 1116 et DossierSponsorPDF.jsx ligne 8) : à décider.
  - Contrôle à l'œil par Kevin : texte en Barlow sur accueil joueur, éducateur et club (clair et sombre, téléphone), rien de coupé.
- Journal :
  - 2026-11-15, Haiku 5.5. Sauvegarde src/ et index.html dans ~/Sauvegardes-DigitalFootball/design-identite-2026-11/ (.avant-bloc3). 838 occurrences de Inter dans src au départ (le plan disait 826) ; 836 remplacées par Barlow, 2 gardées (CauserieAvantMatch.jsx:1116 fiche imprimée, DossierSponsorPDF.jsx:8 PDF sponsor). index.html : Inter retiré du chargement, Barlow 800 et 900 ajoutés. index.css : pile Barlow.
  - Vérifications : build OK, npm test 527 OK, 0 échec. Lint des fichiers modifiés : 117 erreurs et 49 avertissements (pas de comparaison avec la référence du bloc 0 : le changement ne touche que des chaînes de police). Serveur local répond (200).

### Bloc 4 : Menu et cadre commun des deux dashboards
- Statut : fait (en attente du contrôle visuel de Kevin)
- Objectif : le menu latéral, la barre du haut, les onglets et sous-onglets adoptent l'identité (étiquettes de groupes en petites capitales, entrée active nette, coins 6 px).
- Résultat testable : menu club et éducateur sur ordinateur, tablette (icônes seules) et téléphone (tiroir).
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : composant partagé par trois dashboards, trois modes d'affichage à préserver.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 4 PLAN-design-identite.md`
- Dépend de : bloc 3
- Prérequis : aucun
- Étapes :
  - Sauvegarde de src/lib/menuLateral.js et des parties menu des deux dashboards.
  - Menu plein couleur du club conservé (décision PLAN-theme-club) : seuls typographie, rayons, espacements, badge et entrée active changent.
  - Barres d'onglets internes (sous-onglets Finance, Organisation, Événements sportifs, onglets internes éducateur) : un style d'onglet unique tiré du kit.
  - Vérifier que le dashboard joueur, qui partage le menu, reste correct.
  - Build, tests, lint.
- Ce que je teste pour valider : naviguer dans tous les menus club et éducateur sur ordinateur et téléphone.
- Reste à finir :
  - Contrôle à l'œil par Kevin (Claude n'a pas d'outil de capture) : menus club, éducateur et joueur sur ordinateur, tablette, tiroir téléphone ; clair et sombre ; AS Cannes (rouge) et club test (vert).
  - Autres barres d'onglets non touchées, prévues dans leurs blocs : Mon club et Configuration (bloc 5), budget (7), puces de période (BudgetReel, BudgetPrevisionnel, AudienceSponsors).
  - Variante « cartes » des sous-onglets éducateur (Planning / Séances) : seulement coins 14 puis 6 px ; reste en bleu, à revoir au bloc 13.
- Journal :
  - 2026-11-16, Sonnet 5.5. Sauvegardes *.avant-bloc4.* (menuLateral.js, DashboardClub.jsx, DashboardEducateur.jsx). src/lib/menuLateral.js (commun aux trois dashboards, donc le joueur suit) : entrées coins 6 px, texte 14 px, titres de groupes plus lisibles (11 px, couleur menu-text-muted), badge carré 4 px en Barlow Condensed chiffres tabulaires, titre du club en condensé capitales, contour et puces de langue 6 px. Nouvelles classes `df-onglets` / `df-onglet` : onglet condensé capitales sur ligne de craie, actif = texte plein + liseré 3 px de 'accent' (jamais de couleur de club en petit texte), focus visible, mouvement réduit. `SousOngletsGroupe` (club) et `SousOngletsBar` (éducateur) utilisent ces classes et posent `coqueVars` sur la barre (sinon pas de mode sombre). Éducateur : la barre simple gagne role=tablist/tab.
  - Vérifications : build OK, npm test 527 OK (1 ignoré), eslint 0 erreur sur menuLateral.js et SousOngletsGroupe.jsx. Pas de contrôle visuel possible côté Claude.

### Bloc 5 : Club, Mon club et Configuration
- Statut : fait (en attente du contrôle visuel de Kevin)
- Objectif : écrans Mon club (toutes ses étapes : réglages, staff, organigramme, outils, dashboard des éducateurs) et Configuration à l'identité.
- Résultat testable : ces deux entrées du menu club sans emoji, en Barlow, avec le kit.
- Modèle : sonnet · Effort : high · Coût estimé : élevé
- Pourquoi ce modèle : production visuelle sur un écran dense à étapes.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 5 PLAN-design-identite.md`
- Dépend de : bloc 4
- Prérequis : aucun
- Étapes :
  - Sauvegarde des fichiers touchés.
  - `activeTab === 'mon_club'` et `'configuration'` dans DashboardClub, plus leurs composants importés (repérer avec les imports).
  - Objets de style locaux remplacés par le kit ; emojis selon la règle commune ; formulaires avec `styleChamp`.
  - Build, tests, lint.
- Ce que je teste pour valider : parcourir chaque étape de Mon club et Configuration, clair et sombre, ordinateur et téléphone.
- Reste à finir :
  - Contrôle à l'œil par Kevin (Claude n'a pas d'outil de capture) : Mon club (Identité, Staff, Organigramme, Accès du bureau) et Configuration (Mon forfait, Outils du club, Outils des éducateurs, Journal), ordinateur et téléphone, clair et sombre, AS Cannes (rouge) et club test (vert).
  - Dans Staff et Organigramme (écrans écrits dans DashboardClub.jsx), les boutons, champs et fenêtres utilisent encore les styles communs `st.btnSolid`, `st.input`, `st.card` du dashboard, que les blocs suivants remplacent écran par écran ; seuls en-têtes, cartes, étiquettes, coins et couleurs de texte ont changé.
  - Fenêtres (membre de l'organigramme, détail éducateur) : coins et libellés repris dans leur plage, mais la fenêtre elle-même garde son cadre actuel (à traiter avec les fenêtres des blocs suivants).
  - Les croix de fermeture « ✕ » (texte) sont conservées, pas des emojis.
  - Composants partagés avec le dashboard éducateur restylés ici : MesOutils, CarteOutil, MonAbonnement (page Mes outils / Mon forfait). Le bloc 18 n'aura plus qu'à contrôler leur rendu côté éducateur.
  - Interrupteur (outils/Interrupteur.jsx) non touché : la forme ronde d'un interrupteur reste un repère connu.
- Journal :
  - 2026-11-16, Sonnet 5.5. Sauvegardes dans ~/Sauvegardes-DigitalFootball/design-identite-2026-11/ (monclub-avant-bloc5/, MesOutils.jsx.avant-bloc5.jsx, DashboardClub.jsx.avant-bloc5.jsx). Gros du travail à la source : `stylesMonClub` (uiMonClub.js) reconstruit sur le kit (carte coins 6 px sans ombre, titre condensé, étiquette, champ 16 px, boutons et pastilles du kit), donc toutes les étapes en profitent. Barres d'étapes de Mon club et de Configuration remplacées par `df-onglets` / `df-onglet` (mêmes onglets que les autres écrans ; les pastilles numérotées 1 à 4 disparaissent). En-tête d'étape = `TitreEcran` (le rond d'icône coloré est retiré). CarteReglage : liseré 3 px à gauche quand l'outil est actif, plus de barre colorée en haut ni d'ombre ni de survol qui se soulève. Corrigé au passage : le champ avait `outline: none` en ligne, qui masquait l'anneau de focus (`.mc-in`). Écrans retouchés un par un : EtapeIdentite, EtapeAccesBureau (tableau des droits en étiquettes et lignes de craie), EtapeOutils, EtapeEducateurs, EtapeJournal, ModelesDepart, PlacesEducateurs, ApercuMenuEducateur, BandeauPlaces, BandeauAnnuler. DashboardClub.jsx : OrgNode, écrans Organigramme et Staff (en-têtes en `TitreEcran`, cartes du kit, chiffres en condensé, coins 6 px, texte faible `faint` passé en `secondary`), fenêtre membre d'organigramme. Texte fait de `colors.text.faint` remplacé par `text.secondary` dans tous ces fichiers (meilleur contraste).
  - Vérifications : build OK, npm test 527 OK (1 ignoré), eslint 0 erreur sur monclub/ et outils/, DashboardClub.jsx 14 erreurs / 7 avertissements (avant : 15 / 7, rien de nouveau). Rendu côté serveur sans erreur de MonClub (Identité, Accès du bureau, mobile), Configuration, MesOutils (club et éducateur), BandeauPlaces, ApercuMenuEducateur, CarteOutil. Aucun emoji ni Inter dans les fichiers touchés. Pas de contrôle visuel possible côté Claude.

### Bloc 6 : Club, Catégories et équipes
- Statut : fait (en attente du contrôle visuel de Kevin)
- Objectif : écran Catégories (liste, grille de convocation, changement de mode, création) à l'identité.
- Résultat testable : l'entrée Catégories du menu club et ses sous-vues.
- Modèle : sonnet · Effort : high · Coût estimé : élevé
- Pourquoi ce modèle : écran récent et dense (chantier catégories), à toucher sans changer le comportement.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 6 PLAN-design-identite.md`
- Dépend de : bloc 4
- Prérequis : aucun
- Étapes :
  - Sauvegarde.
  - `activeTab === 'categories'` (vues `grille`, `mode`, `creer`) et composants importés.
  - Tableaux de joueurs en `styleTableau` (type classement, chiffres alignés à droite).
  - Build, tests, lint.
- Ce que je teste pour valider : ouvrir une catégorie, la grille de convocation, la création, clair et sombre.
- Reste à finir :
  - Contrôle à l'œil par Kevin (Claude n'a pas d'outil de capture) : Catégories & Équipes (cartes par catégorie, ajout d'équipe, bouton Effectif et sa fenêtre en vue Postes et Liste), Catégories (liste), Créer la catégorie, Changer de mode (répartition, confirmation, résultat), Convocations ; clair et sombre, ordinateur et téléphone, AS Cannes (rouge) et club test (vert). Les vues avec données (liste de catégories, répartition des joueurs, grille remplie) ne sont pas rendables côté Claude : seul le premier affichage l'a été.
  - Fenêtre « fiche individuelle joueur » (ouverte depuis l'Effectif) non touchée : ses libellés gardent des emojis (StatCard, présence par mois, classement). À traiter avec les fenêtres des blocs suivants, ou au bloc 19.
  - Fenêtre HistoriqueClub (ouverte par le bouton Historique saison) non touchée ; seul le bouton a changé.
  - Composants de catégories côté éducateur et joueur non touchés, à faire dans leurs blocs : BandeauEffectifCommun, FicheJoueurCategorie, RenfortConvocation (bloc 12 et suivants), SondageCategorie (dashboard joueur, hors périmètre).
  - GrilleConvocations est aussi utilisée par le dashboard éducateur : elle a pris la nouvelle identité des deux côtés, à contrôler au bloc 12.
  - Erreur de lint déjà là avant (ListeCategories, setState dans un effet) : non touchée.
- Journal :
  - 2026-11-16, Sonnet 5.5. Sauvegardes dans ~/Sauvegardes-DigitalFootball/design-identite-2026-11/ (categories-avant-bloc6/, DashboardClub.jsx.avant-bloc6.jsx). Nouveau fichier src/components/categories/UiCategories.jsx : `FilAriane` (étapes en texte secondaire souligné, plus de couleur de club en petit texte), `Message` (carte à liseré de statut + icône + texte plein, remplace les textes colorés rouge et orange), `Pastille` (coins 4 px). Écran Catégories & Équipes (DashboardClub.jsx) : `TitreEcran`, boutons et champs du kit, deux cartes d'aide en étiquette + texte (celle de l'organisation avec liseré), une carte par catégorie (nom condensé en capitales, lignes de craie entre équipes, carré de lettre d'équipe à la couleur de la catégorie avec texte blanc ou encre calculé, bilan en pastilles V/N/D avec chiffres condensés au lieu de texte coloré, avertissement « sans éducateur » par icône). Fenêtre Effectif : titre condensé, bascule Postes/Liste en vrai groupe de boutons à icônes (les symboles ⊞ ☰ sont remplacés), tableau en `styleTableau`, cartes joueur avec liseré de poste, chiffres en condensé, emojis 🏃 ⭐ 📝 📊 remplacés par des icônes, bouton vert codé en dur supprimé, croix de fermeture accessible. Libellés des groupes de poste (utilisés seulement dans cette fenêtre) sans emoji. ListeCategories, CreerCategorie (choix du mode en vrai groupe radio à liseré), ChangerModeCategorie, GrilleConvocations refaits sur le kit (en-têtes `TitreEcran`, champs 16 px, tableau de convocation en lignes de craie avec chiffres tabulaires). `BoutonHistoriqueSaison` (partagé par 4 écrans du club) reprend le bouton secondaire du kit et une icône lucide. Aucun comportement changé : mêmes requêtes, mêmes textes métier, mêmes actions.
  - Vérifications : build OK, npm test 527 OK (1 ignoré), DashboardClub.jsx 14 erreurs / 7 avertissements (= avant), fichiers de catégories : 1 erreur de lint déjà présente avant (ListeCategories). Rendu côté serveur sans erreur de ListeCategories, CreerCategorie, ChangerModeCategorie, GrilleConvocations et du bouton Historique (premier affichage). Plus aucun emoji ni Inter dans les composants de catégories ni dans l'écran Catégories et la fenêtre Effectif. Pas de contrôle visuel possible côté Claude.

### Bloc 7 : Club, Finance et profil du club
- Statut : fait (en attente du contrôle visuel de Kevin)
- Objectif : budget (prévisionnel, suivi réel, audience), sponsors, déplacements, profil du club.
- Résultat testable : l'entrée Finance (trois sous-onglets) et Profil du menu club.
- Modèle : sonnet · Effort : high · Coût estimé : élevé
- Pourquoi ce modèle : beaucoup de chiffres et de composants importés (GestionSponsors 27 emojis).
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 7 PLAN-design-identite.md`
- Dépend de : bloc 4
- Prérequis : aucun
- Étapes :
  - Sauvegarde.
  - `budget`, `sponsors`, `deplacements`, `profil` et leurs composants (src/components/sponsors/...).
  - Montants en chiffres condensés tabular-nums ; ratios en `Jauge` ; recettes et dépenses gardent leurs couleurs de statut.
  - Ne pas toucher l'export PDF du dossier sponsor (gabarit d'impression).
  - Build, tests, lint.
- Ce que je teste pour valider : les trois vues budget, la liste des sponsors, un déplacement, le profil, clair et sombre.
- Reste à finir :
  - Contrôle à l'œil par Kevin (Claude n'a pas d'outil de capture) : Finance > Budget (Prévisionnel, Suivi réel, Audience), Sponsors (huit rubriques), Déplacements, Profil ; ordinateur et téléphone, clair et sombre, AS Cannes (rouge) et club test (vert). Les vues avec données (budget rempli, liste de sponsors, déplacements) ne sont pas rendables côté Claude : seul le premier affichage l'a été.
  - GestionSponsors : en-tête, onglets, tableau de bord, badges, cartes et fenêtres reprennent le kit via un `st` commun, mais les formulaires, la liste des sponsors, les prospects et les contreparties gardent leur mise en page d'avant (couleurs de statut codées en dur conservées). À reprendre au bloc 19 si Kevin les trouve en décalage.
  - Déplacements : même méthode (`st` du kit, bandeaux d'alerte à liseré, coins 6 px) ; les cartes de déplacements, la fenêtre de véhicule et le formulaire n'ont pas été redessinés en détail.
  - DossierCommercialTemplate et DossierSponsorPDF (gabarits d'impression) non touchés, emojis conservés.
  - `ParrainageWidget` est partagé avec les dashboards joueur et recruteur et la page d'inscription : il a pris la nouvelle identité partout (carte à liseré, titre condensé).
  - Erreurs de lint déjà là avant (setState dans un effet, fonctions impures) non touchées.
- Journal :
  - 2026-11-16, Sonnet 5.5. Sauvegardes dans ~/Sauvegardes-DigitalFootball/design-identite-2026-11/ (finance-avant-bloc7/, DashboardClub.jsx.avant-bloc7.jsx). Nouveaux fichiers : src/components/club/UiFinance.jsx (`GroupeChoix` rectangulaire à la place des puces arrondies, `Barre`, `Statut`, `Etoiles`), src/lib/identiteFinance.js (`styleMontant`, `carteStatut`), src/lib/useStFinance.js (`st` commun des sponsors et des déplacements, calculé depuis le thème et le kit, remplace quatre paires de couleurs codées en dur). BudgetReel et BudgetPrevisionnel refaits : cartes coins 6 px sans ombre, chiffres condensés tabulaires, solde héros à liseré de club, recettes et dépenses à liseré de statut, couverture et répartition en `Jauge`, tableaux en `styleTableau`, graphique à barres de 2 px, champs 16 px, emojis et puces supprimés. AudienceSponsors : en-tête `TitreEcran`, tuiles à liseré, tableau du kit. Profil du club (DashboardClub.jsx) : `TitreEcran`, écusson carré, étoiles au trait, abonnement avec groupe de choix mensuel/annuel, emojis 📋 🏟️ 💳 🔒 ⭐ remplacés par des icônes. ResponsableClub et ParrainageWidget sur le kit. Sponsors : 24 emojis remplacés par des icônes ou retirés, croix de fermeture nommées, boîtes ambre en `Message`, badges de statut et de niveau sans texte coloré, tableau de bord refait. Onglets du budget et des sponsors en `GroupeChoix` (un seul niveau de `df-onglets` reste, celui du menu Finance).
  - Vérifications : build OK, npm test 527 OK (1 ignoré), DashboardClub.jsx 14 erreurs / 7 avertissements (= avant), aucune nouvelle erreur de lint dans les fichiers touchés. Rendu côté serveur sans erreur et sans emoji de BudgetReel (rempli et vide), BudgetPrevisionnel, AudienceSponsors, ResponsableClub, ParrainageWidget, GestionSponsors, Deplacements (premier affichage). Pas de contrôle visuel possible côté Claude.

### Bloc 8 : Club, Éducateurs et Recrutement
- Statut : fait (en attente du contrôle visuel de Kevin)
- Objectif : écran Éducateurs (liste, demandes en attente, séances reçues) et Recrutement.
- Résultat testable : ces entrées du menu club.
- Modèle : sonnet · Effort : medium · Coût estimé : moyen
- Pourquoi ce modèle : listes et cartes, peu de logique d'affichage.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 8 PLAN-design-identite.md`
- Dépend de : bloc 4
- Prérequis : aucun
- Étapes :
  - Sauvegarde.
  - `activeTab === 'educateurs'` (objet `carteEdu`) et `'recrutement'` avec leurs composants.
  - Build, tests, lint.
- Ce que je teste pour valider : liste des éducateurs, une demande en attente, recrutement (si actif sur ton compte).
- Reste à finir :
  - Contrôle à l'œil par Kevin (Claude n'a pas d'outil de capture) : Éducateurs (demandes à traiter, en attente, cartes des affiliés et menu ⋯, séances reçues, quota, code club, invitation, fenêtres Modifier et Droits) ; ordinateur et téléphone, clair et sombre, AS Cannes (rouge) et club test (vert). Les vues avec données ne sont pas rendables côté Claude : build, tests et lint seulement.
  - Recrutement : l'entrée du menu n'apparaît que pour le compte asclubtest@gmail.com ; à contrôler avec ce compte. Le moteur est le même composant que celui du dashboard éducateur (même compte réservé) : il a pris la nouvelle identité des deux côtés, le bloc 18 n'aura qu'à vérifier.
  - Fenêtre « Noter l'éducateur » (ouvrirNotationEducateur) et grille d'évaluation d'une séance (ouvrirGrilleEvaluation) non touchées : ce sont des fenêtres à part, à traiter avec les fenêtres des blocs suivants ou au bloc 19.
  - Les photos d'éducateurs restent rondes (portraits), comme dans Staff.
  - Erreur de lint déjà là avant (MoteurRecrutement, setState dans un effet) non touchée.
- Journal :
  - 2026-11-16, Sonnet 5.5. Sauvegardes dans ~/Sauvegardes-DigitalFootball/design-identite-2026-11/ (educateurs-avant-bloc8/ : DemandesClub.jsx, MoteurRecrutement.jsx ; DashboardClub.jsx.avant-bloc8.jsx). Écran Éducateurs (DashboardClub.jsx) refait sur le kit : `TitreEcran` avec bouton Historique en action, cartes coins 6 px sans ombre, plus aucun `st.` ni objet de style local d'avant. En attente = carte à liseré ambre, lignes séparées par la craie. Cartes d'affiliés : nom Barlow, menu ⋯ en vrai bouton carré nommé (aria-haspopup, role menu), équipes en pastilles avec marqueur carré à la couleur de la catégorie (plus de texte coloré), « Aucune équipe » par icône + texte. Séances reçues : en-têtes de saison en étiquette, note en chiffres condensés dans une pastille, boutons Voir / Analyser du kit, boutons icônes nommés. Quota d'équipes : chiffre héros + `Jauge` (couleur de statut conservée sur la barre seulement), offres supérieures en `Message` avec boutons du kit. Code club en chiffres condensés espacés sur carte à liseré. Invitation : champs du kit (16 px), lignes de craie, messages en `Message`, invitations en attente en pastille. Fenêtres Modifier et Droits : coins 6 px, titre condensé, champs avec libellés liés, croix nommée, rôle dialog. `DemandesClub` (src/components/saisons) refait : carte à liseré info, boutons du kit, avertissements en `Message`. `MoteurRecrutement` refait : `TitreEcran`, filtres en champs du kit nommés, fiches de résultat au clavier (Entrée/Espace) avec liseré si sélectionnée, chiffres en condensé (plus de vert/orange/bleu codés en dur), radar aux couleurs du thème, emojis (🔍 ✅ ⚽ 🎯 🟢 🟡 ⚫ ✉️ ▲ ▼) remplacés par icônes ou texte, statut de recrutement en carte à liseré. Aucun comportement changé : mêmes requêtes, mêmes textes métier, mêmes actions.
  - Vérifications : build OK, npm test 527 OK (1 ignoré), DashboardClub.jsx 14 erreurs / 7 avertissements (= avant), DemandesClub 0 erreur, MoteurRecrutement 1 erreur + 1 avertissement déjà présents. Rendu côté serveur sans erreur de MoteurRecrutement (premier affichage, sans emoji ni Inter) ; DemandesClub n'affiche rien sans demande. Plus aucun emoji ni Inter ni `st.` dans la plage Éducateurs. Pas de contrôle visuel possible côté Claude.

### Bloc 9 : Club, Classements, Planning, Séances et Terrains
- Statut : fait (en attente du contrôle visuel de Kevin)
- Objectif : classements et stats équipe en vrai style tableau de classement, planning, planifier séance, planning des terrains.
- Résultat testable : ces entrées du menu club (dont le groupe Organisation).
- Modèle : sonnet · Effort : high · Coût estimé : élevé
- Pourquoi ce modèle : le classement est l'écran vitrine de l'identité (pastilles, tableaux).
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 9 PLAN-design-identite.md`
- Dépend de : bloc 4
- Prérequis : aucun
- Étapes :
  - Sauvegarde.
  - `classements` (objet `carteSt`), `planning`, `seances`, `terrains` et composants (StatsEquipe, LigneResultat...).
  - Forme récente en `PastilleResultat` partout ; tableau de classement en `styleTableau`.
  - Build, tests, lint.
- Ce que je teste pour valider : classement d'une catégorie, planning de la semaine, planning des terrains.
- Reste à finir :
  - Contrôle à l'œil par Kevin (Claude n'a pas d'outil de capture) : Classements (sélecteur d'équipe, chiffres clés, stats détaillées, derniers résultats, podium, tableau), Planning (Jour, Semaine, Mois, Année, fenêtre d'un événement), Séances (planifier une saison, séance ponctuelle, liste par mois), Terrains (onglets, grille de la semaine, créneaux, Configuration, import) ; ordinateur et téléphone, clair et sombre, AS Cannes (rouge) et club test (vert). Les vues avec données ne sont pas rendables côté Claude : build, tests, lint et rendu serveur des états vides seulement.
  - `StatsEquipe` et `PlanningTerrains` sont aussi utilisés dans le dashboard éducateur (et `StatsEquipe` dans le dashboard joueur) : ils ont pris la nouvelle identité partout. Les blocs 15 et 16 n'auront qu'à vérifier. `PlanningTerrains` ignore désormais la prop `accentColor` (couleur du club lue dans le thème) ; l'appel côté éducateur la passe encore (DashboardEducateur.jsx, inoffensif, à retirer au bloc 15).
  - `PlanningSemaineWidget` (grille de l'accueil) et `LigneResultat` / `CarteMatchAVenir` (écrans éducateur) non touchés : à traiter aux blocs 12 et 15.
  - Fenêtres de confirmation du navigateur (confirm, alert) laissées telles quelles.
  - Erreurs de lint déjà là avant, non touchées : 4 dans PlanningTerrains et 1 dans PlanificationSeances (setState dans un effet de chargement).
  - Couleurs de repère des types d'événement du Planning (entraînement, match domicile, extérieur, événement, projet) : fixes, jamais en texte ; le sens est aussi donné par le libellé.
- Journal :
  - 2026-11-16, Sonnet 5.5. Sauvegardes dans ~/Sauvegardes-DigitalFootball/design-identite-2026-11/ (DashboardClub.jsx.avant-bloc9.jsx ; classements-avant-bloc9/ : StatsEquipe, Planning, PlanificationSeances, PlanningTerrains, PlanningSemaineWidget). Classements (DashboardClub.jsx) refait sur le kit : `TitreEcran` avec bouton Historique, sélecteur d'équipe et critères de tri en boutons à coins 6 px (plein à la couleur du club quand actif, texte recalculé), chiffres clés en `CarteChiffre` + carte Bilan avec `Jauge` V/N/D, derniers résultats en lignes de craie avec `PastilleResultat` et score condensé, classement officiel en bouton du kit, podium (rang en pastille carrée, liseré couleur du club sur le n°1, photos restées rondes), tableau en `styleTableau` (légende et en-têtes liés pour les lecteurs d'écran, liseré sur le n°1). Plus aucune couleur de critère codée en dur. `StatsEquipe` refait : filtres en boutons nommés (aria-pressed), `CarteChiffre`, `Jauge`, forme récente en `PastilleResultat`, graphiques sans couleur de texte (points carrés, barres plates, chiffres condensés). `Planning` : `TitreEcran`, filtres de pôle/genre/vue/type en boutons, navigation par icônes nommées, vues Jour/Semaine/Mois/Année en cartes à liseré de type, éléments cliquables au clavier, fenêtre en dialog avec croix nommée. `PlanificationSeances` : `TitreEcran`, équipes en cartes à liseré, champs du kit avec libellés liés, boutons du kit, icône corbeille nommée. `PlanningTerrains` : palette locale `st` recalculée depuis le thème et le kit (plus de couleurs en dur), `TitreEcran`, onglets et boutons du kit, créneaux à coins 4/6 px avec liseré de zone, alertes (conflit, matchs sans terrain) en texte plein + icône colorée, croix remplacées par icônes nommées, emojis ⚠️ ✓ ✕ retirés, tiret long du sous-titre remplacé. Aucun comportement changé : mêmes requêtes, mêmes textes métier, mêmes actions.
  - Vérifications : build OK, npm test 527 OK (1 ignoré), lint = référence (DashboardClub 14 erreurs / 7 avertissements avant et après ; PlanningTerrains 4 et PlanificationSeances 1, déjà là ; StatsEquipe et Planning 0). Rendu côté serveur sans erreur : StatsEquipe avec 3 matchs, Planning avec un match, PlanificationSeances (vide et avec une équipe), PlanningTerrains (premier affichage). Plus aucun emoji, Inter, `st.card` ni couleur hexadécimale dans la plage Classements. Pas de contrôle visuel possible côté Claude.

### Bloc 10 : Club, Événements et Projets, Tournois, Stages, Projet sportif
- Statut : fait (en attente du contrôle visuel de Kevin)
- Objectif : groupe Événements sportifs et Événements & Projets à l'identité.
- Résultat testable : ces entrées du menu club et leurs sous-vues.
- Modèle : sonnet · Effort : high · Coût estimé : élevé
- Pourquoi ce modèle : gros volume (≈730 lignes en ligne + TournoiOrganise, ProjetDetail, ProjetClubCFF4).
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 10 PLAN-design-identite.md`
- Dépend de : bloc 4
- Prérequis : aucun
- Étapes :
  - Sauvegarde.
  - `evenements` (vues `evenements`, `projets`), `tournoi`, `stages`, `projet_sportif` et composants importés.
  - Les pages publiques de tournoi et de stage (hors dashboard) ne sont pas touchées.
  - Build, tests, lint.
- Ce que je teste pour valider : un événement, un projet, un tournoi, un stage, le projet sportif.
- Reste à finir :
  - TournoiSponsors (reçoit le `st` du kit mais garde sa mise en page), vues « création » et « détail » de TournoiOrganise et sous-onglets des stages : couverts par le kit mais non rendus en test automatique (seul l'état de départ l'est) : à regarder à l'écran.
  - Les listes de pastilles de choix des stages (jours, paiement, filtres) sont passées en fond sombre + contour de la couleur d'accent ; si Kevin les trouve fades, à reprendre au bloc 19.
  - Couleurs de créneaux de stage (COULEURS_CRENEAU) et couleurs de postes de budget de projet : laissées, ce sont des données enregistrées avec chaque ligne.
  - EcranEtatStage (page publique) non touché, comme prévu.
- Journal :
  - 2026-11-16, Sonnet 5.5. EN COURS (session 1 sur 2, contexte à 60 %). Sauvegarde ~/Sauvegardes-DigitalFootball/design-identite-2026-11/DashboardClub.jsx.avant-bloc10.jsx (TournoiClub : récupérable par `git show HEAD:src/components/club/TournoiClub.jsx`). FAIT : (1) `evenements` (Événements & Projets) dans DashboardClub.jsx : `TitreEcran` + vues en boutons (aria-pressed), kit local `kit` (carte, champ, étiquette, boutons) à la place de `st` dans cette section, pavé date, étiquettes neutres, puces à croix nommées (icône X), colonnes de projets en liseré de statut, jauge d'avancement, boutons PDF/Modifier/Supprimer à 36 px nommés. (2) `TournoiClub.jsx` (Nos tournois) : `st` local rebranché sur le kit, statuts en liseré + marqueur carré (plus de couleur en texte, plus de hex), convocations, chiffres du tournoi en `police.titre`, onglets en boutons aria-pressed. Build OK, lint TournoiClub 0 erreur (0 avant), DashboardClub non pire à vérifier en fin de bloc. RESTE À FAIRE : TournoiOrganise (290 styles, 14 emojis, `STATUT_COULEUR` en hex), ProjetDetail (15 emojis), ProjetKanban, ProjetSportif (19 hex) + bloc `projet_sportif` de DashboardClub (cartes Droits des éducateurs, bascules), ProjetClubCFF4 (14 hex), stages/* (StagesModule 19 hex, StageOrganisation, StageInscriptions, StageOffres...), PaveDateTournoi (1 hex), puis build, npm test, lint, rendu serveur des états vides. Reprendre avec `/clear` puis `/bloc 10 PLAN-design-identite.md` : le plan est à jour, ne pas refaire les deux premiers points.
  - 2026-11-16, Sonnet 5.5, session 2 sur 2. FAIT, bloc complet. Sauvegardes dans ~/Sauvegardes-DigitalFootball/design-identite-2026-11/bloc10/ (6 fichiers + stages-avant-bloc10/). `TournoiOrganise` : `st` local rebranché sur le kit (champs, boutons, étiquettes, icônes carrées 36 px nommées), statuts en étiquette à marqueur carré (plus de `STATUT_COULEUR` en hex), cartons 🟨🟥 dessinés (composant `Carton`), emojis de format et de phase finale retirés ou remplacés par icônes lucide, onglets en groupe de boutons aria-pressed, étapes de création en carrés à chiffre condensé, encadrés « étape suivante » et « temps disponible » en carte à liseré, classements en chiffres condensés (plus de rang vert/orange/gris), titres en Barlow condensé, vert de club jamais en texte. Les données envoyées aux badges (couleur '#f59e0b', icône 🏆) sont laissées : elles partent en base. `PaveDateTournoi` refait (lettre calculée sur la couleur de statut). `ProjetKanban` réécrit : colonnes en carte à liseré haut, priorités en étiquette à marqueur, boutons + et valider en icônes nommées. `ProjetDetail` : cartes et champs du kit, KPI en chiffres condensés, onglets soulignés à la couleur du club (texte plein), boutons teintés vert/bleu remplacés par des boutons au trait, croix nommées, cases d'actions en vrais boutons checkbox, 15 emojis retirés. `ProjetSportif` : titres condensés, couleur de pôle gardée en fond/liseré seulement, lettre des boutons pleins calculée, bascule Masculin/Féminin en vrais boutons (le rose codé en dur est supprimé), croix de galerie nommée. Bloc « Droits des éducateurs » de DashboardClub (projet_sportif) : carte du kit et bascules en vrais boutons `role="switch"` avec mention Oui/Non. `ProjetClubCFF4` (src/components/ProjetClubCFF4.jsx) : couleurs d'axes calculées depuis le thème (info, succès, ambre) au lieu de 3 hex, notes 0 à 5 avec lettre calculée, onglets soulignés, titres condensés, l'attestation imprimable n'est pas modifiée. Stages (src/components/stages/) : `st` commun du module sur le kit, statuts de paiement, matériel et tâches en étiquette à marqueur, hex de statut (#f87171 #facc15 #4ade80 #60a5fa) remplacés par les couleurs de statut du thème, chiffres des statistiques sponsors en condensé. Vérifications : `npm run build` OK, `npm test` 527 réussis / 0 échec (1 ignoré comme avant), lint : TournoiOrganise 1 erreur 1 avertissement identiques à avant (setState dans un effet, existant), ProjetSportif 5 erreurs 4 avertissements identiques, TournoiClub / ProjetKanban / ProjetDetail / ProjetClubCFF4 / stages sans erreur nouvelle, DashboardClub 14 erreurs 7 avertissements = référence du HEAD. Rendu serveur de test (fichier temporaire supprimé) : 6 composants plus Kanban et pavé date rendent sans planter à l'état vide. Écart : un `git stash` lancé par erreur en cours de séance a été annulé aussitôt (`git stash pop`), aucun fichier perdu ; l'ancienne réserve nommée « reste du travail non commité avant merge origin/main » est intacte. Aucun commit.

### Bloc 11 : Club, Inventaire, Newsletter, Tâches
- Statut : fait (en attente du contrôle visuel de Kevin)
- Objectif : derniers écrans du club.
- Résultat testable : ces trois entrées du menu club ; plus aucun emoji d'interface dans DashboardClub.
- Modèle : sonnet · Effort : medium · Coût estimé : moyen
- Pourquoi ce modèle : écrans de listes et formulaires.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 11 PLAN-design-identite.md`
- Dépend de : blocs 5 à 10
- Prérequis : aucun
- Étapes :
  - Sauvegarde.
  - `inventaire`, `newsletter` (l'email envoyé n'est pas modifié), `taches` et composants.
  - Comptage final des emojis de DashboardClub (script du bloc 19) : seuls restent ceux de contenu, listés dans le journal.
  - Build, tests, lint.
- Ce que je teste pour valider : inventaire, rédaction d'une newsletter sans l'envoyer, tâches.
- Reste à finir :
  - Contrôle à l'œil par Kevin (Claude n'a pas d'outil de capture, et Inventaire avec données n'est pas rendable côté Claude) : Inventaire Équipement (chiffres, Packs et champs de taille, filtre de catégories, tableau, Préparer / Récupérer), Inventaire Matériel (stock +/−, Distribuer, panier, Historique par saison), fenêtres (champ de taille, pack, catalogue, historique, préparation, distribution, remise) ; Newsletter (sans envoyer) ; Tâches ; ordinateur et téléphone, clair et sombre, AS Cannes (rouge) et club test (vert).
  - Emojis laissés volontairement (données ou PDF) : types d'événement, statuts de projet et catégories de budget (constantes `emoji` / `icon` en tête de DashboardClub, utilisés seulement dans le PDF d'événement), icône de pack `'👕'` (champ enregistré en base, non affiché), colonnes `emoji` des tâches et responsabilités (enregistrées, non affichées), lignes du PDF d'événement et de projet. Rien d'autre dans DashboardClub.
  - Les listes de langues et textes de `translations.js` contiennent encore des emojis : hors périmètre de ce bloc, à traiter au bloc 19.
  - Les écrans Mon club, Éducateurs et Catégories n'ont pas été relus ici ; seuls leurs boutons de fermeture (croix) et la fiche joueur / note éducateur ont été nettoyés de leurs emojis.
  - `couleurPrincipale` n'est plus utilisé par Newsletter et TachesClub (couleur lue dans le thème) ; DashboardClub la passe encore, inoffensif.
  - Erreurs de lint déjà là avant, non touchées : Newsletter 2 erreurs / 2 avertissements et TachesClub 1 / 1 (chargement lancé dans un effet).
- Journal :
  - 2026-11-16, Sonnet 5.5. Sauvegarde ~/Sauvegardes-DigitalFootball/design-identite-2026-11/bloc11/DashboardClub.jsx.avant-bloc11.jsx. Nouveau dans le kit : `EtiquetteStatut` (petites capitales sur fond neutre, marqueur carré à la couleur du statut, jamais de couleur en texte) dans src/components/identite. `Newsletter` et `TachesClub` réécrits sur le kit (titre d'écran, chiffres en `CarteChiffre`, jauge de lecture, choix de cible et d'onglets en boutons aria-pressed, champs et boutons du kit, lignes à liseré, icônes nommées, plus aucune couleur en dur ni emoji affiché). L'email envoyé (fonction send-newsletter) n'est pas touché. `Inventaire` (DashboardClub.jsx) : `TitreEcran`, vue en boutons, chiffres en `CarteChiffre`, réglages dépliables, pastilles de champs et de packs (liseré à la couleur du pack), filtre de catégories en boutons, tableau en `styleTableau` avec légende cachée et groupes dépliables au clavier, statuts en `EtiquetteStatut` (hex #f97316 #f59e0b #f87171 remplacés par les couleurs de statut du thème), Matériel (stock avec boutons − et + nommés, distribution, panier, historique par saison). Sept fenêtres refaites (rôle dialog, titre condensé, croix nommée, choix « Pour qui » en boutons, liste de champs en boutons aria-pressed, emojis ⚽ 📋 👥 🏛️ 📦 ⚠️ ✅ retirés). Nettoyage des emojis d'interface restants dans DashboardClub : boutons Vue Éducateur / Joueur / Parent en icônes (GraduationCap, Shirt, Eye), tutoriel, alertes d'import, fiche joueur (libellés des chiffres, titres de section, coupe du rang 1 en icône), note éducateur, six croix de fermeture nommées. Aucun comportement changé : mêmes requêtes, mêmes textes métier, mêmes actions.
  - Vérifications : `npm run build` OK, `npm test` 527 réussis / 0 échec (1 ignoré comme avant), lint DashboardClub 14 erreurs / 7 avertissements = référence. Rendu côté serveur sans erreur de Newsletter et TachesClub (modifiables et lecture seule) et d'`EtiquetteStatut`. Plus aucun hex, Inter, `st.` ni texte faible dans les plages Inventaire et fenêtres. Pas de contrôle visuel possible côté Claude.
  - Écart : un remplacement trop large dans DashboardClub.jsx a effacé un instant les écrans placés entre Inventaire et ses fenêtres (Newsletter, Tâches, Mon club...). Restaurés aussitôt depuis la sauvegarde du début de bloc et comparés ligne à ligne : identiques à l'original. Aucun commit.

### Bloc 12 : Éducateur, Accueil et Mon équipe
- Statut : fait (en attente du contrôle visuel de Kevin)
- Objectif : l'accueil éducateur (déjà remanié en novembre) passe au kit, puis Mon équipe.
- Résultat testable : accueil et Mon équipe de l'espace éducateur.
- Modèle : sonnet · Effort : high · Coût estimé : élevé
- Pourquoi ce modèle : les deux écrans les plus utilisés au quotidien, Mon équipe est dense (≈720 lignes).
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 12 PLAN-design-identite.md`
- Dépend de : bloc 4
- Prérequis : compte éducateur avec une équipe.
- Étapes :
  - Sauvegarde de DashboardEducateur.jsx.
  - `AccueilEducateur` (objets `cardSt`, `kpiCardSt`, `segLabelSt`, `btnSeanceSt`) vers le kit ; la carte séance garde son liseré, devenu le liseré standard.
  - `activeSection === 'equipe'` : liste des joueurs en tableau type feuille de match ; l'invitation de dirigeant garde sa place (tout en bas).
  - Mode parent en lecture seule : vérifier qu'il reste correct.
  - Build, tests, lint.
- Ce que je teste pour valider : accueil et Mon équipe, ouverture d'un profil joueur, clair et sombre, téléphone.
- Reste à finir :
  - Contrôle à l'œil par Kevin (Claude n'a pas d'outil de capture) : accueil éducateur (en-tête, 4 cartes chiffres, carte séance, bandeau d'alerte s'il y en a, planning de la semaine, classement du mois, actions rapides, fiche déplacement), Mon équipe (en-tête et boutons, synthèse, semaine, groupe, onglets Postes / Liste, tableau, cartes par poste, fenêtre profil joueur, fenêtre Modifier, ajout d'un joueur, import) ; ordinateur et téléphone, clair et sombre, AS Cannes (rouge) et club test (vert). Mode lecture d'un dirigeant à vérifier (étiquette « mode lecture », pas de boutons d'édition).
  - Non touchés, car composants importés (leurs blocs ou le bloc 19) : AnnoncesClubWidget, TerrainsLiberesWidget, DeplacementsAssignesWidget, DerniereCauserieWidget (bouton d'action rapide), AlertesPanel, BandeauClub, AvatarsMenu. Ils reçoivent encore `accentColor={colors.accent.blue}`.
  - `st` (objet de styles partagé du dashboard éducateur : `st.card`, `st.input`, `st.btn`...) n'a pas été modifié : les autres écrans l'utilisent. Dans Mon équipe, ses usages sont remplacés par le kit ; le reste suit aux blocs 13 à 18.
  - Dans la fenêtre Modifier un joueur, seuls le titre, la croix et le bouton Enregistrer ont changé ; le reste du formulaire (jours actifs, photo, boutons `st.btn(colors.accent.blue)`) reste à reprendre. `blocInvitationJoueur` et `FicheJoueurCategorie` non touchés.
  - Icônes de menu `Ico*` en SVG maison gardées (actions rapides, boutons Télécharger / Importer).
- Journal :
  - 2026-11-16, Sonnet 5.5. Sauvegarde ~/Sauvegardes-DigitalFootball/design-identite-2026-11/bloc12/DashboardEducateur.jsx.avant-bloc12.jsx. Un seul fichier modifié : src/pages/DashboardEducateur.jsx (import du kit, de lucide-react et des jetons `police` / `forme`).
  - Accueil : `TitreEcran` (date en sur-titre, « Bonjour prénom », bouton Nouvelle séance du kit). Quatre cartes chiffres en `CarteChiffre` (Effectif liseré, Bilan avec `Jauge` V/N/D, Présence, Prochain match : plus de carte pleine couleur du club, plus de chiffre coloré en vert). Carte séance en `styleCarteLiseree` (le jour n'est plus écrit en couleur du club, titre condensé, compteurs avec marqueur carré, boutons du kit). Bandeau d'alerte : carte à liseré ambre, icône et bouton Voir du kit (les couleurs en dur #FFF4E5 / #7A4A06 et `useTheme` supprimés). Planning de la semaine : entraînement = liseré couleur du club, match = puce pleine couleur du club (texte recalculé), plus de texte en couleur du club. Classement du mois : podium en carte du kit (coins 6 px, chiffres condensés, étoile lucide), liens « Voir tout » en texte plein souligné. Actions rapides : cartes du kit, « à préparer » = liseré. Fiche déplacement : fenêtre nommée (role dialog), champs et boutons du kit, emojis 📋 📍 👥 🎯 📅 🕐 💾 remplacés par des icônes.
  - Mon équipe : `TitreEcran` avec les boutons (modèle, import, ajouter) du kit ; synthèse (barre des lignes en `Jauge`, comptes liés et licenciés en chiffres condensés) ; semaine en cartes à liseré ; groupe d'équipe (lien, champ, bouton) ; Postes / Liste en onglets `df-onglets` ; liste des joueurs en `styleTableau` (en-têtes en petites capitales, numéro condensé, liseré de poste, statuts en `EtiquetteStatut`, légende cachée pour lecteurs d'écran) ; cartes par poste à liseré. Fenêtre profil joueur : cadre 6 px, titre condensé, présence / évaluation / stats / classements avec icônes lucide à la place des emojis (🏃 ✅ 🏆 ❌ 🤕 🤒 📅 ⭐ ⚽ 🎯 🧤 ⏱️ 🏅 🌟 🥇 🪪 ✏️ 💾 📂 ✕), cartons « 🟨 🟥 » remplacés par les mots Jaunes / Rouges, croix nommées « Fermer ». Invitation de dirigeant : inchangée, toujours tout en bas. Aucun comportement changé : mêmes requêtes, mêmes textes métier, mêmes actions.
  - Vérifications : `npm run build` OK, `npm test` 527 réussis / 0 échec (1 ignoré comme avant), lint DashboardEducateur.jsx 16 erreurs / 4 avertissements = référence (avant et après). Plus aucun emoji dans AccueilEducateur ni dans la plage Mon équipe, plus aucun `Barlow, sans-serif` en dur ni couleur du club en texte dans AccueilEducateur. Pas de contrôle visuel possible côté Claude. Aucun commit.


### Bloc 13 : Éducateur, Mes séances
- Statut : fait (en attente du contrôle visuel de Kevin)
- Objectif : l'écran Mes séances à l'identité.
- Résultat testable : la section Mes séances.
- Modèle : sonnet · Effort : high · Coût estimé : élevé
- Pourquoi ce modèle : gros écran (≈1 250 lignes).
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 13 PLAN-design-identite.md`
- Dépend de : bloc 4
- Prérequis : aucun
- Étapes :
  - Sauvegarde.
  - `activeSection === 'mes_seances'` et composants (GrilleSeance...).
  - Ne pas toucher la fiche séance BEF ni le PDF.
  - Build, tests, lint.
- Ce que je teste pour valider : liste de séances, ouvrir une séance, générer un PDF (doit être identique à avant).
- Reste à finir :
  - Contrôle à l'œil par Kevin (Claude n'a pas d'outil de capture) : Mes séances, les 4 modes (Rédiger, Enregistrer, Scanner, Évaluation club pour les comptes bêta), modale « Générer avec l'IA » (comptes bêta), fiche BMF / BEF / DEF avec procédés, fenêtre « sauver dans la bibliothèque », filtres, dossiers Offensif / Défensif et cartes de séance ; ordinateur et téléphone, clair et sombre, AS Cannes (rouge) et club test (vert). Générer un PDF et vérifier qu'il est identique à avant (rien n'a été touché côté gabarits).
  - Non touchés : GrilleSeance (n'est pas utilisé par l'espace éducateur, seulement par les dashboards club et coach : à voir dans leurs blocs ou au bloc 19), fiche séance BEF / BMF et PDF, aperçu de fiche (`ficheApercu`), modale de la bibliothèque d'import (`modalBiblioImport`), Tactipad, `BoutonTutoriel`.
  - `st` (objet de styles partagé) non modifié, ses usages sont retirés de Mes séances seulement.
  - Les pastilles de filtre n'ont plus de couleur par phase (Offensif / Défensif / animées) : seul l'état actif les distingue, le liseré des dossiers garde la couleur de la phase.
- Journal :
  - 2026-11-16, Sonnet 5.5. Sauvegardes ~/Sauvegardes-DigitalFootball/design-identite-2026-11/bloc13/ (DashboardEducateur.jsx et GrilleSeance.jsx). Un seul fichier modifié : src/pages/DashboardEducateur.jsx.
  - Onglets de mode en `df-onglets` avec icônes lucide (Pencil, Inbox, Camera, Landmark), bouton IA et tutoriel sur la même ligne. Quatre cartes de mode en `styleCarte` (coins 6 px), titres condensés. Tous les champs (≈ 60) en `styleChamp` + classe `df-champ` (16 px, plus de zoom iPhone), libellés en petites capitales. Boutons de bascule (collectif / individuel, football / futsal, modes diplôme, type de procédé) en choix pleins à la couleur du club avec `aria-pressed` : plus de fonds noirs `#1a1a1a` (illisibles en clair). Fiche officielle BMF / BEF / DEF et brouillon en carte à liseré ; procédés en cartes du kit, flèches et croix en icônes nommées ; modales (IA, sauver en bibliothèque) en `role="dialog"`. Liste : carte séance du kit, étiquettes `EtiquetteStatut` (thème, diplôme, note, archivée), dossiers de phase en cartes à liseré à la couleur de la phase avec gros chiffre condensé, accessibles au clavier (Entrée, Espace). Emojis remplacés par des icônes ou retirés (aucun restant dans l'écran), plus aucune couleur en dur (`#...`), plus de `Barlow` en dur, couleurs de texte `text.faint` / `muted` remontées en `text.dim`.
  - Aucun comportement changé : mêmes requêtes, mêmes textes, mêmes actions (ajouts d'accessibilité uniquement : rôles, `aria-pressed`, clavier sur les dossiers).
  - Vérifications : `npm run build` OK, `npm test` 527 réussis / 0 échec (1 ignoré), lint DashboardEducateur.jsx 16 erreurs / 4 avertissements = référence. Contrôle automatique de la plage : 0 emoji, 0 couleur hexadécimale, 0 `st.`, 0 doublon de className. Pas de contrôle visuel possible côté Claude. Aucun commit.



### Bloc 14 : Éducateur, Entraînements, Notes, Causerie
- Statut : fait (en attente du contrôle visuel de Kevin)
- Objectif : entraînements (prochaine, liste, présences), notes, causerie avant match.
- Résultat testable : ces sections de l'espace éducateur.
- Modèle : sonnet · Effort : high · Coût estimé : élevé
- Pourquoi ce modèle : CauserieAvantMatch contient 40 emojis, dont certains dans la présentation projetée aux joueurs.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 14 PLAN-design-identite.md`
- Dépend de : bloc 4
- Prérequis : aucun
- Étapes :
  - Sauvegarde.
  - `entrainements` (sous-onglets `prochaine`, `liste`), `notes`, composant CauserieAvantMatch.
  - Présences en `Jauge`, statuts présent/absent inchangés.
  - Build, tests, lint.
- Ce que je teste pour valider : prochaine séance, liste, saisie de présence, une note, ouvrir une causerie en présentation.
- Reste à finir :
  - Contrôle à l'œil par Kevin (Claude n'a pas d'outil de capture) : Entraînements (en-tête et boutons, onglets Prochaine séance / Mes séances, carte de la prochaine séance, synthèse des réponses, clôture du sondage, formulaires « Nouvelle séance » et « Planifier la saison », liste par mois, saisie de présence au clic, point séance, fenêtre Modifier), Évaluations (cartes par ligne, ouverture d'une fiche), Causerie (liste, formulaire en 11 parties, fiche vestiaire, présentation plein écran) ; ordinateur et téléphone, clair et sombre, AS Cannes (rouge) et club test (vert).
  - Non touchés, volontairement : la présentation plein écran de la causerie (palette sombre propre, projetée aux joueurs : seuls les emojis des titres de diapositives sont devenus des icônes), la fiche vestiaire de la causerie (carte colorée à l'écran, base du `window.print()`), `FicheEvaluationJoueur` (fenêtre ouverte depuis Évaluations), `NoteSeanceForm` (formulaire RPE côté joueur), `SondageSemaine`, `PublierSeanceJoueurs`, les modales d'import de fiche et de publication, `CompositionTerrain`, `TactipadViewer`, `st` (objet partagé).
  - `STATUT_CONFIG` (présent / absent / blessé / malade / convoqué) a changé : `emoji` remplacé par `icone` (lucide). La fenêtre « sondage de match » (section Matchs, bloc 15) ne lisait pas `emoji`, donc rien à reprendre.
  - Choix à confirmer : les pastilles de statut perdent leur texte coloré (le sens est porté par le libellé et un marqueur carré coloré) ; le taux de réponse et le taux de présence du mois ne changent plus de couleur selon le seuil 50 % / 80 %.
- Journal :
  - 2026-11-16, Sonnet 5.5. Sauvegardes ~/Sauvegardes-DigitalFootball/design-identite-2026-11/bloc14/ (DashboardEducateur, CauserieAvantMatch, NoteSeanceForm). Fichiers modifiés : src/pages/DashboardEducateur.jsx et src/components/CauserieAvantMatch.jsx.
  - Entraînements : `TitreEcran` avec boutons du kit ; sous-onglets en `df-onglets` ; Prochaine séance : carte à liseré avec pavé date (bandeau du jour à la couleur du club, texte recalculé), `EtiquetteStatut` pour l'échéance et l'état du sondage, synthèse en gros chiffre condensé + `Jauge` à 6 segments (à la place des 6 tuiles), réponses regroupées par statut avec liseré, clôture automatique en choix pleins `aria-pressed`, alerte « pas d'heure » en carte à liseré ambre. Mes séances : mois en bouton (`aria-expanded`), séance à venir = carte à liseré, passée = carte simple, présences en `Jauge`, tuiles de présence avec icône de statut (plus d'emojis), point séance en vrai bouton `aria-pressed` avec étoile lucide, formulaires (séance unique, planification, fenêtre Modifier) en champs du kit 16 px, jours de la semaine en choix à bascule, aperçu et progression en `Jauge`.
  - Évaluations : `TitreEcran`, mode lecture en `EtiquetteStatut`, progression en `Jauge`, cartes joueur en `styleCarte` à liseré de ligne (vrais boutons, focus visible), note en chiffre condensé non coloré.
  - Causerie : styles locaux (`card`, `label`, `inp`, `btnG`, `btnO`) branchés sur le kit, donc les 11 parties du formulaire passent d'un coup ; titres de partie condensés à liseré couleur du club ; liste : `TitreEcran`, cartes de match du kit (la prochaine à liseré, accessible au clavier), étiquettes `EtiquetteStatut`, menu d'actions du kit ; météo en icônes lucide (Sun, CloudSun, CloudRain, Wind, Snowflake, Flame) et en boutons à bascule ; tous les emojis remplacés par des icônes ou retirés (titres de diapositives : icônes lucide). Conflit de nom évité : `couleurClub` du kit importé sous `couleurDuClub` (le composant a une propriété du même nom).
  - Aucun comportement changé : mêmes requêtes, mêmes textes métier, mêmes actions (ajouts d'accessibilité : rôles, `aria-pressed`, `aria-expanded`, clavier).
  - Vérifications : `npm run build` OK, `npm test` 527 réussis / 0 échec (1 ignoré comme avant), lint DashboardEducateur.jsx 16 erreurs / 4 avertissements = référence, CauserieAvantMatch.jsx 2 erreurs / 1 avertissement (effets existants, aucune nouvelle). Contrôle automatique : 0 emoji, 0 couleur hexadécimale, 0 `st.`, 0 `Barlow` en dur dans la plage Entraînements + Évaluations ; 0 emoji dans CauserieAvantMatch (hors fiche vestiaire, couleurs en dur conservées). Pas de contrôle visuel possible côté Claude. Aucun commit.

### Bloc 15 : Éducateur, Matchs et logistique
- Statut : fait (en attente du contrôle visuel de Kevin)
- Objectif : matchs (calendrier, résultats, classement), déplacements, terrains, annonces, matériel.
- Résultat testable : ces sections de l'espace éducateur.
- Modèle : sonnet · Effort : high · Coût estimé : élevé
- Pourquoi ce modèle : écran match dense (≈880 lignes) + scanner de feuille de match.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 15 PLAN-design-identite.md`
- Dépend de : bloc 4
- Prérequis : correctif scan traité au bloc 0.
- Étapes :
  - Sauvegarde.
  - `matchs`, `deplacements` (RepartitionMiniBus), `terrains`, `annonces`, `materiel` et composants (ScannerProc, RapportMatch...).
  - Scores en Barlow Condensed façon tableau d'affichage ; forme en `PastilleResultat`.
  - Build, tests, lint.
- Ce que je teste pour valider : calendrier, un match joué, classement, un déplacement, le matériel.
- Reste à finir :
  - Contrôle à l'œil par Kevin (Claude n'a pas d'outil de capture) : Compétition (en-tête, 4 onglets Causerie / Résultats / Classement / Calendrier), Résultats (filtres, bilan en jauge, cartes de match joué avec pastille V/N/D et score façon tableau d'affichage, menu « ... », feuille de match avec saisie des stats et cartons, fenêtre « Noter »), Calendrier (cartes à venir avec jauge de disponibilités, zone de scan, menu « ⋮ », « Marquer comme joué »), Classement, fenêtres Sondage dispo / Convocation officielle / Marquer comme joué (avec scan de feuille) / Ajouter-Modifier un match, Rapport de match, Déplacements, Terrains, Actualités du club, Mon matériel, widgets de l'Accueil (Actualités, Prochain match, Terrains disponibles) ; ordinateur et téléphone, clair et sombre, AS Cannes (rouge) et club test (vert). Vérifier aussi que « Extraire en PDF » donne le même PDF qu'avant (gabarit non touché).
  - Non touché volontairement : RepartitionMiniBus.jsx (plus importé nulle part, couleurs sombres en dur : candidat à suppression, à décider), l'objet partagé `st` du Dashboard (seule la section Matchs passe par `stK`), les gabarits PDF de RapportMatch, les couleurs de dessin de ScannerProc (palette du schéma tactique), la palette d'équipes de PlanningTerrains.
  - Effet de bord voulu : Déplacements, PlanningTerrains et TerrainsLiberesWidget sont aussi affichés côté club ; les boutons et couleurs y changent de la même façon. Les props `accentColor` ne sont plus lues dans AnnoncesClubWidget, DeplacementsAssignesWidget, TerrainsLiberesWidget et Deplacements (les appelants la passent encore, sans effet : à nettoyer au bloc 19).
  - Choix à confirmer : le bilan Victoires / Nuls / Défaites est devenu une jauge à 3 segments dans une seule carte (au lieu de 3 tuiles) ; le score des matchs joués n'est plus coloré, c'est la pastille V / N / D qui porte le résultat.
- Journal :
  - 2026-11-16, Sonnet 5.5. Sauvegardes ~/Sauvegardes-DigitalFootball/design-identite-2026-11/bloc15/ (DashboardEducateur, RepartitionMiniBus, ScannerProc, RapportMatch, Deplacements, PlanningTerrains, TerrainsLiberesWidget, AnnoncesClubWidget, DeplacementsAssignesWidget). Fichiers modifiés : src/pages/DashboardEducateur.jsx, src/lib/useStFinance.js, src/components/{LigneResultat,CarteMatchAVenir,ScannerProc,RapportMatch,Deplacements,PlanningTerrains,TerrainsLiberesWidget,AnnoncesClubWidget,DeplacementsAssignesWidget}.jsx.
  - useStFinance.js : nouvelle fonction `construireSt(colors)` (même objet que `useSt()`, sans hook) ; `useSt()` l'appelle. Le Dashboard en tire `stK`, utilisé seulement dans la section Matchs (les retours anticipés du composant interdisent le hook). Dans la section : `st.btnSolid` devient `stK.btnSolid()`, boutons en `df-bouton` / `df-bouton-secondaire`, champs en `df-champ` (16 px).
  - Matchs : `TitreEcran` + sous-onglets `df-onglets` ; titres de sous-écran en condensé ; filtres de compétition en boutons à bascule `aria-pressed` ; bilan en `Jauge` ; libellés de mois en `Etiquette` ; menus « ... » et « ⋮ » en boutons du kit (icônes lucide, `aria-haspopup`, `aria-expanded`) avec lignes de menu à 44 px ; feuille de match en carte du kit, cartons en vrais boutons à bascule, ligne avec donnée repérée par une icône coche ; fenêtres en `role="dialog"` avec bouton Fermer nommé ; sondage de disponibilité en `EtiquetteStatut` ; tous les emojis et couleurs hexadécimales retirés de la plage (0 emoji, 0 hex, 0 Barlow). Textes pâles (`text.faint`, `text.disabled`) passés en `text.secondary` / `text.dim` pour le contraste.
  - LigneResultat et CarteMatchAVenir réécrits avec le kit : carte à liseré pour le dernier match joué et le prochain match, score en chiffres condensés, `PastilleResultat`, `EtiquetteStatut`, pavé date à la couleur du club, disponibilités en `Jauge`, carte cliquable accessible au clavier.
  - Actualités du club : `TitreEcran`, cartes du kit, non lue = carte à liseré + étiquette « Nouveau » ; Mon matériel : bandeaux en cartes à liseré, tailles en `Jauge` + champs du kit, lots en cartes à liseré avec `EtiquetteStatut` ; écrans « rejoins un club » de Déplacements et Terrains en `TitreEcran`.
  - Composants : ScannerProc (écran du scan de fiche, 17 emojis remplacés par icônes lucide, choix type / thème / âge en boutons à bascule), RapportMatch (formulaire en kit, grilles qui passent sur une colonne en téléphone, croix nommées), Deplacements (boutons et alertes sur le kit et les couleurs de statut, plus de couleur en dur, liseré du prochain déplacement), PlanningTerrains (police en dur retirée), trois widgets d'Accueil.
  - Vérifications : `npm run build` OK ; `npm test` 528 dont 527 réussis, 0 échec, 1 ignoré (comme avant) ; lint DashboardEducateur.jsx 16 erreurs / 4 avertissements = référence, Deplacements 2/1, RapportMatch 2/0, PlanningTerrains 4/0, widgets 1/0 chacun : identiques à avant mes changements ; ScannerProc, LigneResultat, CarteMatchAVenir : 0. Lint global 176 erreurs / 70 avertissements contre 172 / 70 notés au bloc 0 : l'écart ne vient d'aucun des fichiers de ce bloc (comparés un par un), à repérer au bloc 19. Rendu côté serveur de LigneResultat (vedette, mobile, tirs au but), CarteMatchAVenir (avec et sans disponibilités), ScannerProc et RapportMatch sans erreur (fichier de test temporaire, mis à la corbeille). Pas de contrôle visuel possible côté Claude. Aucun commit.

### Bloc 16 : Éducateur, Statistiques, Santé, Historique
- Statut : fait (en attente du contrôle visuel de Kevin)
- Objectif : statistiques (tableau, graphiques, présence), santé, historique.
- Résultat testable : ces sections de l'espace éducateur.
- Modèle : sonnet · Effort : high · Coût estimé : élevé
- Pourquoi ce modèle : graphiques et tableaux chiffrés (≈1 000 lignes).
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 16 PLAN-design-identite.md`
- Dépend de : bloc 4
- Prérequis : aucun
- Étapes :
  - Sauvegarde.
  - `stats` (dont `carteGraphique`), `sante`, `historique` et composants.
  - Camembert de présence et couleurs d'information : inchangés (statuts).
  - Build, tests, lint.
- Ce que je teste pour valider : les trois onglets de stats, la santé, l'historique.
- Reste à finir :
  - Contrôle à l'œil par Kevin (Claude n'a pas d'outil de capture) : Statistiques (6 onglets : Tableau avec filtre de compétition, Classement avec podium, Graphiques, Présences avec détail par mois, Pts Séance avec la fenêtre « Comment inscrire les points séances », Notes de séance avec la légende RPE), Santé (liste, filtres, déclaration d'une blessure, rapport saison, détail d'une blessure : retour compétition, rééducation, suivi médical), Historique (sélecteur de saison, Collectif / Individuel) ; ordinateur et téléphone, clair et sombre, AS Cannes (rouge) et club test (vert). Pour le détail d'une blessure, il faut une blessure déclarée (rendu serveur impossible sans données).
  - Non touchés, volontairement : `DonutMulti` (camembert de présence, couleurs de statut), `HistoriqueIndividuel` et `HistoriqueClub` (autres écrans de l'historique), `SanteJoueur` (dashboard joueur, bloc 20), `StatsEquipe` (déjà au kit, partagé avec club et joueur), `st` (objet partagé).
  - Effet de bord voulu : `HistoriqueCollectif` et `SelecteurSaison` sont aussi affichés côté club (Historique du club) : leurs boutons, champs et couleurs y changent de la même façon.
  - Choix à confirmer : dans le Tableau, les chiffres ne sont plus colorés par colonne (buts vert, passes bleu...), tout est en texte plein et seule une petite pastille carrée porte la note ; la présence reste une barre à couleur de statut ; les médailles (🥇🥈🥉) de Pts Séance deviennent un carré de rang (le n°1 à la couleur du club) et l'étoile ⭐ une icône ; le taux de présence global et les stats de santé ne changent plus de couleur selon un seuil.
- Journal :
  - 2026-11-16, Sonnet 5.5. Sauvegardes ~/Sauvegardes-DigitalFootball/design-identite-2026-11/bloc16/ (DashboardEducateur, SanteEquipe, HistoriqueCollectif). Fichiers modifiés : src/pages/DashboardEducateur.jsx, src/components/SanteEquipe.jsx, src/components/saisons/HistoriqueCollectif.jsx, src/components/saisons/SelecteurSaison.jsx.
  - Statistiques : `TitreEcran`, sous-onglets en `df-onglets` (rôles tab), filtre de compétition en une seule fonction `filtresCompetition` (choix à bascule `aria-pressed`, partagée par Tableau, Classement, Graphiques). Tableau : `styleTableau` (légende cachée, en-têtes en petites capitales, cartons en rectangles nommés pour lecteurs d'écran, liseré de poste, présence en barre fine, « sort le ... » en `EtiquetteStatut`). Classement : critères en choix à bascule, podium en carte du kit (rang en carré, n°1 à la couleur du club, chiffres condensés), tableau complet du kit. Graphiques : cartes du kit, barres fines à la couleur du club (couleurs de carton jaune / rouge gardées), « Voir tous » en bouton `aria-expanded`. Présences : synthèse avec `Jauge` des statuts, cartes par poste à liseré, détail par mois, classement en barres. Pts Séance : plus d'emojis (rang en carré, étoile lucide, trophée), fenêtre du tutoriel refaite (role dialog, flèches et croix nommées, icônes lucide à la place des emojis d'illustration). Notes de séance : légende RPE, cartes dépliables (`aria-expanded`), jauge de ressenti, `EtiquetteStatut`, mêmes jauges RPE / plaisir. Nouvelles aides en haut du fichier : `masqueLecteur`, `styleChiffreCond`, `marqueurCarre`.
  - Santé : `TitreEcran` ajouté, objet `s` branché sur le kit (cartes 6 px, boutons et champs du kit avec classes `df-bouton` / `df-champ`), chiffres clés en chiffres condensés à liseré de statut, filtres de statut en choix à bascule, cartes de blessure à liseré de statut (accessibles au clavier), `EtiquetteStatut` pour statut et gravité, onglets du détail en `df-onglets`, étapes de rééducation en cartes à liseré, rapport saison au kit, bouton Supprimer et croix nommés. Palette d'avatars colorés supprimée. Historique : titre, choix à bascule (Collectif / Individuel, compétition, critères), résultats avec `PastilleResultat`, classements en barres à la couleur du club, chiffres condensés.
  - Aucun comportement changé : mêmes requêtes, mêmes textes métier, mêmes actions (ajouts d'accessibilité uniquement).
  - Vérifications : `npm run build` OK ; `npm test` 528 dont 527 réussis, 0 échec, 1 ignoré (comme avant) ; lint DashboardEducateur.jsx 16 erreurs / 4 avertissements = référence, SanteEquipe 1 erreur (effet existant, ligne `useEffect`, déjà là avant), HistoriqueCollectif et SelecteurSaison 0. Plage Statistiques du dashboard : 0 emoji, 0 couleur hexadécimale, 0 `st.`, 0 `Barlow` en dur, 0 doublon de className. Rendu côté serveur de SanteEquipe (liste), HistoriqueCollectif et SelecteurSaison sans erreur (fichier de test temporaire, mis à la corbeille). Pas de contrôle visuel possible côté Claude. Aucun commit.

### Bloc 17 : Éducateur, Bibliothèque et outils
- Statut : fait (en attente du contrôle visuel de Kevin)
- Objectif : bibliothèque, Tactipad (cadre seulement), analyse vidéo, prép physique, clôtures de saison, projet sportif, stages.
- Résultat testable : ces sections de l'espace éducateur.
- Modèle : sonnet · Effort : high · Coût estimé : élevé
- Pourquoi ce modèle : bibliothèque volumineuse (≈790 lignes) + plusieurs composants importés.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 17 PLAN-design-identite.md`
- Dépend de : bloc 4
- Prérequis : aucun
- Étapes :
  - Sauvegarde.
  - `bibliotheque` (onglets et filtres de type), `tactipad` (le terrain dessiné n'est pas touché), `analyse_video`, `prep_physique`, `clotures_saison` (GestionCloturesSaison), `projet_sportif`, `stages`.
  - Build, tests, lint.
- Ce que je teste pour valider : bibliothèque (chaque onglet), ouvrir le Tactipad, prép physique, clôtures.
- Reste à finir :
  - Contrôle à l'œil par Kevin (Claude n'a pas d'outil de capture) : Bibliothèque (4 rubriques, filtres de type, de phase et de thème, cartes avec et sans schéma, mode sélection multiple, fenêtres Nouveau / Modifier / Voir / Importer / Scanner un procédé), Tactipad (titre seulement), Analyse vidéo (3 étapes, micro, rapport, liste des rapports), Prép physique (liste des programmes et filtres, détail avec grille de séances, Suivi / Stats / Classement, Tests physiques, fenêtres Créer / Clôturer / Séance), Clôtures de saison (barre de progression, liste des joueurs, fenêtre de clôture d'un joueur), Stages (liste, détail), Projet sportif (4 onglets) ; ordinateur et téléphone, clair et sombre, AS Cannes (rouge) et club test (vert).
  - Prép physique : les champs des fenêtres n'ont pas tous un `label htmlFor` (ils gardent leur libellé visuel au-dessus) ; à reprendre avec l'accessibilité. Le tableau des tests (grille en `<table>`) garde son style local, hors kit tableau.
  - `ProjetClubCFF4` : déjà conforme (0 emoji, 0 hex, polices du kit) ; seuls les coins (20 et 16 px) et la couleur du texte des pastilles de statut ont été corrigés.
  - Les couleurs `COULEURS_CRENEAU` de StagesModule (palette du planning de stage, enregistrée en base) et le fond blanc du QR code sont gardés volontairement.
- Journal :
  - 2026-11-16, Sonnet 5.5, bloc commencé (première moitié). Sauvegardes ~/Sauvegardes-DigitalFootball/design-identite-2026-11/bloc17/ (DashboardEducateur, AnalyseVideo, StagesModule, GestionPrepPhysique, GestionCloturesSaison, ProjetClubCFF4, ProjetSportifEducateur, Tactipad). Fichiers modifiés : src/pages/DashboardEducateur.jsx, src/components/AnalyseVideo.jsx.
  - Bibliothèque (DashboardEducateur) : `df-onglets` pour les 4 rubriques, `TitreEcran` avec actions du kit, types de procédé en choix à bascule (`aria-pressed`, icônes au trait, plus de couleur par type : le type se lit par l'icône et le libellé), filtres phase et thème en choix à bascule (petit carré de couleur pour la phase), cartes de procédé refaites (schéma sans pastilles sur l'image, étiquettes de type et de source, titre condensé, durée en chiffres condensés, boutons Modifier / Supprimer / Copier nommés, pied de carte à 44 px), dossiers par phase en titres condensés, barre de sélection du bas et état vide au kit. Cinq fenêtres (Nouveau-Modifier, Schéma, Importer, Voir, Importer une fiche) en `role="dialog"` avec croix « Fermer » nommée, champs avec `label htmlFor`, 0 emoji. Nouvelles aides en haut du fichier : `styleFondModal`, `styleBoutonFermer`. Icônes locales devenues inutiles retirées. Plage Bibliothèque : 0 emoji, 0 Barlow en dur, 1 seul hex (`#ffffff` = traits du terrain dessiné de la miniature, gardé volontairement).
  - Tactipad : seul le titre passe en `TitreEcran` ; le terrain dessiné n'est pas touché.
  - Analyse vidéo : objets `stSombre` / `stClaire` en dur supprimés, tout passe par le kit (cartes, champs, boutons, étiquettes) ; étapes en liste numérotée, choix aller/retour et période en vrais boutons à bascule, chrono en chiffres condensés, note du rapport en chiffre héros à liseré de statut (plus d'anneau conique), points positifs / axes en cartes à liseré, liste des rapports à lignes de craie, bouton PDF nommé, animation du micro coupée si mouvement réduit. Logique, PDF et textes métier inchangés.
  - Vérifications : `npm run build` OK ; `npm test` 528 dont 527 réussis, 0 échec, 1 ignoré (comme avant) ; lint DashboardEducateur.jsx 16 erreurs / 4 avertissements = référence, AnalyseVideo 2 / 1 = identique à avant. Pas de contrôle visuel possible côté Claude. Aucun commit.
  - 2026-11-16, Sonnet 5.5, bloc terminé (seconde moitié). Nouvelle aide dans src/lib/useStFinance.js : `construirePalette(colors)` / `useStPalette()` donnent aux anciens écrans les mêmes clés (`bg`, `card`, `card2`, `border`, `text`, `muted`, `green`, `red`, `yellow`, `blue`) calculées à partir du thème, plus `brand` (couleur du club) et `surBrand` (texte posé dessus). Les objets `stSombre` / `stClaire` en dur sont supprimés de GestionPrepPhysique et GestionCloturesSaison. Règle appliquée : les couleurs de statut ne servent plus qu'aux marqueurs, liserés et jauges, le texte est en couleur normale ; les boutons pleins prennent la couleur du club.
  - GestionPrepPhysique : `TitreEcran` (liste, tests physiques), titre du programme en condensé, boutons Retour avec icône, filtres En cours / Archivées et onglets Suivi / Stats / Classement en boutons à bascule (`aria-pressed`, 44 px), étoiles de note en vraies icônes boutons nommées (« 3 sur 5 »), notes de bilan en chiffres condensés, ✓ / ✗ remplacés par icônes nommées avec soulignement de statut, pastilles de statut à marqueur carré, coins 6 / 4 px, champs en 16 px avec classe du kit, 0 emoji, 0 hex (sauf `#fff` du texte sur le fond sombre de l'analyse en cours).
  - GestionCloturesSaison : `TitreEcran` avec moyenne des évaluations, choix de saison et bouton « Clore la saison » (icône cadenas), progression en chiffre condensé et barre fine, cartes joueur à liseré quand clôturé, statistiques en chiffres condensés, bilan V / N / D en `PastilleResultat`, fenêtre de clôture en `role="dialog"` avec croix « Fermer », champs avec `label htmlFor`, résultats d'équipe en `Jauge`, 0 emoji, 0 hex. Logique inchangée.
  - StagesModule : liste en `TitreEcran`, polices en dur remplacées par `police.texte`, deux hex remplacés par des jetons. ProjetSportifEducateur : `TitreEcran` (pôle en sur-titre) et onglets `df-onglets`.
  - Vérifications : `npm run build` OK ; `npm test` 528 dont 527 réussis, 0 échec, 1 ignoré (comme avant) ; lint des fichiers touchés : seules erreurs = le `setState` dans un effet déjà présent avant (GestionPrepPhysique l. 310, GestionCloturesSaison l. 281), aucune nouvelle. Pas de contrôle visuel possible côté Claude. Aucun commit.

### Bloc 18 : Éducateur, Explorer, Profil, Mes outils
- Statut : fait (en attente du contrôle visuel de Kevin)
- Objectif : derniers écrans éducateur.
- Résultat testable : ces sections ; plus aucun emoji d'interface dans DashboardEducateur.
- Modèle : sonnet · Effort : medium · Coût estimé : élevé
- Pourquoi ce modèle : profil long (≈1 000 lignes) mais surtout des formulaires.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 18 PLAN-design-identite.md`
- Dépend de : blocs 12 à 17
- Prérequis : aucun
- Étapes :
  - Sauvegarde.
  - `explorer` (éducateurs, clubs, messages, annonces, dirigeants), `profil`, `mes_outils`, `outil_verrouille`.
  - Comptage final des emojis de DashboardEducateur : seuls restent ceux de contenu, listés dans le journal.
  - Build, tests, lint.
- Ce que je teste pour valider : explorer, une conversation, ton profil (sans enregistrer de changement inutile), Mes outils.
- Reste à finir :
  - Contrôle à l'œil par Kevin (Claude n'a pas d'outil de capture) : Explorer (5 onglets, recherche et région, annonces avec filtres et fenêtre « Publier », messages, fenêtre de conversation), Profil (infos, diplôme, parcours, aperçu public, abonnement, joueurs affiliés, Mon club, évaluations, fenêtre de scan de feuille de match), Mes outils, page « Outil non activé » ; ordinateur et téléphone, clair et sombre, AS Cannes (rouge) et club test (vert).
  - Emojis gardés volontairement dans DashboardEducateur.jsx : titres du tutoriel d'accueil (retirés, voir journal), icônes de la chronologie de causerie (`TIMELINE_DEFAUT`, enregistrées en base), « Fiche officielle » du gabarit d'impression (l. 658), commentaires de code. Le reste est à 0.
  - Les champs du profil (Parrainage, évaluations reçues, aperçu public) gardent leur disposition ; seuls styles et icônes ont changé. ParcoursCoach (composant des saisons, affiché dans Explorer) et Register.jsx non touchés.
- Journal :
  - 2026-11-17, Sonnet 5.5, bloc terminé. Sauvegarde ~/Sauvegardes-DigitalFootball/design-identite-2026-11/bloc18/DashboardEducateur.jsx. Fichiers : src/pages/DashboardEducateur.jsx, src/components/outils/OutilNonActive.jsx.
  - Explorer : `TitreEcran`, onglets `df-onglets`, filtres type et région en choix à bascule (`aria-pressed`), annonces en cartes à liseré (types par icône au trait, plus de couleur par type, `TYPES_ANNONCE` porte maintenant `icone`), conversations et lignes éducateurs / clubs en vrais boutons nommés, badge « Profil vérifié » en icône nommée, états vides au kit, fenêtres de conversation et de publication en `role="dialog"` avec croix « Fermer », champs avec `label htmlFor`. Logique inchangée.
  - Profil et fenêtres du bas du fichier (scan de feuille de match, liaison, fiche, Tactipad) : l'objet local `st` (champs, étiquettes, cartes, boutons) est branché sur le kit, donc tous ses usages ont pris la nouvelle identité d'un coup, avec les classes `df-champ` / `df-bouton`. Emojis de titres, boutons et pastilles remplacés par des icônes au trait via l'aide `icoTexte`, croix ✕ en boutons nommés, étoiles en vraies icônes, cartons jaune / rouge du scan en boutons à bascule nommés, menu latéral (Vue Club / Joueur / Parent, cadenas) et notification de succès / erreur sans emoji. Texte « ⚠️ » du scan, toast de convocation et titres du tutoriel : emoji retiré.
  - OutilNonActive (page « Outil non activé », utilisée aussi côté club) : carte, titre, étiquette et boutons du kit.
  - Vérifications : `npm run build` OK ; `npm test` 528 dont 527 réussis, 0 échec, 1 ignoré (comme avant) ; lint DashboardEducateur.jsx 17 erreurs / 4 avertissements = identique à la sauvegarde d'avant le bloc (la référence de 16 notée au bloc 17 date d'avant d'autres changements), OutilNonActive 0 / 0 ; Inter = 0. Pas de contrôle visuel possible côté Claude. Aucun commit.

### Bloc 19 : Vérification finale et nettoyage
- Statut : fait et en production (contrôle visuel de Kevin en cours)
- Objectif : prouver que l'identité est complète et cohérente, nettoyer, préparer la mise en ligne.
- Résultat testable : rapport de comptage (Inter = 0, emojis d'interface = 0 dans les deux dashboards et leurs composants) ; version de test Vercel prête.
- Modèle : sonnet · Effort : medium · Coût estimé : moyen
- Pourquoi ce modèle : contrôle et petits correctifs.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 19 PLAN-design-identite.md`
- Dépend de : blocs 0 à 18
- Prérequis : aucun
- Étapes :
  - Script de comptage des emojis (dans le dossier de travail temporaire) sur les deux dashboards et leurs composants importés ; Inter recherchée dans tout `src/`.
  - Recenser les objets de style locaux devenus inutiles, les styles d'icônes dupliqués, les imports lucide inutilisés : les retirer.
  - Vérifier que les jetons `radius` anciens encore utilisés ailleurs (joueur, parent, dirigeant) n'ont pas été cassés.
  - Mettre à jour PLAN-theme-club.md (renvoi vers ce chantier) et la mémoire du projet.
  - Version de test Vercel (skill vercel-deploy), production seulement après ton « ok ».
- Ce que je teste pour valider : parcours complet club puis éducateur sur la version de test Vercel, ordinateur et téléphone.
- Reste à finir :
  - Mise en ligne faite le 2026-11-17 (voir journal). Parcours complet club puis éducateur à relire par Kevin sur cette version, ordinateur et téléphone.
  - Emojis gardés volontairement dans les deux dashboards et leurs composants : contenu enregistré en base ou saisi par l'utilisateur (champs `emoji` / `icone` des tâches, responsabilités, packs d'équipement, chronologie de causerie, repli `✅` / `📋` d'AlertesPanel), tables de catégories du club (TYPES_EVENEMENT, CATEGORIES_DEPENSE / RECETTE : l'emoji n'est plus affiché, seul le libellé l'est), textes de PDF (DashboardClub l. 2085 à 2284 : emoji devant les lignes, à retirer un jour car la police du PDF ne sait pas les dessiner), flèches de texte (→ ↗ ✓ ✕ ▶) dans quelques composants (GestionSponsors, ProjetDetail, TutorielsClub, AlertesPanel).
  - Inter : reste uniquement dans DossierSponsorPDF.jsx (gabarit imprimé du dossier sponsor, hors périmètre des règles).
  - Hors périmètre des deux dashboards, emojis encore présents : DashboardRecruteur, ScoutCenter, EducationNutrition, DashboardJoueur, DashboardCoach, translations.js (180 usages, textes aussi envoyés par notification ou email).
- Journal :
  - 2026-11-17, Sonnet 5.5, bloc terminé. Sauvegarde ~/Sauvegardes-DigitalFootball/design-identite-2026-11/bloc19/. Comptage (script dans le dossier temporaire de session) : DashboardEducateur et DashboardClub = 0 emoji d'interface (restent flèches de texte, données et PDF listés ci-dessus). Composants importés par les deux dashboards : 4 emojis d'interface trouvés et retirés : FloatingHelper (bouton ⚽ et ✕ remplacés par IconBall / IconClose, « ▶ » retiré), GrilleSeance (📋, ✨, ⏳, ✅ retirés), DerniereCauserieWidget (🎙️ remplacé par « Contre »). CauserieAvantMatch : Inter remplacée par Barlow. Inter = 0 dans src/ sauf DossierSponsorPDF.
  - Jetons `radius` : src/tokens.js n'a fait qu'ajouter `police` et `forme`, les anciennes valeurs sont intactes, donc joueur, parent et dirigeant ne sont pas touchés. Aucun import inutilisé signalé par le lint sur les deux dashboards et leurs composants.
  - Vérifications : `npm run build` OK ; `npm test` 528 dont 527 réussis, 0 échec, 1 ignoré (comme avant) ; lint des 4 fichiers touchés = identique à avant (0 nouvelle erreur). Aucun commit.
  - 2026-11-17, mise en ligne : dossier relié au projet Vercel digital-football-accademy, `.vercelignore` ajouté (secrets, plans, SQL, CSV). Preview testée, puis « ok production » de Kevin : déploiement `--prod --skip-domain`, vérifié, puis `promote` vers https://digitalfootball.academy (réponse 200, titre correct). Aucun commit Git : les 212 fichiers modifiés restent à commiter.

### Bloc 20 (optionnel) : [IDÉE] La même identité pour le dashboard joueur
- Statut : à faire (à décider après le bloc 19)
- Objectif : le joueur a déjà Barlow (bloc 3) et le menu (bloc 4), mais ses écrans gardent les anciennes cartes et ses emojis. Les passer au kit pour que toute la plateforme parle le même langage.
- Résultat testable : dashboard joueur avec cartes chiffres, pastilles V/N/D et icônes au trait.
- Modèle : sonnet · Effort : high · Coût estimé : élevé (sans doute 3 à 4 blocs, à replanifier)
- Pourquoi ce modèle : production visuelle.
- Lancement : à replanifier avec `/plan` si tu dis oui.
- Dépend de : bloc 19
- Prérequis : ta décision.
- Étapes : à détailler dans un plan dédié.
- Ce que je teste pour valider : à définir.
- Reste à finir :
- Journal :
