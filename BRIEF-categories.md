# BRIEF : catégories à plusieurs équipes (effectif commun ou effectifs par équipe)
Date : 2026-11-14 · Plan : PLAN-categories.md

## Idée
Regrouper les équipes d'un club en **catégories** (U15 = U15 A, U15 B, U15 C), avec deux façons d'organiser les joueurs, au choix du club :
- **Effectif commun** : une seule liste de joueurs pour la catégorie ; l'éducateur les convoque à chaque événement en A, en B ou en C.
- **Effectifs par équipe** : chaque joueur appartient à une équipe de la catégorie (fonctionnement actuel).

## Règles impératives (Kevin)
1. Explorer, présenter un plan, attendre l'accord avant toute modification.
2. **Aucun commit, push ni déploiement sans accord explicite** (plus strict que la règle habituelle de fin de bloc).
3. Ne pas toucher aux données de production. Toute migration (tables, colonnes, RLS, reprise) est présentée en script SQL et appliquée seulement après accord. Tester par simulation annulée (pas de base locale : Docker absent).
4. Reprise sans perte : chaque équipe actuelle est rattachée à une catégorie en mode « effectifs par équipe ». Règle de rattachement et cas ambigus présentés avant application.
5. Ne rien casser : `/dashboard-joueur`, `/educateur`, `/club`, convocations, sondage de présence, statistiques, évaluations.
6. Respecter le design actuel (thème, couleurs du club). Les maquettes décrivent la structure, pas les couleurs.
7. Petites étapes, et dire à chaque étape quoi regarder sur localhost.

## Écrans et comportements attendus
### 1. Création d'une catégorie
Écran « Créer la catégorie U15 », fil d'Ariane « Catégories / Nouvelle catégorie », question « Comment veux-tu organiser tes joueurs ? ». Deux cartes côte à côte, **sans présélection** :
- **Effectif commun** : « Une liste U15 pour convoquer en A, en B ou en C. » Petit schéma : « 35 joueurs U15 » qui se répartit vers Équipe A, B, C.
- **Effectifs par équipe** : « Ajoute les joueurs directement dans chaque équipe. » Liste des équipes avec leur nombre de joueurs et bouton « + Ajouter une équipe ».

Sous les cartes : « Les joueurs indiquent leur présence à chaque entraînement. » Bouton « Créer la catégorie » désactivé tant qu'aucun mode n'est choisi, avec un message d'aide.

### 2. Changer de mode (réglages de la catégorie)
- Commun → par équipe : répartir chaque joueur dans une équipe ; répartition proposée selon ses convocations les plus fréquentes, corrigeable ; aucun joueur sans équipe.
- Par équipe → commun : les listes sont fusionnées en une liste de catégorie.
- Dans les deux sens, l'historique reste rattaché à l'équipe où il a eu lieu (convocations, présences, minutes, buts).
- Confirmation claire qui résume l'effet avant d'appliquer.

### 3. Convocations en effectif commun
Écran « Convocations U15 », fil d'Ariane « Catégories / U15 / Convocations », sous-titre « Effectif commun · 35 joueurs », date (« Samedi 21 novembre »).
- Champ « Rechercher un joueur ».
- Tableau : une ligne par joueur, une colonne par équipe (nom, jour et heure, nombre de convoqués en direct), une case par joueur et par équipe.
- Pagination ou défilement (« 1–6 sur 35 joueurs »).
- Un bouton d'envoi par équipe (« Envoyer · U15 A ») : crée les convocations et notifie seulement les joueurs concernés, comme aujourd'hui.
- Conflit : joueur coché dans deux équipes qui jouent le même jour → avertir (« Déjà convoqué en U15 A samedi 14 h »), ne pas bloquer, demander confirmation.
- À côté du nom : a répondu absent / n'a pas répondu au sondage de cette date.

### 4. Convocations en effectifs par équipe
Inchangées, plus le **renfort** : convoquer ponctuellement un joueur d'une autre équipe de la catégorie. Il reste rattaché à son équipe d'origine ; convocation, présence et statistiques de ce match comptent pour l'équipe où il a joué. Mention discrète « renfort U15 B ».

### 5. Sondage de présence
- Effectif commun : le joueur répond **à l'événement** (« Je suis là samedi 21 »), puis l'éducateur le répartit.
- Effectifs par équipe : inchangé.
- La convocation actuelle (« Tu es convoqué ! … Présent / Absent ») marche dans les deux modes et affiche l'équipe.

### 6. Fiche joueur
Fil d'Ariane « U15 / Joueurs / Lucas Moreau », pastille : équipe principale (par équipe) ou catégorie (commun).
- Statistiques de la saison : Entraînements (présences par équipe + colonne « Total U15 » mise en valeur) ; Matchs (matchs joués, minutes, buts, par équipe et total).
- Totaux calculés depuis chaque match et entraînement, jamais de double comptage.
- Dernières activités avec l'équipe (« Entraînement · U15 A, Présent », « Match · U15 B, 60 min jouées »).

### 7. Droits (proposition de Kevin, validée avec précisions)
- Directeur et club voient toute la catégorie.
- Commun : tous les éducateurs de la catégorie voient tous les joueurs et convoquent dans leur équipe.
- Par équipe : un éducateur voit son équipe, et consulte un joueur d'une autre équipe uniquement pour le convoquer en renfort.
- Évaluations détaillées : visibles par leur auteur et par le club, comme aujourd'hui.
- RLS stricte : un club ne voit jamais les données d'un autre club.

### 9. Vérifications demandées
Club existant inchangé ; une catégorie créée dans chaque mode ; convocation, sondage avec un compte joueur de test, saisie d'un match, fiche joueur et totaux ; passage d'un mode à l'autre sans perte ; conflit le même jour et renfort ; droits avec éducateur A, éducateur B, directeur, et deux clubs ; ordinateur, tablette, téléphone (tableau de convocation utilisable sur téléphone) ; console sans erreur, build sans erreur ; liste finale des fichiers modifiés, des SQL préparés (non appliqués) et de quoi regarder sur localhost, sans committer.

## Décisions (2026-11-14)
1. **Entraînements en effectif commun** : chaque entraînement reste rattaché à une équipe (A, B ou C) ; tous les joueurs de la catégorie le voient et répondent au sondage. Les statistiques restent par équipe, sans colonne « catégorie ».
2. **Créer une catégorie et changer de mode** : le compte principal du club uniquement (pas le staff, pas les éducateurs).
3. **Joueurs sans compte** (fiches ajoutées à la main) : restent dans les listes, ne reçoivent ni sondage ni convocation, comme aujourd'hui.
4. **Pas de colonne saison** sur la catégorie (hypothèse proposée par Claude, à confirmer par Kevin) : une catégorie existe une fois pour toutes, comme les équipes aujourd'hui ; les saisons se calculent par les dates (`src/lib/saison.js`).
5. **Droits** : en commun, l'éducateur A voit les colonnes B et C (pour les conflits) mais n'envoie que pour son équipe ; le club envoie pour toutes. Renfort : recherche limitée (prénom, nom, poste, numéro, équipe), pas la fiche complète. « Directeur » = membres du staff ayant la catégorie dans `role_categories_access`.
6. **Pas de fusion physique des fiches** au passage en commun : un joueur présent dans deux équipes s'affiche une fois (regroupé par compte) ; les doublons possibles sans compte sont signalés.
7. **Forfait** : il compte toujours des équipes (cf. chantier places = équipes) ; ajouter une équipe à une catégorie passe par la même limite.

## Ce que l'exploration a montré (2026-11-14)
- `club_categories` est la table des **équipes** : une ligne = « U15 A », champs séparés `nom` (U15) et `equipe` (A), `educateur_id` (un seul coach), `couleur`. Créée hors du dépôt.
- `equipe_joueurs` = fiches joueurs, possédées par un éducateur (`educateur_id`) et rattachées à une équipe (`club_categorie_id`) ; `joueur_id` relie au compte (vide pour une fiche manuelle). Un joueur suivi dans deux équipes a deux fiches.
- `matchs_equipe` et `entrainements` ont déjà `club_categorie_id` : l'historique est déjà rattaché à l'équipe de l'événement.
- `presences_entrainement.joueur_id` = id de fiche (`equipe_joueurs.id`) ; `convocation_joueurs.joueur_id`, `convocation_reponses.joueur_id` et `disponibilites.joueur_id` = id de compte (`profiles.id`).
- Une convocation = un match (`convocations.match_id` unique), possédée par l'éducateur (`educateur_id = auth.uid()`).
- Le sondage de présence = `disponibilites` (par `seance_id` ou `match_id`).
- Les règles d'accès de `club_categories`, `equipe_joueurs`, `matchs_equipe`, `entrainements`, `presences_entrainement`, `stats_match` ne sont pas dans le dépôt : lues au bloc 0 par `supabase_categories_diagnostic.sql`.
- `club_categories` a déjà un déclencheur de verrouillage (chantier saisons, bloc 8) : un coach ne s'attribue pas une équipe seul.
