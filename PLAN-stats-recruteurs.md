# PLAN : Stats de l'éducateur visibles par les recruteurs
Date : 2026-11-07 · Priorité : basse (les recruteurs arrivent N+1 ou N+2) · Touche la base : oui, avec prudence

## Le problème
Le profil recruteur lit la table `stats_match_joueur` (saisies du joueur) et ses moyennes `profil_recrutement`. Les stats de la feuille de match de l'éducateur sont dans une autre table, `stats_match`. Une fonction côté éducateur (`remonterStatsVersJoueurs`, DashboardEducateur ~4937) devait les copier vers `stats_match_joueur`, mais elle ne marche pas :
1. Elle utilise l'identifiant du joueur dans l'effectif (`equipe_joueurs.id`) à la place de l'identifiant de son compte (`equipe_joueurs.joueur_id`). La base refuse l'écriture, l'erreur est avalée en silence.
2. Même corrigée, l'éducateur n'a pas le droit d'écrire dans la table du joueur (règle : seul le joueur écrit ses lignes), ni dans `profil_recrutement`.
3. Un joueur de l'effectif sans compte (`joueur_id` vide) n'a rien à recevoir.

Côté joueur, « Mes statistiques » fusionne déjà les deux sources (commit 7a8b2ce) : le problème ne concerne que les recruteurs.

## Direction retenue
Une copie automatique faite par la base elle-même (un déclencheur) à chaque enregistrement de la feuille de match, au lieu d'un envoi fait par le navigateur de l'éducateur. Avantages : fonctionne pour tous les chemins de saisie (manuelle, scan de la feuille), pas de droit d'écriture supplémentaire à ouvrir à l'éducateur, un seul endroit à maintenir.

## Blocs
### Bloc 0 : Sauvegarde et état des lieux (lecture seule)
- Statut : à faire · Modèle : sonnet · Effort : medium · Coût : faible
- Lancer `~/Sauvegardes-DigitalFootball/sauvegarder.sh` (Kevin).
- Requêtes en lecture seule, que Kevin exécute : nombre de lignes de `stats_match`, combien ont un joueur avec compte (`equipe_joueurs.joueur_id` rempli), colonnes réelles de `stats_match` (sa création n'est pas dans les fichiers SQL du dépôt), lignes `stats_match_joueur` de source `feuille_match` (probablement zéro).
- Validation : Kevin me renvoie les résultats, je confirme le diagnostic avant d'écrire quoi que ce soit.

### Bloc 1 : Fichier SQL du déclencheur (écrit, relu, pas encore lancé)
- Statut : à faire · Modèle : opus · Effort : high · Coût : moyen
- Écrire `supabase_stats_match_vers_joueur.sql` : index d'unicité (joueur, match) sur `stats_match_joueur`, fonction du déclencheur (traduit `equipe_joueurs.id` en compte joueur, ignore les joueurs sans compte, met à jour au lieu de dupliquer, retire la ligne si les minutes passent à zéro, suit la suppression d'une feuille), puis reprise des feuilles déjà saisies.
- Relecture ligne à ligne avec Kevin, en français simple, avant tout lancement. Aucun retour arrière prêt à lancer n'est donné : on décrit la marche arrière en mots, on s'appuie sur la sauvegarde du bloc 0.
- Validation : Kevin dit « ok » au contenu, puis lance le bloc lui-même dans Supabase.

### Bloc 2 : Moyennes du profil recruteur
- Statut : à faire · Modèle : sonnet · Effort : medium · Coût : faible
- `profil_recrutement` (moyennes) n'est recalculé que par le navigateur du joueur. Recalculer à l'ouverture de « Mes statistiques » à partir de toutes les lignes (saisies du joueur + copiées de l'éducateur). Le calcul existant (`calculerMoyennes`) ne change pas.
- Validation : ouvrir « Mes statistiques » avec un joueur de test, vérifier que ses moyennes de recrutement bougent.

### Bloc 3 : Nettoyage du code et vérification
- Statut : à faire · Modèle : sonnet · Effort : medium · Coût : faible
- Retirer l'appel mort `remonterStatsVersJoueurs` côté éducateur. Garder la fusion de « Mes statistiques » (elle évite les doublons si une saisie du joueur tombe le même jour qu'une feuille).
- Test de bout en bout : feuille de match remplie, ligne copiée, profil recruteur à jour, correction de la feuille (mise à jour, pas de doublon), joueur sans compte (rien ne casse).
- Prérequis : un club test, un éducateur test et un joueur test (les comptes de test ont été supprimés).

## Risques et garde-fous
- Fonction à droits élevés (elle écrit dans la table du joueur pour le compte de l'éducateur) : elle doit ne copier que ce qui est dans `stats_match`, jamais un champ libre, et n'accepter que les joueurs de l'équipe concernée.
- Jamais de lancement sans sauvegarde du jour et sans « ok » explicite.
- Rien ne presse : à faire quand les recruteurs approchent.

## Journal
- 2026-11-07 : plan écrit, rien lancé, aucun fichier SQL créé.
