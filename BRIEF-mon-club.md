# BRIEF : « Mon club », un seul endroit pour personnaliser et composer les dashboards
Date : 2026-11-11 · Statut : brouillon issu d'une discussion, à affiner avec `/brainstorm` (Opus, session neuve) puis `/plan`.

## Objectif
Le club personnalise son profil, choisit les outils de son dashboard et ceux du dashboard de ses éducateurs, depuis un seul endroit, simple, clair, modifiable à tout moment.

## Constat (2026-11-11)
Trois endroits séparés aujourd'hui : « Personnaliser » (couleurs, photo, logo, slogan, dans l'accueil), « Mes outils » (nouveau modèle seulement : outils du club et outils ouverts aux éducateurs), « Droits des éducateurs » (permissions par rôle). Trois logiques, le président ne sait pas où aller.

## Décisions de Kevin
- Tous les clubs ont accès à cet endroit, y compris les 6 clubs à l'ancien modèle.
- **Pour les clubs de l'ancien modèle, rien ne change par défaut** : tous leurs outils restent affichés comme aujourd'hui. Ils ajoutent ou retirent des outils eux-mêmes, seulement s'ils le souhaitent.
- Conséquence : pour ces clubs, l'interrupteur ne règle que l'affichage du menu (aucun verrou d'accès ni facturation, le verrou du bloc 15 ne concerne que le nouveau modèle). Aucune donnée n'est supprimée.

## Direction proposée (à valider au brainstorm)
1. Page « Mon club » en trois étapes : Identité (couleurs, logo, photo, slogan, aperçu en direct) ; Outils du club (cartes avec un interrupteur, rangées par thème, une ligne d'explication par outil) ; Dashboard de mes éducateurs (même grille, avec « Voir comme un éducateur »).
2. Un interrupteur agit tout de suite, avec « Annuler ». Désactiver un outil ne supprime jamais de données.
3. Chaque changement prévient les éducateurs concernés avec la date d'effet (existe déjà pour les retraits).
4. [IDÉE] Modèles de départ (Club compétition, Formation, Minimal) qui pré-règlent tout, puis on ajuste.
5. [IDÉE] Exceptions par éducateur en plus du réglage commun.

## Questions encore ouvertes
1. Les éducateurs sont-ils réglés tous ensemble, par équipe, ou un par un ? (recommandé : tous ensemble, plus des exceptions individuelles)
2. Qui peut modifier : seulement le président, ou aussi d'autres rôles ?
3. Où vivent les « Droits des éducateurs » (permissions par rôle) : fusionnés dans cette page, ou gardés à part ?
4. Un éducateur d'un club à l'ancien modèle suit-il les choix du club, ou garde-t-il son menu complet ?

## À réutiliser
`src/components/outils/MesOutils.jsx`, `catalogueOutils.js`, `outilsAcces.js` (`menuVisible`, `outils_club_ouverts`, `outils_affichage_educateur`), panneau Personnaliser de `DashboardClub.jsx`, `ApercuCouleurClub.jsx`, notifications du bloc 10.
