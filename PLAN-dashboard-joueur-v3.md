# PLAN : dashboard joueur v3, identité unique et accès rapide
Date : 2026-11-17 · Brief : BRIEF-dashboard-joueur-v3.md
Objectif : le joueur ouvre l'app sur son téléphone et voit en 3 secondes quand il joue, quoi faire cette semaine et où il en est.
Moyens : menu resserré à 4 entrées + « Saisir mon match », accueil refait autour de l'affiche du prochain match, puis passe identité « Maison de club » sur toutes les rubriques. Aucune base, aucun paiement, aucun email touché.

## Ce que je dois fournir
| Élément | Pourquoi | Où le trouver | Nécessaire avant |
|---|---|---|---|
| Compte joueur de test rattaché à un club, avec un match à venir et si possible une convocation publiée | Voir l'affiche remplie et la réponse présent / absent | Claude vérifie en lecture au bloc 0 lequel existe ; tu te connectes toi-même | Bloc 2 |
| Compte joueur Pro sans club | Voir le cas « progression à la place de l'affiche » | Idem | Bloc 3 |
| Ton téléphone | Valider l'écran témoin en 390 px, à une main | Ta poche | Bloc 4 |

## Manipulations à faire moi-même
1. Avant le bloc 2 : si le bloc 0 dit qu'aucun match à venir ou aucune convocation n'existe pour le joueur test, en créer un depuis le compte éducateur test (Matchs, puis Convocation). Claude te dira exactement quoi.
2. Bloc 4 : ouvrir la version de test (adresse Vercel donnée par Claude) sur ton téléphone, avec le joueur rattaché puis le joueur Pro sans club, et dire « ok » ou lister ce qui ne va pas.
3. À la fin de chaque bloc : contrôle visuel de l'écran indiqué (Claude n'a pas de navigateur), puis ton « ok » pour le commit.

## Répartition suggérée
Je ne vois pas ta barre « 5h » depuis ici : regarde-la avant chaque bloc (sous 30 % pour un bloc à coût moyen ou élevé).
- Jour 1 : blocs 0 et 1.
- Jour 2 : blocs 2 et 3.
- Jour 3 : bloc 4 (témoin sur téléphone). Rien d'autre tant que tu n'as pas validé.
- Jours 4 à 6 : blocs 5 à 10, deux par jour.
- Jour 7 : bloc 11 (vérification finale).
Rappel : `/clear` et une session neuve par bloc.

## Règles communes à tous les blocs
- Sauvegarde datée de `src/pages/DashboardJoueur.jsx` (et des composants touchés) dans `backups/` avant d'écrire.
- Branche `navItems` / `isPro` uniquement. Ne pas toucher à la branche `estAffilie` (abandonnée).
- Ne rien défaire : Barlow, coins, zéro emoji, couleurs du club (`PLAN-theme-club.md`), identité Maison de club (`PLAN-design-identite.md`), en-tête carte de joueur (`PLAN-joueur-v2.md`).
- Les ids d'onglet existants ne changent pas (`dashboard`, `equipe`, `annonces`, `competition`, `entrainement`, `preparation_tactique`, `prep_physique`, `nutrition`, `analyses`, `coach`, `mes_stats`, `profil`, `certif`, `equipement`, `sante`, `messages`, `clubs`...). Les ids DOM de `NAV_SECTION_IDS` restent montés en permanence (OnboardingGuide).
- Nouveaux libellés de menu via `t(...)`, comme les existants.
- `npm run build` sans erreur à la fin de chaque bloc. Aucun commit sans ton « ok ».
- Textes visibles : français simple, pas de tiret long ni moyen, pas d'emoji.

### Grille de la passe identité (blocs 6 à 10)
1. Icônes : lucide-react, trait fin, taille homogène (pas d'`Icon*` maison restant).
2. Coins : 6 px sur les cartes, 4 px sur les petits éléments, comme club et éducateur.
3. Chiffres et titres de section : Barlow Condensed ; texte courant : Barlow.
4. Liseré d'écusson (couleur du club) sur les cartes principales, pas partout.
5. Résultats en pastilles V/N/D, jauges type possession pour les pourcentages.
6. Supprimer les styles divergents : dégradés décoratifs, ombres lourdes, couleurs codées en dur hors palette.
7. Réutiliser `src/components/joueur/` (Carte, TitreSection, TuileChiffre, EnTetePage...) plutôt que du style en ligne.
8. Chaque état vide = une phrase + une action.

## Blocs

### Bloc 0 : mise en place et inventaire
- Statut : fait
- Objectif : sauvegarder l'existant et produire l'inventaire dont les blocs suivants ont besoin, sans rien modifier au code.
- Résultat testable : une section « Inventaire » ajoutée en bas de ce plan, et un dossier de sauvegarde daté.
- Modèle : sonnet · Effort : medium · Coût estimé : faible
- Pourquoi ce modèle : lecture ciblée et synthèse, pas de création.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 0 PLAN-dashboard-joueur-v3.md`
- Dépend de : rien
- Prérequis : aucun
- Étapes :
  - Sauvegarde datée de `DashboardJoueur.jsx` et de `src/components/joueur/` dans `backups/`.
  - Lister tous les appels qui changent d'onglet (`setActiveTab(...)`, liens Santé, Recruteurs, OnboardingGuide) et l'actuelle barre basse mobile (`dj-bottom-nav-btn`).
  - Repérer où vivent aujourd'hui : la saisie d'un match joué, `widgetProchainMatch`, `convocationActive` et la réponse présent / absent, `SeanceDuJourJoueur`, les stats de saison et la série V/N/D.
  - Table de correspondance `Icon*` maison vers lucide-react (pour le bloc 5).
  - Vérifier en lecture (`supabase db query --linked`, SELECT seulement) les comptes joueur test : rattaché avec match à venir et convocation, Pro sans club.
- Ce que je teste pour valider : je lis l'inventaire ; Claude me dit si je dois créer un match ou une convocation de test.
- Reste à finir : créer les comptes de test (voir Inventaire, point 6) avant le bloc 2.
- Journal : 2026-11-17, Sonnet 5.5, aucun écart. Sauvegarde dans backups/dashboard-joueur-v3-20261117-0143. Aucun code modifié.

### Bloc 1 : menu resserré (4 entrées + action centrale)
- Statut : fait côté code (contrôle visuel de Kevin en attente)
- Objectif : remplacer les 14 entrées par Accueil · Mon équipe · Progresser · Moi + « Saisir mon match ». Barre fixe en bas sur téléphone, menu latéral court sur ordinateur. Chaque entrée parente ouvre ses sous-onglets.
- Résultat testable : sur téléphone et ordinateur, chaque ancienne rubrique est joignable en 2 gestes au plus ; badges remontés sur l'entrée parente ; cadenas Nutrition si non Pro.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : beaucoup de branchements à ne pas casser dans un gros fichier, mais pas de donnée sensible.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 1 PLAN-dashboard-joueur-v3.md`
- Dépend de : bloc 0
- Prérequis : inventaire des liens internes (bloc 0)
- Étapes :
  - Nouvelle structure de menu à deux niveaux à partir de `navItems` (groupes : Mon équipe = equipe, annonces, competition ; Progresser = entrainement, preparation_tactique, prep_physique, nutrition, analyses ; Moi = profil, mes_stats, certif, equipement).
  - Barre basse mobile 4 entrées + bouton central « Saisir mon match » (branché sur la saisie existante repérée au bloc 0) ; menu latéral court sur ordinateur.
  - Sous-onglets en haut de la rubrique (rangée horizontale défilante sur téléphone).
  - Icônes du menu en lucide-react ; badges : somme des badges enfants sur le parent.
  - Contrôler chaque lien interne de l'inventaire et les ids `NAV_SECTION_IDS`.
- Ce que je teste pour valider : ouvrir chaque entrée et chaque sous-onglet, les badges, Santé et Recruteurs depuis leurs liens, le guide de prise en main.
- Reste à finir : contrôle visuel par Kevin (téléphone et ordinateur) ; pas de commit tant que le « ok » n'est pas donné. Le clic sur une entrée parente ouvre son premier sous-onglet (pas le dernier visité) : à ajuster si ça gêne.
- Journal : 2026-11-17, Sonnet 5.5. Menu à 2 niveaux dans DashboardJoueur.jsx (groupes + rangée de sous-onglets `df-onglets`), barre basse mobile (`df-barre-basse`, 4 entrées + bouton central), bouton « Saisir mon match » (menu ordinateur et barre basse) branché sur MesStats via la nouvelle prop `vueInitiale`. Santé, Recruteurs, Clubs restent hors menu (rubrique Moi active). Tiroir mobile gardé pour le compte (rôles, notifications, langue, déconnexion). Ballon d'aide et bandeau sponsors remontés au-dessus de la barre (prop `decalageBas`). Guide de prise en main : étapes réécrites (Mon équipe, Progresser, Moi, Saisir mon match) car les anciens ids sous-onglets n'existaient plus (clubs-section, messages-section, carte-section étaient déjà absents du menu avant le chantier). Traductions ajoutées dans 6 langues (jnav_progresser, jnav_moi, jnav_saisir_match). Build OK ; aucun navigateur ici, donc pas de test d'affichage réel. Sauvegarde : backups/dashboard-joueur-v3-bloc1-*.

### Bloc 2 : l'affiche du prochain match
- Statut : fait côté code (contrôle visuel de Kevin en attente)
- Objectif : composant `AfficheMatch` façon affiche du club-house : écusson du club face au monogramme de l'adversaire (initiales en Barlow Condensed dans une pastille), jour, heure de rendez-vous, lieu, et réponse présent / absent si une convocation est active.
- Résultat testable : l'affiche s'affiche en tête d'accueil avec le joueur test ; la réponse à la convocation fonctionne comme avant (même fonction, même table) ; états vides : « Rejoins ton club » et « Aucun match annoncé ».
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : composant visuel signature, réutilise la logique de convocation existante sans la réécrire.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 2 PLAN-dashboard-joueur-v3.md`
- Dépend de : bloc 1
- Prérequis : joueur test avec match à venir (manipulation 1)
- Étapes :
  - Créer `src/components/joueur/AfficheMatch.jsx`, données passées en props depuis `widgetProchainMatch` / `convocationActive` / `matchs_equipe`.
  - Monogramme adversaire : 2 ou 3 initiales, couleur neutre ; écusson et couleurs du club du joueur.
  - Boutons présent / absent branchés sur la fonction de réponse existante, état « réponse envoyée » visible.
  - Conçu en 390 px d'abord, puis vérifié en largeur ordinateur.
- Ce que je teste pour valider : affiche remplie, réponse présent puis absent, joueur sans club, club sans match à venir.
- Reste à finir : contrôle visuel par Kevin (compte kenza, téléphone puis ordinateur) ; pas de commit tant que le « ok » n'est pas donné. Le joueur sans club voit « Rejoins ton club » en attendant le bloc 3 (qui met sa progression à la place). À contrôler : sur la capture du bloc 1, la carte « Mes éducateurs » (compte Test Joueur) montrait un rond vert sans nom et une barre « ... » : probable état de chargement, hors périmètre, à revoir au bloc 10 si ça persiste.
- Journal : 2026-11-17, Sonnet 5.5. Nouveau composant `src/components/joueur/AfficheMatch.jsx` : écusson du club (image_hero_url ou avatar_url, sinon monogramme en couleur du club) face au monogramme de l'adversaire (2 ou 3 initiales), le club qui reçoit à gauche selon `domicile`, jour en Barlow Condensed, heure, lieu, heure de rendez-vous seulement si une étape du programme de la convocation la contient. Réponse présent / absent branchée sur `repondreConvocation` (même fonction, même table `convocation_reponses`), ligne « Réponse envoyée ». Programme, notes, terrain et arbitre de la convocation repris dans l'affiche. Dans DashboardJoueur.jsx l'affiche est en tête d'accueil (sous l'en-tête joueur) ; `ALaUne` ne répète plus la convocation ni le match quand l'affiche les montre (séance, composition, analyse, visibilité inchangées). Un seul bloc en relief : l'affiche l'est quand elle est le bloc à la une, sinon standard. États vides : « Rejoins ton club » (non affilié) et « Aucun match annoncé ». Données de test : match du 2026-11-22 avec convocation pour kenza.harroudsilva (heure et lieu vides, donc l'affiche n'affiche ni heure ni lieu). Vérifié : build OK, rendu serveur des 4 états en largeur téléphone et ordinateur sans erreur (texte correct), mais aucun navigateur ici donc pas de contrôle visuel. Sauvegarde : backups/DashboardJoueur-bloc2-*.

### Bloc 3 : accueil refait (4 accès en un geste)
- Statut : fait côté code (contrôle visuel de Kevin en attente)
- Objectif : accueil ordonné : 1. affiche du prochain match, 2. séance du jour (`SeanceDuJourJoueur`), 3. saisir un match joué, 4. ma progression (stats de saison, série V/N/D en pastilles, lien Mes statistiques).
- Résultat testable : l'accueil tient en un écran et demi sur téléphone ; le joueur Pro sans club voit sa progression en tête à la place de l'affiche ; aucune carte vide.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : assemblage d'écran et nettoyage des anciens blocs d'accueil.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 3 PLAN-dashboard-joueur-v3.md`
- Dépend de : bloc 2
- Prérequis : compte joueur Pro sans club
- Étapes :
  - Réécrire le rendu de l'onglet `dashboard` (branche `navItems` / `isPro`) dans l'ordre ci-dessus.
  - Réutiliser ou refaire `ALaUne`, `BandeSemaine`, `BarreActions`, `JaugeSaison`, `EnTeteJoueur` : pas de doublon, retirer de l'accueil ce qui n'est plus affiché (code conservé s'il sert ailleurs).
  - Bloc progression : chiffres en tableau d'affichage condensé + 5 dernières pastilles V/N/D.
  - États vides : une phrase + une action pour chacun des 4 blocs.
- Ce que je teste pour valider : accueil joueur rattaché, joueur sans match, joueur Pro sans club ; chaque bouton mène au bon endroit.
- Reste à finir : contrôle visuel par Kevin (téléphone puis ordinateur) avec le compte kenza (rattaché, match du 22/11 avec convocation) ; pas de commit tant que le « ok » n'est pas donné. Aucun compte joueur Pro sans club n'existe en base (inventaire) : le cas « progression en tête » n'a donc pas pu être vu en vrai, il faut un compte Pro sans club ou faire passer un compte test en Pro (action de Kevin). Sous les 4 accès, l'accueil garde encore, tels quels : sondage de la semaine (présent / absent aux séances), évaluations coach, Jogabonito / Publier, messages recruteurs et coach, quota d'analyses, vidéo, abonnement (résiliation) et aperçu Pro. Ils n'existent nulle part ailleurs (la résiliation d'abonnement en particulier) : les reloger dans la bonne rubrique est à faire aux blocs 6 à 10, pas ici. La séance du jour sur l'accueil est un résumé : la séance complète reste dans Progresser, Entraînement.
- Journal : 2026-11-17, Sonnet 5.5, aucun écart de périmètre. Ordre de l'accueil rattaché : affiche, « à la une » (sans répéter match ni séance), alertes, séance du jour, saisir un match, progression. Joueur gratuit sans club : affiche « Rejoins ton club » en tête, puis saisie et progression. Joueur Pro sans club : progression en tête à la place de l'affiche, pas de bloc séance (il n'a pas de séance de club). Nouveaux composants dans `src/components/joueur/` : `SeanceAccueil` (même requête `seances_publiees` et même règle des 22h que la séance complète ; sans séance publiée, montre le prochain entraînement ; sinon « Aucune séance prévue »), `BlocSaisirMatch` (masqué en mode parent), `ProgressionAccueil` (tableau d'affichage Barlow Condensed : présence, matchs, buts, passes, puis 5 pastilles V/N/D ; un chiffre sans donnée n'est pas montré). Série V/N/D : calculée avec `resultatMatch` (tirs au but compris) sur les matchs joués de l'équipe principale (même éducateur et même catégorie) ; `chargerCompetition` est maintenant aussi appelée à l'ouverture de l'accueil. Chiffres : ceux de l'équipe (fiches de l'éducateur) s'il y en a, sinon ceux que le joueur a saisis (`stats_match_joueur`, une lecture légère rechargée à chaque retour sur l'accueil). Retiré de l'accueil : JaugeSaison (remplacée par la progression), carte « mon équipe » et raccourci « fiche d'évaluation » (déjà dans Mon équipe), invitation « Rejoins ton équipe » pour le joueur gratuit (déjà sur l'affiche). Aucune table, aucun paiement, aucun email touché. Vérifié : build OK ; rendu serveur des états rempli, pastilles seules, vide et mode parent de ProgressionAccueil et du bloc de saisie (textes corrects) ; SeanceAccueil dépend de la base, donc non rendu hors navigateur. Aucun navigateur ici : pas de contrôle visuel. Sauvegarde : backups/DashboardJoueur-bloc3-20261117-1628.jsx.

### Bloc 4 : écran témoin validé sur téléphone
- Statut : fait (2026-11-17, validé par Kevin « ok »)
- Objectif : mettre coque + menu + accueil dans une version de test Vercel et les faire valider par Kevin sur son téléphone, puis corriger.
- Résultat testable : adresse de test Vercel ; liste de retours de Kevin traitée.
- Modèle : sonnet · Effort : medium · Coût estimé : faible à moyen (selon les retours)
- Pourquoi ce modèle : corrections ciblées.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 4 PLAN-dashboard-joueur-v3.md`
- Dépend de : blocs 1 à 3
- Prérequis : ton téléphone, 15 minutes
- Étapes :
  - Version de test via le skill `vercel-deploy` (test seulement, jamais la production).
  - Kevin teste les deux comptes et donne ses retours en une liste.
  - Corrections, nouvelle version de test, nouvelle validation.
  - Après « ok » : commit et push des blocs 0 à 4.
- Ce que je teste pour valider : à une main, en 390 px : je trouve mon prochain match, je réponds à la convocation, j'ouvre la séance du jour, je saisis un match, je vois ma progression.
- Reste à finir : rien.
- Journal : 2026-11-17, Sonnet 5.5. Vercel CLI absent : lancé via `npx vercel@latest` (aucune installation permanente). Connecté (sicko10), projet lié digital-football-accademy. Simulation `--dry` : 705 fichiers envoyés, `.env`, `.env.local` et tous les `.sql` exclus, aucun secret ; le dossier `backups/` (24 copies de code) part avec, sans secret. Build local OK. Version de test (pas la production) : https://digital-football-accademy-gtu3e3r8f-digital-football-s-projects.vercel.app . Servie correctement (vérifiée via `vercel curl`), protégée par la connexion Vercel (302 vers vercel.com/sso) : protection non modifiée. Aucun navigateur ici : test sur téléphone par Kevin.
- Validation : « ok » de Kevin le 2026-11-17, puis commit et push des blocs 0 à 4 (fichiers du chantier uniquement, `npm run build` OK).

### Bloc 5 : icônes lucide-react sur tout le dashboard joueur
- Statut : fait côté code (contrôle visuel de Kevin en attente)
- Objectif : remplacer tous les composants `Icon*` maison du dashboard joueur et de `src/components/joueur/` par leurs équivalents lucide-react, selon la table du bloc 0.
- Résultat testable : plus aucun `Icon*` maison utilisé côté joueur ; build OK ; icônes de même épaisseur partout.
- Modèle : haiku · Effort : low · Coût estimé : faible
- Pourquoi ce modèle : remplacement mécanique suivant une table déjà écrite.
- Lancement : `/clear`, puis `/model haiku`, puis `/effort low`, puis `/bloc 5 PLAN-dashboard-joueur-v3.md`
- Dépend de : bloc 4 validé
- Prérequis : table de correspondance (bloc 0)
- Étapes :
  - Remplacer usage par usage selon la table, taille et épaisseur homogènes.
  - Retirer les définitions `Icon*` devenues inutiles (seulement si plus aucun usage, vérifié par recherche).
  - `npm run build`.
- Ce que je teste pour valider : survol rapide de chaque rubrique, aucune icône manquante ou carré vide.
- Reste à finir :
- Journal :

### Bloc 6 : passe identité, Mon équipe
- Statut : fait côté code (contrôle visuel de Kevin en attente)
- Objectif : appliquer la grille de la passe identité à Équipe, Actualités du club, Compétition.
- Résultat testable : les 3 sous-onglets ont la même allure que l'accueil validé ; classement de compétition façon classement FFF (rang, points, pastilles de forme).
- Modèle : sonnet · Effort : medium · Coût estimé : moyen
- Pourquoi ce modèle : retouches visuelles avec jugement de design.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 6 PLAN-dashboard-joueur-v3.md`
- Dépend de : bloc 5
- Prérequis : aucun
- Étapes :
  - Parcourir les 3 rubriques avec la grille (8 points).
  - Classement : colonnes condensées, ligne du club du joueur surlignée au liseré d'écusson.
  - États vides : une phrase + une action.
- Ce que je teste pour valider : les 3 sous-onglets sur téléphone, badge non lus des actualités.
- Reste à finir : (1) pas de vrai classement de ligue en base (le classement officiel reste le lien externe) : la ligne « Bilan de la saison » en tient lieu, points 3/1/0 calculés sur les matchs joués ; si Kevin veut un vrai classement FFF, il faut une source de données (saisie éducateur ou import), à décider. (2) `Carte` a un nouveau réglage `identite` (coins 6 px), non activé par défaut pour ne pas changer l'accueil validé : bascule du défaut au bloc 11. (3) `EnTetePage` est passé en coins 6 px, fond uni et liseré (touche aussi Entraînement, Nutrition, Tactique, Équipement, Mes stats). (4) Dans la branche abandonnée estAffilie, 6 titres de section ont été remplacés par erreur par `TitreSection` (code mort, sans effet).
- Journal : 2026-11-17, Sonnet 5.5. Sauvegarde backups/DashboardJoueur.bloc6-*.jsx. Équipe : en-tête EnTetePage avec saison, titres de section en TitreSection, coins 6 px / 4 px, couleurs en dur remplacées par la palette, dégradés et lueur retirés. Actualités : cartes à coins 6 px, liseré vert sur les non lues, titres en Barlow Condensed, pastille Nouveau en 4 px. Compétition : bilan en ligne de classement (Pts J G N P BP BC Diff + forme sur 5 matchs en pastilles V/N/D), liserés, filtres et boutons en 4 px, états vides avec phrase d'aide. Incident corrigé : un remplacement automatique avait cassé une chaîne de caractères (ligne du badge amber), repéré et réparé. `npm run build` OK. Aucun test à l'écran (pas de navigateur).

### Bloc 7 : passe identité, Progresser (1/2)
- Statut : fait côté code (contrôle visuel de Kevin en attente)
- Objectif : grille de la passe identité sur Entraînement, Préparation tactique, Préparation physique.
- Résultat testable : 3 sous-onglets harmonisés, aucune fonction changée.
- Modèle : sonnet · Effort : medium · Coût estimé : moyen
- Pourquoi ce modèle : retouches visuelles avec jugement de design.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 7 PLAN-dashboard-joueur-v3.md`
- Dépend de : bloc 5
- Prérequis : aucun
- Étapes :
  - Parcourir les 3 rubriques avec la grille.
  - Uniformiser les en-têtes de rubrique (`EnTetePage`) et les cartes de séance.
  - États vides.
- Ce que je teste pour valider : ouvrir une séance, un exercice tactique, un programme physique.
- Reste à finir : contrôle visuel par Kevin (téléphone puis ordinateur) : ouvrir une séance publiée, un schéma partagé, un programme physique et une soumission de séance ; pas de commit tant que le « ok » n'est pas donné. (1) PrepPhysiqueJoueur garde sa petite palette locale (`stSombre` / `stClaire`, thème clair et sombre) : elle n'est pas branchée sur la palette du club, à décider au bloc 11. (2) L'état vide « Aucun programme actif » n'a pas d'action (l'éducateur crée le programme, rien à faire côté joueur). (3) Les vignettes de schéma gardent un fond vert terrain en dur (`#0B3D1E`), c'est la couleur du terrain.
- Journal : 2026-11-17, Sonnet 5.5, aucun écart. Sauvegarde backups/DashboardJoueur.bloc7-*.jsx (les 3 composants sont dans git). Entraînement (`SeanceDuJourJoueur`) : carte en coins 6 px, titres en Barlow Condensed, icône lucide. Tactique (`PreparationTactiqueJoueur`) : cartes en coins 6 px (réglage `identite`), onglets et boutons en 4 px, liseré de 3 px sur la zone choisie, vignettes de schéma sans lueur ni lévitation au survol, bouton lecture carré avec icône lucide, titres en Barlow Condensed. Préparation physique (`PrepPhysiqueJoueur`) : 16 icônes maison remplacées par lucide, tous les coins passés à 6 px / 4 px, jauge de progression en vert uni (dégradé retiré), fonds d'alerte en dur remplacés par la palette, chevrons lucide à la place des flèches texte, chiffres et titres en Barlow Condensed, liseré vert sur la carte du plan actif. Aucune requête, table, paiement ni email touché. `npm run build` OK. Aucun navigateur ici : pas de contrôle visuel.

### Bloc 8 : passe identité, Progresser (2/2)
- Statut : fait côté code (contrôle visuel de Kevin en attente)
- Objectif : grille de la passe identité sur Nutrition (cadenas et aperçu non Pro inclus) et Analyses / Coach analyseur.
- Résultat testable : rubriques harmonisées ; joueur non Pro voit un aperçu propre avec une action claire vers l'offre (lien Stripe existant, inchangé).
- Modèle : sonnet · Effort : medium · Coût estimé : moyen
- Pourquoi ce modèle : retouches visuelles ; les liens d'abonnement ne sont pas modifiés.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 8 PLAN-dashboard-joueur-v3.md`
- Dépend de : bloc 5
- Prérequis : aucun
- Étapes :
  - Grille sur Nutrition (`NutritionAccueil`, `NutritionIntro`, `ApercuPro`) et Analyses (`AnalysesJoueur`, `CoachAnalyseurJoueur`).
  - Ne pas toucher aux liens Stripe (rappel : `STRIPE_LINKS.starter` = mensuel, `.pro` = annuel).
  - États vides.
- Ce que je teste pour valider : Nutrition en Pro et non Pro, envoi d'une demande d'analyse, Coach analyseur.
- Reste à finir : contrôle visuel par Kevin (Nutrition Pro et non Pro, Analyses avec et sans demande, Coach analyseur). (1) Les autres écrans de `NutritionDashboard` (Journal, Poids, Profil, Plan) gardent leurs styles en dur : hors périmètre de ce bloc, à décider au bloc 11. (2) L'état vide « Aucun coach » n'a pas d'action (rien à faire côté joueur). (3) `TuileChiffre` garde 12 px par défaut, forcé à 6 px seulement dans Nutrition ; bascule du défaut au bloc 11.
- Journal : 2026-11-17, Sonnet 5.5, aucun écart. Sauvegardes backups/*.bloc8-*.jsx. ApercuPro, NutritionIntro, NutritionAccueil, AnalysesJoueur, CoachAnalyseurJoueur : cartes en `identite` (coins 6 px) avec liseré vert (liseré de statut vert/ambre sur les demandes d'analyse), anciennes lueurs `accent` retirées, boutons et champs en 4 px, titres et grands chiffres en Barlow Condensed (prix, kcal, titres de page), bulles de message en 6 px, vignettes en 4 px, onglets Analyses / Coach du dashboard en 6 px / 4 px. Liens Stripe, formules et textes non touchés. `npm run build` OK. Aucun navigateur ici : pas de contrôle visuel.


### Bloc 9 : passe identité, Moi (avec la fiche façon feuille de match)
- Statut : fait côté code (contrôle visuel de Kevin en attente)
- Objectif : grille de la passe identité sur Profil, Mes statistiques, Certification, Équipement. [IDÉE] Mes statistiques prend la forme d'une feuille de match : numéro, poste, stats de saison en tableau d'affichage condensé, série V/N/D en pastilles.
- Résultat testable : rubriques harmonisées ; la fiche se lit en un coup d'œil sur téléphone.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : la fiche est un second élément signature, demande du soin.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 9 PLAN-dashboard-joueur-v3.md`
- Dépend de : bloc 5
- Prérequis : aucun
- Étapes :
  - Fiche feuille de match dans `mes_stats` (données existantes uniquement, `ProfilStatsJoueur` réutilisé).
  - Grille sur Profil, Certification, Équipement (`EquipementJoueur`).
  - États vides.
- Ce que je teste pour valider : ma fiche avec et sans matchs saisis, modification du profil, page certification.
- Reste à finir : contrôle visuel par Kevin (téléphone puis ordinateur) : Mes statistiques avec et sans matchs saisis, Profil (modifier puis enregistrer), Certification, Équipement. Pas de commit tant que le « ok » n'est pas donné. (1) La feuille de match n'affiche pas de numéro de maillot : aucune donnée de numéro n'existe en base, rien n'a été inventé ; à décider si Kevin veut ajouter ce champ. (2) La série V/N/D est celle de l'équipe (résultats de la compétition), car les matchs du joueur n'ont pas de score en base. (3) Dans Profil, les pastilles de style de jeu et de points forts gardent leurs coins ronds (20 px) et le bleu « #60a5fa » en dur : choix de sélection, à reprendre au bloc 11 si on veut tout en 4 px. (4) Radar de Mes stats : inchangé.
- Journal : 2026-11-17, Sonnet 5.5, aucun écart. Sauvegardes backups/ProfilStatsJoueur.bloc9-*.jsx et backups/DashboardJoueur.bloc9-*.jsx. Mes statistiques (`ProfilStatsJoueur`) : nouvelle « Feuille de match » à côté de la carte joueur : poste et saison en en-tête, tableau d'affichage de cases condensées (matchs, minutes, buts, passes, note, présence, points, rang d'équipe), série V/N/D de l'équipe en pastilles ; cartes en coins 6 px avec liseré ; récompenses en pastilles 4 px. `MesStats` : icônes maison remplacées par lucide, champs et boutons en 4 px, cartes `identite`. `DashboardJoueur` : l'onglet Mes stats charge maintenant les résultats de la compétition (lecture seule, déjà utilisée ailleurs) pour la série. Profil : cartes `identite`, coins 4 px, 2 icônes en svg brut remplacées par lucide. Certification : jaune en dur remplacé par la palette, cartes en 6 px avec liseré, icône d'envoi en lucide. Équipement : cartes `identite`, coins 4 px, liseré ambre à la place de la lueur. Aucune requête d'écriture, table, paiement ni email touché. `npm run build` OK. Aucun navigateur ici : pas de contrôle visuel.



### Bloc 10 : passe identité, rubriques hors menu
- Statut : fait côté code (contrôle visuel de Kevin en attente)
- Objectif : grille de la passe identité sur les rubriques joignables par liens internes : Santé (`sante`), Recruteurs (`messages`), Clubs (`clubs`) et écrans restants repérés au bloc 0 dans la branche `navItems` / `isPro`.
- Résultat testable : plus aucun écran joueur au style divergent.
- Modèle : sonnet · Effort : medium · Coût estimé : moyen
- Pourquoi ce modèle : retouches visuelles.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 10 PLAN-dashboard-joueur-v3.md`
- Dépend de : bloc 5
- Prérequis : aucun
- Étapes :
  - Grille sur chaque rubrique listée.
  - Vérifier que leurs liens d'accès (depuis l'accueil, le profil, le guide) fonctionnent toujours.
  - États vides.
- Ce que je teste pour valider : ouvrir Santé, Recruteurs, Clubs depuis leurs liens.
- Reste à finir : contrôle visuel par Kevin : ouvrir Santé (depuis les alertes de l'accueil), Recruteurs (depuis la carte messages de l'accueil), Clubs (Explorer). Pas de commit tant que le « ok » n'est pas donné. (1) Dans Santé, le détail des blessures (visites, rééducation) garde ses réglages internes, seuls coins et cartes ont changé. (2) Les avatars restent ronds (ce sont des photos). (3) Le bloc 11 doit aussi décider du défaut `identite` de `Carte` et des textes en dur restants.
- Journal : 2026-11-17, Sonnet 5.5, aucun écart. Sauvegarde backups/dashboard-joueur-v3-bloc10-20261117-1807 (DashboardJoueur.jsx, SanteJoueur.jsx). Santé : titre en Barlow Condensed, cartes `identite` (coins 6 px), liseré de couleur de statut sur « Ton état actuel » à la place de la lueur, pastilles, boutons et jauges en 4 px. Recruteurs (messages) : cartes en 6 px, champs en 4 px, titre en Barlow Condensed, état vide avec action « Compléter mon profil » (mobile et ordinateur). Clubs (Explorer) : titre en Barlow Condensed, onglets et champs en 4 px, cartes en 6 px. Écran Coach déjà fait au bloc 8. Liens d'accès vérifiés (alertes vers Santé, accueil vers Messages, Explorer). Aucune requête, table, paiement ni email touché. `npm run build` OK. Aucun navigateur ici : pas de contrôle visuel.

### Bloc 11 : vérification finale et nettoyage
- Statut : fait côté code, version de test en ligne le 2026-11-18 (contrôle de Kevin en attente)
- Objectif : retirer le code mort laissé par le chantier, relire les liens internes, version de test finale, commit.
- Résultat testable : build OK, aucune fonction ni composant joueur inutilisé, version de test Vercel validée par Kevin.
- Modèle : sonnet · Effort : medium · Coût estimé : faible à moyen
- Pourquoi ce modèle : contrôle et nettoyage avec jugement (savoir ce qui sert encore ailleurs).
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 11 PLAN-dashboard-joueur-v3.md`
- Dépend de : blocs 6 à 10
- Prérequis : aucun
- Étapes :
  - Rechercher composants, icônes et styles devenus inutiles ; les retirer seulement après vérification qu'aucun autre écran ne les utilise.
  - Rejouer la liste des liens internes du bloc 0.
  - Version de test Vercel, contrôle par Kevin sur téléphone et ordinateur.
  - Marquer dans `PLAN.md` et `PLAN-joueur-v2.md` que leurs validations visuelles sont remplacées par ce chantier.
  - Après « ok » : commit et push ; mise en production seulement sur ton ok explicite.
- Ce que je teste pour valider : tour complet de l'app joueur avec les deux comptes.
- Reste à finir : (1) Version de test Vercel non lancée : à faire sur ton « ok » (le déploiement est une action vers l'extérieur), puis contrôle par toi sur téléphone et ordinateur avec les deux comptes. (2) Commit et push non faits : attendent ton « ok » après le contrôle. Les modifications des blocs 5 à 10 sont toujours non commitées. (3) `IconBall` reste en maison (lucide n'a pas de ballon), utilisé par d'autres pages. (4) Décisions repoussées, aucune urgence : défaut `identite` de `Carte`, défaut 6 px de `TuileChiffre`, palette locale de PrepPhysiqueJoueur, écrans Journal / Poids / Profil / Plan de Nutrition, pastilles de Profil en 20 px. Les laisser tels quels ne change rien à l'accueil validé. (5) Pas de numéro de maillot en base (bloc 9) : décision à prendre si tu veux ce champ. (6) Pas de vrai classement de ligue en base (bloc 6).
- Journal : 2026-11-17, Sonnet 5.5. Sauvegarde backups/dashboard-joueur-v3-bloc11-*. Recherche de code mort par lint sur tous les fichiers joueur touchés : 3 imports inutiles retirés (`BadgeCheck` et `TuileChiffre` dans DashboardJoueur, `radius` dans SeanceDuJourJoueur) et la règle CSS `dj-bottom-nav-btn` (aucun élément ne l'utilisait). `TuileChiffre` gardé (utilisé par Nutrition, Santé, JaugeSaison, Historique). Liens internes rejoués : ids d'onglet envoyés (accueil, annonces, coach, entrainement, equipe, equipement, mes_stats, messages, profil, sante, analyses) tous gérés ; Santé, Messages, Clubs, Coach restent atteignables. Notes ajoutées dans PLAN.md et PLAN-joueur-v2.md. `npm run build` OK. Aucun navigateur ici : pas de contrôle visuel.

## Inventaire
(rempli au bloc 0, 2026-11-17, lignes de `src/pages/DashboardJoueur.jsx` approximatives)

### 1. Navigation actuelle (branche navItems / isPro)
- `onglet` = état local (l.359), `navItems` l.3460, `NAV_SECTION_IDS` l.3480 (equipe, prep_physique, analyses, coach, profil, carte, certif, clubs, messages). Rendu du menu latéral l.3556 ; pas de barre basse mobile : le menu est un tiroir (`sidebarOpen`) ouvert par un bouton fixe en haut à gauche (l.3697).
- `dj-bottom-nav-btn` n'existe que dans une règle CSS (l.3503), aucun élément ne l'utilise : à supprimer, rien à migrer.
- Entrées actuelles (13) : dashboard, equipe, annonces, competition, equipement, entrainement, preparation_tactique, prep_physique, nutrition (cadenas si non Pro), analyses (couvre aussi `coach`), mes_stats, profil, certif. Masqués du menu mais joignables : `sante`, `messages` (Recruteurs), `clubs`, `coach`.
- Groupes du bloc 1 : l'entrée `equipement` est dans « Équipe » aujourd'hui, le plan la met dans « Moi » (OK, id inchangé).

### 2. Appels qui changent d'onglet (à rejouer au bloc 1 et 11)
- `setOnglet('equipe')` : l.1949, 3876, 3884, 3904 (fin de saison, rejoindre un club). `setOnglet('equipement')` : l.2212 (popup équipement prêt, hors menu). `setOnglet('messages')` : l.3937, 3941. `setOnglet('coach')` : l.3960, 3964. `setOnglet('mes_stats')` : l.4111. `setOnglet('accueil')` : l.703.
- `onOuvrirOnglet={setOnglet}` / `onNaviguer={setOnglet}` : ALaUne (l.3735), ListeAlertes (l.3758), ActualitesJoueur (l.4554), SanteJoueur (l.4560), EquipementJoueur (l.4584), et un autre composant l.4983. Les ids qu'ils envoient sont à contrôler dans ces composants au bloc 1.
- Onglets `sante` (l.4559), `clubs` (l.4861), `messages` (l.4626/4638) : pas dans le menu, doivent rester atteignables.
- Les lignes 2276 à 3400 appartiennent à la branche `estAffilie` abandonnée : on n'y touche pas.
- OnboardingGuide cible les ids DOM : upload-section, equipe-section, prep-physique-section, analyses-section, coach-section, profile-section, carte-section, certif-section, clubs-section, messages-section. Le guide cherche ces éléments par `getElementById` : avec le nouveau menu à deux niveaux, ils doivent rester présents dans le DOM (sinon le guide saute l'étape).

### 3. Où vit quoi
| Élément | Emplacement actuel |
|---|---|
| Saisie d'un match joué | `src/pages/MesStats.jsx`, vue interne `vue === 'saisir'` (état local, l.126), enregistre dans `stats_match_joueur`. Aucune prop pour l'ouvrir de l'extérieur : le bouton « Saisir mon match » du bloc 1 demandera une petite prop (ex. `vueInitiale`) sur MesStats. |
| Prochain match | `widgetProchainMatch` (l.435, chargé l.1122), `prochainMatchSemaine` |
| Convocation + réponse | `convocationActive` (l.440, chargée l.819 à 849), `repConvoc`, `repondreConvocation(reponse)` l.874 ; affichée via `ALaUne` (l.3729). Disponibilité match : `repondreDisponibilite` (l.1212). |
| Séance du jour | `SeanceDuJourJoueur` (composant, rendu l.4971 dans l'onglet entrainement, pas sur l'accueil) |
| Stats de saison | `tauxPresenceAccueil` (l.439, calculé l.567 à 597 : taux, série de présences, buts, passes, matchs joués), `JaugeSaison` (l.3800), `equipePrincipaleStats` |
| Série V/N/D | Pas de calcul existant côté joueur : les scores viennent de `matchs_equipe` (score_nous, score_eux, l.1178). À créer au bloc 3 (5 derniers résultats de l'équipe principale). |
| Accueil actuel | `EnTeteJoueur` l.3713, `ALaUne` l.3729, `ListeAlertes` l.3758, `SondageSemaine` l.3792, `JaugeSaison` l.3800, `BarreActions` l.3861 |

### 4. Icônes : table de correspondance `Icon*` (src/components/icones.jsx) vers lucide-react (lucide-react 1.73 déjà installé et utilisé ailleurs)
IconHome=House · IconUser=User · IconChart=ChartColumn · IconMessage=MessageSquare · IconMic=Mic · IconPlay=Play · IconGlobe=Globe · IconUpload=Upload · IconVideoOff=VideoOff · IconLock=Lock · IconSearch=Search · IconCard=CreditCard · IconBadge=BadgeCheck · IconClipboard=ClipboardList · IconShirt=Shirt · IconNutrition=Apple · IconHealth=HeartPulse · IconBuilding=Building2 · IconDumbbell=Dumbbell · IconUsers=Users · IconTactic=Route · IconTrophy=Trophy · IconBall=Circle (pas de ballon dans lucide : à garder en maison si aucun rendu correct) · IconStar=Star · IconCalendar=Calendar · IconPin=MapPin · IconTarget=Target · IconBell=Bell · IconCheck=Check · IconCheckCircle=CircleCheck · IconClose=X · IconClock=Clock · IconLink=Link · IconKey=Key · IconAlert=TriangleAlert · IconMail=Mail · IconPencil=Pencil · IconMenu=Menu · IconPass=ArrowRightLeft · IconGlove=Hand · IconStadium=Landmark · IconCarton=RectangleVertical · IconHeart=Heart · IconTool=Wrench · IconDocument=FileText · IconBolt=Zap · IconRefresh=RefreshCw · IconStretch=PersonStanding · IconCamera=Camera · IconRun=Footprints · IconUnlock=LockOpen · IconGift=Gift · IconCopy=Copy · IconHelp=CircleHelp · IconSend=Send · IconPaperclip=Paperclip · IconVideo=Video · IconArrowRight=ArrowRight · IconTrash=Trash2 · IconShare=Share2 · IconRepeat=Repeat · IconVolume=Volume2 · IconVolumeOff=VolumeOff · IconFolder=Folder.
Usage : DashboardJoueur.jsx importe 42 icônes (les plus utilisées : IconStar 16, IconTrophy 12, IconClose 10, IconClock 10, IconCheck 10). Dans `src/components/joueur/` : IconVideo, IconShirt, IconCheck, IconMic, IconMessage, IconDocument, IconCheckCircle, IconCard. `icones.jsx` est partagé avec d'autres écrans : on ne supprime les définitions que si plus aucun usage dans tout `src` (bloc 5 et 11). Les noms lucide sont à vérifier à l'import au bloc 5 (build).

### 5. Comptes de test (lecture seule sur la production)
- Aucun joueur rattaché à un club avec match à venir ou convocation active.
- Aucun joueur Pro : les 2 comptes joueur existants sont `joueur_starter` (gratuit), sans club.
- Il existe aussi des comptes club et éducateur (dont le club test).

### 6. À faire par Kevin avant le bloc 2 (manipulation 1)
1. Avec le club test, créer ou rattacher un éducateur test, puis créer une équipe.
2. Rattacher un des 2 comptes joueur gratuits à cet éducateur (affiliation acceptée).
3. Depuis l'éducateur : créer un match à venir (Matchs) puis publier une convocation incluant ce joueur.
4. Pour le bloc 3 : un compte joueur Pro sans club. Soit passer un des comptes gratuits en Pro par Stripe en mode test, soit me demander la procédure au bloc 3. Rien ne touche la base sans ton exécution.
