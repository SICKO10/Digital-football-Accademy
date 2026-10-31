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
- Statut : fait (2026-10-31, attend la validation de Kevin sur les choix de l'Inventaire)
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
- Reste à finir : `supabase_sponsors_diagnostic_resultats.txt` laissé non suivi volontairement (sortie brute de psql, jamais relue pour d'éventuelles données sensibles). À ranger ou à mettre dans le .gitignore.
- Journal : 2026-10-31, Sonnet 5.5. Trois commits de départ créés (scripts SQL, ressenti collectif club, brief et plan saisons), rien de poussé. Inventaire écrit en bas de ce fichier. Aucun écart.

### Bloc 1 : socle saison (sélecteur et filtrage par dates)
- Statut : fait (2026-10-31, attend la validation de Kevin)
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
- Reste à finir : `SelecteurSaison` créé mais pas encore affiché nulle part (il sert aux blocs 2, 3, 9). `StatsEquipe` ne montre désormais que la saison en cours par défaut, aussi côté club et joueur (la saison 2025 - 2026 n'existe pas, les matchs de juin 2026 avant la bascule n'y sont plus comptés). Test visuel dans le navigateur non fait (pas de navigateur ici).
- Journal : 2026-10-31, Sonnet 5.5. `saison.js` complété (fonctions pures), 6 tests ajoutés dans `tests/saison.test.js`, `npm test` 71/71, `npm run build` ok. Écart : `saisonActuelle` accepte maintenant une date en paramètre (pour les tests), comportement inchangé sans paramètre.

### Bloc 2 : coach, onglet Historique collectif
- Statut : fait (2026-10-31, attend la validation de Kevin)
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
- Reste à finir : l'interrupteur Collectif / Individuel n'est pas affiché (rien à mettre derrière avant le bloc 3, il sera ajouté avec `HistoriqueIndividuel`). Test visuel dans le navigateur non fait (pas de navigateur ici). Pour une saison passée, l'effectif = effectif actuel + joueurs ayant des stats cette saison-là (affichés « Ancien joueur » s'ils ont quitté l'équipe). Les séances de la saison passée dont la présence vient du sondage seulement comptent comme dans Stats.
- Journal : 2026-10-31, Sonnet 5.5. Créé `src/lib/statsSaison.js` (calculs purs), `tests/statsSaison.test.js` (6 tests, `npm test` 77/77), `src/components/saisons/HistoriqueCollectif.jsx` (requêtes propres à la saison choisie, équipe active du coach). Onglet Historique ajouté dans Mon équipe (droit « stats » pour un dirigeant délégué). `npm run build` ok, lint propre sur les fichiers créés. Écart : les classements écartent les joueurs à zéro ; « Temps de jeu » et « Victoires » disent « non disponible » si aucune minute n'est saisie (les victoires dépendent des minutes).

### Bloc 3 : coach, Historique individuel
- Statut : fait (2026-10-31, attend la validation de Kevin)
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
- Reste à finir : test visuel dans le navigateur non fait (pas de navigateur ici). Les minutes non saisies s'affichent « n.d. ». Le sélecteur de joueur est une rangée de boutons (un par joueur), à remplacer par une liste si l'effectif est grand. Les tests physiques ne sont lus que pour les joueurs liés à un compte (`joueur_id`). La fiche figée de fin de saison n'est lue que pour une saison passée (aucune avant juillet 2027).
- Journal : 2026-10-31, Sonnet 5.5. Créé `HistoriqueIndividuel.jsx` (stats, % victoires, clean sheets conditionnels, cartons, présence, note de match, note de saison /20, évaluations par période, tests physiques début/dernier, santé), interrupteur Collectif / Individuel ajouté dans `HistoriqueCollectif.jsx`, 2 fonctions pures dans `statsSaison.js` + test. `npm test` 78/78, build ok, lint : 1 avertissement de dépendances sur le useEffect. Écart : la fiche de fin de saison (`historique_saisons`) n'est pas dupliquée, seule sa note et son date de clôture sont reprises.

### Bloc 4 : coach, mes saisons dans Mon profil
- Statut : fait (2026-10-31, attend la validation de Kevin)
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
- Reste à finir : test visuel dans le navigateur non fait (pas de navigateur ici). Le classement en compétition n'existe pas en base : la section affiche le bilan V/N/D par compétition et le dit à l'écran. Les blessures ne sont comptées que pour les équipes ayant un match ou une séance cette saison-là. Le nom du club vient de `profiles_public.club` ; si absent, seul le nom de l'équipe s'affiche. L'équipe n'est pas filtrée sur « le coach encadrait l'équipe » via une affiliation : seuls les matchs et séances du coach comptent (réponse (a) de l'Inventaire).
- Journal : 2026-10-31, Sonnet 5.5. Ajout de `bilanSaisonEquipe` dans `statsSaison.js` (+2 tests, `npm test` 80/80), création de `MesSaisonsCoach.jsx`, branché dans Mon profil sous le parrainage (`DashboardEducateur.jsx`). Build ok, lint propre. Écart : les calculs de `StatsEquipe` (React) n'ont pas été extraits tels quels, le bilan est une fonction pure indépendante qui applique les mêmes règles.

### Bloc 5 : base de données, demandes et droits de validation
- Statut : fait (2026-10-31), exécuté en production par Kevin, vérification 36/36 ok
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
- Reste à finir : SQL et vérification exécutés par Kevin le 2026-10-31, 33/33 ok. Kevin a aussi lancé par erreur le fichier d'annulation : échec dès la 1re ligne (ordre de suppression), rien supprimé. Corrigé et verrouillé (`supabase_saisons_demandes_ANNULATION_NE_PAS_EXECUTER.sql`, ligne de blocage en tête). Décisions de Kevin (2026-10-31) : affiliation et clôture club validées par compte principal, président, directeur sportif **et responsable formation** ; personne ne valide sa propre demande ; un départ ne se refuse pas ; option colonne équipe sur `historique_saisons` acceptée. Fichier principal mis à jour (seule `saison_role_couvre_categorie` change), retesté localement : 36/36 et parcours 0 KO. Relancé par Kevin avec l'option, vérification 36/36 ok en production. Commit local des fichiers SQL, pas de push (rien de visible tant que les blocs 6 et 7 ne sont pas en ligne).
- Pour les blocs 6 et 7 :
  - Coach : `insert` direct dans `saison_demandes` (type `affiliation` avec `souhaite_rester`, ou `categorie` avec `categorie_nom` + `categorie_equipe`, `club_categorie_id` si l'équipe existe déjà), saison au format `2027-2028`. Annulation : RPC `saison_annuler_demande(id)`.
  - Club : RPC `saison_traiter_demande(id, 'validee' | 'refusee', commentaire)` ; `saison_peut_valider(club_id, categorie_nom)` dit si l'utilisateur connecté peut traiter (catégorie vide pour une affiliation) et sert à afficher ou non les boutons. Messages d'erreur en français, prêts à afficher.
  - Clôture club (bloc 10) : `insert` dans `saisons_closes_club (club_id, saison, close_par)`.
- Journal : 2026-10-31, Opus 5.5. Fichiers SQL écrits, puis exécutés et testés sur une base Postgres locale factice (PGlite, hors projet, rien en production) avec des bouchons des tables existantes : 33/33 contrôles de vérification ok, 29/29 parcours simulés ok (préformation refusée sur U17, directeur sportif et responsable formation acceptés, secrétaire refusée, pas de demande au nom d'un autre, pas de vol d'équipe déjà tenue, réutilisation de l'équipe vacante, départ, annulation, clôture club), fichier relançable deux fois sans erreur. Décisions prises : (1) les demandes d'affiliation et la clôture club sont réservées au compte principal, président, directeur sportif, puis Kevin a ajouté le responsable formation ; (2) personne ne valide sa propre demande ; (3) la règle des rôles est fixe, indépendante des réglages « voir » de `role_categories_access` ; (4) un départ (« non » à l'affiliation) ne se refuse pas, sa validation retire le coach du club et libère ses équipes, comme le bouton « Retirer » ; (5) une catégorie non reconnue (ex. Vétérans) ne peut être validée que par les rôles « tout » ; (6) l'école de foot couvre U10 et moins. Aucune règle existante modifiée.

### Bloc 6 : coach, les deux questions après clôture
- Statut : fait, poussé en production avec le bloc 7 (2026-10-31)
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
- Reste à finir : test dans le navigateur non fait (pas de navigateur ici) : à faire par Kevin avec le deuxième compte coach. Le coach ne voit pas encore de réponse tant que le bloc 7 (validation côté club) n'existe pas : **ne pas pousser avant le bloc 7**. La question 1 « Restes-tu affilié » ne se pose que si la clôture a laissé une trace (au moins une affiliation joueur archivée par ce coach) et que le coach n'a plus aucune équipe ; un coach qui clôture une seule de ses équipes alors qu'il en garde une autre n'est pas interrogé. Une demande d'affiliation « je reste » refusée par le club n'a pas d'effet automatique (le coach reste accepté au club). Le coach ne peut pas ajouter une équipe tenue par un autre coach (message d'avance). L'auto-déclaration en base reste ouverte jusqu'au bloc 8 (un coach qui contourne l'écran peut encore s'attribuer une équipe).
- Journal : 2026-10-31, Sonnet 5.5. Création de `src/lib/demandesSaison.js` (règles pures : saison visée, après clôture, étape à afficher, préparation de la demande) + `tests/demandesSaison.test.js` (9 tests, `npm test` 89/89), de `src/components/saisons/DemandesCoach.jsx` (question 1, confirmation du départ, question 2, carte « en attente » avec annulation et bouton « Vérifier la réponse du club », relecture au retour sur l'onglet). `DashboardEducateur.jsx` : `declarerMaCategorie` supprimée (plus d'écriture directe dans `club_categories` pour s'attribuer une équipe), remplacée par `apresDemandeSaison` (relit équipes et affiliation, bascule sur l'équipe accordée) ; états `promptCategorieForm` et `savingCategorieClub` retirés ; retrait de soi-même d'une équipe et `AcceptInvite.jsx` inchangés. Build ok, lint propre sur les nouveaux fichiers (19 erreurs déjà présentes dans le gros fichier, identiques avant/après). Décision : la saison visée par la demande est la plus tardive entre la saison en cours et la suivante de la dernière saison clôturée par le coach.

### Bloc 7 : club, demandes à valider sur la page Éducateurs
- Statut : fait, poussé en production avec les blocs 1 à 6 sur le « ok » de Kevin (2026-10-31)
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
- Reste à finir : test dans le navigateur non fait (pas de navigateur ici) : parcours complet à jouer par Kevin (coach de test qui demande, compte club qui valide), puis cas du rôle non autorisé (la page doit afficher « À valider par … » sans boutons). **Push commun des blocs 6 et 7 seulement après son « ok »** (rien n'est poussé). Le compteur de l'onglet Éducateurs additionne les affiliations en attente et les demandes de saison ; le bloc « Traiter » de l'accueil club ne compte pas encore les demandes de saison (amélioration hors bloc). Pas d'email au coach, seulement la notification dans l'appli (clochette). L'historique des demandes déjà traitées n'est pas affiché côté club (seulement celles en attente). Un club sans staff déclaré : seul le compte principal valide (affiché « le compte principal du club »).
- Journal : 2026-10-31, Sonnet 5.5. Ajout dans `src/lib/demandesSaison.js` des règles pures côté club : `roleCouvreCategorie` (miroir de la règle de la base, sert seulement à écrire « à valider par … »), `libelleValideurs`, `actionsDemandeClub` (valider, confirmer un départ, sa propre demande, rôle non autorisé), `notificationCoach`, `categoriePourDroit` ; 6 tests ajoutés (`npm test` 95/95). Nouveau `src/components/saisons/DemandesClub.jsx` : lit les demandes en attente du club, interroge `saison_peut_valider` une fois par catégorie différente pour afficher ou non les boutons, Valider / Refuser (motif facultatif vu par le coach) via `saison_traiter_demande`, un départ se confirme en deux temps et ne se refuse pas, notification dans l'appli au coach (table `notifications`, sans email), relecture au retour sur l'onglet. `DashboardClub.jsx` : composant placé en tête de la page Éducateurs, compteur dans l'onglet (`nbDemandesSaison`), rechargement des équipes et des éducateurs après un traitement. Build ok, lint propre sur les nouveaux fichiers (10 erreurs déjà présentes dans `DashboardClub.jsx`, identiques avant et après). Décisions : une demande faite par la personne connectée elle-même (compte à double rôle) n'a pas de bouton, comme la base l'impose ; « à valider par » cite le compte principal puis les membres du staff dont le rôle couvre la catégorie.

### Bloc 8 : verrouillage en base
- Statut : fait (2026-10-31), exécuté en production par Kevin, vérification 13/13 ok ; parcours coach et club à rejouer par Kevin
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
- Reste à finir : parcours coach (retrait d'une équipe, demande) et parcours club (création d'équipe, validation) à rejouer par Kevin. Aucun code de l'appli touché : le verrou agit sans push. Règles restantes en production sur `club_categories` : 4 règles « club peut… » (voir, créer, modifier, supprimer), « educateur peut voir categories de son club », `educateur_quitte_sa_categorie`. Constat hors bloc : les écritures directes semblent réservées au compte principal du club (à confirmer) ; un membre du staff connecté avec son propre compte ne créerait donc pas d'équipe depuis la page club, ce qui était déjà le cas avant ce bloc. Il valide quand même les demandes (fonction du bloc 5). Effet assumé : un membre du staff qui est aussi coach ne peut plus s'attribuer une équipe depuis la page club, il passe par une demande validée par un autre (règle du bloc 5).
- Journal : 2026-10-31, Opus 5.5. Inventaire du code : 5 écritures sur `club_categories` (coach : retrait dans `GestionCloturesSaison.jsx` et `DashboardEducateur.jsx`, toutes deux vers « sans coach » ; club : création, suppression, création à l'acceptation d'une affiliation dans `DashboardClub.jsx`), aucune dans `api/` ni `supabase/functions`, `AcceptInvite.jsx` n'écrit pas dans la table. SQL : fonction `saison_peut_attribuer_equipe` + déclencheur `saison_garde_attribution_equipe` (refuse toute attribution d'équipe par un coach, même si une règle inconnue de la production l'autorisait), suppression des règles `educateur_declare_sa_categorie` et `educateur_reclame_categorie_vacante`, `educateur_quitte_sa_categorie` conservée. Testé sur une base Postgres locale factice (PGlite, hors projet) : 40/40 (vérification 13/13, coach, pire cas avec règle « tout permis », club et staff, circuit de demande des blocs 5 à 7, script serveur, fichier relancé deux fois, annulation verrouillée puis déverrouillée = retour exact à l'état d'avant). `npm test` 95/95. Libellé du test 12 de la vérification du bloc 5 précisé (il comptera 1 règle après ce bloc). Décision : un staff qui est aussi coach ne s'attribue pas d'équipe lui-même.

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

---

## Inventaire (bloc 0, 2026-10-31)
Lu dans les scripts `supabase_*.sql` et dans le code. Aucune requête sur la base de production : les tables créées hors fichiers SQL (ex. `historique_saisons`, `stats_match`, `matchs_equipe`) sont décrites d'après le code qui les lit et les écrit.

### Données disponibles pour recalculer une saison
| Donnée | Table | Date | Équipe | Coach |
|---|---|---|---|---|
| Matchs, score, compétition | `matchs_equipe` | `date` | `club_categorie_id` | `educateur_id` |
| Buts (minute, nature, côté) | `matchs_equipe.buts_detail` (JSON) | via le match | idem | idem |
| Stats par joueur et match : minutes, buts, passes, clean sheet, cartons | `stats_match` | via `match_id` | via le match | `educateur_id` |
| Séances | `entrainements` | `date` | `club_categorie_id` | `educateur_id` |
| Présences | `presences_entrainement` (+ `disponibilites`) | via la séance | via la séance | via la séance |
| Notes RPE et plaisir | `seances_notes_demandes` / `seances_notes_joueurs` | `date_seance` | `club_categorie_id` | `educateur_id` |
| Blessures et suivi médical | `blessures` / `suivi_medical` | `date_debut`, `saison` (texte) | `equipe_joueur_id` | `educateur_id` |
| Tests physiques | `tests_physiques` | `date_test` | `club_categorie_id` | `educateur_id` |
| Évaluations | `evaluations_joueur` (`note_globale_saison`) | `updated_at` seulement | `equipe_joueur_id` | `educateur_id` |
| Fiche de fin de saison (photo figée) | `historique_saisons` | `saison` (texte), `date_cloture` | aucune colonne équipe | `educateur_id` |
| Effectif | `equipe_joueurs` (poste en texte libre) | aucune | `club_categorie_id` | `educateur_id` |
| Projet sportif | `planification_annuelle` (colonne `saison`), `regles_jeu` (colonne `saison`), `principes_jeu` (sans saison) | voir à gauche | `club_id` + `pole_key` | sans objet |

### Les quatre questions
**(a) Quel coach avait quelle équipe en saison passée ?** La clôture (`GestionCloturesSaison.jsx`) passe les affiliations en `archive` (avec `saison` et `date_fin`) puis met `club_categories.educateur_id` à vide. Mais chaque match, séance et test garde son `educateur_id` et son `club_categorie_id`. Réponse : on retrouve le couple coach + équipe d'une saison en regardant les matchs et séances datés de cette saison. Limite : une équipe sans aucun match ni séance dans la saison n'apparaît pas. Les affiliations archivées complètent pour l'effectif. Ce n'est pas bloquant.
**(b) Le poste gardien est-il connu ?** Pas besoin : `stats_match.clean_sheet` est saisi match par match par le coach. Les clean sheets de la saison = somme de ces cases. Pour l'affichage « gardien seulement » du bloc 3 : on affiche la ligne dès qu'un clean sheet existe, ou si le poste texte libre contient « gardien » (`src/lib/postes.js`).
**(c) Les minutes jouées sont-elles saisies ?** Oui, `stats_match.minutes` est enregistré par le coach (valeur 0 si non saisi). Piège : 0 veut dire « pas saisi » autant que « n'a pas joué ». Le bloc 2 affiche « non disponible » si aucune minute n'est saisie sur la saison, comme le fait déjà `StatsEquipe` pour sa section.
**(d) Le projet sportif garde-t-il ses versions précédentes ?** Non pour les principes de jeu (`principes_jeu` n'a pas de saison, modifié en place). Oui pour la planification annuelle et les règles (colonne `saison`). Conséquence : le bloc 9 compare les deux saisons pour la planification et les règles. Pour les principes de jeu, l'historique commence à partir du moment où on le sauvegarde.

### Autres constats
- Les données de saison passée **se recalculent depuis les dates** : pas besoin de nouvelle table pour les chiffres. Seule la fiche `historique_saisons` reste une photo.
- `historique_saisons` n'a pas de colonne équipe : un coach à plusieurs équipes mélange ses fiches de fin de saison (clé : joueur, éducateur, saison). Contournement : relier la fiche à l'équipe via `equipe_joueurs.club_categorie_id` du joueur.
- Les évaluations n'ont pas de date de saison. Le bloc 3 affichera la fiche `historique_saisons` pour une saison close, et l'évaluation en cours seulement pour la saison en cours.
- **Classement en compétition** (bloc 4) : aucune table de classement trouvée. Seul le nom de la compétition est stocké sur les matchs. Le bloc 4 affichera le bilan des matchs par compétition et « non disponible » pour le rang.
- `matchs_equipe.club_categorie_id` a été rempli après coup pour les anciens matchs (scripts de rattrapage) : certains matchs d'un coach à plusieurs équipes peuvent rester sans équipe. Ces matchs sont comptés pour le coach mais pas pour une équipe précise.
- Les blessures portent déjà une saison en texte : filtre direct possible.

### Rôles staff (pour le bloc 5)
- Table `staff_club` (colonne `role`) et `role_permissions`, contrainte de valeurs définie dans `supabase_inventaire.sql` (19 rôles).
- Liste côté appli : `ROLES_STAFF` dans `DashboardClub.jsx` (ligne 120).
- Catégories par rôle : `role_categories_access` ; défauts `ACCES_CATEGORIES_DEFAUT` (`DashboardClub.jsx` ~148) : formation U15 à Seniors, préformation U11 à U14, école de foot U7 à U10 ; le directeur sportif a tout ; le président a tout. La secrétaire figure aussi dans les rôles à accès complet par défaut (`ROLES_ACCES_COMPLET_DEFAUT`) : **le bloc 5 doit l'exclure explicitement de la validation**, comme prévu.
- Règles actuelles de `club_categories` à ne pas casser avant le bloc 8 : un éducateur accepté du club peut s'insérer (`educateur_declare_sa_categorie`), réclamer une catégorie vacante, et la quitter (`supabase_club_categories_educateur_declare.sql`).

### Conséquences pour le bloc 5 (à valider par Kevin)
1. **Ajout au SQL** : table « saison close pour ce club » (déjà prévue), table des demandes (prévue).
2. **Pas d'ajout** pour la trace coach + équipe : déjà dans les matchs et séances.
3. **Facultatif** : colonne `club_categorie_id` sur `historique_saisons` pour séparer les fiches d'un coach à plusieurs équipes. Recommandé, petit, sans risque (colonne vide par défaut).
4. **Rien pour les principes de jeu** : l'historique démarre à la première sauvegarde, c'est dit à l'écran.
