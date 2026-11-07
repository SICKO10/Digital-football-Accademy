# BRIEF : esthétique du dashboard joueur, deuxième passe
Date : 2026-11-07 · Statut : prêt pour /plan

> `BRIEF.md` (2026-10-29) portait le même titre et a été **livré** : socle visuel
> `src/components/joueur/`, cadre 980 px, tokens, chasse aux emojis, puis
> `PLAN.md` « finition de l'espace joueur » (blocs 0 à 11, en production).
> Ce brief est la passe suivante : passer de « propre » à « désirable ».
> Plan à écrire dans `PLAN-joueur-v2.md`, exécution avec `/bloc N PLAN-joueur-v2.md`.

## Vision en 3 lignes
L'espace joueur doit donner envie d'être montré, pas seulement d'être consulté.
La refonte d'octobre a rendu l'écran sain mais plat : tous les blocs ont la même
surface, le même rayon de 16 px et le même poids typographique. Cette passe
installe une hiérarchie, de la profondeur et un moment fort, sans toucher à la
plomberie déjà en place.

## Pour qui, et ce qui change pour eux
- **Joueur affilié à un club** (13-18 ans, téléphone, plan `joueur_starter` ou
  `joueur_pro` avec `affilieAccepte`) : il ouvre l'app pour savoir s'il joue et
  ce que le coach pense. Demain : son identité de joueur d'abord, puis une seule
  chose à la une.
- **Joueur indépendant Pro** (adulte en recherche, `joueur_pro` +
  `abonnement_actif`, sans affiliation) : aujourd'hui il voit le même squelette
  privé de club (pas de convocation, pas de coach, pas d'équipe) : il hérite de
  trous. Demain les emplacements « club » sont occupés par son parcours
  (visibilité recruteurs, analyses, publications), jamais par un mur d'upsell.
- **Kevin** : le socle `src/components/joueur/` existe déjà, donc le chantier est
  une couche de peau, pas une reconstruction. Chaque écran suivant en profite.

## Promesse et différenciation
Promesse : « ton espace de joueur, beau comme l'app d'un club pro ».
Différenciation : la continuité. Le même squelette sert les deux profils ; ce qui
change, c'est le contenu des emplacements, jamais le style. Le joueur affilié qui
passe Pro ne change pas de monde, son espace s'ouvre.

## Direction artistique arrêtée (choix laissé à Claude, décidé ici)
Même ADN : fond noir profond, vert de marque `#4ade80`. Exécution nouvelle.

### 1. Trois niveaux de surface au lieu d'un
Aujourd'hui presque tout est `background.surface` (#111) + `border.subtle` +
`radius['3xl']` (16 px). Nouveau système, en thème sombre :
- **N0, page** : `background.base` (#0a0a0a), inchangé.
- **N1, bloc discret** : fond transparent + bordure 1 px `border.subtle` (#1a1a1a).
  Pour les sections de liste, les groupes, les blocs secondaires. Ils reculent.
- **N2, carte standard** : `background.surface` (#111) + bordure `border.subtle`.
  L'actuel, conservé pour les cartes de contenu.
- **N3, bloc en relief, un seul par écran** : `background.surfaceAlt` (#141414),
  bordure `colors.accent.green + alpha.light`, lueur (voir point 3). Réservé au
  bloc « à la une ». Jamais deux N3 visibles en même temps.

En thème clair (`colorsClaire`) : mêmes quatre niveaux, la lueur verte devient une
ombre portée douce (`0 10px 30px -18px rgba(0,0,0,0.18)`), jamais une lueur.

### 2. Une seule police display en plus d'Inter
**Barlow Condensed**, poids 600 et 800 seulement, ajoutée à la ligne Google Fonts
existante de `index.html` (ligne 27, `display=swap`, le `preconnect` est déjà là).
Usages **exclusifs**, déclarés une fois dans une classe CSS, jamais en inline :
- nom du joueur dans l'en-tête : 34 px sur mobile, 44 px sur ordinateur, poids 800,
  interlettrage -0,5 px ;
- chiffre de poste en fond de l'en-tête : 150 px, poids 800, couleur blanche à 4 %,
  débordement masqué ;
- valeurs chiffrées (stats, quotas, jauges, scores) : 28 à 32 px, poids 800, avec
  `font-variant-numeric: tabular-nums` pour que les chiffres ne dansent pas ;
- sur-titres de section (`TitreSection`) : 11 px, poids 700, majuscules,
  interlettrage 0,14 em.
Tout le reste (corps, boutons, étiquettes, menus) reste **Inter**. Règle : jamais
de display sous 11 px, jamais pour un paragraphe.

### 3. La lumière de terrain
Une seule source lumineuse par écran, posée sur le bloc N3 :
`radial-gradient(circle at 15% 0%, #4ade8010, transparent 60%)` en fond, plus
`box-shadow: 0 24px 60px -34px rgba(74,222,128,0.38)`.
Grain : un `::before` fixe sur le conteneur de l'écran, bruit SVG `feTurbulence`
en `data:` (aucune requête réseau), opacité 0,02, `pointer-events: none`.
Aucune autre ombre colorée ailleurs dans l'écran.

### 4. Un seul système d'états
Première brique déjà écrite dans `src/lib/menuLateral.js` (non committé), à
étendre à l'écran joueur dans un fichier CSS commun :
- survol d'un bloc cliquable : `translateY(-2px)` + bordure `border.default`,
  transition `0.18s ease` ;
- actif : bordure verte `alpha.light` + barre d'accent 4 px à gauche ;
- verrouillé : texte `border.strong` + icône cadenas, jamais d'opacité globale ;
- focus clavier : `outline: 2px solid var(--df-accent)` ;
- vide : une phrase qui explique et une action, jamais une carte vide.

### 5. Rayons et espacements normalisés
Rayons : 16 px (carte), 12 px (tuile, ligne), `radius.pill` (badge, pastille).
Les 14 px et 10 px disparaissent de l'écran joueur.
Espacements : uniquement les valeurs de `spacing` (4, 6, 8, 10, 12, 14, 16, 20,
24, 32). Fin des `gap: '14px'` et `marginBottom: '20px'` écrits en dur.

## Parcours et éléments à produire
Écran concerné : la branche `onglet === 'dashboard'` de
`src/pages/DashboardJoueur.jsx` (à partir de la ligne 3678), qui sert **les deux
profils**. La branche `onglet === 'accueil'` (`estAffilie`, plan `fan`) est du
code mort et reste intouchée.

### Structure unique, 7 emplacements, identiques pour les deux profils
| # | Emplacement | Joueur affilié | Joueur indépendant Pro |
|---|---|---|---|
| 1 | En-tête carte de joueur | avatar, nom, poste, catégorie, logo du club | avatar, nom, poste, région, badge Pro |
| 2 | À la une (seul bloc N3) | convocation, sinon composition, sinon prochaine séance | dernière analyse vidéo, sinon visibilité recruteurs, sinon publier un clip |
| 3 | Ma semaine (`BandeSemaine`) | séances, match, présence déclarée | masqué s'il n'a aucune échéance |
| 4 | Alertes (`ListeAlertes`) | identique | identique |
| 5 | Ma saison (`JaugeSaison`) | présence, évaluations coach, buts et passes | analyses utilisées, clips publiés, demandes reçues |
| 6 | Actions | barre compacte Jogabonito / Publier + vignette vidéo réelle | idem + Feed |
| 7 | Colonne droite (320 px, ordinateur) | quota d'analyses, abonnement | quota d'analyses, abonnement |

**Règle d'or** : aucun emplacement vide. Si un emplacement n'a pas de contenu pour
le profil, il **disparaît**. On ne met jamais un mur d'upsell à la place d'un
contenu de club : l'aperçu Pro (`ApercuPro`) garde sa place unique, en bas.

### Ce qui change concrètement dans le code
1. **Fondations** : police display chargée, classes CSS communes de l'écran
   joueur (surfaces, lumière, états, display), alignées sur `menuLateral.js`.
2. **En-tête identité** : remplace la carte horizontale actuelle (lignes 3686 à
   3720 environ) par la carte de joueur signature.
3. **À la une** : un seul bloc N3, choisi par ordre de priorité selon le profil.
4. **Actions** : les 3 tuiles jumelles (lignes 3967 à 4000) deviennent une barre
   d'actions compacte plus une vignette vidéo réelle.
5. **Socle joueur** : `Carte` reçoit un niveau (`niveau="discret|standard|relief"`),
   `TitreSection`, `TuileChiffre` et `JaugeSaison` passent à la police display.
6. **Coque commune** : menu latéral (`menuLateral.js`), en-tête haut et tiroir
   mobile harmonisés sur les trois dashboards (joueur, éducateur, club), chacun
   gardant sa couleur d'accent.

## Idées signature [IDÉE]
- **[IDÉE] La carte de joueur comme en-tête.** Numéro de poste en chiffre fantôme
  géant en fond, nom en display, logo du club en médaille sur l'avatar, ligne de
  stats intégrée. Pourquoi : c'est le seul écran qu'un jeune montre à ses copains
  ou à ses parents. Le composant `CarteJoueur` existe déjà mais dort dans un onglet.
- **[IDÉE] Une police display pour les noms et les chiffres.** Pourquoi : un seul
  changement fait basculer tout l'espace du côté « club pro », sur tous les écrans
  à la fois, sans retoucher une seule mise en page.
- **[IDÉE] La lumière de terrain.** Une seule source lumineuse par écran et un
  grain imperceptible. Pourquoi : la profondeur est exactement ce qui manque, et
  ça se fait en CSS pur, sans image et sans coût de chargement.

## Contraintes (plateforme, existant, budget, délai)
- Application en production : React + Vite, Supabase, Stripe. **Aucune**
  modification de base de données, de paiement ou d'email.
- `src/pages/DashboardJoueur.jsx` : 5 710 lignes, les deux variantes dans le même
  fichier, styles inline. On ne touche que la couche visuelle : aucune requête
  Supabase ni `useEffect` de chargement modifié.
- Socle déjà disponible dans `src/components/joueur/` : `Carte`, `TitreSection`,
  `TuileChiffre`, `BandeSemaine`, `JaugeSaison`, `ListeAlertes`, `ApercuPro`,
  `SectionRepliable`, plus les écrans internes déjà refaits. On fait évoluer ces
  composants, on n'en recrée pas.
- Tokens dans `src/tokens.js` (`colors`, `colorsClaire`, `alpha`, `spacing`,
  `fontSize`, `radius`) et `useColors()` pour le thème. Thème clair **et** sombre
  vérifiés sur chaque écran livré.
- Pas d'emoji décoratif (règle permanente). Vert `#4ade80` conservé.
- Une seule police ajoutée, deux poids : pas de troisième famille.
- Sauvegarde datée du fichier avant modification, `npm run build` vérifié, test
  réel sur un compte affilié et un compte Pro avant tout commit.
- Claude n'a pas de navigateur sur ce projet : chaque bloc se termine par une
  validation visuelle de Kevin, téléphone et ordinateur, clair et sombre.

## Décisions prises
- **Ambition** : nouvelle direction artistique « club pro » (police display,
  carte de joueur, lumière de terrain, trois niveaux de surface), et non un simple
  polissage.
- **Périmètre** : l'écran d'accueil des deux profils **plus la coque commune**
  (menu latéral, en-tête haut, tiroir mobile) sur les trois dashboards.
- **Branche** : le travail en cours sur `proto/fff-sync` (menu latéral commun aux
  trois dashboards, `src/lib/menuLateral.js` et les trois fichiers modifiés) est
  **terminé, testé et committé sur `main` en premier**, après validation visuelle
  de Kevin. Le chantier repart ensuite d'une base propre.
- **Références** : direction fixée par Claude, décrite ci-dessus. Pas de recherche
  d'inspirations, pas d'agent de repérage.
- L'écran travaillé est la branche `dashboard`, pour les deux profils à la fois.
  La branche `accueil` / plan `fan` reste morte et n'est pas rouverte.
- Refonte visuelle seulement : aucune nouvelle fonctionnalité, aucune donnée
  nouvelle. Si une donnée manque pour un emplacement, l'emplacement disparaît.

## Questions ouvertes
Aucune. Le plan peut être écrit.

## Hors périmètre
- Dashboards éducateur, coach, club, dirigeant, recruteur, parent : **seule** la
  coque commune (menu, en-tête, tiroir) les concerne, pas leur contenu.
- La barre d'onglets en bas sur mobile : abandonnée au bloc 6 du chantier
  d'octobre, le tiroir coulissant reste la navigation mobile. Ne pas la reproposer.
- La branche `accueil` / plan `fan`, code mort assumé.
- Les onglets internes du joueur (équipe, stats, compétition, santé, nutrition,
  préparation physique et tactique, analyses, profil, équipement) : refaits en
  octobre, ils héritent du nouveau socle sans être redessinés un par un.
- Base de données, tarifs, Stripe, emails.
- Découpage du fichier de 5 710 lignes (refactor technique, chantier séparé).

## Ce que je dois fournir (accès, textes, photos, logos, comptes)
- Un compte joueur **affilié à un club** et un compte joueur **Pro sans
  affiliation**, pour voir les deux variantes en vrai. Les comptes de test ont été
  supprimés : à recréer avant le premier bloc visuel.
- La validation visuelle à chaque fin de bloc : téléphone et ordinateur, thème
  clair et thème sombre.
- Le feu vert explicite avant toute mise en ligne.

## Répartition suggérée pour /plan (à affiner)
0. Finir, tester et committer le menu latéral commun sur `main` + sauvegarde datée.
1. Fondations : police display, classes CSS communes, niveaux de `Carte`.
2. En-tête carte de joueur, les deux profils. **Point de validation décisif.**
3. À la une + Ma semaine.
4. Ma saison + alertes.
5. Actions, vignette vidéo, colonne droite.
6. Coque commune : en-tête haut et tiroir mobile sur les trois dashboards.
7. Thème clair, états vides, build, vérification finale, mise en ligne.
