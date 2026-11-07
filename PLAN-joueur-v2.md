# PLAN : esthétique du dashboard joueur, deuxième passe
Date : 2026-11-07 · Brief : BRIEF-joueur-v2.md · Exécution : `/bloc N PLAN-joueur-v2.md`

Objectif : faire passer l'écran d'accueil joueur (branche `onglet === 'dashboard'`,
les deux profils) de « propre » à « désirable », par une couche visuelle seule :
police display, carte de joueur en en-tête, trois niveaux de surface, une seule
lumière par écran, puis la coque commune aux trois dashboards.

Périmètre technique : `src/pages/DashboardJoueur.jsx` (couche visuelle uniquement),
`src/components/joueur/*`, `index.html`, un nouveau `src/lib/ecranJoueur.js`,
et au dernier bloc visuel les trois `Dashboard*.jsx` pour la coque.
Interdits sur tout le chantier : base de données (schéma), Stripe, emails,
requêtes Supabase et `useEffect` de chargement, branche `onglet === 'accueil'`.

## Ce que je dois fournir
| Élément | Pourquoi | Où le trouver | Nécessaire avant |
|---|---|---|---|
| Validation visuelle du menu latéral déjà testé | Le bloc 0 ne fait que committer ce que tu as validé | Ton écran, déjà vu | bloc 0 (fait) |
| Compte joueur **affilié** à un club actif | Voir la variante club des 7 emplacements | À recréer, voir manipulation 1 | bloc 2 |
| Compte joueur **Pro sans affiliation** | Voir la variante indépendante des 7 emplacements | À recréer, voir manipulation 2 | bloc 2 |
| Un club test + un éducateur test | Sans eux, pas de convocation, pas de composition, pas d'évaluation à afficher | À recréer, voir manipulation 1 | bloc 3 |
| Validation visuelle à chaque fin de bloc | Je n'ai pas de navigateur sur ce projet | Téléphone + ordinateur, thème clair + sombre | chaque bloc |
| Ton « ok » explicite pour la mise en ligne | Règle permanente | — | bloc 8 |

## Manipulations à faire moi-même

1. **Avant le bloc 2 : recréer le jeu de comptes test.** Depuis la page
   d'inscription du site, avec des alias de ton adresse (`...+clubtest@`,
   `...+edutest@`, `...+joueurtest@`, `...+protest@`), dans cet ordre :
   a. un compte **club** (nom « Club Test DF »), b. un compte **éducateur** qui
   demande l'affiliation à ce club, c. un compte **joueur** qui demande
   l'affiliation à ce club, d. accepter les deux demandes depuis le compte club,
   e. affecter le joueur à une équipe depuis le compte club ou éducateur.
   Note-moi les 4 adresses et les mots de passe dans un fichier hors du dépôt
   (pas dans `~/digital-football`, et jamais dans un commit).

2. **Avant le bloc 2 : un quatrième compte joueur sans aucune affiliation**,
   passé en plan Pro à la main. Je ne te donne pas la requête ici parce que je
   n'ai pas encore lu les colonnes concernées : le bloc 2 commence par la lire
   dans le code et te donner **un seul** bloc SQL à coller dans Supabase, qui
   touche uniquement la ligne de ce compte test. Aucune autre écriture en base
   sur tout le chantier.

3. **Avant le bloc 3 : créer de la matière à afficher** depuis le compte
   éducateur, pour que l'emplacement « à la une » ne soit pas vide : une séance
   d'entraînement à venir, un match à venir avec une convocation du joueur test,
   et une évaluation remplie. Sans ça je ne peux pas vérifier l'ordre de priorité
   du bloc en relief, seulement son état vide.

4. **À chaque fin de bloc** : ouvrir l'écran sur ton téléphone **et** sur
   l'ordinateur, en thème clair **et** en thème sombre, avec le compte affilié
   **et** le compte Pro quand le bloc touche les deux. Me dire oui, ou me dire
   quoi corriger, avant que je passe au bloc suivant.

5. **Au bloc 8 seulement** : ton « ok » écrit avant que je lance `vercel-deploy`,
   version de test d'abord, production ensuite.

## Répartition suggérée
Neuf blocs, dont deux mécaniques très légers. Les blocs 2, 3, 5 et 7 sont les
plus lourds : un seul de ceux-là par fenêtre de 5 h, jamais deux à la suite.

- **Aujourd'hui** : bloc 0 (10 min, mécanique), puis bloc 1 (fondations).
  Les deux tiennent dans une fenêtre avec de la marge.
- **Jour 2** : bloc 2 (en-tête carte de joueur, le point de validation décisif).
  Seul, parce que c'est lui qui décide si la direction te plaît. Crée les comptes
  test avant de le lancer, sinon tu valides à l'aveugle.
- **Jour 3** : bloc 3 (à la une + lumière + ma semaine), puis bloc 4 (ma saison +
  alertes) si la barre 5 h reste sous 60 %.
- **Jour 4** : bloc 5 (actions + vignette vidéo + colonne droite), puis bloc 6
  (passe mécanique Haiku, très léger).
- **Jour 5** : bloc 7 (coque commune aux trois dashboards), seul.
- **Jour 6** : bloc 8 (thème clair, états vides, build, mise en ligne).

Rappel : `/clear` et une session neuve **par bloc**. Si la barre « ctx » dépasse
40 % au milieu d'un bloc, je finis proprement et je te dis de repartir à neuf.

---

## Blocs

### Bloc 0 : committer le menu latéral commun sur `main`
- Statut : fait (2026-11-07)
- Objectif : repartir d'une base propre. Le menu latéral commun aux trois
  dashboards (`src/lib/menuLateral.js` + les trois fichiers modifiés) est testé
  par toi mais pas committé : il entre sur `main` avant tout nouveau travail.
- Résultat testable : `git status` propre sur les quatre fichiers, le site
  fonctionne toujours en local, le commit est visible sur GitHub.
- Modèle : haiku · Effort : low · Coût estimé : faible
- Pourquoi ce modèle : relire un diff de 87 lignes déjà validé, lancer un build
  et écrire un message de commit. Aucune décision de design.
- Lancement : `/clear`, puis `/model haiku`, puis `/effort low`, puis `/bloc 0 PLAN-joueur-v2.md`
- Dépend de : rien
- Prérequis : aucun (tu as déjà validé visuellement le menu)
- Étapes :
  - Sauvegarde datée des trois dashboards dans `~/Sauvegardes-DigitalFootball/`
    (copie, pas de `rm`).
  - Relire `git diff` sur les trois fichiers : vérifier qu'il ne contient que le
    passage à `menuLateralCss` et rien d'autre.
  - `npm run build` : doit passer sans erreur.
  - Commit des quatre fichiers avec un message français clair, puis push sur `main`.
  - Vérifier que `BRIEF-joueur-v2.md`, `BRIEF-theme-club.md` et `PLAN-theme-club.md`
    ne sont **pas** inclus dans ce commit (chantiers séparés).
- Ce que je teste pour valider : le menu de gauche des trois dashboards est
  intact après le build, et le commit apparaît sur GitHub.
- Reste à finir : dans `menuLateral.js`, la classe `.dj-nav-btn:hover` (DashboardJoueur.jsx, ligne ~3465) n'est plus utilisée : à supprimer au bloc 7 avec la coque.
- Journal : 2026-11-07, modèle haiku (effort low). Commit `e4f7061` poussé sur `main` (4 fichiers : menuLateral.js + 3 dashboards). Sauvegarde datée : `~/Sauvegardes-DigitalFootball/bloc0-2026-11-07-0039/`. Build OK. Écart : `src/lib/ThemeProvider.jsx` est modifié mais appartient au chantier thème club : non commité, à ne pas mélanger. Non commités aussi : BRIEF/PLAN-joueur-v2.md, BRIEF/PLAN-theme-club.md, clubTheme.js, paletteClub.js, tests/paletteClub.test.js. Validation visuelle : faite par Kevin avant ce bloc (non rejouée).

---

### Bloc 1 : fondations (police display, CSS commun, niveaux de surface)
- Statut : fait (2026-11-07), en attente de ta validation visuelle
- Objectif : poser les trois outils dont tous les blocs suivants dépendent, sans
  redessiner une seule section : la police Barlow Condensed, un fichier de CSS
  commun à l'écran joueur, et le niveau de surface sur `Carte`.
- Résultat testable : sur l'écran d'accueil joueur, les sur-titres de section et
  tous les chiffres passent en Barlow Condensed (condensée, plus affirmée), la
  mise en page ne bouge pas, rien ne casse.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : production de code soignée avec une décision de structure
  (où vivent les classes, quelle API pour `Carte`), mais aucun risque sur les
  données ni sur les paiements.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 1 PLAN-joueur-v2.md`
- Dépend de : bloc 0
- Prérequis : `main` propre
- Étapes :
  - `index.html` ligne 27 : ajouter `Barlow+Condensed:wght@600;800` à la ligne
    Google Fonts existante, dans la même requête (`display=swap`, le
    `preconnect` est déjà là). Une seule requête réseau, pas une deuxième balise.
  - Créer `src/lib/ecranJoueur.js` sur le modèle exact de `menuLateral.js` :
    `export const ecranJoueurCss = (colors) => \`...\``, injecté une seule fois
    par `<style>{ecranJoueurCss(colors)}</style>` dans la branche `dashboard`.
    Classes à y définir : `.dj-display` (famille + interlettrage), `.dj-chiffre`
    (display 800 + `font-variant-numeric: tabular-nums`), `.dj-eyebrow`
    (11 px, 700, majuscules, 0,14 em), `.dj-cliquable` (survol `translateY(-2px)`
    + bordure `border.default`, transition 0,18 s, `:focus-visible` outline
    `var(--df-accent)`), `.dj-grain` (`::before` fixe, bruit `feTurbulence` en
    `data:`, opacité 0,02, `pointer-events: none`).
  - `src/components/joueur/Carte.jsx` : ajouter la prop
    `niveau="discret" | "standard" | "relief"` (défaut `standard`, comportement
    actuel conservé pour tous les appels existants). `discret` = fond transparent
    + bordure `border.subtle`. `relief` = `background.surfaceAlt` + bordure
    `accent.green + alpha.light` + la lumière du brief. Garder la prop `accent`
    en place mais la documenter comme remplacée par `niveau="relief"`.
  - `TitreSection.jsx` : passer à `className="dj-eyebrow"` et retirer les styles
    inline correspondants. `TuileChiffre.jsx` et `JaugeSaison.jsx` : les valeurs
    chiffrées passent en `className="dj-chiffre"`, 28 à 32 px.
  - Vérifier que les autres écrans joueur qui utilisent ces trois composants
    (`AnalysesJoueur`, `EquipementJoueur`, etc.) n'ont pas régressé : la police
    change, la taille et la place ne doivent pas changer.
  - `npm run build`, puis me rendre compte.
- Ce que je teste pour valider : l'accueil joueur, un onglet interne (analyses),
  en clair et en sombre, téléphone et ordinateur. Les titres de section et les
  chiffres ont une nouvelle allure, rien n'est décalé ni coupé.
- Reste à finir : `accent` sur `Carte` est encore utilisé par SanteJoueur, EquipementJoueur et NutritionIntro (écrans hors accueil) : à migrer vers `niveau="relief"` ou retirer plus tard. La classe `.dj-grain` et `.dj-cliquable` sont définies mais pas encore posées (blocs 3 à 5).
- Journal : 2026-11-07, modèle sonnet 5.5 (effort high). Sauvegarde : `~/Sauvegardes-DigitalFootball/bloc1-2026-11-07/`. Police Barlow Condensed 600/800 ajoutée dans la requête Google Fonts existante (réponse 200). `src/lib/ecranJoueur.js` créé et injecté à la racine de DashboardJoueur (à côté du `<style>` global, et non dans la branche `dashboard`) pour que `TitreSection` et `TuileChiffre` gardent leur style dans tous les onglets joueur. `Carte` : prop `niveau` (discret, standard, relief), lumière en sombre, ombre douce en clair. `JaugeSaison` : pourcentage passé de 22 à 32 px (Barlow est plus étroite). Build OK. Écart : `git status` montre aussi des modifications du chantier thème club (App.jsx, theme.js, ThemeProvider.jsx, couleurs dans DashboardJoueur.jsx) : pas à moi, à ne pas mélanger dans le commit du bloc 1. Pas de navigateur ici : validation visuelle par Kevin.

---

### Bloc 2 : en-tête carte de joueur, les deux profils
- Statut : fait (2026-11-07), en attente de ta validation visuelle
- Objectif : remplacer la carte horizontale actuelle (vers les lignes 3686 à 3720)
  par la carte de joueur signature : chiffre de poste fantôme en fond, nom en
  display 34/44 px, logo du club en médaille sur l'avatar, ligne de stats
  intégrée. Variante Pro : région et badge Pro à la place de la catégorie et du
  club. **Point de validation décisif du chantier.**
- Résultat testable : l'en-tête de l'accueil joueur ressemble à une carte de
  joueur d'app de club pro, sur les deux comptes, dans les deux thèmes. L'envoi
  de photo de profil fonctionne toujours.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : c'est du dessin d'interface dense avec deux variantes à
  tenir dans un seul squelette, et l'upload d'avatar à ne pas casser. Opus n'y
  apporterait rien : aucune logique de données.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 2 PLAN-joueur-v2.md`
- Dépend de : bloc 1
- Prérequis : manipulations 1 et 2 faites (les quatre comptes test existent)
- Étapes :
  - D'abord : lire les colonnes du profil concernées et me donner **un seul**
    bloc SQL pour passer le compte test en Pro (manipulation 2). Attendre que je
    confirme avant de continuer le bloc.
  - Lire `src/components/CarteJoueur.jsx` (déjà existant, utilisé seulement
    ligne 4950) : réutiliser ce qui s'y trouve plutôt que repartir de zéro, mais
    sans toucher à son usage actuel dans l'onglet profil.
  - Construire l'en-tête : chiffre de poste en Barlow 150 px, blanc à 4 %,
    `overflow: hidden` sur le conteneur ; nom en `.dj-display` ; avatar 88 px
    avec le logo du club en médaille ; ligne de stats sous le nom.
  - Variantes : affilié (catégorie + logo du club), Pro indépendant (région +
    badge Pro). Même squelette, même style, contenu différent. Si une donnée
    manque, l'élément disparaît, jamais de « — » ni de case vide.
  - Conserver intacts le `<label>` d'envoi de photo, `avatarUploading` et le
    composant `Avatar`.
  - Thème clair : le chiffre fantôme devient noir à 4 %, pas blanc. Vérifier le
    contraste du nom sur les deux fonds.
  - `npm run build`, puis me rendre compte avec la liste de ce que je dois voir.
- Ce que je teste pour valider : les deux comptes, les deux thèmes, téléphone et
  ordinateur. Le chiffre fantôme ne déborde pas, le nom long ne casse pas la
  carte, le changement de photo de profil marche encore.
- Reste à finir : le grand chiffre fantôme est le numéro de maillot classique du poste (Gardien 1, latéral droit 2, latéral gauche 3, central 4, milieu défensif 6, ailier droit 7, milieu central 8, attaquant 9, milieu offensif 10, ailier gauche 11) : à confirmer par Kevin. Sans poste renseigné, aucun chiffre. Le club saisi à la main dans le profil (`profil.club`) n'est plus affiché : seul le club affilié l'est (ordre du plan). Les chiffres « saison » restent au bloc 4.
- Journal : 2026-11-07, modèle sonnet 5.5 (effort high). SQL de passage du compte test en Pro : exécuté par Kevin avec succès (après une erreur réseau Safari « Load failed » sans effet). Sauvegarde : `~/Sauvegardes-DigitalFootball/DashboardJoueur-bloc2-2026-11-07.jsx`. Nouveau composant `src/components/joueur/EnTeteJoueur.jsx` (remplace le bloc d'en-tête de DashboardJoueur.jsx), `numeroDePoste` ajouté à `ecranJoueur.js`. `CarteJoueur.jsx` (carte OVR par paliers bronze/or) n'est pas réutilisée : c'est un autre objet (note de joueur), son usage dans l'onglet profil est intact. Upload de photo : `<label>`, `handleAvatarUpload`, `avatarUploading` et `Avatar` conservés tels quels. Build OK, eslint propre sur les deux fichiers. Pas de navigateur ici : validation visuelle par Kevin.

---

### Bloc 3 : « à la une » (bloc en relief unique) et « ma semaine »
- Statut : fait (2026-11-07), en attente de ta validation visuelle
- Objectif : installer l'emplacement 2, seul bloc en relief de l'écran, avec son
  ordre de priorité par profil, plus la lumière de terrain et le grain. Ajuster
  `BandeSemaine` (emplacement 3) et la faire disparaître quand il n'y a aucune
  échéance.
- Résultat testable : une seule chose ressort de l'écran, et c'est la bonne :
  convocation, sinon composition, sinon prochaine séance pour l'affilié ;
  dernière analyse vidéo, sinon visibilité recruteurs, sinon publier un clip pour
  le Pro indépendant.
- Modèle : sonnet · Effort : high · Coût estimé : moyen à élevé
- Pourquoi ce modèle : l'ordre de priorité se lit dans des données déjà chargées,
  donc c'est de la logique d'affichage, pas de la logique métier. Mais c'est le
  bloc le plus long : plusieurs cas à couvrir sans jamais laisser un trou.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 3 PLAN-joueur-v2.md`
- Dépend de : blocs 1 et 2
- Prérequis : manipulation 3 faite (séance, match avec convocation, évaluation)
- Étapes :
  - Repérer les états déjà chargés qui alimentent les trois priorités de chaque
    profil. Ne créer **aucune** requête ni `useEffect` : si la donnée n'est pas
    déjà là, la priorité est retirée de la liste et je te le dis.
  - Écrire la fonction de choix (une seule, qui rend `{ type, contenu }`), puis
    un seul `<Carte niveau="relief">` qui la rend. Garantir qu'aucun autre bloc
    de l'écran n'utilise `niveau="relief"` ni `accent`.
  - Poser la lumière (`radial-gradient` + `box-shadow` du brief) sur ce bloc
    seul, et `.dj-grain` sur le conteneur de l'écran. Retirer toute autre ombre
    colorée de la branche `dashboard`.
  - `BandeSemaine` : harmoniser avec le niveau `discret`, et retourner `null`
    quand il n'y a ni séance, ni match, ni présence à déclarer.
  - État vide du bloc en relief : une phrase qui explique et une action, jamais
    une carte vide ni un mur d'upsell.
  - Thème clair : lueur verte remplacée par l'ombre portée douce du brief.
  - `npm run build`, puis me rendre compte.
- Ce que je teste pour valider : avec convocation, puis sans (en supprimant la
  convocation côté éducateur) pour voir la priorité suivante. Les deux comptes,
  les deux thèmes. Le grain ne doit pas être visible comme un bruit, seulement
  comme une texture.
- Reste à finir : (1) `BandeSemaine` est adaptée (niveau discret, rend `null` sans échéance) mais **pas posée** dans la branche `dashboard` : le commentaire du code dit que tu as retiré la bande le 2026-10-29 parce que `SondageSemaine` montre déjà la semaine avec les boutons de présence. À toi de dire si tu la veux quand même au-dessus du sondage. (2) Priorité Pro : « dernière analyse » reste à la une tant qu'une analyse existe, même ancienne : si tu veux qu'elle cède la place après X jours, c'est une ligne dans `choisirALaUne`. (3) « Visibilité recruteurs » n'est proposée qu'aux Pro (la visibilité est un avantage Pro). (4) La carte « Composition » reste affichée en dessous quand une convocation prend la une : rien n'est caché au joueur. (5) Pas de compteur de vues recruteurs : la donnée n'est pas chargée, donc le bloc affiche seulement le statut.
- Journal : 2026-11-07, modèle sonnet 5.5 (effort high). Sauvegardes : `~/Sauvegardes-DigitalFootball/DashboardJoueur-bloc3-2026-11-07.jsx`, `ecranJoueur-bloc3-...js`, `BandeSemaine-bloc3-...jsx`. Nouveau `src/components/joueur/ALaUne.jsx` (seul `<Carte niveau="relief">` de la branche `dashboard`) et `choisirALaUne` dans `src/lib/ecranJoueur.js` (fonction pure, 8 tests dans `tests/ecranJoueur.test.js`). Aucune requête ni `useEffect` ajouté : « dernière analyse » = première ligne de `demandes` en statut `analyse`, visibilité = `recrutementProfil` déjà chargé. Ancienne carte de convocation retirée de la page (reprise dans le bloc à la une avec Présent/Absent, programme, notes). `.dj-grain` posé sur le conteneur de la branche `dashboard`. Plus aucune ombre colorée ni `accent=` dans la branche. Build OK, `npm test` 139/139, eslint propre sur les fichiers neufs (les 10 alertes de DashboardJoueur.jsx existaient avant). Rendu de test des 7 cas + cas vide : OK. Pas de navigateur ici : validation visuelle par Kevin. Prérequis non vérifiable de mon côté : manipulation 3 (séance, match avec convocation, évaluation).

---

### Bloc 4 : « ma saison » et alertes
- Statut : fait (2026-11-07), en attente de ta validation visuelle
- Objectif : emplacements 4 et 5. `JaugeSaison` adopte les chiffres en display et
  les deux jeux de mesures (affilié : présence, évaluations, buts et passes ;
  Pro : analyses utilisées, clips publiés, demandes reçues). `ListeAlertes`
  passe en niveau discret.
- Résultat testable : la section « ma saison » affiche les bons chiffres pour
  chaque profil, en gros, lisibles, alignés ; les alertes reculent visuellement
  au lieu de concurrencer le bloc en relief.
- Modèle : sonnet · Effort : medium · Coût estimé : faible à moyen
- Pourquoi ce modèle : deux composants existants à habiller, pas de nouvelle
  structure. Effort medium suffit.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 4 PLAN-joueur-v2.md`
- Dépend de : blocs 1 et 3
- Prérequis : comptes test en place, quelques données de saison sur le compte affilié
- Étapes :
  - `JaugeSaison.jsx` : valeurs en `.dj-chiffre` 28 à 32 px, libellés en Inter,
    rayon 12 px pour les tuiles, espacements pris dans `spacing`.
  - Jeu de mesures du profil Pro : utiliser uniquement les compteurs déjà
    chargés. Toute mesure sans donnée disparaît, la jauge ne garde jamais un zéro
    menteur.
  - `ListeAlertes.jsx` : `niveau="discret"`, `.dj-cliquable` sur les lignes
    cliquables, état verrouillé en `border.strong` + cadenas (pas d'opacité).
  - État vide : si aucune alerte, la section entière disparaît.
  - `npm run build`, puis me rendre compte.
- Ce que je teste pour valider : les deux comptes, les deux thèmes. Les chiffres
  ne dansent pas quand ils changent (tabular-nums), rien n'est tronqué sur
  téléphone.
- Reste à finir : (1) « Clips publiés » (mesure Pro prévue) retirée : seul le dernier reel est chargé (`limit(1)`), pas de compteur, et le plan interdit toute nouvelle requête. Si tu le veux, c'est une petite requête `count` à autoriser. (2) « Demandes reçues » = demandes de bilan médical des recruteurs (seule donnée « demande » déjà chargée). (3) Les analyses restantes ne sont pas dans la jauge : elles ont déjà leur carte « quota » dans la colonne droite (bloc 5). (4) État verrouillé « border.strong + cadenas » : aucune ligne d'alerte n'est verrouillée aujourd'hui, rien à faire. (5) Sur le profil Pro, les tuiles « minutes jouées » et « série de présences » disparaissent au profit de la jauge commune (la série reste dans la phrase).
- Journal : 2026-11-07, modèle sonnet 5.5 (effort medium). Sauvegardes : `~/Sauvegardes-DigitalFootball/{DashboardJoueur,JaugeSaison,ListeAlertes}-bloc4-2026-11-07.jsx`. `JaugeSaison` : nouvelle prop `mesures` (jeu Pro), chiffres déjà en `.dj-chiffre` 28 à 32 px (bloc 1), tuiles rayon 12 px ; une mesure à 0 n'est pas affichée ; sans présence ni mesure, la section disparaît. Branche Pro de `DashboardJoueur.jsx` : les 4 tuiles en dur remplacées par `<JaugeSaison>` (mesures : analyses reçues, demandes de bilan médical). `CerclePresence` et `DonutPresenceMulti` supprimés (devenus inutilisés). `ListeAlertes` : `niveau="discret"`, lignes cliquables en `.dj-cliquable` (+ Entrée au clavier), rayon 12 px. Build OK, `npm test` 139/139, eslint DashboardJoueur : 10 alertes, comme avant. Rendu de test (5 cas : Pro avec mesure, Pro sans donnée, affilié, alertes, sans alerte) : OK. Pas de navigateur ici : validation visuelle par Kevin. Non commité (mélangé avec le chantier thème club dans le dépôt).

---

### Bloc 5 : actions, vignette vidéo réelle, colonne droite
- Statut : fait (2026-11-07), en attente de ta validation visuelle
- Objectif : emplacements 6 et 7. Les trois tuiles jumelles (vers les lignes 3967
  à 4000) deviennent une barre d'actions compacte, accompagnée d'une vraie
  vignette de la dernière vidéo. La colonne de droite (320 px, ordinateur) reçoit
  le quota d'analyses et l'abonnement, et `ApercuPro` garde sa place unique en bas.
- Résultat testable : plus de pavé de trois cartes identiques en haut de la
  colonne gauche. Une barre d'actions discrète, une vignette qui montre une vraie
  image, et une colonne droite qui ne répète rien.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : il faut récupérer la vignette d'une vidéo déjà chargée et
  gérer son absence proprement, dans une mise en page à deux colonnes qui doit
  tenir sur téléphone. Rien qui justifie Opus.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 5 PLAN-joueur-v2.md`
- Dépend de : blocs 1, 3 et 4
- Prérequis : au moins une vidéo sur le compte affilié ou Pro, sinon je ne peux
  montrer que l'état sans vignette (dis-le moi, c'est acceptable pour ce bloc)
- Étapes :
  - Remplacer la grille de tuiles par une barre compacte (Jogabonito, Publier,
    et Feed pour le Pro), en `.dj-cliquable`, rayon 12 px.
  - Vignette : utiliser l'image de la dernière vidéo déjà présente dans les
    états. Sans vidéo, la vignette disparaît et la barre reste seule.
  - Colonne droite : quota d'analyses et abonnement en niveau standard, chiffres
    en `.dj-chiffre`. Sur téléphone, la colonne passe sous le contenu.
  - Vérifier qu'`ApercuPro` n'apparaît qu'une fois, en bas, et seulement pour qui
    n'est pas Pro.
  - Supprimer la classe `dj-action-card` devenue inutile si plus rien ne
    l'utilise, ainsi que son CSS.
  - `npm run build`, puis me rendre compte.
- Ce que je teste pour valider : les deux comptes, les deux thèmes, téléphone et
  ordinateur. Chaque bouton de la barre mène bien où il dit, la vignette s'ouvre
  sur la vidéo, aucun bouton mort.
- Reste à finir : (1) La vignette n'est possible que pour un lien YouTube (miniature officielle) ou un fichier vidéo direct (.mp4, .mov, .webm, Cloudinary, première image du fichier). Veo, TikTok, Instagram : pas de vignette, la barre reste seule (aucune colonne miniature en base, pas de nouvelle requête). (2) La carte « vidéo partagée » (Voir, Changer, Supprimer) reste dans la colonne droite, inchangée : elle porte la suppression, je ne l'ai pas retirée. Elle double un peu la vignette ; à toi de dire si tu veux la fusionner plus tard. (3) Cartes « messages » et « réponses du coach » de la colonne gauche : encore au style d'origine, à traiter au bloc 6 (rayons et espacements).
- Journal : 2026-11-07, modèle sonnet 5.5 (effort high). Sauvegardes : `~/Sauvegardes-DigitalFootball/{DashboardJoueur,ecranJoueur}-bloc5-2026-11-07.{jsx,js}`. Nouveau `src/components/joueur/BarreActions.jsx` (boutons `.dj-cliquable`, rayon 12 px, sous-titres masqués sur téléphone, vignette cliquable qui ouvre la vidéo dans un nouvel onglet, disparaît si l'image ne charge pas). Nouvelle fonction pure `vignetteVideo` dans `src/lib/ecranJoueur.js` (3 tests ajoutés). `DashboardJoueur.jsx` : les 3 tuiles `dj-action-card` remplacées par la barre (l'id `upload-section` de l'OnboardingGuide est conservé) ; CSS `.dj-action-card` supprimé ; quota et abonnement passés en `<Carte>` standard, nombre du quota en `.dj-chiffre` 40 px ; `ApercuPro` déplacé en dernière position de la colonne droite (une seule occurrence, seulement pour qui n'est pas Pro). Aucune requête ni `useEffect` ajouté. Build OK, `npm test` 142/142, eslint propre sur les fichiers neufs et 10 alertes sur DashboardJoueur.jsx, comme avant. Rendu de test de la barre (sans vidéo, YouTube, mp4, TikTok) : OK. Pas de navigateur ici : validation visuelle par Kevin. Non commité (mélangé avec le chantier thème club dans le dépôt).

---

### Bloc 6 : normalisation des rayons et des espacements
- Statut : fait (2026-11-07), en attente de ta validation visuelle
- Objectif : faire disparaître de la branche `dashboard` les valeurs en dur :
  rayons 14 px et 10 px, `gap: '14px'`, `marginBottom: '20px'` et compagnie, au
  profit de `radius` et `spacing`. Purement mécanique.
- Résultat testable : l'écran est identique à l'œil, et `grep` ne trouve plus de
  rayon ni d'espacement en dur dans la branche `dashboard`.
- Modèle : haiku · Effort : low · Coût estimé : faible
- Pourquoi ce modèle : remplacements à l'identique, aucune décision visuelle.
  Exactement le travail que le kit réserve à Haiku.
- Lancement : `/clear`, puis `/model haiku`, puis `/effort low`, puis `/bloc 6 PLAN-joueur-v2.md`
- Dépend de : blocs 2 à 5 validés (sinon on normalise du code qui va changer)
- Prérequis : bloc 5 validé par toi
- Étapes :
  - Lister les valeurs en dur de la branche `dashboard` (`grep` sur `px'` entre
    les bornes de la branche) et établir la table de correspondance vers les
    tokens.
  - Remplacer, rayon par rayon : 16 px carte, 12 px tuile et ligne, `radius.pill`
    badge et pastille. Aucun 14 px ni 10 px ne survit.
  - Remplacer les espacements par les clés de `spacing` les plus proches, sans
    jamais changer une valeur de plus de 2 px.
  - `npm run build`, puis me dire précisément quoi regarder en priorité.
- Ce que je teste pour valider : comparaison rapide avant/après sur téléphone et
  ordinateur. Rien ne doit avoir visiblement bougé.
- Reste à finir : (1) Deux `marginBottom: '1px'` (pastilles de conversation, lignes ~239 et ~262) gardés en dur : le token le plus proche est à 3 px d'écart, au-delà de la limite de 2 px. (2) `padding: '24px 40px'` : 40 px n'a pas de clé dans `spacing` (la plus proche, 32, est à 8 px d'écart), donc la valeur reste en dur. (3) La branche garde `fontSize` et des `1px` de bordure : ce ne sont ni rayons ni espacements. (4) Les composants `src/components/joueur/*` (dont les cartes de la colonne gauche : messages, réponses du coach) gardent leurs propres valeurs, hors de la branche. (5) Pas de comparaison visuelle avant/après faite ici (pas de navigateur) : à toi de regarder.
- Journal : 2026-11-07, modèle haiku 5.5 (effort low). Sauvegardes : `~/Sauvegardes-DigitalFootball/DashboardJoueur-bloc6-2026-11-07.jsx`, `joueur-bloc6-2026-11-07/`, `ecranJoueur-bloc6-2026-11-07.js`. Premier essai de remplacement par script : il a mal découpé le fichier (dupliquait une partie), fichier restauré depuis la sauvegarde avant de refaire. Remplacement final dans la seule branche `onglet === 'dashboard'` : 83 valeurs simples plus 3 conditions mobile/bureau, rayons en `radius.*`, espacements en `spacing.*`. Écarts : 2 px et 3 px arrondis au token le plus proche (écart de 1 à 2 px seulement). Build OK, `npm test` 142/142. Lint : même nombre d'alertes qu'avant (10, déjà présentes). Pas de commit (bloc pas encore validé).

---

### Bloc 7 : coque commune (en-tête haut et tiroir mobile, trois dashboards)
- Statut : fait (2026-11-07), en attente de ta validation visuelle
- Objectif : prolonger `menuLateral.js` par le même traitement sur l'en-tête haut
  et le tiroir coulissant mobile des trois dashboards (joueur, éducateur, club),
  chacun gardant sa couleur d'accent. La barre d'onglets du bas reste abandonnée.
- Résultat testable : les trois dashboards partagent exactement la même coque
  (en-tête, tiroir, états de survol et de focus), et seule la couleur d'accent
  les distingue.
- Modèle : sonnet · Effort : high · Coût estimé : élevé
- Pourquoi ce modèle : trois fichiers en production touchés en même temps, avec
  une navigation mobile à ne pas casser. Bloc à faire seul dans sa fenêtre.
- Dépend de : blocs 0 et 6
- Prérequis : blocs 2 à 6 validés, sauvegarde datée des trois dashboards
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 7 PLAN-joueur-v2.md`
- Étapes :
  - Sauvegarde datée des trois dashboards avant toute modification.
  - Étendre `src/lib/menuLateral.js` (ou créer `src/lib/coqueDashboard.js` s'il
    devient trop gros) avec les classes `df-topbar`, `df-drawer`,
    `df-drawer-backdrop` et leurs états, sur le même modèle que `df-nav-btn`.
  - Appliquer aux trois dashboards, un fichier à la fois, en vérifiant à chaque
    fois que l'ouverture et la fermeture du tiroir fonctionnent toujours.
  - Ne toucher à **aucun** contenu de l'éducateur ni du club : coque seulement.
  - `npm run build`, puis me rendre compte fichier par fichier.
- Ce que je teste pour valider : les trois dashboards, téléphone en priorité :
  ouverture du tiroir, fermeture au clic dehors, navigation entre onglets,
  couleur d'accent propre à chaque espace. Les deux thèmes.
- Reste à finir : (1) Seul le dashboard club avait une vraie barre du haut ; éducateur et joueur n'en ont pas (ligne burger / bouton flottant). J'ai donné à tous le même bouton `df-burger` et le même tiroir, sans créer de barre là où il n'y en avait pas (ce serait un changement de mise en page). `df-topbar` est utilisé par le club. À toi de dire si tu veux une vraie barre sur les deux autres. (2) Le logo « Digital Football » au centre de la ligne mobile de l'éducateur et la cloche mobile du joueur n'ont pas été touchés. (3) Les branches mortes de DashboardJoueur (anciens écrans affilié) gardent leur ancien bouton.
- Journal : 2026-11-07, modèle sonnet 5.5 (effort high). Sauvegardes : `~/Sauvegardes-DigitalFootball/Dashboard{Joueur,Educateur,Club}-bloc7-2026-11-07.jsx` et `menuLateral-bloc7-...js`. `src/lib/menuLateral.js` : classes `df-drawer` (ombre à l'ouverture), `df-drawer-backdrop` (fond flouté, fondu), `df-burger`, `df-topbar`, respect de `prefers-reduced-motion`, et `coqueVars(colors, accent)` (accent : bleu éducateur, vert joueur et club). Appliqué aux trois fichiers par modifications ciblées (DashboardEducateur.jsx était modifié en parallèle par une autre session : aucun fichier réécrit en bloc). Logique d'ouverture/fermeture (`sidebarOpen`) inchangée. Build OK, `npm test` OK. Pas de navigateur ici : tiroir à valider par Kevin.

---

### Bloc 8 : vérification finale, thème clair, états vides, mise en ligne
- Statut : contrôles faits (2026-11-07), commit/push/mise en ligne en attente de ton choix
- Objectif : la passe de contrôle. Thème clair repris écran par écran, tous les
  états vides vérifiés, build propre, commit, puis mise en ligne après ton « ok ».
- Résultat testable : l'écran joueur est irréprochable dans les deux thèmes, sur
  les deux profils, y compris quand il n'y a aucune donnée, et la version en
  ligne correspond à ce que tu as validé en local.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : relecture critique et corrections fines, plus une mise en
  ligne à conduire avec prudence.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 8 PLAN-joueur-v2.md`
- Dépend de : tous les blocs précédents
- Prérequis : blocs 0 à 7 validés par toi
- Étapes :
  - Thème clair : parcourir chaque emplacement, vérifier qu'aucune lueur verte ne
    subsiste et que les ombres portées douces ont bien pris sa place.
  - États vides : nouveau compte sans aucune donnée, compte Pro sans vidéo,
    compte affilié sans convocation. Aucun emplacement vide, aucune carte creuse,
    aucun bouton mort.
  - Vérifier qu'il n'y a qu'un seul bloc en relief, une seule source de lumière,
    et aucun emoji décoratif ajouté.
  - `npm run build`, commit en français, push sur `main`.
  - Lancer `vercel-deploy` : version de test d'abord, me donner l'adresse,
    attendre mon « ok » écrit, puis production.
- Ce que je teste pour valider : l'adresse de test sur téléphone et ordinateur,
  les deux thèmes, les deux comptes, avant de dire oui pour la production.
- Reste à finir : commit et push (le dépôt mélange aussi le chantier thème club : voir compte rendu), puis vercel-deploy après ton ok. Test visuel clair/sombre, états vides sur vrais comptes : à ta charge, pas de navigateur ici.
- Journal : 2026-11-07, sonnet 5.5 (high). Contrôles de code : branche dashboard sans accent= ni ombre colorée (seules restent celles de la branche accueil, hors périmètre), un seul niveau="relief" (ALaUne), aucun emoji, aucun bouton vide. Thème clair : relief = ombre neutre. Build OK, npm test 142/142, eslint propre. Rien commité ni déployé.
