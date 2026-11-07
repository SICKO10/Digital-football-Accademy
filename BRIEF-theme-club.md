# BRIEF : Thème « couleurs du club » + refonte de l'accueil éducateur
Date : 2026-11-07 · À transformer en PLAN-theme-club.md avec `/plan` (Opus, session neuve)

## Objectif
L'interface prend les couleurs du club. Un thème par défaut existe pour les clubs qui n'ont rien choisi. Quand un club personnalise ses couleurs, cela change directement les dashboards de **tous ses joueurs et éducateurs affiliés**. L'accueil de l'espace éducateur est refait.

## Décisions de Kevin (2026-11-07)
1. **Thème par défaut** : clair, accent vert Digital Football. Le bouton soleil/lune garde le sombre disponible. Un club qui personnalise ses couleurs remplace l'accent vert, partout, pour ses joueurs et éducateurs affiliés.
2. **Le bleu de l'éducateur disparaît** au profit de la couleur du club (compte relié à l'AS Cannes : passage en rouge). Les statuts restent fixes et ne suivent jamais la couleur du club : vert = positif (victoire, présent, OUVERT), orange/jaune = alerte, rouge d'erreur = erreur/défaite/suppression.
3. **Périmètre** : les 3 dashboards (joueur, éducateur, club) passent en couleurs du club.
4. **Menu** : plein couleur du club (fond couleur du club, logo rond blanc à gauche de « Digital Football », entrée active en bloc blanc). Il remplace le menu sobre fait le 2026-11-06 (non commité : [menuLateral.js](src/lib/menuLateral.js) et les 3 dashboards), qui sert de base technique et sera dépassé.

## Constats techniques (exploration du 2026-11-07)
- Les couleurs existent déjà en base : `profiles.couleur_principale` et `couleur_secondaire` (supabase_profiles_theme_club.sql), réglées par le club dans DashboardClub. **Aucune migration prévue.** Ne pas coder `#B8141F` en dur : AS Cannes prend la couleur qu'il a enregistrée.
- Éducateur : lit déjà `couleur_principale` via `profiles_public` (chargerClubAffiliation, DashboardEducateur ~2121). Joueur : lit déjà `profiles_public` du club (club, avatar_url, ~1048) : il faut ajouter `couleur_principale`. La vue publique expose déjà ce champ.
- Thème clair/sombre existant : `src/lib/theme.js` (`useColors`), `src/tokens.js` (`colors`, `colorsClaire`, palette froide gris-bleu partagée par 5 dashboards), bouton `ThemeToggleButton` (ThemeProvider.jsx).
- L'app est en styles intégrés (`style={{...}}`) : plus de 1 285 usages de `colors.*` dans DashboardEducateur seul. Pas de réécriture globale en variables CSS : on pose des variables CSS à la racine de chaque dashboard et on les utilise dans le menu et l'accueil ; le reste suit via `useColors` (palette + accent du club).
- L'accueil éducateur est le composant `AccueilEducateur` (DashboardEducateur.jsx ~1143 à 1777) : podium, bilan V/N/D, briefing, planning, déplacement, alertes existent déjà. Surtout un remaniement de présentation.
- Le menu éducateur a un mode tablette (icônes seules) et un mode mobile (tiroir) à préserver.

## Système de thème (cible)
- Variables CSS : `--club-primary`, `--club-primary-dark`, `--club-primary-soft`, `--menu-bg`, `--menu-text`, `--screen-bg`, `--card-bg`, `--card-border`, `--text`, `--text-muted`, `--success`, `--warning`.
- Palette claire : écran `#F5F5F7`, cartes `#FFFFFF`, bordure `#E7E7EB`, rayon 12 px, texte `#16161A`, texte secondaire `#7A7A85`. Défaut du club : accent vert Digital Football `#4ADE80` ; vert de statut positif `#16A34A`.
- Palette sombre (existante) : menu `#07130D`, écran `#121417`, cartes `#1A1D21`, accent `#4ADE80`.
- Dérivés de la couleur du club : `-dark` (survol, texte sur fond clair), `-soft` (fonds légers, ex. rouge `#FBE9EA`).
- **Garde-fou de contraste** : couleur trop sombre ou trop claire pour rester lisible avec du texte blanc ou sur le fond : ajustée automatiquement (éclaircie ou assombrie), sinon retour à la palette par défaut.
- Un seul calcul de palette, partagé par les 3 dashboards (fichier dans src/lib).
- Les thèmes clairs des dashboards parent et dirigeant ne doivent pas changer.

## Menu (plein couleur du club)
- Fond : couleur principale du club ; texte blanc légèrement atténué ; titres de section plus clairs.
- Logo du club en rond blanc à gauche du texte « Digital Football ».
- Entrée active : bloc blanc plein, texte et icône en couleur du club. Survol : blanc à ~12 %. Pastilles : fond blanc, chiffre en couleur du club.
- Éducateur : sélecteur d'équipes (active en pastille blanche, autres en contour blanc), « Vue Club » en contour blanc.
- Mêmes règles sur joueur et club, en gardant leurs entrées, leur ordre et leur logique actuels. Tablette : icônes seules, entrée active lisible.

## Accueil éducateur (de haut en bas)
1. En-tête : date du jour en petit, « Bonjour {prénom} », un seul bouton principal « + Nouvelle séance » en couleur du club.
2. Chiffres clés, 4 cartes de même taille sur une ligne : Effectif ; Bilan (pourcentage de victoires + barre victoires vert / nuls orange / défaites couleur du club, à la place de l'anneau) ; Présence (pourcentage en vert) ; Match du week-end (carte pleine couleur du club, texte blanc : date, heure, adversaire, domicile/extérieur).
3. Prochaine séance : carte blanche, trait de 4 px couleur du club à gauche, date en grand (jour en couleur du club), titre et heure, présents (vert) / absents (couleur du club) / en attente sur une ligne. Boutons : « Fiche séance » plein couleur du club ; « Joueurs présents » contour gris.
4. Briefing / alerte de la semaine : bandeau orangé clair (`#FFF4E5`, texte `#7A4A06`), icône d'alerte, lien « Voir ».
5. Planning de la semaine, 7 colonnes : séances en `-soft` / texte `-dark` ; séance du jour et match du week-end en couleur du club pleine.
6. Déplacement : icône de bus sur fond `-soft`, adversaire, date et heure de départ, pastille « J-2 », bouton « Remplir la fiche » en contour couleur du club.
7. Classement du mois : vrai podium, 1er au centre (avatar plus grand bordé couleur du club, marche haute pleine couleur du club), 2e à gauche et 3e à droite en marches grises plus basses ; rappel du mois précédent sur une seule ligne discrète.
8. Actions rapides : 4 boutons blancs de même largeur, icônes couleur du club ; l'action « à préparer » surlignée (fond `-soft`, contour couleur du club).
9. Alertes : une seule carte en liste compacte, une ligne par joueur avec deux petits cartons jaunes dessinés, nom, « prochain jaune = suspension », coche « vu ». Remplace les trois cartes tronquées.
10. Partenaire officiel : bandeau sobre, blanc, bordure fine.
- À vérifier au moment du bloc : présence en pourcentage et compteurs présents / absents / en attente sont-ils déjà calculés ? Sinon le dire, ne rien inventer.

## Contraintes
- Aucune modification de la base de production ni de ses données ; aucune migration sans l'accord explicite de Kevin.
- Aucun commit, push ni déploiement sans « ok » de Kevin.
- Ne rien casser : joueur, éducateur et club doivent continuer à fonctionner à chaque étape ; thème sombre toujours disponible.
- Aucun texte « à compléter » ni bouton sans effet.

## Vérifications attendues
- Bureau et tablette (menu à icônes seules, entrée active lisible).
- Thème sombre via le bouton soleil/lune.
- Club sans couleurs : palette par défaut verte. Club avec couleurs (AS Cannes) : un compte joueur affilié et un compte éducateur affilié voient les mêmes couleurs.
- Couleurs de club extrêmes (très claire, très sombre) : garde-fou de contraste.
- Aucune erreur dans la console, build sans erreur, comptes d'erreurs du lint inchangés.
- Fin de chaque bloc : fichiers modifiés et quoi regarder sur http://localhost:5173.

## Points ouverts
- Le menu sobre du 2026-11-06 n'est pas commité : à décider au bloc 1 (le remplacer proprement, sans l'avoir commité).
- Si le club change de couleur pendant qu'un joueur est connecté : rafraîchissement au prochain chargement (suffisant ?).
