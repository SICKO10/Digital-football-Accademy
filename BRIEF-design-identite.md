# BRIEF : Identité visuelle « Maison de club » (dashboards club et éducateur)
Date : 2026-11-15 · À transformer en PLAN-design-identite.md avec `/plan` (Opus, session neuve). Décisions validées par Kevin le 2026-11-15 (voir bas de fichier).

## Objectif
Que le site ne ressemble plus à un produit généré par IA et ait une identité reconnaissable entre mille. Le chantier « thème couleurs du club » (PLAN-theme-club.md, blocs 0 à 10 faits) a réglé les couleurs : on construit dessus, on ne le défait pas. Ici on change le **langage visuel** : typographie, icônes, formes, rythme, détails signature.

## Pourquoi ça fait « IA » aujourd'hui (constats du 2026-11-15)
1. **Inter partout** : 184 `fontFamily: 'Inter'` en ligne rien que dans DashboardClub + DashboardEducateur, plus l'héritage global. Inter est la police par défaut de tous les designs générés par IA.
2. **Emojis comme icônes** : ✅ ⚽ 🏆 👥 🧤 🏟 📣 📝 dans les titres et boutons. Deuxième signature IA la plus reconnaissable.
3. **Cartes toutes identiques** : mêmes coins très arrondis, même ombre, même remplissage, aucune hiérarchie visuelle entre une carte de chiffre et une carte de contenu.
4. **Aucun élément propre au football** : enlève le texte et ça pourrait être un outil de comptabilité.
5. Palette pastel standard (ambre `#f59e0b`, bleu `#60a5fa`, violet `#a78bfa`) encore présente par endroits en dur.

## Direction retenue : « Maison de club »
L'idée : l'interface emprunte ses codes au monde réel du club amateur : la feuille de match, le tableau d'affichage, le classement, le numéro de maillot. Sobre au quotidien, football dans les détails. Elle doit rester belle quelle que soit la couleur du club (rouge AS Cannes, bleu, jaune...), donc l'identité repose sur les formes et la typographie, jamais sur une teinte fixe.

### 1. Typographie (le plus gros levier)
- **Titres, chiffres, scores : Barlow Condensed** (600/700). L'esprit numéro de maillot et tableau d'affichage. Un effectif « 23 », un bilan « 68 % » s'affichent grand (36 à 44 px), condensés, avec `font-variant-numeric: tabular-nums`.
- **Texte courant : Barlow** (400/500/600). Même famille, cohérence totale, excellent rendu des accents français.
- Google Fonts comme aujourd'hui (remplacement d'Inter dans index.html). Inter disparaît des deux dashboards.
- Étiquettes de sections en petites capitales espacées (`letter-spacing: 0.08em`, 11-12 px), comme les rubriques d'une feuille de match.

### 2. Icônes : fin des emojis
- Jeu d'icônes au trait unique et cohérent : **lucide-react** (gratuit, léger, utilisé à l'unité). Taille unique 18/20 px, épaisseur de trait constante.
- Tous les emojis fonctionnels (titres, boutons, menus, cartes) des deux dashboards sont remplacés. Les emojis dans du **contenu** (messages écrits par les utilisateurs) ne sont pas touchés.

### 3. Formes signature
- **Coins 6 px** au lieu des grosses pastilles arrondies : plus net, plus pro, moins « IA ».
- **Liseré d'écusson** : les cartes importantes portent une barre verticale de 3 px couleur du club sur leur bord gauche (déjà amorcé sur la carte séance de l'accueil éducateur : on le généralise comme signature).
- **Séparateurs « ligne de craie »** : trait fin blanc/gris à faible opacité, comme le traçage d'un terrain, à la place des bordures de boîtes systématiques.
- **Pastilles V/N/D de classement** : carrés 22 px à coins 4 px, lettre en Barlow Condensed, comme les classements de la FFF. Deviennent le composant standard pour victoire/nul/défaite partout.
- **Jauges type possession** : barres fines à deux segments pour tous les ratios (présence, V/N/D, budget), remplaçant les barres arrondies génériques.

### 4. Hiérarchie et rythme
- Une carte de chiffre = **un chiffre héros** en condensed + une étiquette en petites capitales, rien d'autre. Les cartes de contenu (listes, tableaux) sont visuellement distinctes (fond, densité).
- Tableaux plus denses, type classement : lignes fines, chiffres alignés à droite en tabular-nums, en-têtes en petites capitales.
- En-têtes d'écran : titre en Barlow Condensed + sous-ligne de contexte, au lieu des gros titres ronds actuels.

### Ce qui ne change pas
- Les **couleurs du club** et tout le moteur `paletteClub` / `useColors` / `clubTheme` : l'identité s'exprime par-dessus.
- Les **statuts fixes** (vert succès, orange alerte, rouge erreur, bleu info).
- Thème clair par défaut + sombre disponible.
- La **structure des pages**, le menu, les fonctionnalités : zéro changement de comportement, zéro requête nouvelle.
- Les gabarits d'impression (fiche BEF, PDF) : exclus du chantier.

## Périmètre
- **Socle global** (police, icônes, jetons de forme dans tokens.js) : touche mécaniquement toute l'app, y compris joueur. Assumé : la cohérence vaut mieux qu'un site à deux polices.
- **Passes écran par écran** : dashboards club et éducateur seulement (la demande de Kevin). Le dashboard joueur suivra dans un chantier séparé si validé.

## Méthode imposée au plan
1. **Bloc 0 : socle + écran témoin.** Polices chargées, lucide-react installé, jetons de forme (rayons, liseré, pastilles V/N/D, jauge) dans tokens.js, puis UN écran témoin entièrement passé à la nouvelle identité : l'accueil du dashboard club. Kevin valide à l'écran avant tout le reste. Rien d'autre ne bouge tant que le témoin n'est pas validé.
2. Ensuite une passe par onglet/écran, dans l'ordre d'usage réel (club : accueil, Mon club, catégories, finance... ; éducateur : accueil, Mon équipe, séances, matchs...). Un bloc = un ou deux écrans, jamais plus.
3. Sauvegarde datée avant chaque bloc (styles en ligne = fichiers géants, retour arrière facile obligatoire), build + tests à chaque bloc, aucun commit sans validation de Kevin.
4. Prérequis bloc 0 : régler le sort des modifications non commitées actuelles de DashboardEducateur.jsx et scan-feuille-match (autre chantier en cours).

## Coût et risques
- Volume : ~2 900 styles en ligne sur les deux fichiers. Prévoir 12 à 16 blocs courts, Sonnet, effort high sur les écrans denses.
- Risque principal : casser un écran en remplaçant un style en ligne. Parade : témoin validé d'abord, un écran à la fois, sauvegardes datées, et jamais de recherche-remplacement aveugle sur tout un fichier.
- Les emojis sont parfois dans des chaînes utilisées ailleurs (notifications, exports) : chaque remplacement se vérifie dans son contexte.

## Décisions validées par Kevin (2026-11-15)
1. **Police** : Barlow + Barlow Condensed dans toute l'application (Inter disparaît partout, dashboard joueur compris).
2. **Emojis** : tous les emojis d'interface des deux dashboards remplacés par des icônes au trait (lucide-react). Les emojis écrits par les utilisateurs dans leurs contenus ne sont pas touchés.
3. **Écran témoin** : l'accueil du dashboard club. Rien d'autre ne bouge tant que Kevin ne l'a pas validé à l'écran.
