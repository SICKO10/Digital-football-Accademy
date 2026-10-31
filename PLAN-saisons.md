# PLAN : historique des saisons et passage à la saison suivante
Date : 2026-10-31 · Brief : BRIEF-saisons.md
Fichier séparé de `PLAN.md` (chantier espace joueur, encore en attente de publication).

Objectif : chaque saison devient une page qu'on rouvre (coach, joueur, club) sans mélange avec la saison en cours, et le passage à la saison suivante passe par une validation du club.
Principe : les chiffres passés se recalculent depuis les données datées déjà en base ; seule la fiche de fin de saison (`historique_saisons`) reste une photo figée.

## Décisions de cadrage
Prises par Kevin le 2026-10-31 (brief) :
1. Le bouton club « Clôturer une saison » n'archive rien : chaque coach clôture sa propre équipe.
2. « Repartir à zéro » dans Planifier séance **masque** les séances passées, rien n'est supprimé.
3. Licence : date limite fixe, 15 juillet pour tous les clubs, aucune colonne en base.

Prises par Kevin le 2026-10-31 (/plan) :
4. **Bascule de saison par la date** : la saison change seule le 1er juillet (`saisonActuelle()`). Le bouton club affiche le bilan (équipes clôturées ou non) et marque la saison close pour ce club.
5. **Validation club pour toute auto-déclaration** : tout coach qui se déclare seul sur une catégorie (après clôture ou à son arrivée) passe par une demande. Les coachs déjà en place gardent leur équipe. Un coach invité par le club reste accepté directement.
6. **Messages au joueur dans l'appli seulement** : encadré sur le tableau de bord et notification plateforme. Aucun email.

Constat de Kevin le 2026-10-31 (après /plan) : **la plateforme a été créée en juin 2026, il n'existe aucune donnée de saison 2025-2026.** La saison en cours est 2026 - 2027 (depuis le 1er juillet 2026) et la première saison à rouvrir sera 2026 - 2027, à partir de juillet 2027. Conséquences :
7. **Les écrans d'historique se testent sur la saison en cours.** Le sélecteur propose toutes les saisons qui contiennent des données, y compris la saison en cours (étiquetée « en cours »). Les chiffres sont donc vérifiables dès maintenant avec les vraies données depuis juillet 2026.
8. **Pas de fausses données dans la base de production.** Le calcul d'une saison (bornes de dates, filtrage, agrégats) est écrit en fonctions pures, testées par des tests automatiques sur des données fictives en mémoire (`npm test`, aucun contact avec la base) : une saison passée simulée est ainsi vérifiée sans rien insérer.
9. **Avant juillet 2027, l'historique passé est vide pour tout le monde.** Les écrans affichent un état vide soigné : « Ta première saison archivée apparaîtra en juillet 2027 ». Les données de juin 2026 (avant la bascule) ne forment pas une vraie saison : la saison 2025 - 2026 n'est listée que si elle contient des données réelles, et l'Inventaire (bloc 0) dit si c'est le cas.
10. **Pas d'urgence côté calendrier.** Il reste environ 8 mois avant la première vraie clôture (juin 2027). Priorité de livraison : le circuit de validation (blocs 5 à 8) et la clôture doivent être en ligne et rodés avant fin mai 2027 ; les écrans d'historique ont ensuite le temps d'être affinés avec de vraies données.

Hypothèse à corriger si besoin : le **compte principal du club** peut valider comme le président (sinon un club sans staff déclaré ne pourrait rien valider).

## Règles techniques pour tous les blocs
- `DashboardEducateur.jsx` (13 200 lignes), `DashboardClub.jsx` (7 500) et `DashboardJoueur.jsx` (5 700) sont énormes : **ne jamais les lire en entier**. Chercher l'endroit précis (grep), y brancher le minimum, et écrire le nouveau code dans des composants séparés, rangés dans `src/components/saisons/`.
- Socle visuel joueur : réutiliser `src/components/joueur/` (`Carte`, `TitreSection`, `TuileChiffre`…), couleurs via `useColors()`, zéro couleur en dur, zéro emoji.
- Toute requête sur une saison passe par les fonctions de `src/lib/saison.js` (bornes juillet → juin), jamais de dates écrites à la main.
- Base de production : chaque SQL est relu, la sauvegarde `~/Sauvegardes-DigitalFootball/sauvegarder.sh` est lancée par Kevin **avant**, et le SQL est exécuté par Kevin. Le fichier de retour arrière est fourni à part, jamais dans le même message que le SQL à lancer.
- Push = mise en production. Rien n'est poussé sans le « ok » de Kevin. **Les blocs 6 et 7 se poussent ensemble** (sinon les coachs enverraient des demandes que personne ne pourrait valider).

## Ce que je dois fournir
| Élément | Pourquoi | Où le trouver | Nécessaire avant |
|---|---|---|---|
| Un compte éducateur qui a des matchs, séances et notes RPE depuis juillet 2026 | Vérifier que l'historique affiche de vrais chiffres (saison 2026 - 2027, en cours) | Ton compte de test ou un coach réel (lecture seule) | bloc 2 |
| Un compte club avec un rôle président ou directeur sportif, et si possible un responsable formation | Tester qui peut valider et qui ne peut pas | Ton compte club | bloc 7 |
| Un deuxième compte éducateur de test, affilié au même club | Jouer le coach qui demande une catégorie | À créer toi-même | bloc 6 |
| Un compte joueur de test affilié à une équipe de test dont le coach de test clôture (la clôture marche à toute date) | Voir le message de fin de saison et la reconduction | Comptes de test, jamais une vraie équipe | bloc 11 |
| Le chantier espace joueur (`PLAN.md`) publié ou abandonné | Éviter de mélanger deux chantiers sur le dashboard joueur | Ton « ok » sur la publication en attente | bloc 11 |

## Manipulations à faire moi-même
1. **Avant le bloc 5** : lancer `~/Sauvegardes-DigitalFootball/sauvegarder.sh`, puis exécuter dans Supabase (SQL Editor) le fichier SQL du bloc 5, puis le fichier de vérification. Me coller le résultat.
2. **Fin du bloc 7** : tester le parcours complet avec deux comptes (coach qui demande, club qui valide), puis donner ton « ok » pour pousser les blocs 6 et 7 ensemble.
3. **Avant le bloc 8** : nouvelle sauvegarde, puis exécuter le SQL de verrouillage. Seulement après la mise en ligne des blocs 6 et 7.
4. **À chaque fin de bloc** : ouvrir l'écran concerné sur téléphone et ordinateur, thème sombre et clair, puis valider ou dire ce qui ne va pas.
5. Ne pas m'envoyer d'identifiants : je n'ai pas de navigateur.

## Répartition suggérée
Je ne vois pas ta barre de statut d'ici : adapte selon ton compteur.
- **Jour 1** : blocs 0 et 1 (faibles, Sonnet).
- **Jour 2** : blocs 2 et 3 (le rendu historique coach devient visible).
- **Jour 3** : bloc 4, puis bloc 5 en début d'une fenêtre 5 h neuve (Opus, le plus cher).
- **Jour 4** : blocs 6 et 7, puis push commun.
- **Jour 5** : bloc 8 (Opus, court), puis bloc 9.
- **Jour 6** : blocs 10 et 11.
- **Jour 7** : bloc 12.
Les deux blocs Opus (5 et 8) pèsent le plus sur la limite de la semaine : ne pas les placer le même jour.
Rappel : `/clear` et une session neuve par bloc.

## Blocs

### Bloc 0 : mise en place et inventaire des données
- Statut : en cours
- Objectif : partir d'un état propre et savoir précisément quelles données datées existent pour recalculer une saison passée.
- Résultat testable : une section « Inventaire » ajoutée en bas de ce fichier, qui répond aux questions ci-dessous, et un commit de départ.
- Modèle : sonnet · Effort : medium · Coût estimé : faible
- Pourquoi ce modèle : lecture ciblée et synthèse, pas de logique délicate.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 0 PLAN-saisons.md`
- Dépend de : rien
- Prérequis : aucun
- Étapes :
  - Vérifier que le dépôt est propre (`git status`), ranger les fichiers SQL non suivis du chantier sponsors sans les supprimer, commit de départ.
  - Lister, à partir des fichiers `supabase_*.sql` et des requêtes du code, pour chaque donnée de l'historique : table, colonne de date, colonne équipe (`club_categorie_id` ou autre), colonne coach. Données : matchs, buts (`buts_detail`), stats match joueur (minutes, cartons, buts, passes, note), présences entraînement, notes RPE (`seances_notes_*`), santé, tests physiques, évaluations, compétitions/classement, projet sportif.
  - Répondre à quatre questions clés : (a) comment savoir quel coach avait quelle équipe en saison passée, alors que la clôture vide `club_categories.educateur_id` ? (b) le poste gardien est-il connu (clean sheets) ? (c) les minutes jouées sont-elles saisies ? (d) le projet sportif garde-t-il une trace de ses versions précédentes ?
  - Repérer où est stocké le rôle staff d'un membre du club (`ROLES_STAFF`, `staff_club_delegation`, `role_permissions`) pour préparer le bloc 5.
  - Écrire la section « Inventaire » avec, pour chaque manque, la conséquence : à ajouter au SQL du bloc 5, ou donnée affichée « non disponible ».
- Ce que je teste pour valider : je lis la section Inventaire et je confirme les choix sur les manques.
- Reste à finir :
- Journal :

### Bloc 1 : socle saison (sélecteur et filtrage par dates)
- Statut : à faire
- Objectif : un sélecteur de saison réutilisable partout, et des fonctions qui filtrent les données sur une saison donnée.
- Résultat testable : dans l'onglet Stats du coach, les notes RPE ne montrent plus que la saison en cours (correction du mélange actuel), avec le libellé « Saison 2026 - 2027 ». Un fichier `tests/saison.test.js` (lancé par `npm test`) prouve, sur des données fictives, que les bornes et le filtrage d'une saison passée sont justes (cas limites : 30 juin, 1er juillet, année bissextile).
- Modèle : sonnet · Effort : medium · Coût estimé : faible
- Pourquoi ce modèle : code front simple, sans base de données.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 1 PLAN-saisons.md`
- Dépend de : bloc 0
- Prérequis : section Inventaire écrite
- Étapes :
  - Compléter `src/lib/saison.js` : liste des saisons qui contiennent des données (la saison en cours incluse, étiquetée « en cours »), libellé « 2026 - 2027 », bornes de dates d'une saison quelconque, état vide « première saison archivée en juillet 2027 ».
  - Écrire ces calculs en fonctions pures + `tests/saison.test.js` sur données fictives (aucun accès à la base).
  - Créer `src/components/saisons/SelecteurSaison.jsx` (liste déroulante sobre, socle visuel existant).
  - Rendre `StatsEquipe.jsx` capable de recevoir une saison en paramètre (par défaut la saison en cours), sans changer son affichage actuel.
  - Filtrer les notes RPE de l'onglet Stats sur la saison en cours.
  - `npm run build` sans erreur.
- Ce que je teste pour valider : onglet Stats du coach, les RPE de l'an dernier ont disparu, le reste est inchangé.
- Reste à finir :
- Journal :

### Bloc 2 : coach, onglet Historique collectif
- Statut : à faire
- Objectif : nouvel onglet Historique après Santé, avec l'accès Collectif d'une saison passée.
- Résultat testable : je choisis la saison 2026-2027 (la seule avec des données réelles, étiquetée « en cours ») et je vois effectif, résultats, % victoires/nuls/défaites, buts par match et par quart d'heure, nature des buts, cartons, classements (buteurs, passeurs, présence, victoires, temps de jeu, note), présence entraînement et résumé santé.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : beaucoup d'affichage en réutilisant Stats équipe ; l'effort high sert à ne pas casser le fichier géant.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 2 PLAN-saisons.md`
- Dépend de : bloc 1
- Prérequis : compte coach avec des données 2025-2026
- Étapes :
  - Ajouter l'entrée Historique dans la navigation du coach (sous-onglets `equipe / stats / sante`, ligne ~5654 et ~6139 de `DashboardEducateur.jsx`) et l'interrupteur Collectif / Individuel.
  - Créer `src/components/saisons/HistoriqueCollectif.jsx` : sélecteur de saison, puis `StatsEquipe` avec la saison choisie, plus les blocs absents de Stats équipe (temps de jeu, victoires par joueur, résumé santé).
  - Retrouver l'équipe de la saison choisie selon la réponse (a) de l'Inventaire.
  - Afficher « non disponible » proprement quand une donnée n'existe pas pour cette saison.
- Ce que je teste pour valider : Historique > Collectif > 2026-2027, chiffres identiques à l'onglet Stats actuel ; et l'état vide quand aucune saison passée n'existe.
- Reste à finir :
- Journal :

### Bloc 3 : coach, Historique individuel
- Statut : à faire
- Objectif : l'accès Individuel de l'onglet Historique, joueur par joueur.
- Résultat testable : je choisis une saison puis un joueur et je vois sa fiche d'évaluation, buts, passes, clean sheets (gardien seulement), cartons, minutes, % victoires, note de saison, tests physiques, récapitulatif santé.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : même nature que le bloc 2.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 3 PLAN-saisons.md`
- Dépend de : bloc 2
- Prérequis : aucun nouveau
- Étapes :
  - Créer `src/components/saisons/HistoriqueIndividuel.jsx` : liste de l'effectif de la saison, puis fiche du joueur.
  - Réutiliser la fiche de fin de saison (`historique_saisons`) pour l'évaluation, sans la dupliquer.
  - Clean sheets : seulement si le poste gardien est connu (réponse (b) de l'Inventaire), sinon ligne masquée.
  - Brancher dans l'interrupteur Collectif / Individuel du bloc 2.
- Ce que je teste pour valider : deux joueurs, dont un gardien si possible, chiffres cohérents.
- Reste à finir :
- Journal :

### Bloc 4 : coach, mes saisons dans Mon profil
- Statut : à faire
- Objectif : l'historique de carrière du coach, une ligne par saison, séparé de l'historique de son équipe actuelle.
- Résultat testable : dans Mon profil, une section « Mes saisons » : par saison, club et équipe, % victoires/nuls/défaites, buts marqués et pris par match, % nature des buts, classement en compétition, résumé blessures, % présence entraînement, moyenne RPE.
- Modèle : sonnet · Effort : medium · Coût estimé : moyen
- Pourquoi ce modèle : agrégation de calculs déjà écrits aux blocs 1 à 3.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 4 PLAN-saisons.md`
- Dépend de : bloc 3
- Prérequis : aucun nouveau
- Étapes :
  - Extraire les calculs des blocs 2 et 3 dans `src/lib/statsSaison.js` pour ne pas les écrire deux fois.
  - Créer `src/components/saisons/MesSaisonsCoach.jsx` et le brancher dans Mon profil.
  - Ne garder que les saisons où ce coach encadrait l'équipe (réponse (a) de l'Inventaire).
- Ce que je teste pour valider : Mon profil, la saison 2026-2027 (en cours) apparaît avec des chiffres qui correspondent à l'onglet Historique ; avant juillet 2027 la section dit clairement qu'il n'y a pas encore de saison archivée.
- Reste à finir :
- Journal :

### Bloc 5 : base de données, demandes et droits de validation
- Statut : à faire
- Objectif : créer en base le circuit de demande (affiliation au club, responsabilité d'une catégorie) et les droits de validation par rôle, **sans encore rien interdire** de ce qui marche aujourd'hui.
- Résultat testable : le fichier de vérification montre la table des demandes, les fonctions de validation, et un test qui prouve qu'un responsable préformation ne peut pas valider une demande U17, mais le directeur sportif oui.
- Modèle : opus · Effort : high · Coût estimé : élevé
- Pourquoi ce modèle : règles d'accès sur la base de production, une erreur bloque des coachs ou ouvre une faille.
- Lancement : `/clear`, puis `/model opus`, puis `/effort high`, puis `/bloc 5 PLAN-saisons.md`
- Dépend de : bloc 0 (où sont stockés les rôles staff)
- Prérequis : sauvegarde lancée par Kevin
- Étapes :
  - `supabase_saisons_demandes.sql` : table des demandes (coach, club, catégorie, type affiliation ou catégorie, saison, statut, qui a validé, quand), règles d'accès : le coach voit et crée les siennes, le club voit celles de son club.
  - Fonction de validation sécurisée : vérifie le rôle (responsable formation U15 à Seniors, préformation U11 à U14, école de foot U7 à U10, directeur sportif, président et compte principal du club pour tout), puis rattache le coach à la catégorie. La secrétaire est refusée.
  - Table légère « saison close pour ce club » (club, saison, date, par qui) pour le bloc 10, plus ce que l'Inventaire a signalé comme manquant (trace coach ↔ équipe par saison, versions du projet sportif) si Kevin l'a validé.
  - Fichier de vérification + fichier de retour arrière livré séparément.
  - Aucune modification des règles actuelles de `club_categories` dans ce bloc.
- Ce que je teste pour valider : j'exécute le SQL puis la vérification, je colle le résultat, Claude confirme ligne par ligne.
- Reste à finir :
- Journal :

### Bloc 6 : coach, les deux questions après clôture
- Statut : à faire
- Objectif : après « Clôturer la saison », Mon équipe demande « Restes-tu affilié à [club] ? » puis « De quelle catégorie es-tu responsable ? », chaque réponse devient une demande au club. L'auto-déclaration actuelle passe aussi par une demande.
- Résultat testable : avec le deuxième compte coach, je clôture (ou j'arrive sans équipe), je réponds, je vois « Demande envoyée, en attente du club » et je n'accède pas aux nouvelles données.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : front avec des états à bien gérer ; la sécurité est déjà dans la base (bloc 5).
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 6 PLAN-saisons.md`
- Dépend de : bloc 5
- Prérequis : SQL du bloc 5 exécuté, deuxième compte coach
- Étapes :
  - Créer `src/components/saisons/DemandesCoach.jsx` (deux questions, état en attente, refusé, validé).
  - Remplacer les écritures directes de `declarerMaCategorie` et de l'ajout d'une équipe (`DashboardEducateur.jsx` ~2157 et ~2476) par la création d'une demande. Le retrait de soi-même d'une catégorie reste direct.
  - Ne pas toucher l'acceptation d'invitation (`AcceptInvite.jsx`) : invité par le club = accepté.
  - Réponse « non » à l'affiliation : explication claire de ce que ça change, confirmation avant d'envoyer.
  - **Pas de push** à la fin de ce bloc : commit local seulement.
- Ce que je teste pour valider : parcours coach complet jusqu'à « en attente », sans erreur.
- Reste à finir :
- Journal :

### Bloc 7 : club, demandes à valider sur la page Éducateurs
- Statut : à faire
- Objectif : les demandes remontent dans la page Éducateurs du club ; la personne qui a le bon rôle valide ou refuse en un clic.
- Résultat testable : connecté en directeur sportif, je valide la demande du bloc 6 ; le coach accède à son équipe. Connecté avec un rôle non autorisé, je vois la demande sans bouton de validation.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : front, la règle des rôles est appliquée par la fonction du bloc 5.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 7 PLAN-saisons.md`
- Dépend de : bloc 6
- Prérequis : compte club avec au moins deux rôles différents
- Étapes :
  - Créer `src/components/saisons/DemandesClub.jsx` et le placer en haut de la page Éducateurs (`DashboardClub.jsx`, repérer par grep), avec un compteur visible.
  - Boutons Valider et Refuser seulement si le rôle connecté couvre la catégorie ; sinon mention « à valider par … ».
  - Notification plateforme au coach à la validation ou au refus.
  - Test du parcours complet avec deux comptes, puis **push commun des blocs 6 et 7** après le « ok » de Kevin.
- Ce que je teste pour valider : parcours complet, et le cas de la secrétaire qui ne peut pas valider.
- Reste à finir :
- Journal :

### Bloc 8 : verrouillage en base
- Statut : à faire
- Objectif : fermer en base la possibilité pour un coach de se rattacher seul à une catégorie, maintenant que le nouveau parcours est en ligne.
- Résultat testable : le fichier de vérification prouve qu'une écriture directe d'un coach sur `club_categories.educateur_id` est refusée, que le retrait de soi-même, l'invitation par le club et les écrans du club marchent toujours.
- Modèle : opus · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : modification d'une règle d'accès utilisée par de nombreux écrans en production.
- Lancement : `/clear`, puis `/model opus`, puis `/effort high`, puis `/bloc 8 PLAN-saisons.md`
- Dépend de : bloc 7 poussé en production
- Prérequis : nouvelle sauvegarde lancée par Kevin
- Étapes :
  - Lister par grep tous les endroits du code qui écrivent dans `club_categories` et vérifier qu'aucun ne casse.
  - `supabase_saisons_verrouillage_categories.sql` : règle qui interdit au coach de s'attribuer une catégorie, tout en laissant le retrait de soi et les écritures du club.
  - Vérification avec des tests simulés par rôle, retour arrière livré séparément.
- Ce que je teste pour valider : j'exécute, je colle le résultat, puis je refais un parcours coach et un parcours club.
- Reste à finir :
- Journal :

### Bloc 9 : club, boutons Historique
- Statut : à faire
- Objectif : rouvrir une saison passée côté club.
- Résultat testable : bouton « Historique saison » avec choix de la saison, et un bouton Historique sur Stats équipe, Projet sportif (évolution d'une saison à l'autre) et Éducateurs (qui encadrait quelle équipe, avec quel effectif).
- Modèle : sonnet · Effort : medium · Coût estimé : moyen
- Pourquoi ce modèle : réutilisation des composants des blocs 1 à 4.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 9 PLAN-saisons.md`
- Dépend de : blocs 4 et 5
- Prérequis : aucun nouveau
- Étapes :
  - Bouton Historique saison : vue par équipe réutilisant `HistoriqueCollectif`.
  - Stats équipe club : sélecteur de saison.
  - Éducateurs : liste par saison, coach, équipe, effectif.
  - Projet sportif : comparaison entre deux saisons, selon ce que le bloc 0 a trouvé (sinon, l'historique démarre à partir de la saison en cours, et c'est dit à l'écran).
- Ce que je teste pour valider : les quatre boutons sur 2026-2027 (en cours), et l'état vide pour les saisons passées.
- Reste à finir :
- Journal :

### Bloc 10 : club, clôture de saison et Planifier séance à zéro
- Statut : à faire
- Objectif : le bouton « Clôturer une saison » en bas du dashboard club (bilan, sans rien archiver) et la remise à zéro de Planifier séance.
- Résultat testable : le bouton affiche quelles équipes ont clôturé et lesquelles non, puis marque la saison close pour le club. Dans Planifier séance, « Repartir à zéro » masque les séances des saisons passées ; la présence entraînement reste dans l'historique.
- Modèle : sonnet · Effort : medium · Coût estimé : faible
- Pourquoi ce modèle : deux écrans simples, la table existe depuis le bloc 5.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 10 PLAN-saisons.md`
- Dépend de : bloc 5
- Prérequis : aucun nouveau
- Étapes :
  - `src/components/saisons/ClotureSaisonClub.jsx` : liste des équipes avec leur état de clôture, confirmation, enregistrement dans la table du bloc 5. Réservé président et directeur sportif.
  - Rappel clair à l'écran : « Rien n'est archivé ici, chaque coach clôture son équipe. Stages, tournois et administratif ne sont pas touchés. »
  - [IDÉE] Bouton « Relancer » à côté d'une équipe non clôturée : notification plateforme au coach. Optionnel, 10 minutes, à garder si Kevin le veut.
  - `PlanificationSeances.jsx` : filtre par défaut sur la saison en cours, interrupteur pour revoir les anciennes. Aucune suppression.
- Ce que je teste pour valider : bilan affiché, aucune affiliation modifiée, anciennes séances masquées puis réaffichables.
- Reste à finir :
- Journal :

### Bloc 11 : joueur, saison en cours et Mes saisons
- Statut : à faire
- Objectif : côté joueur starter et Pro, la saison actuelle au premier plan et les anciennes rangées.
- Résultat testable : Mon équipe affiche « Saison 2026 - 2027 » et garde le bouton Mes stats ; une sous-rubrique Historique liste les saisons passées ; un joueur dont le coach a clôturé voit le message de fin de saison ; quand le nouveau coach l'intègre, il reçoit une notification de confirmation.
- Modèle : sonnet · Effort : medium · Coût estimé : moyen
- Pourquoi ce modèle : affichage et une notification, aucun SQL prévu.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 11 PLAN-saisons.md`
- Dépend de : bloc 1, et chantier `PLAN.md` publié ou abandonné
- Prérequis : compte joueur de test
- Étapes :
  - Libellé de saison dans Mon équipe, sans changer le reste de l'interface.
  - Sous-rubrique Historique à partir de `HistoriqueSaisons.jsx` existant, saison actuelle en premier ; état vide soigné tant qu'aucune saison n'est archivée.
  - Le message de fin de saison s'appuie sur l'affiliation archivée, pas sur la date : il se teste dès maintenant avec des comptes de test.
  - Message exact : « Tu as terminé ta saison avec [nom du coach]. Dans l'attente de ton nouvel éducateur, tu peux renouveler ta licence avant le 15 juillet et retrouver ta saison 2025 - 2026 dans « Mes saisons ». » (affiché si son affiliation est archivée et aucune nouvelle n'est active).
  - Notification plateforme de reconduction à l'ajout dans l'effectif d'un nouveau coach. Si les règles d'accès des notifications l'empêchent, s'arrêter et proposer un petit SQL à Kevin plutôt que de le contourner.
  - Les deux branches du dashboard joueur sont concernées (starter et Pro).
- Ce que je teste pour valider : les trois états du joueur (en cours, saison terminée, reconduit), sur téléphone.
- Reste à finir :
- Journal :

### Bloc 12 : vérification finale et nettoyage
- Statut : à faire
- Objectif : vérifier le chantier de bout en bout et ranger.
- Résultat testable : un compte rendu avec, pour chaque point du brief, l'écran où le voir ; build propre ; fichiers SQL du chantier rangés.
- Modèle : sonnet · Effort : medium · Coût estimé : faible
- Pourquoi ce modèle : relecture ciblée, pas de nouvelle logique.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 12 PLAN-saisons.md`
- Dépend de : blocs 0 à 11
- Prérequis : aucun
- Étapes :
  - Reprendre le brief point par point et cocher où chaque demande est visible.
  - `npm test` vert. Rappeler à Kevin ce qui ne pourra être vérifié en réel qu'en juillet 2027 (première bascule de saison, premier historique archivé) et proposer une répétition générale en mai 2027 avec des comptes de test.
  - `npm run build` et lint sur les fichiers touchés ; retrait des journaux de debug.
  - Tutoriels club et éducateur : ajouter une ligne sur l'historique et la validation, si un tutoriel couvre déjà ces écrans.
  - Mettre à jour la mémoire projet, puis commit et push après le « ok » de Kevin.
- Ce que je teste pour valider : je parcours la liste du compte rendu.
- Reste à finir :
- Journal :
