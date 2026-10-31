# BRIEF : historique des saisons et passage à la saison suivante
Date : 2026-10-31 · Statut : prêt pour /plan
Fichier séparé de BRIEF.md (chantier espace joueur en cours, à ne pas écraser).

## Vision en 3 lignes
Chaque saison devient une page qu'on peut rouvrir : le coach, le joueur et le club retrouvent les chiffres d'une saison passée sans qu'ils se mélangent avec la saison en cours.
La clôture de saison ne casse rien : elle fige le passé, puis le club valide qui reste, qui encadre quelle équipe.
Le joueur voit sa saison actuelle au premier plan et ses anciennes saisons rangées dans « Mes saisons ».

## Ce qui existe déjà (vérifié dans le code le 2026-10-31)
- **Stats équipe** (`src/components/StatsEquipe.jsx` + onglet Stats du dashboard éducateur) calcule déjà : buts par quart d'heure, nature des buts (champ `matchs_equipe.buts_detail`), résultats, classements buteurs/passeurs/présence/note, cartons, présence entraînement, notes de séance RPE.
- **Clôture de saison éducateur** (`src/components/prepphysique/GestionCloturesSaison.jsx`) :
  - fiche de fin de saison par joueur, enregistrée dans la table `historique_saisons` (sans danger, modifiable) ;
  - bouton « Clôturer la saison » : passe toutes les affiliations actives de l'équipe en `archive` **et** détache le coach de sa catégorie (`club_categories.educateur_id = null`). Irréversible côté interface.
- **Historique joueur** : `src/components/saisons/HistoriqueSaisons.jsx`, déjà affiché dans le dashboard joueur (lecture seule des saisons clôturées).
- **Saison** : `src/lib/saison.js` (`saisonActuelle()`, `bornesSaison()`), saison = juillet → juin.
- **Rôles club** : président, directeur sportif, responsable formation, préformation, école de foot existent déjà (`ROLES_STAFF`, `DashboardClub.jsx`), avec un périmètre de catégories par rôle déjà réglable (`ACCES_CATEGORIES_DEFAUT` : école de foot U7 à U10, préformation U11 à U14, formation U15 à Seniors).

## Ce qui manque
1. **Aucun découpage par saison** sur plusieurs données : les matchs sont filtrés sur la saison en cours, mais les notes de séance RPE s'empilent toutes saisons confondues, et il n'existe aucun moyen de rouvrir une saison passée.
2. **Pas de validation club** : aujourd'hui un coach se déclare seul responsable d'une catégorie (`declarerMaCategorie`), sans accord du club.
3. **Pas d'historique côté club** (Projet sportif, Stats équipe, Éducateurs).
4. **Pas d'historique des saisons du coach** dans son profil.
5. **Côté joueur** : pas de libellé de saison, pas de message de fin de saison, pas de confirmation de reconduction.

## Principe technique retenu
Les chiffres d'une saison passée se **recalculent à partir des données datées déjà en base** (matchs, séances, présences, notes RPE, santé), filtrées sur les dates de la saison et l'équipe. On **ne recopie pas** les données dans une archive : moins de SQL, rien à resynchroniser, et les écrans existants de Stats équipe sont réutilisés tels quels avec un sélecteur de saison.
Seule la fiche de fin de saison par joueur (`historique_saisons`) reste une photo figée, comme aujourd'hui.

## Demande détaillée de Kevin

### Dashboard éducateur
- Nouvel onglet **Historique**, placé après Santé, avec deux accès :
  - **Collectif** : effectif, classement, présence entraînement, % victoires/nuls/défaites, résultats des matchs, buts marqués et encaissés par match, buts marqués et pris par quart d'heure, nature des buts marqués et pris, cartons, classements buteurs/passeurs/présence/victoires/temps de jeu/note, résumé santé.
  - **Individuel** : fiche d'évaluation, buts, passes décisives, clean sheets (gardiens seulement), cartons jaunes et rouges, minutes jouées, % de victoire, note de saison, tests physiques, récapitulatif santé.
- Après « Clôturer la saison », la rubrique **Mon équipe** pose deux questions, chacune validée par le club avant d'accéder aux nouvelles données :
  - « Restes-tu affilié à [club] ? » (oui → demande de validation club)
  - « De quelle catégorie es-tu responsable ? » (→ demande de validation club)
- **Mon profil** : historique des saisons du coach (% victoires/nuls/défaites, buts marqués et pris par match, % nature des buts, classements des compétitions, résumé des blessures, % présence entraînement, retour global RPE).
- Ne pas confondre avec l'historique de « Mon équipe » de son nouveau groupe.

### Dashboard joueur (starter et Pro)
- **Mon équipe** : garder quasiment la même interface (mes éducateurs), ajouter le libellé « Saison 2026 - 2027 », garder le bouton « Mes stats » qui ouvre la fiche.
- Saisons passées rangées dans une sous-rubrique **Historique**, saison actuelle au premier plan.
- Le joueur est **reconduit** quand le prochain éducateur l'intègre à son effectif ; il reçoit alors un message de confirmation.
- Avant ça, message : « Tu as terminé ta saison avec [nom du coach]. Dans l'attente de ton nouvel éducateur, tu peux renouveler ta licence avant le 15 juillet et retrouver ta saison 2025 - 2026 dans « Mes saisons ». »

### Dashboard club
- Bouton **Clôturer une saison** en bas : n'agit que sur le sportif, jamais sur l'administratif.
- Bouton **Historique saison** avec choix de la saison (2025 - 2026, 2026 - 2027…) qui affiche les données de cette saison.
- Bouton Historique aussi sur **Projet sportif** (voir les évolutions d'une saison à l'autre), **Stats équipe**, **Éducateurs** (se rappeler des éducateurs et de leur effectif).
- Page Éducateurs : les nouvelles demandes d'affiliation et de responsabilité d'équipe y remontent, le club n'a qu'à valider.
- **Qui valide** : responsable formation (équipes de la formation), responsable préformation (préformation), responsable école de foot (école de foot), directeur sportif et président (toutes les équipes). Personne d'autre, y compris la secrétaire, qui a pourtant aujourd'hui un accès complet aux catégories par défaut.
- **Planifier séance** : possibilité de repartir à zéro en début de saison.
- **Stages et tournois** : on ne touche à rien.

## Risques
- **Base de production** : le site en local parle à la vraie base Supabase. Tout bloc qui modifie la base passe par la sauvegarde manuelle (`~/Sauvegardes-DigitalFootball/sauvegarder.sh`) avant exécution, SQL relu et lancé par Kevin.
- **Validation club** : il faudra empêcher en base qu'un coach se rattache seul à une catégorie (règles d'accès RLS sur `club_categories` et une table de demandes). C'est le seul vrai morceau sensible du chantier.
- **Remise à zéro de Planifier séance** : supprimer les séances passées effacerait aussi la présence entraînement de l'historique. Voir question 2.

## Découpage proposé (à affiner par /plan)
1. Socle saison : sélecteur réutilisable + filtrage par dates des données existantes. Aucune modification de base.
2. Éducateur, onglet Historique collectif (réutilise Stats équipe, Compétition, Santé filtrés par saison).
3. Éducateur, historique individuel par joueur.
4. Éducateur, historique de ses saisons dans Mon profil, dont le RPE global.
5. Base : table des demandes (affiliation club + catégorie), règles d'accès, droits de validation par rôle. Sauvegarde avant.
6. Éducateur : les deux questions dans Mon équipe après clôture.
7. Club : demandes à valider sur la page Éducateurs, selon le rôle.
8. Club : boutons Historique (saison, Projet sportif, Stats équipe, Éducateurs).
9. Club : bouton Clôturer une saison (selon question 1).
10. Joueur : libellé de saison, sous-rubrique Historique, message de fin de saison, confirmation de reconduction.
11. Planifier séance : remise à zéro (selon question 2).

Les blocs 1 à 4 sont sans risque (lecture seule) et donnent déjà à voir le rendu. Le circuit de validation (5 à 7) est le cœur sensible.

## Décisions (prises par Kevin le 2026-10-31)
1. **Clôture club** : le bouton club ouvre la nouvelle saison et montre quelles équipes ont clôturé. Il n'archive rien lui-même : chaque coach clôture sa propre équipe.
2. **Planifier séance** : « repartir à zéro » **masque** les séances des saisons passées. Rien n'est supprimé, la présence entraînement reste dans l'historique.
3. **Licence** : date limite fixe, **15 juillet pour tous les clubs**. Aucune colonne en base.
