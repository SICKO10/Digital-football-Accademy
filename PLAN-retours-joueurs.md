# PLAN : Deux retours de joueurs (2026-11-09)
Deux problèmes indépendants, un bloc chacun, une session neuve par bloc. Commande : `/bloc N PLAN-retours-joueurs.md`.

## Bloc 1 : Le thème sombre est retenu à la prochaine connexion
- Statut : piste A validée et commitée (2026-11-09) ; piste B (mémoire entre appareils) reportée à plus tard, à reprendre sur demande
- Constat : la mémoire existe déjà (`df_dashboard_theme` dans `src/lib/ThemeProvider.jsx`), mais seulement dans le navigateur de l'appareil, et seulement si le joueur a cliqué sur le bouton soleil/lune. Depuis le clair par défaut (chantier thème club), un joueur qui était en sombre sans jamais cliquer arrive en clair. Aucune mémoire d'un appareil à l'autre.
- Objectif : un joueur qui choisit le sombre le retrouve à chaque connexion, sur tous ses appareils.
- Pistes : (A) vérifier et durcir la mémoire locale (cas navigation privée, stockage vidé, changement de compte sur le même appareil) ; (B) enregistrer le choix sur le profil (colonne en base) pour suivre la personne partout, avec repli sur la mémoire locale.
- Recommandation : A d'abord (aucune modification de la base), B seulement si tu veux la mémoire entre téléphone et ordinateur. B touche la base : sauvegarde `~/Sauvegardes-DigitalFootball/sauvegarder.sh` avant, SQL à te donner à exécuter.
- Modèle : sonnet · Effort : medium · Coût : faible (A) à moyen (B)
- Test : choisir sombre, se déconnecter, se reconnecter (puis un autre appareil pour B) : le sombre est conservé.

## Bloc 2 : Schéma tactique en lecture, plein écran et proportions sur mobile
- Statut : validé (2026-11-09), commit 3b76ea3
- Constat : côté joueur, `src/components/TactipadViewer.jsx` affiche le schéma à largeur fixe (écran moins 64 px dans `PreparationTactiqueJoueur.jsx` ~254) sans mode plein écran ni adaptation à l'orientation. Le ratio est imposé à 16:10 alors que l'éditeur mobile utilise un ratio 0.56 : les éléments sont remis à l'échelle de façon non uniforme, d'où des proportions différentes de l'ordinateur.
- Objectif : au clic sur Lire, le schéma s'affiche comme une vidéo plein écran (portrait et paysage), avec les mêmes proportions que sur ordinateur.
- Étapes : (1) reproduire avec un schéma réel sur téléphone et noter l'écart ; (2) respecter le ratio d'origine du schéma (`terrain.w/h`) ; (3) bouton plein écran (API plein écran, repli en superposition fixe si le navigateur du téléphone la refuse, notamment iPhone) ; (4) ajustement à la rotation ; (5) test portrait et paysage.
- Prérequis : un schéma partagé avec animation, et un téléphone ou l'émulation mobile.
- Modèle : sonnet · Effort : high · Coût : moyen à élevé
- Test : sur téléphone, ouvrir la préparation tactique, lancer Lire : plein écran, schéma entier visible, mêmes proportions qu'à l'ordinateur, en portrait et en paysage.

- Reste à finir : test sur un vrai téléphone (iPhone surtout : le plein écran du navigateur n'y existe pas, le calque fixe prend le relais). Non modifié : la page de partage public (`TactipadPublic.jsx`, ratio 16:10 fixe, sans animation) et la Causerie (`CauserieAvantMatch.jsx`) ; elles bénéficient quand même du ratio réel via `TactipadViewer`.
- Journal (2026-11-09, Sonnet 5.5) : `TactipadViewer` prend la hauteur du ratio réel enregistré (`terrain.h/terrain.w`, repli 0,625) donc mise à l'échelle uniforme ; `SchemaPleinEcran` s'adapte au portrait et au paysage (plus de blocage « tourne ton téléphone », plus de verrouillage en paysage), terrain entier visible ; sur téléphone, toucher Lire/le terrain ouvre le plein écran et lance l'animation (`onLire`, `lectureAuto`) dans `PreparationTactiqueJoueur` et `SeanceDuJourJoueur`. Testé en émulation Chromium (390x844 et 844x390) : ratio 0,56 respecté, schéma entier dans l'écran, animation lancée à l'ouverture, aucune erreur. Commit 3b76ea3.

- Journal bloc 1 (2026-11-09, Sonnet 5.5) : piste A. `ThemeProvider.jsx` : lecture/écriture du thème protégées (plus de plantage si le stockage est bloqué, valeur invalide ignorée), et un changement de thème dans un autre onglet est suivi. Lint et build OK. Non testé à la main dans le navigateur. Pas de commit. Limite : un joueur qui était en sombre sans jamais cliquer arrive en clair (ancien défaut impossible à retrouver), et rien ne suit d'un appareil à l'autre sans la piste B.

## Bloc 3 : Tirs au but dans les matchs de coupe (ajouté 2026-11-09)
- Statut : fait et validé (2026-11-09), commit 94685d0
- Demande : pour un match de type Coupe, une case « Tirs au but » qui ouvre deux champs (tirs au but nous / eux). Un match nul au temps réglementaire devient une victoire ou une défaite d'après les tirs au but, jamais un nul.
- Décisions validées : (1) affichage « 1-1 (4-2 t.a.b.) » ; (2) une victoire aux t.a.b. compte comme une victoire normale dans toutes les stats et classements.
- Règle : le score du match reste celui du temps réglementaire. Les tirs au but ne comptent pas dans les buts marqués ou encaissés, ni dans les buts des joueurs.
- Étapes : (1) sauvegarde `~/Sauvegardes-DigitalFootball/sauvegarder.sh`, puis SQL à te donner : deux colonnes (`tab_nous`, `tab_eux`, nulles par défaut) sur la table des matchs ; (2) une fonction unique « résultat du match » (V/N/D) qui tient compte des t.a.b., placée dans `src/lib` avec tests ; (3) formulaires d'ajout et de modification du match (`DashboardEducateur.jsx` ~8038 et ~8782) ; (4) remplacer les comparaisons `score_nous` / `score_eux` par cette fonction : `StatsEquipe`, `statsSaison.js`, `parcoursCoach.js`, `LigneResultat`, `HistoriqueCollectif`, `DashboardEducateur` (~1357, ~8084), `DashboardJoueur`, `DashboardClub`, `ClubPublic`, `RapportMatch`, `NotationMatch`, `TournoiClub` (à vérifier : les tournois ont peut-être leurs propres règles) ; (5) affichage du score avec t.a.b.
- Modèle : sonnet · Effort : high · Coût : moyen à élevé · Session neuve
- Test : créer un match de coupe 1-1 avec t.a.b. 4-2 : affiché « 1-1 (4-2 t.a.b.) », compté victoire dans Compétition, Stats équipe, Saisons, dashboard joueur. Un match de championnat 1-1 reste un nul.

- Journal bloc 3 (2026-11-09, Sonnet 5.5) : sauvegarde Supabase faite (`~/Sauvegardes-DigitalFootball/2026-11-09_0040`). Écrit : `supabase_tirs_au_but.sql` (à exécuter par Kevin), `src/lib/resultatMatch.js` (`resultatMatch`, `scoreAffiche`, `aTirsAuBut`, `estCoupe`) et `tests/resultatMatch.test.js` (6 tests OK). En attente : exécution du SQL avant de brancher formulaires, requêtes et stats (étapes 3 à 5).
- Journal bloc 3, suite (2026-11-09, Sonnet 5.5) : SQL exécuté par Kevin. Formulaires branchés (`DashboardEducateur.jsx` : ajout de match et fenêtre « score joué », case « Tirs au but » visible seulement si la compétition contient « coupe », champs vidés si décochée). Comparaisons remplacées par `resultatMatch` dans `DashboardEducateur`, `DashboardClub`, `DashboardJoueur`, `ClubPublic`, `StatsEquipe`, `statsSaison`, `HistoriqueCollectif`, `LigneResultat` ; affichage « 1-1 (4-2 t.a.b.) » dans LigneResultat, DashboardClub, DashboardJoueur (résultats du mois), HistoriqueCollectif, ClubPublic. `npm test` 185 OK, build OK. Non testé dans le navigateur connecté (pas de compte de test).
- Reste à finir bloc 3 : commit 94685d0 poussé sans `DashboardClub.jsx` ni `DashboardJoueur.jsx` (mélangés au chantier outils à la carte) : leurs changements t.a.b. partiront avec ce chantier. Hors périmètre (validé par Kevin) : tournois, scan IA, rapport de match.

## Bloc 4 : Alertes cartons jaunes, cumul sur 3 mois (ajouté 2026-11-09)
- Statut : phase 1 faite, non commitée, en attente de test par Kevin (2026-11-09, Sonnet 5.5)
- Règle (barèmes FFF, à confirmer auprès du district) : 3 jaunes en moins ou égal à 3 mois = suspension potentielle, décidée par la commission ; jamais « suspendu » automatique. Cartons gardés dans l'historique, seul le calcul écarte les anciens. Fin de saison : remise à zéro (1er juillet).
- Fait : `src/lib/disciplineCartons.js` (+ `tests/disciplineCartons.test.js`, 7 tests) ; alertes éducateur (`AlertesPanel.jsx`, résumé accueil) ; alerte joueur (`ListeAlertes.jsx`, `DashboardJoueur.jsx`, états menace / 3 avertissements / fin de menace pendant 14 jours).
- Phase 2 (à décider) : table `decisions_disciplinaires` + bouton « Suspension confirmée » (une suspension ferme efface les jaunes du casier), SQL à exécuter par Kevin, sauvegarde avant. Aussi : alerte sur le dashboard club.
- Limites : le calcul ne voit que les cartons saisis sur la feuille de match ; la règle exacte du district n'a pas été lue.
